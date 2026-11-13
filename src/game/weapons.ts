import * as THREE from 'three';
import { SkinId, WEAPON_SKINS, WeaponId } from '@/src/types/game';

export interface WeaponModelHandle {
  root: THREE.Group;
  magazineGroup: THREE.Group;
  boltGroup: THREE.Group;
  muzzleFlash: THREE.Group;
  muzzlePoint: THREE.Object3D;
  applySkin: (skinId: SkinId, skinMaps?: Record<SkinId, THREE.CanvasTexture | null>) => void;
  dispose: () => void;
}

function createCurvedMagGeo(geometries: THREE.BufferGeometry[]): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.028, 0);
  s.lineTo(0.028, 0);
  s.quadraticCurveTo(0.042, -0.11, 0.068, -0.21);
  s.lineTo(0.015, -0.22);
  s.quadraticCurveTo(-0.015, -0.11, -0.028, 0);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.028,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
  });
  geo.rotateY(Math.PI / 2);
  geo.translate(-0.014, 0, 0);
  geometries.push(geo);
  return geo;
}

function createPistolGripGeo(geometries: THREE.BufferGeometry[]): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.022, 0);
  s.lineTo(0.022, 0);
  s.lineTo(0.004, -0.115);
  s.lineTo(-0.038, -0.115);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.028,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
  });
  geo.rotateY(Math.PI / 2);
  geo.translate(-0.014, 0, 0);
  geometries.push(geo);
  return geo;
}

function createKarambitBladeGeo(geometries: THREE.BufferGeometry[]): THREE.ExtrudeGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.07, 0.052, 0.145, 0.012);
  s.quadraticCurveTo(0.175, -0.02, 0.195, -0.065);
  s.quadraticCurveTo(0.12, -0.012, 0.01, -0.026);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.007,
    bevelEnabled: true,
    bevelThickness: 0.0025,
    bevelSize: 0.002,
    bevelSegments: 2,
  });
  geo.rotateY(Math.PI / 2);
  geo.translate(-0.0035, 0, 0);
  geometries.push(geo);
  return geo;
}

function buildMuzzleFlash(geometries: THREE.BufferGeometry[], materials: THREE.Material[]): THREE.Group {
  const group = new THREE.Group();
  const flashMat = new THREE.MeshBasicMaterial({
    color: '#ffcf5c',
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });
  materials.push(flashMat);

  const coneGeo = new THREE.ConeGeometry(0.032, 0.14, 6);
  coneGeo.rotateX(Math.PI / 2);
  geometries.push(coneGeo);

  const starGeo = new THREE.BoxGeometry(0.14, 0.025, 0.015);
  geometries.push(starGeo);

  const core = new THREE.Mesh(coneGeo, flashMat);
  core.position.z = 0.07;
  group.add(core);

  for (let i = 0; i < 3; i++) {
    const fin = new THREE.Mesh(starGeo, flashMat);
    fin.rotation.z = (i / 3) * Math.PI;
    fin.position.z = 0.02;
    group.add(fin);
  }
  group.visible = false;
  return group;
}

export function buildWeaponModel(
  weaponId: WeaponId,
  skinId: SkinId = 'default',
  skinMaps?: Record<SkinId, THREE.CanvasTexture | null>
): WeaponModelHandle {
  const root = new THREE.Group();
  const magazineGroup = new THREE.Group();
  const boltGroup = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const skin = WEAPON_SKINS.find((s) => s.id === skinId) ?? WEAPON_SKINS[0];
  const initialMap = skinMaps?.[skinId] ?? null;

  const primaryMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(initialMap ? '#ffffff' : skin.primaryHex),
    map: initialMap,
    metalness: skin.metalness,
    roughness: skin.roughness,
    clearcoat: 0.65,
    clearcoatRoughness: 0.18,
  });

  const secondaryMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(skin.secondaryHex),
    metalness: 0.5,
    roughness: 0.38,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(skin.accentHex),
    metalness: 0.8,
    roughness: 0.22,
  });

  const gunmetalMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#1d2128'),
    metalness: 0.9,
    roughness: 0.26,
  });

  const polymerMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#14161a'),
    metalness: 0.12,
    roughness: 0.76,
  });

  const woodMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#6b3f23'),
    metalness: 0.05,
    roughness: 0.56,
  });

  const opticGlassMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#1d4ed8'),
    metalness: 0.15,
    roughness: 0.04,
    clearcoat: 1.0,
    envMapIntensity: 1.9,
  });

  materials.push(
    primaryMat,
    secondaryMat,
    accentMat,
    gunmetalMat,
    polymerMat,
    woodMat,
    opticGlassMat
  );

  const muzzleFlash = buildMuzzleFlash(geometries, materials);
  const muzzlePoint = new THREE.Object3D();

  const addBox = (
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    rx = 0
  ) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    geometries.push(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.x = rx;
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const addCyl = (
    parent: THREE.Object3D,
    rTop: number,
    rBot: number,
    len: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material
  ) => {
    const geo = new THREE.CylinderGeometry(rTop, rBot, len, 18);
    geo.rotateX(Math.PI / 2);
    geometries.push(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const addTriggerAssembly = (y: number, z: number) => {
    addBox(root, 0.012, 0.008, 0.055, 0, y - 0.024, z, gunmetalMat);
    addBox(root, 0.012, 0.026, 0.008, 0, y - 0.012, z + 0.026, gunmetalMat);
    addBox(root, 0.006, 0.020, 0.008, 0, y - 0.008, z - 0.003, accentMat, 0.25);
  };

  if (weaponId === 'ak47') {
    addBox(root, 0.048, 0.068, 0.34, 0, 0, 0, primaryMat);
    addBox(root, 0.044, 0.026, 0.28, 0, 0.042, -0.02, secondaryMat);
    // Rear sight leaf + selector lever
    addBox(root, 0.020, 0.016, 0.04, 0, 0.058, 0.10, gunmetalMat);
    addBox(root, 0.006, 0.014, 0.09, -0.028, 0.012, -0.03, accentMat);

    const stockMat = skinId === 'default' ? woodMat : secondaryMat;
    addBox(root, 0.038, 0.088, 0.24, 0, -0.024, -0.28, stockMat, 0.14);
    addBox(root, 0.042, 0.096, 0.022, 0, -0.036, -0.40, polymerMat, 0.14);

    const grip = new THREE.Mesh(createPistolGripGeo(geometries), polymerMat);
    grip.position.set(0, -0.032, -0.10);
    root.add(grip);
    addTriggerAssembly(-0.034, -0.045);

    const hgMat = skinId === 'default' ? woodMat : primaryMat;
    addBox(root, 0.054, 0.058, 0.24, 0, -0.002, 0.28, hgMat);
    addCyl(root, 0.012, 0.012, 0.24, 0, 0.034, 0.28, gunmetalMat);
    // Barrel + Under-barrel cleaning rod + Front Sight Hood + Slant Brake
    addCyl(root, 0.011, 0.013, 0.44, 0, 0.008, 0.48, gunmetalMat);
    addCyl(root, 0.004, 0.004, 0.38, 0, -0.014, 0.46, gunmetalMat);
    addBox(root, 0.012, 0.048, 0.024, 0, 0.032, 0.62, gunmetalMat);
    addCyl(root, 0.016, 0.014, 0.042, 0, 0.008, 0.70, accentMat);

    const mag = new THREE.Mesh(createCurvedMagGeo(geometries), secondaryMat);
    mag.position.set(0, -0.03, 0.09);
    magazineGroup.add(mag);
    root.add(magazineGroup);

    addBox(boltGroup, 0.018, 0.022, 0.075, -0.026, 0.025, 0.04, accentMat);
    addBox(boltGroup, 0.028, 0.012, 0.016, -0.038, 0.025, 0.06, accentMat);
    root.add(boltGroup);

    muzzlePoint.position.set(0, 0.008, 0.73);
  } else if (weaponId === 'm4a1s') {
    addBox(root, 0.046, 0.072, 0.31, 0, 0, 0, primaryMat);
    addBox(root, 0.024, 0.014, 0.48, 0, 0.044, 0.09, gunmetalMat);
    addCyl(root, 0.018, 0.018, 0.24, 0, 0.005, -0.26, gunmetalMat);
    addBox(root, 0.040, 0.095, 0.14, 0, -0.018, -0.34, secondaryMat);

    const grip = new THREE.Mesh(createPistolGripGeo(geometries), polymerMat);
    grip.position.set(0, -0.034, -0.09);
    root.add(grip);
    addTriggerAssembly(-0.036, -0.038);

    // Quad-Rail Handguard + Vertical Tactical Foregrip + PEQ Laser Box
    addBox(root, 0.054, 0.054, 0.25, 0, 0.006, 0.27, secondaryMat);
    addCyl(root, 0.014, 0.013, 0.09, 0, -0.062, 0.27, polymerMat);
    // Rotate foregrip upright
    const fg = root.children[root.children.length - 1];
    fg.rotation.x = Math.PI / 2;
    addBox(root, 0.024, 0.022, 0.075, 0.034, 0.018, 0.31, polymerMat);

    // Barrel + Long Matte Suppressor
    addCyl(root, 0.011, 0.011, 0.16, 0, 0.012, 0.44, gunmetalMat);
    addCyl(root, 0.023, 0.023, 0.24, 0, 0.012, 0.62, polymerMat);
    addCyl(root, 0.024, 0.024, 0.02, 0, 0.012, 0.51, accentMat);
    // Holographic Optic
    addBox(root, 0.034, 0.038, 0.078, 0, 0.068, 0.02, gunmetalMat);
    addBox(root, 0.026, 0.024, 0.008, 0, 0.070, 0.060, opticGlassMat);

    addBox(magazineGroup, 0.026, 0.165, 0.065, 0, -0.105, 0.08, secondaryMat, 0.12);
    addBox(magazineGroup, 0.030, 0.016, 0.068, 0, -0.185, 0.09, polymerMat, 0.12);
    root.add(magazineGroup);

    addBox(boltGroup, 0.012, 0.020, 0.065, -0.022, 0.018, 0.03, accentMat);
    root.add(boltGroup);

    muzzlePoint.position.set(0, 0.012, 0.75);
  } else if (weaponId === 'awp') {
    addBox(root, 0.056, 0.078, 0.40, 0, -0.004, 0, primaryMat);
    addBox(root, 0.044, 0.098, 0.28, 0, -0.024, -0.32, primaryMat);
    addBox(root, 0.046, 0.034, 0.11, 0, 0.034, -0.28, polymerMat);
    const grip = new THREE.Mesh(createPistolGripGeo(geometries), polymerMat);
    grip.position.set(0, -0.04, -0.11);
    root.add(grip);
    addTriggerAssembly(-0.042, -0.05);

    addCyl(root, 0.015, 0.018, 0.62, 0, 0.016, 0.48, gunmetalMat);
    addBox(root, 0.038, 0.030, 0.068, 0, 0.016, 0.80, accentMat);
    // Folded Bipod with rubber feet
    addCyl(root, 0.008, 0.008, 0.18, 0.028, -0.045, 0.34, gunmetalMat);
    addCyl(root, 0.008, 0.008, 0.18, -0.028, -0.045, 0.34, gunmetalMat);
    // Scope + Sunshade + Windage/Elevation Turrets + Lenses
    addCyl(root, 0.020, 0.020, 0.28, 0, 0.076, 0.04, secondaryMat);
    addCyl(root, 0.028, 0.022, 0.075, 0, 0.076, 0.19, secondaryMat);
    addCyl(root, 0.024, 0.020, 0.06, 0, 0.076, -0.10, secondaryMat);
    addCyl(root, 0.024, 0.024, 0.01, 0, 0.076, 0.228, opticGlassMat);
    addCyl(root, 0.018, 0.018, 0.01, 0, 0.076, -0.132, opticGlassMat);
    // Turrets
    addBox(root, 0.018, 0.016, 0.018, 0, 0.10, 0.04, accentMat);
    addBox(root, 0.018, 0.018, 0.018, -0.026, 0.076, 0.04, accentMat);
    addBox(root, 0.018, 0.032, 0.022, 0, 0.048, -0.02, gunmetalMat);
    addBox(root, 0.018, 0.032, 0.022, 0, 0.048, 0.10, gunmetalMat);

    addBox(magazineGroup, 0.030, 0.10, 0.095, 0, -0.078, 0.06, secondaryMat);
    root.add(magazineGroup);

    addCyl(boltGroup, 0.008, 0.008, 0.07, -0.015, 0.026, -0.02, accentMat);
    addBox(boltGroup, 0.035, 0.014, 0.014, -0.036, 0.022, -0.03, accentMat);
    root.add(boltGroup);

    muzzlePoint.position.set(0, 0.016, 0.84);
  } else if (weaponId === 'deagle') {
    addBox(root, 0.036, 0.032, 0.22, 0, 0.002, 0.05, gunmetalMat);
    addBox(root, 0.024, 0.012, 0.08, 0, -0.016, 0.11, gunmetalMat);
    const grip = new THREE.Mesh(createPistolGripGeo(geometries), polymerMat);
    grip.position.set(0, -0.018, -0.035);
    root.add(grip);
    addTriggerAssembly(-0.014, 0.012);

    addBox(boltGroup, 0.038, 0.038, 0.23, 0, 0.034, 0.05, primaryMat);
    addBox(boltGroup, 0.012, 0.010, 0.016, 0, 0.057, 0.14, accentMat);
    addBox(boltGroup, 0.016, 0.010, 0.014, 0, 0.057, -0.05, accentMat);
    root.add(boltGroup);

    addBox(magazineGroup, 0.024, 0.10, 0.034, 0, -0.068, -0.042, secondaryMat, -0.25);
    root.add(magazineGroup);

    muzzlePoint.position.set(0, 0.032, 0.18);
  } else {
    const ringGeo = new THREE.TorusGeometry(0.021, 0.0065, 12, 24);
    ringGeo.rotateY(Math.PI / 2);
    geometries.push(ringGeo);
    const ring = new THREE.Mesh(ringGeo, accentMat);
    ring.position.set(0, -0.015, -0.075);
    root.add(ring);

    addBox(root, 0.022, 0.030, 0.105, 0, -0.005, -0.01, polymerMat);
    addBox(root, 0.024, 0.036, 0.018, 0, 0.002, 0.042, accentMat);
    const blade = new THREE.Mesh(createKarambitBladeGeo(geometries), primaryMat);
    blade.position.set(0, 0.008, 0.04);
    root.add(blade);

    muzzlePoint.position.set(0, 0, 0.22);
  }

  muzzleFlash.position.copy(muzzlePoint.position);
  root.add(muzzlePoint);
  root.add(muzzleFlash);

  const applySkin = (
    nextSkinId: SkinId,
    nextSkinMaps?: Record<SkinId, THREE.CanvasTexture | null>
  ) => {
    const nextSkin = WEAPON_SKINS.find((s) => s.id === nextSkinId) ?? WEAPON_SKINS[0];
    const mapTex = nextSkinMaps?.[nextSkinId] ?? null;
    primaryMat.map = mapTex;
    primaryMat.color.set(mapTex ? '#ffffff' : nextSkin.primaryHex);
    primaryMat.metalness = nextSkin.metalness;
    primaryMat.roughness = nextSkin.roughness;
    secondaryMat.color.set(nextSkin.secondaryHex);
    accentMat.color.set(nextSkin.accentHex);
    primaryMat.needsUpdate = true;
    secondaryMat.needsUpdate = true;
    accentMat.needsUpdate = true;
  };

  return {
    root,
    magazineGroup,
    boltGroup,
    muzzleFlash,
    muzzlePoint,
    applySkin,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
