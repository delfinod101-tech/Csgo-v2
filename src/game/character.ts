import * as THREE from 'three';
import { SkinId, TeamSide, WeaponId } from '@/src/types/game';
import { buildWeaponModel, WeaponModelHandle } from './weapons';

export interface CharacterRig {
  root: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  rightArm: THREE.Group;
  leftArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  weaponMount: THREE.Group;
  headHitbox: THREE.Mesh;
  bodyHitbox: THREE.Mesh;
  weaponHandle: WeaponModelHandle | null;
  setTeam: (team: TeamSide) => void;
  setWeapon: (
    weaponId: WeaponId,
    skinId: SkinId,
    skinMaps?: Record<SkinId, THREE.CanvasTexture | null>
  ) => void;
  setSkin: (skinId: SkinId, skinMaps?: Record<SkinId, THREE.CanvasTexture | null>) => void;
  updateLobbyIdle: (time: number, inspectPhase: number) => void;
  updateCombatPose: (
    time: number,
    moveSpeedRatio: number,
    recoilFlash: number,
    isDead: boolean,
    deathProgress: number,
    hitFlash: number
  ) => void;
  dispose: () => void;
}

export function buildCharacterRig(
  initialTeam: TeamSide,
  options: { includeHitboxes?: boolean; entityId?: string } = {}
): CharacterRig {
  const root = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const uniformMat = new THREE.MeshStandardMaterial({
    color: initialTeam === 'ct' ? '#1e334d' : '#7c6548',
    roughness: 0.78,
    metalness: 0.08,
  });

  const vestMat = new THREE.MeshStandardMaterial({
    color: initialTeam === 'ct' ? '#151c26' : '#3a3428',
    roughness: 0.62,
    metalness: 0.24,
  });

  const gearMat = new THREE.MeshStandardMaterial({
    color: '#17191d',
    roughness: 0.68,
    metalness: 0.28,
  });

  const accentPatchMat = new THREE.MeshStandardMaterial({
    color: initialTeam === 'ct' ? '#38bdf8' : '#f59e0b',
    roughness: 0.45,
    metalness: 0.4,
  });

  const visorMat = new THREE.MeshPhysicalMaterial({
    color: initialTeam === 'ct' ? '#0f172a' : '#78350f',
    metalness: 0.35,
    roughness: 0.1,
    clearcoat: 1.0,
    envMapIntensity: 1.75,
  });

  const skinMat = new THREE.MeshStandardMaterial({
    color: '#c69977',
    roughness: 0.72,
    metalness: 0.02,
  });

  materials.push(uniformMat, vestMat, gearMat, accentPatchMat, visorMat, skinMat);

  const addLimbBox = (
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material
  ) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    geometries.push(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // Hierarchical Pivots
  const hips = new THREE.Group();
  hips.position.set(0, 0.92, 0);
  root.add(hips);

  addLimbBox(hips, 0.36, 0.16, 0.22, 0, 0.02, 0, uniformMat);
  addLimbBox(hips, 0.39, 0.065, 0.25, 0, 0.08, 0, gearMat);
  // Hip drop-leg holster
  addLimbBox(hips, 0.05, 0.16, 0.11, -0.20, -0.08, 0.02, gearMat);

  // Torso
  const torso = new THREE.Group();
  torso.position.set(0, 0.10, 0);
  hips.add(torso);

  addLimbBox(torso, 0.40, 0.48, 0.24, 0, 0.24, 0, uniformMat);
  addLimbBox(torso, 0.43, 0.37, 0.29, 0, 0.26, 0, vestMat);
  // Ballistic Collar & Back Spine Pack
  addLimbBox(torso, 0.26, 0.07, 0.20, 0, 0.46, -0.02, vestMat);
  addLimbBox(torso, 0.26, 0.30, 0.08, 0, 0.27, -0.17, gearMat);

  // Front magazine pouches + Radio & Whip Antenna
  for (const px of [-0.11, 0, 0.11]) {
    addLimbBox(torso, 0.072, 0.135, 0.055, px, 0.20, 0.155, gearMat);
  }
  addLimbBox(torso, 0.055, 0.11, 0.045, 0.15, 0.36, 0.145, gearMat);
  addLimbBox(torso, 0.01, 0.18, 0.01, 0.16, 0.48, 0.145, gearMat);

  // Shoulder pads + Tactical Unit Patch
  addLimbBox(torso, 0.14, 0.11, 0.24, 0.24, 0.43, 0, vestMat);
  addLimbBox(torso, 0.14, 0.11, 0.24, -0.24, 0.43, 0, vestMat);
  addLimbBox(torso, 0.02, 0.05, 0.07, 0.315, 0.43, 0, accentPatchMat);
  addLimbBox(torso, 0.02, 0.05, 0.07, -0.315, 0.43, 0, accentPatchMat);

  // Head + Ballistic Helmet / NVG Shroud / Visor / Comms Boom Mic
  const head = new THREE.Group();
  head.position.set(0, 0.52, 0);
  torso.add(head);

  const headGeo = new THREE.SphereGeometry(0.125, 18, 16);
  geometries.push(headGeo);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.set(0, 0.13, 0);
  headMesh.castShadow = true;
  head.add(headMesh);

  addLimbBox(head, 0.195, 0.145, 0.205, 0, 0.08, 0.01, gearMat);

  const helmetGeo = new THREE.SphereGeometry(0.144, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62);
  geometries.push(helmetGeo);
  const helmetMesh = new THREE.Mesh(helmetGeo, vestMat);
  helmetMesh.position.set(0, 0.145, -0.005);
  helmetMesh.castShadow = true;
  head.add(helmetMesh);

  // Helmet NVG front shroud + side rails
  const nvgMount = addLimbBox(head, 0.05, 0.055, 0.03, 0, 0.21, 0.135, gearMat);
  // Visor & Earpro Headset + Boom Mic
  addLimbBox(head, 0.215, 0.065, 0.105, 0, 0.145, 0.105, visorMat);
  addLimbBox(head, 0.042, 0.085, 0.085, 0.142, 0.13, 0, gearMat);
  addLimbBox(head, 0.042, 0.085, 0.085, -0.142, 0.13, 0, gearMat);
  addLimbBox(head, 0.014, 0.014, 0.11, 0.135, 0.09, 0.07, gearMat);

  // Articulated Arms + Elbow Pads + Gloves
  const rightArm = new THREE.Group();
  rightArm.position.set(-0.26, 0.42, 0);
  torso.add(rightArm);
  addLimbBox(rightArm, 0.115, 0.26, 0.115, 0, -0.13, 0, uniformMat);
  addLimbBox(rightArm, 0.12, 0.075, 0.125, 0, -0.25, 0.02, gearMat); // elbow pad
  addLimbBox(rightArm, 0.098, 0.25, 0.098, 0, -0.35, 0.08, uniformMat);
  addLimbBox(rightArm, 0.095, 0.095, 0.105, 0, -0.47, 0.13, gearMat);

  const leftArm = new THREE.Group();
  leftArm.position.set(0.26, 0.42, 0);
  torso.add(leftArm);
  addLimbBox(leftArm, 0.115, 0.26, 0.115, 0, -0.13, 0, uniformMat);
  addLimbBox(leftArm, 0.12, 0.075, 0.125, 0, -0.25, 0.02, gearMat);
  addLimbBox(leftArm, 0.098, 0.25, 0.098, 0, -0.35, 0.08, uniformMat);
  addLimbBox(leftArm, 0.095, 0.095, 0.105, 0, -0.47, 0.13, gearMat);

  const weaponMount = new THREE.Group();
  weaponMount.position.set(-0.14, 0.24, 0.25);
  torso.add(weaponMount);

  // Legs + Knee Pads + Combat Boots with Soles
  const leftLeg = new THREE.Group();
  leftLeg.position.set(0.11, 0, 0);
  hips.add(leftLeg);
  addLimbBox(leftLeg, 0.155, 0.42, 0.165, 0, -0.22, 0, uniformMat);
  addLimbBox(leftLeg, 0.15, 0.105, 0.18, 0, -0.44, 0.02, gearMat);
  addLimbBox(leftLeg, 0.135, 0.37, 0.145, 0, -0.64, 0, uniformMat);
  addLimbBox(leftLeg, 0.15, 0.10, 0.23, 0, -0.84, 0.035, gearMat);
  addLimbBox(leftLeg, 0.16, 0.03, 0.25, 0, -0.905, 0.04, vestMat);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(-0.11, 0, 0);
  hips.add(rightLeg);
  addLimbBox(rightLeg, 0.155, 0.42, 0.165, 0, -0.22, 0, uniformMat);
  addLimbBox(rightLeg, 0.15, 0.105, 0.18, 0, -0.44, 0.02, gearMat);
  addLimbBox(rightLeg, 0.135, 0.37, 0.145, 0, -0.64, 0, uniformMat);
  addLimbBox(rightLeg, 0.15, 0.10, 0.23, 0, -0.84, 0.035, gearMat);
  addLimbBox(rightLeg, 0.16, 0.03, 0.25, 0, -0.905, 0.04, vestMat);

  // Invisible Hitboxes
  const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
  materials.push(hitboxMat);

  const headHitGeo = new THREE.SphereGeometry(0.18, 10, 10);
  const bodyHitGeo = new THREE.BoxGeometry(0.56, 1.32, 0.42);
  geometries.push(headHitGeo, bodyHitGeo);

  const headHitbox = new THREE.Mesh(headHitGeo, hitboxMat);
  headHitbox.position.set(0, 1.56, 0);
  headHitbox.userData.hitZone = 'head';
  headHitbox.userData.entityId = options.entityId;

  const bodyHitbox = new THREE.Mesh(bodyHitGeo, hitboxMat);
  bodyHitbox.position.set(0, 0.78, 0);
  bodyHitbox.userData.hitZone = 'body';
  bodyHitbox.userData.entityId = options.entityId;

  if (options.includeHitboxes) {
    root.add(headHitbox, bodyHitbox);
  }

  let weaponHandle: WeaponModelHandle | null = null;
  let currentWeaponId: WeaponId = 'ak47';

  const setTeam = (team: TeamSide) => {
    uniformMat.color.set(team === 'ct' ? '#1e3a5f' : '#856b49');
    vestMat.color.set(team === 'ct' ? '#141c27' : '#3a3326');
    visorMat.color.set(team === 'ct' ? '#1e40af' : '#9a3412');
    accentPatchMat.color.set(team === 'ct' ? '#38bdf8' : '#f59e0b');
    helmetMesh.visible = team === 'ct';
    nvgMount.visible = team === 'ct';
  };

  const setWeapon = (
    weaponId: WeaponId,
    skinId: SkinId,
    skinMaps?: Record<SkinId, THREE.CanvasTexture | null>
  ) => {
    currentWeaponId = weaponId;
    if (weaponHandle) {
      weaponMount.remove(weaponHandle.root);
      weaponHandle.dispose();
    }
    weaponHandle = buildWeaponModel(weaponId, skinId, skinMaps);
    weaponMount.add(weaponHandle.root);
  };

  const setSkin = (skinId: SkinId, skinMaps?: Record<SkinId, THREE.CanvasTexture | null>) => {
    weaponHandle?.applySkin(skinId, skinMaps);
  };

  setTeam(initialTeam);

  const updateLobbyIdle = (time: number, inspectPhase: number) => {
    const breath = Math.sin(time * 1.85);
    const sway = Math.sin(time * 0.9);

    hips.position.y = 0.92 + breath * 0.008;
    hips.rotation.y = -0.18 + sway * 0.03;

    torso.rotation.x = 0.03 + breath * 0.015;
    torso.rotation.y = 0.16 + sway * 0.025;

    head.rotation.y = -0.05 + Math.sin(time * 0.65) * 0.08;
    head.rotation.x = 0.02 + breath * 0.015;

    if (currentWeaponId === 'knife') {
      rightArm.rotation.set(-0.65, 0.15, -0.15);
      leftArm.rotation.set(-0.25, -0.1, 0.12);
      weaponMount.position.set(-0.24, 0.18, 0.24);
      weaponMount.rotation.set(0.25, -0.3, 0.4);
    } else if (currentWeaponId === 'deagle') {
      rightArm.rotation.set(-0.95, 0.12, -0.08);
      leftArm.rotation.set(-0.85, -0.35, 0.12);
      weaponMount.position.set(-0.14, 0.28, 0.34);
      weaponMount.rotation.set(0.08, -0.15 + inspectPhase * 0.5, inspectPhase * 0.4);
    } else {
      rightArm.rotation.set(-0.82 - inspectPhase * 0.2, 0.22, -0.15);
      leftArm.rotation.set(-0.92 - inspectPhase * 0.2, -0.52, 0.24);
      weaponMount.position.set(-0.08, 0.20 + inspectPhase * 0.08, 0.24 + inspectPhase * 0.05);
      weaponMount.rotation.set(
        0.18 - inspectPhase * 0.35,
        0.65 - inspectPhase * 0.9,
        -0.12 + inspectPhase * 0.25
      );
    }

    leftLeg.rotation.set(-0.08, 0.08, 0.04);
    rightLeg.rotation.set(0.08, -0.05, -0.04);
  };

  const updateCombatPose = (
    time: number,
    moveSpeedRatio: number,
    recoilFlash: number,
    isDead: boolean,
    deathProgress: number,
    hitFlash: number
  ) => {
    if (isDead) {
      const p = Math.min(deathProgress, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      hips.position.y = THREE.MathUtils.lerp(0.92, 0.16, eased);
      hips.rotation.x = THREE.MathUtils.lerp(0, -Math.PI / 2 + 0.08, eased);
      hips.rotation.z = THREE.MathUtils.lerp(0, 0.28, eased);
      leftArm.rotation.x = -0.3 - eased * 0.8;
      rightArm.rotation.x = -0.3 - eased * 0.9;
      return;
    }

    hips.rotation.x = 0;
    hips.rotation.z = 0;

    const stride = Math.sin(time * 9.5) * moveSpeedRatio;
    hips.position.y = 0.92 + Math.abs(Math.sin(time * 9.5)) * 0.035 * moveSpeedRatio;
    hips.rotation.y = 0;

    leftLeg.rotation.set(stride * 0.55, 0, 0);
    rightLeg.rotation.set(-stride * 0.55, 0, 0);

    const flinch = hitFlash * 0.18;
    torso.rotation.set(0.04 - flinch, 0, 0);
    head.rotation.set(-flinch * 1.4, 0, 0);

    rightArm.rotation.set(-1.38 - recoilFlash * 0.22, 0.12, 0);
    leftArm.rotation.set(-1.32 - recoilFlash * 0.22, -0.42, 0);

    weaponMount.position.set(-0.14, 0.28, 0.30 - recoilFlash * 0.05);
    weaponMount.rotation.set(-recoilFlash * 0.25, 0, 0);

    if (weaponHandle) {
      weaponHandle.muzzleFlash.visible = recoilFlash > 0.45;
      weaponHandle.muzzleFlash.rotation.z = time * 40;
    }

    if (hitFlash > 0.01) {
      uniformMat.emissive.setRGB(hitFlash * 0.65, 0, 0);
    } else {
      uniformMat.emissive.setRGB(0, 0, 0);
    }
  };

  return {
    root,
    hips,
    torso,
    head,
    rightArm,
    leftArm,
    leftLeg,
    rightLeg,
    weaponMount,
    headHitbox,
    bodyHitbox,
    weaponHandle,
    setTeam,
    setWeapon,
    setSkin,
    updateLobbyIdle,
    updateCombatPose,
    dispose: () => {
      weaponHandle?.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
