import * as THREE from 'three';
import {
  CALIPER_FINISHES,
  PAINT_FINISHES,
  WHEEL_FINISHES,
  WheelFinishId,
} from '@/src/types/car';
import { ProceduralTextures } from './textures';

export interface CarMaterialLibrary {
  bodyPaint: THREE.MeshPhysicalMaterial;
  carbon: THREE.MeshPhysicalMaterial;
  glass: THREE.MeshPhysicalMaterial;
  darkTrim: THREE.MeshStandardMaterial;
  chromeTrim: THREE.MeshStandardMaterial;
  wheelRim: THREE.MeshPhysicalMaterial;
  brakeDisc: THREE.MeshStandardMaterial;
  brakeCaliper: THREE.MeshPhysicalMaterial;
  tireRubber: THREE.MeshStandardMaterial;
  interiorLeather: THREE.MeshStandardMaterial;
  headlightEmissive: THREE.MeshStandardMaterial;
  taillightEmissive: THREE.MeshStandardMaterial;
  applyPaint: (paintId: string) => void;
  applyWheelFinish: (wheelId: WheelFinishId) => void;
  applyCaliper: (caliperId: string) => void;
  setLightsState: (headlightsOn: boolean, braking: boolean) => void;
  dispose: () => void;
}

export function createCarMaterials(
  textures: ProceduralTextures,
  isSoftwareGl: boolean
): CarMaterialLibrary {
  const initialPaint = PAINT_FINISHES[0];
  const initialWheel = WHEEL_FINISHES[0];
  const initialCaliper = CALIPER_FINISHES[0];

  const bodyPaint = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(initialPaint.hex),
    metalness: initialPaint.metalness,
    roughness: initialPaint.roughness,
    clearcoat: initialPaint.clearcoat,
    clearcoatRoughness: initialPaint.clearcoatRoughness,
    envMapIntensity: 1.35,
  });

  const carbon = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#ffffff'),
    map: textures.carbonAlbedo,
    roughnessMap: textures.carbonRoughness,
    metalness: 0.2,
    roughness: 0.4,
    clearcoat: 0.78,
    clearcoatRoughness: 0.14,
    envMapIntensity: 1.1,
  });

  const glass = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#0c121a'),
    metalness: 0.05,
    roughness: 0.05,
    transmission: isSoftwareGl ? 0 : 0.82,
    transparent: true,
    opacity: isSoftwareGl ? 0.55 : 0.96,
    ior: 1.52,
    thickness: 0.4,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    depthWrite: false,
    envMapIntensity: 1.5,
  });

  const darkTrim = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#121418'),
    metalness: 0.18,
    roughness: 0.72,
  });

  const chromeTrim = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#d4dae3'),
    metalness: 0.96,
    roughness: 0.12,
    envMapIntensity: 1.4,
  });

  const wheelRim = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(initialWheel.hex),
    metalness: initialWheel.metalness,
    roughness: initialWheel.roughness,
    anisotropy: 0.75,
    clearcoat: 0.45,
    clearcoatRoughness: 0.2,
    envMapIntensity: 1.25,
  });

  const brakeDisc = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#8a929e'),
    metalness: 0.92,
    roughness: 0.28,
    envMapIntensity: 1.1,
  });

  const brakeCaliper = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(initialCaliper.hex),
    metalness: 0.45,
    roughness: 0.25,
    clearcoat: 0.9,
    clearcoatRoughness: 0.1,
  });

  const tireRubber = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#202226'),
    map: textures.tireTread,
    metalness: 0.04,
    roughness: 0.88,
  });

  const interiorLeather = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#1b1918'),
    metalness: 0.04,
    roughness: 0.68,
  });

  const headlightEmissive = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#e8f1ff'),
    emissive: new THREE.Color('#dcebff'),
    emissiveIntensity: 3.2,
    roughness: 0.1,
    metalness: 0.1,
  });

  const taillightEmissive = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#7f1d1d'),
    emissive: new THREE.Color('#ef4444'),
    emissiveIntensity: 2.6,
    roughness: 0.15,
    metalness: 0.1,
  });

  const allMaterials: THREE.Material[] = [
    bodyPaint,
    carbon,
    glass,
    darkTrim,
    chromeTrim,
    wheelRim,
    brakeDisc,
    brakeCaliper,
    tireRubber,
    interiorLeather,
    headlightEmissive,
    taillightEmissive,
  ];

  return {
    bodyPaint,
    carbon,
    glass,
    darkTrim,
    chromeTrim,
    wheelRim,
    brakeDisc,
    brakeCaliper,
    tireRubber,
    interiorLeather,
    headlightEmissive,
    taillightEmissive,
    applyPaint: (paintId: string) => {
      const finish = PAINT_FINISHES.find((p) => p.id === paintId) ?? PAINT_FINISHES[0];
      bodyPaint.color.set(finish.hex);
      bodyPaint.metalness = finish.metalness;
      bodyPaint.roughness = finish.roughness;
      bodyPaint.clearcoat = finish.clearcoat;
      bodyPaint.clearcoatRoughness = finish.clearcoatRoughness;
      bodyPaint.needsUpdate = true;
    },
    applyWheelFinish: (wheelId: WheelFinishId) => {
      const finish = WHEEL_FINISHES.find((w) => w.id === wheelId) ?? WHEEL_FINISHES[0];
      wheelRim.color.set(finish.hex);
      wheelRim.metalness = finish.metalness;
      wheelRim.roughness = finish.roughness;
      wheelRim.needsUpdate = true;
    },
    applyCaliper: (caliperId: string) => {
      const finish = CALIPER_FINISHES.find((c) => c.id === caliperId) ?? CALIPER_FINISHES[0];
      brakeCaliper.color.set(finish.hex);
      brakeCaliper.needsUpdate = true;
    },
    setLightsState: (headlightsOn: boolean, braking: boolean) => {
      headlightEmissive.emissiveIntensity = headlightsOn ? 4.2 : 0.35;
      taillightEmissive.emissiveIntensity = braking ? 5.5 : headlightsOn ? 2.6 : 0.45;
    },
    dispose: () => {
      allMaterials.forEach((m) => m.dispose());
    },
  };
}
