import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  GameSettings,
  MapId,
  ScreenView,
  SkinId,
  TeamSide,
  WeaponId,
} from '@/src/types/game';
import { buildCharacterRig, CharacterRig } from '@/src/game/character';
import { createGameTextures } from '@/src/game/textures';
import { buildWeaponModel, WeaponModelHandle } from '@/src/game/weapons';

export interface LobbyViewportHandle {
  triggerInspect: () => void;
}

interface LobbyViewportProps {
  view: Extract<ScreenView, 'lobby' | 'inventory' | 'store'>;
  team: TeamSide;
  mapId: MapId;
  weaponId: WeaponId;
  skinId: SkinId;
  settings: GameSettings;
}

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

export const LobbyViewport = React.forwardRef<LobbyViewportHandle, LobbyViewportProps>(
  ({ view, team, mapId, weaponId, skinId, settings }, ref) => {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const [webglError, setWebglError] = useState(false);

    const stateRef = useRef({ view, team, mapId, weaponId, skinId, settings });
    stateRef.current = { view, team, mapId, weaponId, skinId, settings };

    const apiRef = useRef<{
      syncProps: () => void;
      triggerInspect: () => void;
    } | null>(null);

    useImperativeHandle(ref, () => ({
      triggerInspect: () => apiRef.current?.triggerInspect(),
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
        setWebglError(true);
        return;
      }

      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.18;
      const baseDpr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2);
      renderer.setPixelRatio(baseDpr * stateRef.current.settings.resolutionScale);
      renderer.shadowMap.enabled =
        !isSoftwareGl && stateRef.current.settings.shadowsEnabled;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#131922');
      scene.fog = new THREE.FogExp2('#131922', 0.042);

      const camera = new THREE.PerspectiveCamera(
        37,
        Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1),
        0.1,
        100
      );
      camera.position.set(0.3, 1.48, 3.35);

      const pmrem = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      const envTex = pmrem.fromScene(roomEnv, 0.04).texture;
      scene.environment = envTex;
      roomEnv.dispose();
      pmrem.dispose();

      // Cinematic CS2 Key + Fill + Rim + Warm Back-Bounce Lights
      const keyLight = new THREE.DirectionalLight('#ffe4c4', 2.5);
      keyLight.position.set(3.5, 5.5, 4.5);
      keyLight.castShadow = !isSoftwareGl;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 16;
      keyLight.shadow.camera.left = -3.5;
      keyLight.shadow.camera.right = 3.5;
      keyLight.shadow.camera.top = 3.5;
      keyLight.shadow.camera.bottom = -3.5;
      keyLight.shadow.bias = -0.0005;
      scene.add(keyLight);

      const hemiLight = new THREE.HemisphereLight('#93c5fd', '#1e293b', 0.9);
      scene.add(hemiLight);

      const rimLight = new THREE.DirectionalLight('#38bdf8', 1.85);
      rimLight.position.set(-4.2, 3.2, -3.5);
      scene.add(rimLight);

      const warmAccentLight = new THREE.PointLight('#f59e0b', 2.2, 10);
      warmAccentLight.position.set(2.2, 1.8, -2.2);
      scene.add(warmAccentLight);

      const textures = createGameTextures(renderer.capabilities.getMaxAnisotropy());
      const geometries: THREE.BufferGeometry[] = [];
      const materials: THREE.Material[] = [];

      // Courtyard / Hangar Panorama Stage
      const stageGroup = new THREE.Group();
      const floorGeo = new THREE.CircleGeometry(16, 48);
      floorGeo.rotateX(-Math.PI / 2);
      geometries.push(floorGeo);
      const floorMat = new THREE.MeshStandardMaterial({
        map: textures.sandGround,
        roughness: 0.78,
        metalness: 0.14,
      });
      materials.push(floorMat);
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.receiveShadow = true;
      stageGroup.add(floor);

      // Stepped Tactical Dais + Glowing Perimeter Ring
      const daisGeo = new THREE.CylinderGeometry(1.18, 1.30, 0.055, 56);
      const daisSubGeo = new THREE.CylinderGeometry(1.36, 1.44, 0.025, 56);
      const daisRingGeo = new THREE.TorusGeometry(1.24, 0.014, 10, 64);
      daisRingGeo.rotateX(Math.PI / 2);
      geometries.push(daisGeo, daisSubGeo, daisRingGeo);

      const daisMat = new THREE.MeshStandardMaterial({
        color: '#171d26',
        roughness: 0.42,
        metalness: 0.62,
      });
      const daisRingMat = new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        emissive: '#38bdf8',
        emissiveIntensity: 1.6,
        roughness: 0.2,
      });
      materials.push(daisMat, daisRingMat);

      const dais = new THREE.Mesh(daisGeo, daisMat);
      dais.position.set(0, -0.025, 0);
      dais.receiveShadow = true;
      const daisSub = new THREE.Mesh(daisSubGeo, daisMat);
      daisSub.position.set(0, -0.045, 0);
      daisSub.receiveShadow = true;
      const daisRing = new THREE.Mesh(daisRingGeo, daisRingMat);
      daisRing.position.set(0, 0.002, 0);
      stageGroup.add(dais, daisSub, daisRing);

      // Background Architecture + Tactical Crates + Industrial Barrel
      const pillarGeo = new THREE.BoxGeometry(0.95, 4.8, 0.95);
      const backWallGeo = new THREE.BoxGeometry(11, 5.2, 0.5);
      const crateGeo = new THREE.BoxGeometry(1.15, 1.15, 1.15);
      const barrelGeo = new THREE.CylinderGeometry(0.36, 0.36, 1.05, 20);
      geometries.push(pillarGeo, backWallGeo, crateGeo, barrelGeo);

      const wallMat = new THREE.MeshStandardMaterial({
        map: textures.sandWall,
        roughness: 0.85,
      });
      const crateMat = new THREE.MeshStandardMaterial({
        map: textures.woodCrate,
        roughness: 0.72,
      });
      const barrelMat = new THREE.MeshStandardMaterial({
        color: '#334155',
        metalness: 0.65,
        roughness: 0.4,
      });
      materials.push(wallMat, crateMat, barrelMat);

      const backWall = new THREE.Mesh(backWallGeo, wallMat);
      backWall.position.set(0, 2.5, -5.2);
      backWall.receiveShadow = true;

      const pillarL = new THREE.Mesh(pillarGeo, wallMat);
      pillarL.position.set(-2.7, 2.4, -3.2);
      pillarL.receiveShadow = true;
      const pillarR = new THREE.Mesh(pillarGeo, wallMat);
      pillarR.position.set(2.9, 2.4, -3.5);
      pillarR.receiveShadow = true;
      const archTop = new THREE.Mesh(pillarGeo, wallMat);
      archTop.scale.set(7.4, 0.25, 1.0);
      archTop.position.set(0.1, 4.3, -3.35);

      const propCrate = new THREE.Mesh(crateGeo, crateMat);
      propCrate.position.set(-1.85, 0.575, -1.4);
      propCrate.rotation.y = 0.38;
      propCrate.castShadow = true;
      propCrate.receiveShadow = true;

      const propCrateTop = new THREE.Mesh(crateGeo, crateMat);
      propCrateTop.scale.setScalar(0.68);
      propCrateTop.position.set(-1.95, 1.54, -1.45);
      propCrateTop.rotation.y = -0.22;
      propCrateTop.castShadow = true;

      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      barrel.position.set(1.85, 0.525, -1.8);
      barrel.castShadow = true;
      barrel.receiveShadow = true;

      stageGroup.add(backWall, pillarL, pillarR, archTop, propCrate, propCrateTop, barrel);
      scene.add(stageGroup);

      // Subtle Atmospheric Volumetric Light Shaft Cone
      const beamGeo = new THREE.ConeGeometry(2.2, 6.5, 24, 1, true);
      geometries.push(beamGeo);
      const beamMat = new THREE.MeshBasicMaterial({
        color: '#ffe4b5',
        transparent: true,
        opacity: 0.038,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      materials.push(beamMat);
      const sunBeam = new THREE.Mesh(beamGeo, beamMat);
      sunBeam.position.set(0.4, 3.0, -0.3);
      sunBeam.rotation.z = 0.22;
      scene.add(sunBeam);

      // Atmospheric Dust Motes
      const moteCount = 110;
      const motePos = new Float32Array(moteCount * 3);
      for (let i = 0; i < moteCount; i++) {
        motePos[i * 3] = (Math.random() - 0.5) * 7.5;
        motePos[i * 3 + 1] = 0.2 + Math.random() * 3.4;
        motePos[i * 3 + 2] = (Math.random() - 0.5) * 5.5;
      }
      const moteGeo = new THREE.BufferGeometry();
      moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
      geometries.push(moteGeo);
      const moteMat = new THREE.PointsMaterial({
        color: '#fbbf24',
        size: 0.024,
        transparent: true,
        opacity: 0.48,
      });
      materials.push(moteMat);
      const motes = new THREE.Points(moteGeo, moteMat);
      scene.add(motes);

      // 1. Animated Operative Rig
      const operative: CharacterRig = buildCharacterRig(stateRef.current.team);
      operative.setWeapon(stateRef.current.weaponId, stateRef.current.skinId, textures.skinMaps);
      scene.add(operative.root);

      // 2. Inventory 3D Weapon Showcase
      const showcaseGroup = new THREE.Group();
      showcaseGroup.position.set(0, 1.32, 0.6);
      showcaseGroup.visible = false;
      scene.add(showcaseGroup);

      let showcaseWeapon: WeaponModelHandle | null = buildWeaponModel(
        stateRef.current.weaponId,
        stateRef.current.skinId,
        textures.skinMaps
      );
      showcaseWeapon.root.scale.setScalar(1.85);
      showcaseGroup.add(showcaseWeapon.root);

      // Drag-to-orbit rotation
      let isDragging = false;
      let prevX = 0;
      let prevY = 0;
      let operativeYaw = 0.15;
      let weaponYaw = -0.65;
      let weaponPitch = 0.08;
      let inspectTimer = 0;

      const onPointerDown = (e: PointerEvent) => {
        isDragging = true;
        prevX = e.clientX;
        prevY = e.clientY;
      };
      const onPointerMove = (e: PointerEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - prevX;
        const dy = e.clientY - prevY;
        prevX = e.clientX;
        prevY = e.clientY;
        if (stateRef.current.view === 'inventory') {
          weaponYaw += dx * 0.012;
          weaponPitch = THREE.MathUtils.clamp(weaponPitch + dy * 0.008, -0.65, 0.65);
        } else {
          operativeYaw += dx * 0.01;
        }
      };
      const onPointerUp = () => {
        isDragging = false;
      };

      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);

      let lastWeapon = stateRef.current.weaponId;
      let lastTeam = stateRef.current.team;
      let lastSkin = stateRef.current.skinId;
      let lastMap = stateRef.current.mapId;

      function syncProps() {
        const s = stateRef.current;

        // Graphics Settings Sync
        renderer.setPixelRatio(baseDpr * s.settings.resolutionScale);
        renderer.shadowMap.enabled = !isSoftwareGl && s.settings.shadowsEnabled;
        motes.visible = s.settings.particlesEnabled;
        sunBeam.visible = s.settings.particlesEnabled;

        daisRingMat.color.set(s.team === 'ct' ? '#38bdf8' : '#f59e0b');
        daisRingMat.emissive.set(s.team === 'ct' ? '#38bdf8' : '#f59e0b');

        if (s.team !== lastTeam) {
          lastTeam = s.team;
          operative.setTeam(s.team);
          inspectTimer = 1.0;
        }
        if (s.weaponId !== lastWeapon) {
          lastWeapon = s.weaponId;
          operative.setWeapon(s.weaponId, s.skinId, textures.skinMaps);
          if (showcaseWeapon) {
            showcaseGroup.remove(showcaseWeapon.root);
            showcaseWeapon.dispose();
          }
          showcaseWeapon = buildWeaponModel(s.weaponId, s.skinId, textures.skinMaps);
          showcaseWeapon.root.scale.setScalar(s.weaponId === 'knife' ? 2.6 : 1.85);
          showcaseGroup.add(showcaseWeapon.root);
          inspectTimer = 1.0;
        }
        if (s.skinId !== lastSkin) {
          lastSkin = s.skinId;
          operative.setSkin(s.skinId, textures.skinMaps);
          showcaseWeapon?.applySkin(s.skinId, textures.skinMaps);
        }
        if (s.mapId !== lastMap) {
          lastMap = s.mapId;
          const isMirage = s.mapId === 'mirage';
          floorMat.map = isMirage ? textures.sandGround : textures.concreteFloor;
          floorMat.needsUpdate = true;
          crateMat.map = isMirage ? textures.woodCrate : textures.steelContainer;
          crateMat.needsUpdate = true;
          scene.background = new THREE.Color(isMirage ? '#181e27' : '#0f1620');
          scene.fog = new THREE.FogExp2(isMirage ? '#181e27' : '#0f1620', 0.045);
          keyLight.color.set(isMirage ? '#ffe4c4' : '#dbeafe');
        }
      }

      apiRef.current = {
        syncProps,
        triggerInspect: () => {
          inspectTimer = 1.6;
        },
      };

      const clock = new THREE.Clock();
      let frameId = 0;
      let isDisposed = false;

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

      function tick() {
        if (isDisposed) return;
        const dt = Math.min(clock.getDelta(), 0.05);
        const elapsed = clock.getElapsedTime();
        const isInventory = stateRef.current.view === 'inventory';

        if (inspectTimer > 0) {
          inspectTimer = Math.max(0, inspectTimer - dt);
        }
        const inspectPhase = Math.sin(Math.min(inspectTimer, 1.2) * Math.PI * 0.85);

        operative.root.visible = !isInventory;
        showcaseGroup.visible = isInventory;

        if (!isInventory) {
          operative.updateLobbyIdle(elapsed, inspectPhase);
          operative.root.rotation.y = THREE.MathUtils.damp(
            operative.root.rotation.y,
            operativeYaw,
            8,
            dt
          );
          const isNarrow = (container?.clientWidth ?? window.innerWidth) < 768;
          const targetCamX = isNarrow ? 0.0 : -0.32;
          const targetCamZ = isNarrow ? 3.85 : 3.25;
          camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamX, 5, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, 1.38, 5, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamZ, 5, dt);
          camera.lookAt(isNarrow ? 0 : -0.15, 1.12, 0);
        } else {
          if (!isDragging) {
            weaponYaw += dt * 0.25;
          }
          const inspectRoll = inspectTimer > 0 ? Math.sin(inspectTimer * 4) * 0.45 : 0;
          showcaseGroup.rotation.y = THREE.MathUtils.damp(
            showcaseGroup.rotation.y,
            weaponYaw,
            10,
            dt
          );
          showcaseGroup.rotation.x = THREE.MathUtils.damp(
            showcaseGroup.rotation.x,
            weaponPitch + inspectRoll,
            10,
            dt
          );
          showcaseGroup.position.y = 1.32 + Math.sin(elapsed * 1.6) * 0.025;

          camera.position.x = THREE.MathUtils.damp(camera.position.x, 0, 6, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, 1.36, 6, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, 2.25, 6, dt);
          camera.lookAt(0, 1.32, 0.55);
        }

        motes.rotation.y = elapsed * 0.03;

        renderer.render(scene, camera);
        if (isSoftwareGl) afterDraw(tick);
        else frameId = requestAnimationFrame(tick);
      }

      const onResize = () => {
        if (!container || isDisposed) return;
        const w = Math.max(container.clientWidth, 1);
        const h = Math.max(container.clientHeight, 1);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        renderer.setPixelRatio(baseDpr * stateRef.current.settings.resolutionScale);
      };
      window.addEventListener('resize', onResize);

      syncProps();
      tick();

      return () => {
        isDisposed = true;
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
        renderer.domElement.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('resize', onResize);
        operative.dispose();
        showcaseWeapon?.dispose();
        geometries.forEach((g) => g.dispose());
        materials.forEach((m) => m.dispose());
        textures.dispose();
        envTex.dispose();
        renderer.dispose();
        apiRef.current = null;
      };
    }, []);

    useEffect(() => {
      apiRef.current?.syncProps();
    }, [view, team, mapId, weaponId, skinId, settings]);

    if (webglError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#0b0e14] text-zinc-300">
          WebGL indisponível neste dispositivo.
        </div>
      );
    }

    return <div ref={mountRef} className="w-full h-full touch-none cursor-grab active:cursor-grabbing" />;
  }
);

LobbyViewport.displayName = 'LobbyViewport';
