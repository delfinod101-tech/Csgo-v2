import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  AppMode,
  CameraPresetId,
  CarConfig,
  DriveTelemetry,
  InspectedPart,
} from '@/src/types/car';
import { CarAudioEngine } from '@/src/three/audio';
import { buildCarModel } from '@/src/three/carModel';
import { setupEnvironment } from '@/src/three/environment';
import { createCarMaterials } from '@/src/three/materials';
import { createProceduralTextures } from '@/src/three/textures';

export interface TouchDriveInput {
  throttle: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
}

export interface CarViewportHandle {
  captureSnapshot: () => void;
  resetDrivePosition: () => void;
  setTouchInput: (patch: Partial<TouchDriveInput>) => void;
  playMechanicalToggle: () => void;
}

interface CarViewportProps {
  mode: AppMode;
  config: CarConfig;
  cameraRequestNonce: number;
  onInspectPart: (part: InspectedPart | null) => void;
  onTelemetryChange: (telemetry: DriveTelemetry) => void;
}

const CAMERA_PRESETS_POS: Record<
  CameraPresetId,
  { pos: [number, number, number]; target: [number, number, number] }
> = {
  hero: { pos: [4.35, 1.85, 4.45], target: [0, 0.55, 0] },
  side: { pos: [5.6, 1.05, 0.0], target: [0, 0.55, 0] },
  front: { pos: [0.0, 1.25, 5.1], target: [0, 0.52, 0.2] },
  rear: { pos: [0.0, 1.32, -5.1], target: [0, 0.58, -0.2] },
  top: { pos: [0.01, 6.4, 0.01], target: [0, 0.3, 0] },
};

// Pre-allocated scratch helpers (Zero GC in render loop)
const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3();
const _chaseOffset = new THREE.Vector3();
const _pointer = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export const CarViewport = React.forwardRef<CarViewportHandle, CarViewportProps>(
  ({ mode, config, cameraRequestNonce, onInspectPart, onTelemetryChange }, ref) => {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const [contextLost, setContextLost] = useState(false);
    const [webglUnavailable, setWebglUnavailable] = useState(false);

    // Live mutable refs so React state never tears down the WebGL scene
    const modeRef = useRef<AppMode>(mode);
    const configRef = useRef<CarConfig>(config);
    const onInspectPartRef = useRef(onInspectPart);
    const onTelemetryRef = useRef(onTelemetryChange);
    const touchInputRef = useRef<TouchDriveInput>({
      throttle: false,
      brake: false,
      left: false,
      right: false,
    });

    onInspectPartRef.current = onInspectPart;
    onTelemetryRef.current = onTelemetryChange;

    // Scene controller refs exposed for imperative handle & prop sync
    const sceneApiRef = useRef<{
      triggerCameraPreset: (preset: CameraPresetId) => void;
      syncConfig: (cfg: CarConfig) => void;
      syncMode: (m: AppMode) => void;
      captureSnapshot: () => void;
      resetDrive: () => void;
      playMechanicalToggle: () => void;
    } | null>(null);

    useImperativeHandle(ref, () => ({
      captureSnapshot: () => sceneApiRef.current?.captureSnapshot(),
      resetDrivePosition: () => sceneApiRef.current?.resetDrive(),
      setTouchInput: (patch: Partial<TouchDriveInput>) => {
        touchInputRef.current = { ...touchInputRef.current, ...patch };
      },
      playMechanicalToggle: () => sceneApiRef.current?.playMechanicalToggle(),
    }));

    useEffect(() => {
      const container = mountRef.current;
      if (!container) return;

      const isSoftwareGl = detectSoftwareWebGL();
      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: !isSoftwareGl,
          powerPreference: 'high-performance',
        });
      } catch {
        setWebglUnavailable(true);
        return;
      }

      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = !isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';

      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        42,
        Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1),
        0.1,
        500
      );
      const initialPreset = CAMERA_PRESETS_POS[configRef.current.cameraPreset];
      camera.position.set(...initialPreset.pos);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(...initialPreset.target);
      controls.enableDamping = !isSoftwareGl;
      controls.dampingFactor = 0.06;
      controls.minDistance = 2.6;
      controls.maxDistance = 12.5;
      controls.minPolarAngle = 0.12;
      controls.maxPolarAngle = Math.PI / 2 - 0.03;
      controls.enablePan = false;
      controls.update();

      const textures = createProceduralTextures(renderer.capabilities.getMaxAnisotropy());
      const materials = createCarMaterials(textures, isSoftwareGl);
      const car = buildCarModel(materials);
      scene.add(car.root);

      const env = setupEnvironment(scene, renderer, textures, isSoftwareGl);
      const audio = new CarAudioEngine();

      if (!isSoftwareGl) {
        renderer.compile(scene, camera);
      }

      // Animation / Loop state
      let frameId = 0;
      let isDisposed = false;
      let renderBusy = false;
      let renderDirty = false;
      let loopActive = false;

      let cameraTransitioning = false;
      let camPresetTarget = configRef.current.cameraPreset;
      let currentExploded = configRef.current.exploded;
      let currentSpoiler = configRef.current.spoilerDeployed ? 1 : 0;

      // Drive physics state
      const keys: Record<string, boolean> = {};
      let carPosX = 0;
      let carPosZ = 0;
      let carHeading = 0;
      let carSpeed = 0; // m/s
      let wheelSpinAngle = 0;
      let steerAngle = 0;
      let bodyPitch = 0;
      let bodyRoll = 0;
      let lastTelemetryPush = 0;

      const clock = new THREE.Clock();

      function afterDraw(cb: () => void) {
        if (isDisposed) return;
        const gl = renderer.getContext() as WebGL2RenderingContext;
        if (gl && typeof gl.fenceSync === 'function') {
          const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
          gl.flush();
          const poll = () => {
            if (isDisposed) {
              if (sync) gl.deleteSync(sync);
              return;
            }
            const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
            if (state === gl.UNSIGNALED) {
              frameId = window.setTimeout(poll, 5);
            } else {
              if (sync) gl.deleteSync(sync);
              frameId = window.setTimeout(cb, 80);
            }
          };
          frameId = window.setTimeout(poll, 5);
        } else {
          frameId = window.setTimeout(cb, 80);
        }
      }

      function needsContinuousLoop(): boolean {
        if (modeRef.current === 'drive') return true;
        if (configRef.current.turntableSpin) return true;
        if (cameraTransitioning) return true;
        if (Math.abs(currentExploded - configRef.current.exploded) > 0.001) return true;
        const targetSpoiler = configRef.current.spoilerDeployed ? 1 : 0;
        if (Math.abs(currentSpoiler - targetSpoiler) > 0.001) return true;
        return false;
      }

      function requestRender() {
        if (isDisposed || loopActive) return;
        if (renderBusy) {
          renderDirty = true;
          return;
        }
        renderBusy = true;
        frameId = requestAnimationFrame(() => {
          if (isDisposed) return;
          renderDirty = false;
          controls.update();
          renderer.render(scene, camera);
          const done = () => {
            renderBusy = false;
            if (renderDirty && !loopActive) requestRender();
          };
          if (isSoftwareGl) afterDraw(done);
          else done();
        });
      }

      function ensureLoopRunning() {
        if (loopActive || isDisposed) return;
        loopActive = true;
        clock.getDelta(); // reset delta spike
        if (isSoftwareGl) {
          frameId = window.setTimeout(tick, 0);
        } else {
          frameId = requestAnimationFrame(tick);
        }
      }

      function stepScene(delta: number) {
        const dt = Math.min(delta, 0.05);
        const cfg = configRef.current;

        // 1. Damped Exploded View & Spoiler Deployment
        currentExploded = THREE.MathUtils.damp(currentExploded, cfg.exploded, 7.5, dt);
        const spoilerGoal = modeRef.current === 'drive' && Math.abs(carSpeed) > 22
          ? 1
          : cfg.spoilerDeployed
            ? 1
            : 0;
        currentSpoiler = THREE.MathUtils.damp(currentSpoiler, spoilerGoal, 8.0, dt);

        car.applyExploded(currentExploded);
        car.applySpoiler(currentSpoiler);

        // 2. Mode-specific behavior
        if (modeRef.current === 'studio') {
          if (cfg.turntableSpin) {
            car.root.rotation.y += dt * 0.28;
            env.turntableGroup.rotation.y += dt * 0.28;
          }

          if (cameraTransitioning) {
            const preset = CAMERA_PRESETS_POS[camPresetTarget];
            _camGoalPos.set(...preset.pos);
            _camGoalTarget.set(...preset.target);
            camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, 6.2, dt);
            camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, 6.2, dt);
            camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, 6.2, dt);
            controls.target.x = THREE.MathUtils.damp(controls.target.x, _camGoalTarget.x, 6.2, dt);
            controls.target.y = THREE.MathUtils.damp(controls.target.y, _camGoalTarget.y, 6.2, dt);
            controls.target.z = THREE.MathUtils.damp(controls.target.z, _camGoalTarget.z, 6.2, dt);

            if (
              camera.position.distanceToSquared(_camGoalPos) < 0.0008 &&
              controls.target.distanceToSquared(_camGoalTarget) < 0.0008
            ) {
              camera.position.copy(_camGoalPos);
              controls.target.copy(_camGoalTarget);
              cameraTransitioning = false;
            }
          }
          controls.update();
        } else {
          // DRIVE MODE KINEMATICS
          const touch = touchInputRef.current;
          const throttlePressed = !!(keys['KeyW'] || keys['ArrowUp'] || touch.throttle);
          const brakePressed = !!(keys['KeyS'] || keys['ArrowDown'] || touch.brake);
          const handbrakePressed = !!keys['Space'];
          const leftPressed = !!(keys['KeyA'] || keys['ArrowLeft'] || touch.left);
          const rightPressed = !!(keys['KeyD'] || keys['ArrowRight'] || touch.right);

          const maxFwdSpeed = 76; // ~273 km/h
          const maxRevSpeed = -18;

          let accel = 0;
          let isBraking = false;
          if (handbrakePressed) {
            accel = carSpeed > 0 ? -42 : carSpeed < 0 ? 42 : 0;
            isBraking = true;
          } else if (throttlePressed) {
            accel = 28 * (1 - Math.max(0, carSpeed) / (maxFwdSpeed * 1.15));
          } else if (brakePressed) {
            if (carSpeed > 1.2) {
              accel = -38;
              isBraking = true;
            } else {
              accel = -13;
              isBraking = true;
            }
          } else {
            // Natural rolling + aero drag
            accel = -carSpeed * 0.42 - Math.sign(carSpeed) * 0.35;
            if (Math.abs(carSpeed) < 0.12) {
              carSpeed = 0;
              accel = 0;
            }
          }

          carSpeed = THREE.MathUtils.clamp(carSpeed + accel * dt, maxRevSpeed, maxFwdSpeed);

          // Steering angle
          const speedSteerFactor = 1 - Math.min(Math.abs(carSpeed) / 95, 0.65);
          const targetSteer =
            ((leftPressed ? 1 : 0) - (rightPressed ? 1 : 0)) * 0.44 * speedSteerFactor;
          steerAngle = THREE.MathUtils.damp(steerAngle, targetSteer, 9.5, dt);

          // Turn rate based on wheelbase
          if (Math.abs(carSpeed) > 0.08) {
            const turnRate = (carSpeed / 2.72) * Math.sin(steerAngle);
            carHeading += turnRate * dt;
          }

          carPosX += Math.sin(carHeading) * carSpeed * dt;
          carPosZ += Math.cos(carHeading) * carSpeed * dt;

          // Soft proving-ground perimeter (radius 155m)
          const distFromOrigin = Math.hypot(carPosX, carPosZ);
          if (distFromOrigin > 155) {
            const nx = carPosX / distFromOrigin;
            const nz = carPosZ / distFromOrigin;
            carPosX = nx * 155;
            carPosZ = nz * 155;
            carSpeed *= 0.85;
          }

          // Wheel spin & suspension pitch/roll
          wheelSpinAngle += (carSpeed / 0.36) * dt;
          const targetPitch = THREE.MathUtils.clamp(-accel * 0.0014, -0.045, 0.045);
          const lateralG = (carSpeed * steerAngle) * 0.0022;
          const targetRoll = THREE.MathUtils.clamp(lateralG, -0.055, 0.055);
          bodyPitch = THREE.MathUtils.damp(bodyPitch, targetPitch, 8.5, dt);
          bodyRoll = THREE.MathUtils.damp(bodyRoll, targetRoll, 8.5, dt);

          car.root.position.set(carPosX, 0, carPosZ);
          car.root.rotation.y = carHeading;
          car.setDriveKinematics(wheelSpinAngle, steerAngle, bodyPitch, bodyRoll);

          materials.setLightsState(cfg.headlightsOn, isBraking);
          audio.updateDrive(Math.abs(carSpeed) / maxFwdSpeed, throttlePressed ? 1 : 0);

          // Chase Camera with subtle dynamic FOV widening
          const speedRatio = Math.min(Math.abs(carSpeed) / maxFwdSpeed, 1);
          const targetFov = 44 + speedRatio * 13;
          if (Math.abs(camera.fov - targetFov) > 0.05) {
            camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 4.5, dt);
            camera.updateProjectionMatrix();
          }

          const chaseDist = 5.4 + speedRatio * 1.1;
          const chaseHeight = 1.85 + speedRatio * 0.25;
          _chaseOffset.set(
            -Math.sin(carHeading) * chaseDist,
            chaseHeight,
            -Math.cos(carHeading) * chaseDist
          );
          _camGoalPos.set(carPosX + _chaseOffset.x, _chaseOffset.y, carPosZ + _chaseOffset.z);
          _camGoalTarget.set(
            carPosX + Math.sin(carHeading) * 2.4,
            0.78,
            carPosZ + Math.cos(carHeading) * 2.4
          );

          camera.position.x = THREE.MathUtils.damp(camera.position.x, _camGoalPos.x, 7.5, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, _camGoalPos.y, 7.5, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, _camGoalPos.z, 7.5, dt);
          camera.lookAt(_camGoalTarget);

          // Throttle telemetry updates to ~15fps to avoid unnecessary React re-renders
          const now = performance.now();
          if (now - lastTelemetryPush > 66) {
            lastTelemetryPush = now;
            onTelemetryRef.current({
              speedKmh: Math.round(Math.abs(carSpeed) * 3.6),
              gear: Math.abs(carSpeed) < 0.2 ? 'P' : carSpeed < 0 ? 'R' : 'D',
              steeringDeg: Math.round(THREE.MathUtils.radToDeg(steerAngle)),
              throttle: throttlePressed ? 1 : 0,
              braking: isBraking,
            });
          }
        }
      }

      function tick() {
        if (isDisposed) return;
        const delta = clock.getDelta();
        stepScene(delta);
        renderer.render(scene, camera);

        if (needsContinuousLoop()) {
          if (isSoftwareGl) afterDraw(tick);
          else frameId = requestAnimationFrame(tick);
        } else {
          loopActive = false;
        }
      }

      // -------------------------------------------------------------------------
      // Sync helpers called when React props change
      // -------------------------------------------------------------------------
      function syncConfig(cfg: CarConfig) {
        configRef.current = cfg;
        materials.applyPaint(cfg.paintId);
        materials.applyWheelFinish(cfg.wheelFinishId);
        materials.applyCaliper(cfg.caliperId);
        materials.setLightsState(cfg.headlightsOn, false);
        car.headlightBeamLeft.intensity = cfg.headlightsOn ? 18 : 0;
        car.headlightBeamRight.intensity = cfg.headlightsOn ? 18 : 0;
        env.setLightingPreset(cfg.lightingId);
        audio.setEnabled(cfg.audioEnabled);

        if (needsContinuousLoop()) {
          ensureLoopRunning();
        } else {
          requestRender();
        }
      }

      function syncMode(nextMode: AppMode) {
        const prev = modeRef.current;
        modeRef.current = nextMode;
        env.setMode(nextMode);

        if (nextMode === 'drive' && prev !== 'drive') {
          controls.enabled = false;
          carPosX = 0;
          carPosZ = 0;
          carHeading = 0;
          carSpeed = 0;
          steerAngle = 0;
          car.root.position.set(0, 0, 0);
          car.root.rotation.set(0, 0, 0);
          env.turntableGroup.rotation.y = 0;
          camera.position.set(0, 1.9, -5.4);
          camera.lookAt(0, 0.75, 2.0);
          ensureLoopRunning();
        } else if (nextMode === 'studio' && prev !== 'studio') {
          controls.enabled = true;
          carSpeed = 0;
          steerAngle = 0;
          bodyPitch = 0;
          bodyRoll = 0;
          car.root.position.set(0, 0, 0);
          car.root.rotation.set(0, 0, 0);
          car.setDriveKinematics(wheelSpinAngle, 0, 0, 0);
          camera.fov = 42;
          camera.updateProjectionMatrix();
          camPresetTarget = configRef.current.cameraPreset;
          cameraTransitioning = true;
          audio.updateDrive(0, 0);
          onTelemetryRef.current({
            speedKmh: 0,
            gear: 'P',
            steeringDeg: 0,
            throttle: 0,
            braking: false,
          });
          ensureLoopRunning();
        }
      }

      sceneApiRef.current = {
        triggerCameraPreset: (preset: CameraPresetId) => {
          camPresetTarget = preset;
          cameraTransitioning = true;
          ensureLoopRunning();
        },
        syncConfig,
        syncMode,
        captureSnapshot: () => {
          renderer.render(scene, camera);
          const url = renderer.domElement.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = `carro-gt01-${configRef.current.paintId}.png`;
          link.href = url;
          link.click();
        },
        resetDrive: () => {
          carPosX = 0;
          carPosZ = 0;
          carHeading = 0;
          carSpeed = 0;
          steerAngle = 0;
          car.root.position.set(0, 0, 0);
          car.root.rotation.set(0, 0, 0);
        },
        playMechanicalToggle: () => {
          audio.playMechanicalToggle();
        },
      };

      // -------------------------------------------------------------------------
      // Event Listeners: Controls, Raycasting, Keyboard, Resize, Context Loss
      // -------------------------------------------------------------------------
      const onControlsChange = () => {
        if (!loopActive && modeRef.current === 'studio') {
          requestRender();
        }
      };
      const onControlsStart = () => {
        // Cancel scripted camera preset immediately on user drag
        cameraTransitioning = false;
      };
      controls.addEventListener('change', onControlsChange);
      controls.addEventListener('start', onControlsStart);

      let downX = 0;
      let downY = 0;
      const onPointerDown = (e: PointerEvent) => {
        downX = e.clientX;
        downY = e.clientY;
      };
      const onPointerUp = (e: PointerEvent) => {
        if (modeRef.current !== 'studio') return;
        const moveDist = Math.hypot(e.clientX - downX, e.clientY - downY);
        if (moveDist > 6) return; // user was orbiting, not clicking a part

        const rect = renderer.domElement.getBoundingClientRect();
        _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        _raycaster.setFromCamera(_pointer, camera);
        const hits = _raycaster.intersectObjects(car.clickableMeshes, false);
        if (hits.length > 0) {
          const info = hits[0].object.userData.partInfo as InspectedPart | undefined;
          if (info) {
            onInspectPartRef.current(info);
            return;
          }
        }
        onInspectPartRef.current(null);
      };
      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      renderer.domElement.addEventListener('pointerup', onPointerUp);

      const onKeyDown = (e: KeyboardEvent) => {
        keys[e.code] = true;
        if (modeRef.current === 'drive' && e.code === 'KeyR') {
          sceneApiRef.current?.resetDrive();
        }
      };
      const onKeyUp = (e: KeyboardEvent) => {
        keys[e.code] = false;
      };
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);

      const onResize = () => {
        if (!container || isDisposed) return;
        const w = Math.max(container.clientWidth, 1);
        const h = Math.max(container.clientHeight, 1);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
        requestRender();
      };
      window.addEventListener('resize', onResize);

      const onContextLost = (e: Event) => {
        e.preventDefault();
        setContextLost(true);
      };
      const onContextRestored = () => {
        setContextLost(false);
        requestRender();
      };
      renderer.domElement.addEventListener('webglcontextlost', onContextLost);
      renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

      // Initial render
      syncConfig(configRef.current);
      requestRender();

      return () => {
        isDisposed = true;
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
        controls.removeEventListener('change', onControlsChange);
        controls.removeEventListener('start', onControlsStart);
        controls.dispose();
        renderer.domElement.removeEventListener('pointerdown', onPointerDown);
        renderer.domElement.removeEventListener('pointerup', onPointerUp);
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
        renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('resize', onResize);
        audio.dispose();
        car.dispose();
        env.dispose();
        materials.dispose();
        textures.dispose();
        renderer.dispose();
        sceneApiRef.current = null;
      };
    }, []);

    // Sync config prop updates without recreating WebGL context
    useEffect(() => {
      configRef.current = config;
      sceneApiRef.current?.syncConfig(config);
    }, [config]);

    // Sync camera preset changes
    useEffect(() => {
      if (cameraRequestNonce > 0 && mode === 'studio') {
        sceneApiRef.current?.triggerCameraPreset(config.cameraPreset);
      }
    }, [cameraRequestNonce, config.cameraPreset, mode]);

    // Sync studio vs drive mode
    useEffect(() => {
      sceneApiRef.current?.syncMode(mode);
    }, [mode]);

    if (webglUnavailable || contextLost) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#0b0d11] text-zinc-200 p-8">
          <div className="max-w-md text-center space-y-3 border border-white/10 rounded-xl bg-[#12151c] p-8">
            <h2 className="font-display text-2xl font-semibold text-white">
              Carro GT-01 Stradale
            </h2>
            <p className="text-sm text-zinc-400">
              {contextLost
                ? 'Graphics context interrupted. Restoring the 3D studio viewport automatically.'
                : 'Hardware-accelerated WebGL is unavailable in this browser environment.'}
            </p>
          </div>
        </div>
      );
    }

    return <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />;
  }
);

CarViewport.displayName = 'CarViewport';
