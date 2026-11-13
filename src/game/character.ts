import * as THREE from 'three';
import { SkinId, TeamSide, WeaponId } from '@/src/types/game';
import { buildWeaponModel, WeaponModelHandle } from './weapons';

export interface CharacterRig {
  root: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  rightArm: THREE.Group;
  rightForearm: THREE.Group;
  leftArm: THREE.Group;
  leftForearm: THREE.Group;
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

function createVoxelFaceTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Base warm tan skin matching reference sheet
    ctx.fillStyle = '#c89b7b';
    ctx.fillRect(0, 0, 64, 64);

    // Subtle skin shading along bottom chin
    ctx.fillStyle = '#bd8f6f';
    ctx.fillRect(0, 58, 64, 6);

    // Side-swept dark hair bangs pixel pattern on forehead
    ctx.fillStyle = '#2d2320';
    ctx.fillRect(0, 0, 64, 10);
    ctx.fillRect(0, 10, 12, 8);
    ctx.fillRect(0, 18, 6, 8);
    ctx.fillRect(12, 10, 6, 4);
    ctx.fillRect(46, 10, 18, 12);
    ctx.fillRect(52, 22, 12, 10);
    ctx.fillRect(58, 32, 6, 6);

    // Eyebrows
    ctx.fillStyle = '#211916';
    ctx.fillRect(14, 23, 11, 4);
    ctx.fillRect(39, 23, 11, 4);

    // Pixel eyes
    ctx.fillStyle = '#0e0e11';
    ctx.fillRect(15, 29, 7, 7);
    ctx.fillRect(42, 29, 7, 7);
    // Crisp eye highlights
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(15, 29, 2, 2);
    ctx.fillRect(42, 29, 2, 2);

    // Subtle cheek blush squares
    ctx.fillStyle = '#b98368';
    ctx.fillRect(10, 38, 8, 7);
    ctx.fillRect(46, 38, 8, 7);

    // Clean coral/peach mouth
    ctx.fillStyle = '#c8776e';
    ctx.fillRect(26, 48, 12, 3);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

const UPPER_ARM_LEN = 0.19;
const FOREARM_HAND_LEN = 0.31;

// Reusable scratch math objects for 2-bone arm IK solver
const _s = new THREE.Vector3();
const _t = new THREE.Vector3();
const _toT = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _perp = new THREE.Vector3();
const _elbow = new THREE.Vector3();
const _armY = new THREE.Vector3();
const _armX = new THREE.Vector3();
const _armZ = new THREE.Vector3();
const _fwdHint = new THREE.Vector3(0, 0, 1);
const _altHint = new THREE.Vector3(1, 0, 0);
const _basis = new THREE.Matrix4();
const _invQuat = new THREE.Quaternion();
const _foreDir = new THREE.Vector3();
const _worldGrip = new THREE.Vector3();
const _torsoInv = new THREE.Matrix4();
const _targetInTorso = new THREE.Vector3();
const _pole = new THREE.Vector3();

function setLimbQuatFromDownDir(
  quat: THREE.Quaternion,
  downDir: THREE.Vector3,
  hintDir: THREE.Vector3
) {
  _armY.copy(downDir).negate().normalize();
  const useHint = Math.abs(_armY.dot(hintDir)) > 0.94 ? _altHint : hintDir;
  _armX.crossVectors(_armY, useHint);
  if (_armX.lengthSq() < 1e-6) {
    _armX.set(1, 0, 0);
  } else {
    _armX.normalize();
  }
  _armZ.crossVectors(_armX, _armY).normalize();
  _armX.crossVectors(_armY, _armZ).normalize();
  _basis.makeBasis(_armX, _armY, _armZ);
  quat.setFromRotationMatrix(_basis);
}

function solveTwoBoneArm(
  upperArm: THREE.Group,
  forearm: THREE.Group,
  targetInTorso: THREE.Vector3,
  poleDir: THREE.Vector3
) {
  _s.copy(upperArm.position);
  _t.copy(targetInTorso);
  _toT.subVectors(_t, _s);
  const rawDist = _toT.length();
  const minDist = Math.abs(FOREARM_HAND_LEN - UPPER_ARM_LEN) + 0.02;
  const maxDist = UPPER_ARM_LEN + FOREARM_HAND_LEN - 0.005;
  const dist = THREE.MathUtils.clamp(rawDist, minDist, maxDist);

  if (rawDist < 1e-5) {
    _dir.set(0, -1, 0);
  } else {
    _dir.copy(_toT).divideScalar(rawDist);
  }

  const cosAlpha = THREE.MathUtils.clamp(
    (UPPER_ARM_LEN * UPPER_ARM_LEN + dist * dist - FOREARM_HAND_LEN * FOREARM_HAND_LEN) /
      (2 * UPPER_ARM_LEN * dist),
    -1,
    1
  );
  const sinAlpha = Math.sqrt(Math.max(0, 1 - cosAlpha * cosAlpha));

  _perp.copy(poleDir).addScaledVector(_dir, -poleDir.dot(_dir));
  if (_perp.lengthSq() < 1e-5) {
    _perp.set(1, 0, 0).addScaledVector(_dir, -_dir.x);
  }
  _perp.normalize();

  _elbow
    .copy(_s)
    .addScaledVector(_dir, UPPER_ARM_LEN * cosAlpha)
    .addScaledVector(_perp, UPPER_ARM_LEN * sinAlpha);

  // Upper arm points from S -> E
  _foreDir.subVectors(_elbow, _s).normalize();
  setLimbQuatFromDownDir(upperArm.quaternion, _foreDir, _fwdHint);

  // Forearm points from E -> T (computed in upperArm's local space)
  _foreDir.subVectors(_t, _elbow);
  if (_foreDir.lengthSq() < 1e-6) {
    _foreDir.copy(_dir);
  } else {
    _foreDir.normalize();
  }
  _invQuat.copy(upperArm.quaternion).invert();
  _foreDir.applyQuaternion(_invQuat);
  setLimbQuatFromDownDir(forearm.quaternion, _foreDir, _fwdHint);
}

export function buildCharacterRig(
  initialTeam: TeamSide,
  options: { includeHitboxes?: boolean; entityId?: string } = {}
): CharacterRig {
  const root = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const faceTex = createVoxelFaceTexture();
  textures.push(faceTex);

  const shirtMat = new THREE.MeshStandardMaterial({
    color: initialTeam === 'ct' ? '#0c4da2' : '#9c3728',
    roughness: 0.78,
    metalness: 0.04,
  });

  const shirtDetailMat = new THREE.MeshStandardMaterial({
    color: initialTeam === 'ct' ? '#093d84' : '#7d2a1e',
    roughness: 0.82,
    metalness: 0.04,
  });

  const pantsMat = new THREE.MeshStandardMaterial({
    color: initialTeam === 'ct' ? '#1e232c' : '#262320',
    roughness: 0.85,
    metalness: 0.05,
  });

  const bootsMat = new THREE.MeshStandardMaterial({
    color: '#11141a',
    roughness: 0.72,
    metalness: 0.12,
  });

  const skinMat = new THREE.MeshStandardMaterial({
    color: '#c89b7b',
    roughness: 0.74,
    metalness: 0.02,
  });

  const faceMat = new THREE.MeshStandardMaterial({
    map: faceTex,
    roughness: 0.74,
    metalness: 0.02,
  });

  const hairMat = new THREE.MeshStandardMaterial({
    color: '#2d2320',
    roughness: 0.88,
    metalness: 0.02,
  });

  const watchMat = new THREE.MeshStandardMaterial({
    color: initialTeam === 'ct' ? '#38bdf8' : '#f59e0b',
    roughness: 0.45,
    metalness: 0.35,
  });

  materials.push(
    shirtMat,
    shirtDetailMat,
    pantsMat,
    bootsMat,
    skinMat,
    faceMat,
    hairMat,
    watchMat
  );

  const addBox = (
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material | THREE.Material[]
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

  // Hierarchical Pivots (Voxel Character proportions matching turnaround reference)
  const hips = new THREE.Group();
  hips.position.set(0, 0.62, 0);
  root.add(hips);

  // Waistline / belt trim
  addBox(hips, 0.41, 0.055, 0.23, 0, 0.02, 0, pantsMat);

  // Torso (Blue / Team Collared Short-Sleeve Shirt)
  const torso = new THREE.Group();
  torso.position.set(0, 0.04, 0);
  hips.add(torso);

  // Main shirt block
  addBox(torso, 0.41, 0.54, 0.23, 0, 0.27, 0, shirtMat);
  // Center vertical button placket (front)
  addBox(torso, 0.055, 0.49, 0.012, 0, 0.245, 0.118, shirtDetailMat);
  // Dual front chest pockets + pocket flaps
  addBox(torso, 0.105, 0.115, 0.012, -0.115, 0.34, 0.118, shirtDetailMat);
  addBox(torso, 0.105, 0.115, 0.012, 0.115, 0.34, 0.118, shirtDetailMat);
  addBox(torso, 0.112, 0.032, 0.016, -0.115, 0.39, 0.120, shirtMat);
  addBox(torso, 0.112, 0.032, 0.016, 0.115, 0.39, 0.120, shirtMat);
  // Neck V-collar skin inlay + folded collar rim
  addBox(torso, 0.155, 0.055, 0.015, 0, 0.515, 0.112, skinMat);
  addBox(torso, 0.22, 0.032, 0.245, 0, 0.545, -0.005, shirtDetailMat);

  // Head + Pixel Face + Stepped 3D Voxel Hair Cap
  const head = new THREE.Group();
  head.position.set(0, 0.55, 0);
  torso.add(head);

  // BoxGeometry material order: [+X, -X, +Y, -Y, +Z (front), -Z (back)]
  const headMaterials = [skinMat, skinMat, hairMat, skinMat, faceMat, hairMat];
  addBox(head, 0.42, 0.42, 0.42, 0, 0.21, 0, headMaterials);

  // 3D Stepped Hair Crown + Back + Sideburns + Forehead Bangs
  addBox(head, 0.445, 0.075, 0.445, 0, 0.415, -0.005, hairMat); // Top crown
  addBox(head, 0.445, 0.32, 0.055, 0, 0.24, -0.205, hairMat); // Back hair
  addBox(head, 0.035, 0.24, 0.28, -0.21, 0.28, -0.06, hairMat);
  addBox(head, 0.035, 0.20, 0.24, 0.21, 0.30, -0.08, hairMat);
  addBox(head, 0.435, 0.065, 0.035, 0, 0.385, 0.208, hairMat);
  addBox(head, 0.11, 0.095, 0.035, -0.155, 0.325, 0.208, hairMat);
  addBox(head, 0.075, 0.075, 0.035, 0.175, 0.335, 0.208, hairMat);

  // Articulated Right Arm (Upper Sleeve + Elbow Forearm + Hand)
  const rightArm = new THREE.Group();
  rightArm.position.set(-0.295, 0.47, 0);
  torso.add(rightArm);
  addBox(rightArm, 0.185, 0.20, 0.195, 0, -0.055, 0, shirtMat); // Short sleeve
  addBox(rightArm, 0.195, 0.035, 0.205, 0, -0.155, 0, shirtDetailMat); // Sleeve cuff

  const rightForearm = new THREE.Group();
  rightForearm.position.set(0, -UPPER_ARM_LEN, 0);
  rightArm.add(rightForearm);
  // Slight overlap at elbow joint (-0.155 relative to elbow) so bending never leaves gaps
  addBox(rightForearm, 0.158, 0.34, 0.158, 0, -0.155, 0, skinMat);

  // Articulated Left Arm (Upper Sleeve + Elbow Forearm + Team Wristband + Hand)
  const leftArm = new THREE.Group();
  leftArm.position.set(0.295, 0.47, 0);
  torso.add(leftArm);
  addBox(leftArm, 0.185, 0.20, 0.195, 0, -0.055, 0, shirtMat);
  addBox(leftArm, 0.195, 0.035, 0.205, 0, -0.155, 0, shirtDetailMat);

  const leftForearm = new THREE.Group();
  leftForearm.position.set(0, -UPPER_ARM_LEN, 0);
  leftArm.add(leftForearm);
  addBox(leftForearm, 0.158, 0.34, 0.158, 0, -0.155, 0, skinMat);
  addBox(leftForearm, 0.168, 0.035, 0.168, 0, -0.225, 0, watchMat);

  // Weapon Mount attached DIRECTLY to rightForearm hand palm
  const weaponMount = new THREE.Group();
  weaponMount.position.set(0, -FOREARM_HAND_LEN + 0.02, 0.03);
  rightForearm.add(weaponMount);

  // Legs (Blocky charcoal tactical pants + boots)
  const leftLeg = new THREE.Group();
  leftLeg.position.set(0.105, 0, 0);
  hips.add(leftLeg);
  addBox(leftLeg, 0.185, 0.50, 0.20, 0, -0.25, 0, pantsMat);
  addBox(leftLeg, 0.192, 0.11, 0.22, 0, -0.545, 0.008, bootsMat);
  addBox(leftLeg, 0.198, 0.03, 0.23, 0, -0.605, 0.012, bootsMat);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(-0.105, 0, 0);
  hips.add(rightLeg);
  addBox(rightLeg, 0.185, 0.50, 0.20, 0, -0.25, 0, pantsMat);
  addBox(rightLeg, 0.192, 0.11, 0.22, 0, -0.545, 0.008, bootsMat);
  addBox(rightLeg, 0.198, 0.03, 0.23, 0, -0.605, 0.012, bootsMat);

  // Invisible Hitboxes calibrated to voxel proportions
  const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });
  materials.push(hitboxMat);

  const headHitGeo = new THREE.BoxGeometry(0.46, 0.46, 0.46);
  const bodyHitGeo = new THREE.BoxGeometry(0.62, 1.18, 0.38);
  geometries.push(headHitGeo, bodyHitGeo);

  const headHitbox = new THREE.Mesh(headHitGeo, hitboxMat);
  headHitbox.position.set(0, 1.42, 0);
  headHitbox.userData.hitZone = 'head';
  headHitbox.userData.entityId = options.entityId;

  const bodyHitbox = new THREE.Mesh(bodyHitGeo, hitboxMat);
  bodyHitbox.position.set(0, 0.62, 0);
  bodyHitbox.userData.hitZone = 'body';
  bodyHitbox.userData.entityId = options.entityId;

  if (options.includeHitboxes) {
    root.add(headHitbox, bodyHitbox);
  }

  let weaponHandle: WeaponModelHandle | null = null;
  let currentWeaponId: WeaponId = 'ak47';

  const applyHandSocketOffset = (wId: WeaponId) => {
    if (!weaponHandle) return;
    if (wId === 'knife') {
      weaponMount.position.set(0.0, -FOREARM_HAND_LEN + 0.02, 0.045);
      weaponMount.rotation.set(Math.PI / 2 - 0.18, 0.18, -0.12);
      weaponHandle.root.position.set(0, -0.015, 0.045);
      weaponHandle.root.scale.setScalar(1.55);
    } else if (wId === 'deagle') {
      weaponMount.position.set(0.0, -FOREARM_HAND_LEN + 0.02, 0.02);
      weaponMount.rotation.set(Math.PI / 2, 0, 0);
      weaponHandle.root.position.set(0, 0.085, 0.068);
      weaponHandle.root.scale.setScalar(1.32);
    } else {
      weaponMount.position.set(0.0, -FOREARM_HAND_LEN + 0.02, 0.015);
      weaponMount.rotation.set(Math.PI / 2, 0, 0);
      weaponHandle.root.position.set(0, 0.088, 0.115);
      weaponHandle.root.scale.setScalar(1.06);
    }
  };

  const snapLeftHandToWeapon = (localGrip: THREE.Vector3, poleX: number, poleY: number, poleZ: number) => {
    if (!weaponHandle) return;
    torso.updateMatrixWorld(true);
    _worldGrip.copy(localGrip).applyMatrix4(weaponHandle.root.matrixWorld);
    _torsoInv.copy(torso.matrixWorld).invert();
    _targetInTorso.copy(_worldGrip).applyMatrix4(_torsoInv);
    _pole.set(poleX, poleY, poleZ).normalize();
    solveTwoBoneArm(leftArm, leftForearm, _targetInTorso, _pole);
  };

  const setTeam = (team: TeamSide) => {
    shirtMat.color.set(team === 'ct' ? '#0c4da2' : '#9c3728');
    shirtDetailMat.color.set(team === 'ct' ? '#093d84' : '#7d2a1e');
    pantsMat.color.set(team === 'ct' ? '#1e232c' : '#262320');
    watchMat.color.set(team === 'ct' ? '#38bdf8' : '#f59e0b');
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
    applyHandSocketOffset(weaponId);
  };

  const setSkin = (skinId: SkinId, skinMaps?: Record<SkinId, THREE.CanvasTexture | null>) => {
    weaponHandle?.applySkin(skinId, skinMaps);
  };

  setTeam(initialTeam);

  const updateLobbyIdle = (time: number, inspectPhase: number) => {
    const breath = Math.sin(time * 1.85);
    const sway = Math.sin(time * 0.9);

    hips.position.y = 0.62 + breath * 0.008;
    hips.rotation.y = -0.14 + sway * 0.025;

    torso.rotation.set(0.02 + breath * 0.012, 0.12 + sway * 0.02, 0);
    head.rotation.set(0.02 + breath * 0.015, -0.06 + Math.sin(time * 0.65) * 0.06, 0);

    if (currentWeaponId === 'knife') {
      // Tactical reverse-grip Karambit forward + left hand balanced at chest guard
      rightArm.rotation.set(-0.62 - inspectPhase * 0.18, -0.08 + inspectPhase * 0.15, -0.12, 'YXZ');
      rightForearm.rotation.set(-0.78 - inspectPhase * 0.25, 0.12, 0.10, 'YXZ');
      weaponMount.rotation.set(
        Math.PI / 2 - 0.16 + inspectPhase * 0.35,
        0.18 + inspectPhase * 0.55,
        -0.12 + inspectPhase * 0.25
      );
      leftArm.rotation.set(-0.34, 0.12, 0.18, 'YXZ');
      leftForearm.rotation.set(-0.72, -0.22, -0.14, 'YXZ');
    } else if (currentWeaponId === 'deagle') {
      // Two-handed tactical pistol ready-up across upper torso
      rightArm.rotation.set(-0.56 - inspectPhase * 0.22, 0.34, -0.04, 'YXZ');
      rightForearm.rotation.set(-0.88 - inspectPhase * 0.18, 0.12, 0.12, 'YXZ');
      weaponMount.rotation.set(
        Math.PI / 2 + 0.05 - inspectPhase * 0.22,
        0.22 - inspectPhase * 0.45,
        -0.10 + inspectPhase * 0.28
      );
      // Left hand locks onto the underside/front of the Deagle grip/trigger guard
      snapLeftHandToWeapon(new THREE.Vector3(0.02, -0.045, 0.01), 0.72, -0.65, 0.18);
    } else {
      // Two-handed rifle hold across chest (barrel visible left-to-right, BOTH hands gripping gun!)
      rightArm.rotation.set(-0.46 - inspectPhase * 0.18, 0.36 - inspectPhase * 0.12, -0.08, 'YXZ');
      rightForearm.rotation.set(-0.92 - inspectPhase * 0.16, 0.18, 0.14, 'YXZ');
      weaponMount.rotation.set(
        Math.PI / 2 + 0.18 - inspectPhase * 0.28,
        0.64 - inspectPhase * 0.52,
        -0.18 + inspectPhase * 0.22
      );
      // Left hand physically locks onto the rifle's handguard / foregrip
      const handguardZ = currentWeaponId === 'awp' ? 0.24 : 0.255;
      snapLeftHandToWeapon(new THREE.Vector3(0.0, -0.018, handguardZ), 0.75, -0.62, 0.16);
    }

    leftLeg.rotation.set(-0.06, 0.05, 0.03);
    rightLeg.rotation.set(0.06, -0.04, -0.03);
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
      hips.position.y = THREE.MathUtils.lerp(0.62, 0.18, eased);
      hips.rotation.x = THREE.MathUtils.lerp(0, -Math.PI / 2 + 0.08, eased);
      hips.rotation.z = THREE.MathUtils.lerp(0, 0.25, eased);
      leftArm.rotation.set(-0.25 - eased * 0.75, 0, 0.12);
      leftForearm.rotation.set(-0.35, 0, 0);
      rightArm.rotation.set(-0.25 - eased * 0.85, 0, -0.12);
      rightForearm.rotation.set(-0.35, 0, 0);
      return;
    }

    hips.rotation.x = 0;
    hips.rotation.z = 0;

    const stride = Math.sin(time * 9.5) * moveSpeedRatio;
    const runBounce = Math.abs(Math.sin(time * 9.5)) * 0.03 * moveSpeedRatio;
    hips.position.y = 0.62 + runBounce;
    hips.rotation.y = 0;

    leftLeg.rotation.set(stride * 0.58, 0, 0);
    rightLeg.rotation.set(-stride * 0.58, 0, 0);

    const flinch = hitFlash * 0.18;

    if (currentWeaponId === 'knife') {
      torso.rotation.set(0.04 - flinch, stride * 0.08, 0);
      head.rotation.set(-flinch * 1.4, -stride * 0.06, 0);
      rightArm.rotation.set(-0.72 - recoilFlash * 0.45, -0.06 + recoilFlash * 0.25, -0.08, 'YXZ');
      rightForearm.rotation.set(-0.62 - recoilFlash * 0.25, 0.08, 0, 'YXZ');
      leftArm.rotation.set(-0.38 + stride * 0.28, 0.12, 0.14, 'YXZ');
      leftForearm.rotation.set(-0.55, -0.15, 0, 'YXZ');
      weaponMount.rotation.set(Math.PI / 2 + 0.16, 0.08, -0.14);
    } else if (currentWeaponId === 'deagle') {
      // Bladed tactical stance so both hands grip the Deagle straight along +Z
      torso.rotation.set(0.03 - flinch, -0.24, 0);
      head.rotation.set(-flinch * 1.3, 0.24, 0);
      rightArm.rotation.set(-0.75 - recoilFlash * 0.18, 0.28, -0.05, 'YXZ');
      rightForearm.rotation.set(-0.72 - recoilFlash * 0.16, 0.05, 0.06, 'YXZ');
      weaponMount.rotation.set(Math.PI / 2 + 0.05 - recoilFlash * 0.16, -0.08, 0);
      snapLeftHandToWeapon(new THREE.Vector3(0.02, -0.045, 0.01), 0.72, -0.62, 0.20);
    } else {
      // Bladed Weaver tactical rifle stance: stock shouldered, barrel straight +Z, left hand on handguard
      torso.rotation.set(0.05 - flinch, -0.36 + stride * 0.03, 0);
      head.rotation.set(-flinch * 1.3, 0.36 - stride * 0.03, 0);
      rightArm.rotation.set(-0.52 - recoilFlash * 0.14, 0.32, -0.10, 'YXZ');
      rightForearm.rotation.set(-0.98 - recoilFlash * 0.12, 0.10, 0.08, 'YXZ');
      weaponMount.rotation.set(Math.PI / 2 + 0.10 - recoilFlash * 0.12, 0.12, -0.06);
      const handguardZ = currentWeaponId === 'awp' ? 0.21 : 0.22;
      snapLeftHandToWeapon(new THREE.Vector3(0.0, -0.018, handguardZ), 0.78, -0.58, 0.22);
    }

    if (weaponHandle) {
      weaponHandle.muzzleFlash.visible = recoilFlash > 0.45 && currentWeaponId !== 'knife';
      weaponHandle.muzzleFlash.rotation.z = time * 40;
    }

    if (hitFlash > 0.01) {
      shirtMat.emissive.setRGB(hitFlash * 0.65, 0, 0);
    } else {
      shirtMat.emissive.setRGB(0, 0, 0);
    }
  };

  return {
    root,
    hips,
    torso,
    head,
    rightArm,
    rightForearm,
    leftArm,
    leftForearm,
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
      textures.forEach((t) => t.dispose());
    },
  };
}
