import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { AppMode, LightingPresetId } from '@/src/types/car';
import { ProceduralTextures } from './textures';

export interface SceneEnvironmentController {
  turntableGroup: THREE.Group;
  provingGroundGroup: THREE.Group;
  setLightingPreset: (preset: LightingPresetId) => void;
  setMode: (mode: AppMode) => void;
  dispose: () => void;
}

const LIGHTING_CONFIGS: Record<
  LightingPresetId,
  {
    bg: string;
    fogColor: string;
    fogDensity: number;
    keyColor: string;
    keyIntensity: number;
    hemiSky: string;
    hemiGround: string;
    hemiIntensity: number;
    rimColor: string;
    rimIntensity: number;
    rectIntensity: number;
    floorColor: string;
  }
> = {
  obsidian: {
    bg: '#0b0d11',
    fogColor: '#0b0d11',
    fogDensity: 0.018,
    keyColor: '#fff4e6',
    keyIntensity: 2.35,
    hemiSky: '#8fa8c8',
    hemiGround: '#111419',
    hemiIntensity: 0.72,
    rimColor: '#9dc4ff',
    rimIntensity: 1.5,
    rectIntensity: 4.5,
    floorColor: '#12151b',
  },
  pavilion: {
    bg: '#dde3eb',
    fogColor: '#dde3eb',
    fogDensity: 0.012,
    keyColor: '#fffaf0',
    keyIntensity: 2.6,
    hemiSky: '#eef5ff',
    hemiGround: '#6b7280',
    hemiIntensity: 1.15,
    rimColor: '#ffffff',
    rimIntensity: 1.1,
    rectIntensity: 3.4,
    floorColor: '#cfd6df',
  },
  horizon: {
    bg: '#1c1821',
    fogColor: '#291e28',
    fogDensity: 0.015,
    keyColor: '#ffb570',
    keyIntensity: 2.5,
    hemiSky: '#9888b8',
    hemiGround: '#241b1a',
    hemiIntensity: 0.85,
    rimColor: '#ff8a5c',
    rimIntensity: 1.75,
    rectIntensity: 3.8,
    floorColor: '#18141c',
  },
};

export function setupEnvironment(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  textures: ProceduralTextures,
  isSoftwareGl: boolean
): SceneEnvironmentController {
  // 1. Mandatory Studio Environment Reflection via RoomEnvironment
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envTex = pmremGenerator.fromScene(roomEnv, 0.04).texture;
  scene.environment = envTex;
  roomEnv.dispose();
  pmremGenerator.dispose();

  // 2. Three-Point Studio Lighting Rig
  const keyLight = new THREE.DirectionalLight('#fff4e6', 2.35);
  keyLight.position.set(6, 9, 6);
  keyLight.castShadow = !isSoftwareGl;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 28;
  keyLight.shadow.camera.left = -4.8;
  keyLight.shadow.camera.right = 4.8;
  keyLight.shadow.camera.top = 4.8;
  keyLight.shadow.camera.bottom = -4.8;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  const hemiLight = new THREE.HemisphereLight('#8fa8c8', '#111419', 0.72);
  scene.add(hemiLight);

  const rimLight = new THREE.DirectionalLight('#9dc4ff', 1.5);
  rimLight.position.set(-7, 4.5, -6);
  scene.add(rimLight);

  // Studio Overhead Softboxes (RectAreaLight skipped on software WebGL)
  const rectLights: THREE.RectAreaLight[] = [];
  if (!isSoftwareGl) {
    RectAreaLightUniformsLib.init();
    const overheadSoftbox = new THREE.RectAreaLight('#ffffff', 4.5, 6.5, 2.2);
    overheadSoftbox.position.set(0, 4.2, 0.2);
    overheadSoftbox.lookAt(0, 0.5, 0);
    scene.add(overheadSoftbox);
    rectLights.push(overheadSoftbox);

    const sideSoftbox = new THREE.RectAreaLight('#eef4ff', 2.8, 5.2, 1.4);
    sideSoftbox.position.set(4.5, 2.0, 0);
    sideSoftbox.lookAt(0, 0.6, 0);
    scene.add(sideSoftbox);
    rectLights.push(sideSoftbox);
  }

  // ---------------------------------------------------------------------------
  // 3. Studio Turntable & Contact Grounding
  // ---------------------------------------------------------------------------
  const turntableGroup = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // Broad studio floor
  const studioFloorGeo = new THREE.CircleGeometry(36, 64);
  studioFloorGeo.rotateX(-Math.PI / 2);
  geometries.push(studioFloorGeo);
  const studioFloorMat = new THREE.MeshStandardMaterial({
    color: '#12151b',
    roughness: 0.78,
    metalness: 0.12,
  });
  materials.push(studioFloorMat);
  const studioFloor = new THREE.Mesh(studioFloorGeo, studioFloorMat);
  studioFloor.position.y = -0.03;
  studioFloor.receiveShadow = true;
  turntableGroup.add(studioFloor);

  // Turntable circular dais (y top = -0.002 so tires sit flush at y=0 without Z-fighting)
  const daisGeo = new THREE.CylinderGeometry(3.25, 3.34, 0.028, 72);
  geometries.push(daisGeo);
  const daisMat = new THREE.MeshStandardMaterial({
    map: textures.turntableMap,
    roughness: 0.42,
    metalness: 0.45,
  });
  materials.push(daisMat);
  const dais = new THREE.Mesh(daisGeo, daisMat);
  dais.position.y = -0.015;
  dais.receiveShadow = true;
  turntableGroup.add(dais);

  // Subtle brushed aluminum perimeter ring on dais
  const ringGeo = new THREE.RingGeometry(3.23, 3.26, 72);
  ringGeo.rotateX(-Math.PI / 2);
  geometries.push(ringGeo);
  const ringMat = new THREE.MeshStandardMaterial({
    color: '#64748b',
    metalness: 0.9,
    roughness: 0.25,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  materials.push(ringMat);
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.position.y = 0.001;
  turntableGroup.add(ringMesh);

  // Contact shadow grounding plane right under chassis
  const contactGeo = new THREE.PlaneGeometry(3.2, 5.4);
  contactGeo.rotateX(-Math.PI / 2);
  geometries.push(contactGeo);
  const contactMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadow,
    transparent: true,
    depthWrite: false,
    opacity: 0.72,
  });
  materials.push(contactMat);
  const contactMesh = new THREE.Mesh(contactGeo, contactMat);
  contactMesh.position.y = 0.003;
  turntableGroup.add(contactMesh);

  scene.add(turntableGroup);

  // ---------------------------------------------------------------------------
  // 4. Open-Air Proving Ground Environment (Drive Mode)
  // ---------------------------------------------------------------------------
  const provingGroundGroup = new THREE.Group();
  provingGroundGroup.visible = false;

  // Vast asphalt proving ground (offset -0.01 on Y, never Z-fights)
  const roadGeo = new THREE.PlaneGeometry(420, 420);
  roadGeo.rotateX(-Math.PI / 2);
  geometries.push(roadGeo);
  const roadMat = new THREE.MeshStandardMaterial({
    map: textures.asphaltMap,
    roughnessMap: textures.asphaltRoughness,
    roughness: 0.85,
    metalness: 0.08,
  });
  materials.push(roadMat);
  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.position.y = -0.005;
  roadMesh.receiveShadow = true;
  provingGroundGroup.add(roadMesh);

  // Sweeping Proving Ground Circuit Lanes (Ring markings + apex curbs)
  const trackRadius = 56;
  const innerLaneGeo = new THREE.RingGeometry(trackRadius - 6.5, trackRadius - 6.25, 96);
  innerLaneGeo.rotateX(-Math.PI / 2);
  const outerLaneGeo = new THREE.RingGeometry(trackRadius + 6.25, trackRadius + 6.5, 96);
  outerLaneGeo.rotateX(-Math.PI / 2);
  geometries.push(innerLaneGeo, outerLaneGeo);

  const lineMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    roughness: 0.6,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  materials.push(lineMat);

  const innerLine = new THREE.Mesh(innerLaneGeo, lineMat);
  innerLine.position.set(trackRadius, 0.004, 0);
  const outerLine = new THREE.Mesh(outerLaneGeo, lineMat);
  outerLine.position.set(trackRadius, 0.004, 0);
  provingGroundGroup.add(innerLine, outerLine);

  // Straightway launch corridor lines extending from origin
  const straightLineGeo = new THREE.PlaneGeometry(0.22, 160);
  straightLineGeo.rotateX(-Math.PI / 2);
  geometries.push(straightLineGeo);
  for (const lx of [-5.2, 5.2]) {
    const sl = new THREE.Mesh(straightLineGeo, lineMat);
    sl.position.set(lx, 0.004, 70);
    provingGroundGroup.add(sl);
  }

  // Instanced Trackside Pylons / Light Gates along the proving-ground circuit
  const pylonGeo = new THREE.BoxGeometry(0.28, 3.6, 0.28);
  geometries.push(pylonGeo);
  const pylonMat = new THREE.MeshStandardMaterial({
    color: '#334155',
    metalness: 0.65,
    roughness: 0.35,
  });
  materials.push(pylonMat);

  const pylonCount = 48;
  const pylons = new THREE.InstancedMesh(pylonGeo, pylonMat, pylonCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < pylonCount; i++) {
    const theta = (i / pylonCount) * Math.PI * 2;
    const isOuter = i % 2 === 0;
    const r = isOuter ? trackRadius + 8.5 : trackRadius - 8.5;
    dummy.position.set(trackRadius + Math.cos(theta) * r, 1.8, Math.sin(theta) * r);
    dummy.rotation.y = -theta;
    dummy.scale.set(1, 0.9 + (i % 3) * 0.12, 1);
    dummy.updateMatrix();
    pylons.setMatrixAt(i, dummy.matrix);
  }
  pylons.instanceMatrix.needsUpdate = true;
  pylons.computeBoundingSphere();
  provingGroundGroup.add(pylons);

  // Horizon mountain / terrain silhouettes around outer perimeter
  const ridgeGeo = new THREE.ConeGeometry(28, 16, 5);
  geometries.push(ridgeGeo);
  const ridgeMat = new THREE.MeshStandardMaterial({
    color: '#181c24',
    roughness: 0.95,
    metalness: 0.02,
  });
  materials.push(ridgeMat);
  const ridgeCount = 28;
  const ridges = new THREE.InstancedMesh(ridgeGeo, ridgeMat, ridgeCount);
  for (let i = 0; i < ridgeCount; i++) {
    const theta = (i / ridgeCount) * Math.PI * 2;
    const dist = 165 + (i % 4) * 14;
    dummy.position.set(Math.cos(theta) * dist, 7, Math.sin(theta) * dist);
    dummy.rotation.y = theta * 1.7;
    const s = 0.8 + (i % 3) * 0.35;
    dummy.scale.set(s * 1.6, s, s);
    dummy.updateMatrix();
    ridges.setMatrixAt(i, dummy.matrix);
  }
  ridges.instanceMatrix.needsUpdate = true;
  ridges.computeBoundingSphere();
  provingGroundGroup.add(ridges);

  scene.add(provingGroundGroup);

  let currentPreset: LightingPresetId = 'obsidian';
  let currentMode: AppMode = 'studio';

  function applyAtmosphere(): void {
    const cfg = LIGHTING_CONFIGS[currentPreset];
    scene.background = new THREE.Color(cfg.bg);
    const fogDensity = currentMode === 'drive' ? cfg.fogDensity * 0.45 : cfg.fogDensity;
    scene.fog = new THREE.FogExp2(cfg.fogColor, fogDensity);

    keyLight.color.set(cfg.keyColor);
    keyLight.intensity = cfg.keyIntensity;
    hemiLight.color.set(cfg.hemiSky);
    hemiLight.groundColor.set(cfg.hemiGround);
    hemiLight.intensity = cfg.hemiIntensity;
    rimLight.color.set(cfg.rimColor);
    rimLight.intensity = cfg.rimIntensity;
    studioFloorMat.color.set(cfg.floorColor);

    rectLights.forEach((rl, idx) => {
      rl.intensity = idx === 0 ? cfg.rectIntensity : cfg.rectIntensity * 0.62;
    });
  }

  applyAtmosphere();

  return {
    turntableGroup,
    provingGroundGroup,
    setLightingPreset: (preset: LightingPresetId) => {
      currentPreset = preset;
      applyAtmosphere();
    },
    setMode: (mode: AppMode) => {
      currentMode = mode;
      turntableGroup.visible = mode === 'studio';
      provingGroundGroup.visible = mode === 'drive';
      applyAtmosphere();
    },
    dispose: () => {
      envTex.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
