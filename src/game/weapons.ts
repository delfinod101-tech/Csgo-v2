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

function createWaffleMagTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#16191f';
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = '#252a34';
    ctx.lineWidth = 3;
    for (let x = 0; x <= 128; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 128);
      ctx.stroke();
    }
    for (let y = 0; y <= 128; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(128, y);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 3);
  return tex;
}

function createDeagleStainlessTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, '#dde3ec');
    grad.addColorStop(0.5, '#cbd3df');
    grad.addColorStop(1, '#b6c0cf');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1;
    for (let y = 0; y < 128; y += 2) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createKarambitGripTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#15171c';
    ctx.fillRect(0, 0, 128, 128);
    // Diamond polymer stippling
    for (let y = 0; y < 128; y += 4) {
      for (let x = 0; x < 128; x += 4) {
        const offset = (y / 4) % 2 === 0 ? 0 : 2;
        ctx.fillStyle = (x + y) % 8 === 0 ? '#232730' : '#0d0f13';
        ctx.fillRect((x + offset) % 128, y, 2, 2);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

function createKarambitDefaultBladeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 256, 128);
    grad.addColorStop(0, '#14171d');
    grad.addColorStop(0.55, '#1d222b');
    grad.addColorStop(1, '#101318');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 128);

    // Subtle brushed steel grain
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * 3.2);
      ctx.quadraticCurveTo(128, i * 3.2 + 8, 256, i * 3.2 - 4);
      ctx.stroke();
    }

    // Subtle tactical heel etching
    ctx.save();
    ctx.translate(46, 56);
    ctx.rotate(-0.22);
    ctx.fillStyle = 'rgba(226, 232, 240, 0.58)';
    ctx.font = 'italic bold 13px sans-serif';
    ctx.fillText('STRIKE', 0, 0);
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function orientWeaponShapeGeo(geo: THREE.ExtrudeGeometry, depth: number): THREE.ExtrudeGeometry {
  // Maps shape +X -> +Z (forward), shape +Y -> +Y (up), centered on X = 0
  geo.rotateY(-Math.PI / 2);
  geo.translate(depth / 2, 0, 0);
  geo.computeVertexNormals();
  return geo;
}

function createAkTacticalStockGeo(geometries: THREE.BufferGeometry[]): THREE.ExtrudeGeometry {
  // Sloped AK-103/tactical polymer buttstock
  const s = new THREE.Shape();
  s.moveTo(-0.155, 0.022);
  s.lineTo(-0.395, -0.018);
  s.lineTo(-0.405, -0.128);
  s.quadraticCurveTo(-0.320, -0.105, -0.220, -0.062);
  s.lineTo(-0.155, -0.030);
  s.closePath();

  const depth = 0.034;
  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.0035,
    bevelSegments: 2,
  });
  orientWeaponShapeGeo(geo, depth);
  geometries.push(geo);
  return geo;
}

function createAkFingerGripGeo(geometries: THREE.BufferGeometry[]): THREE.ExtrudeGeometry {
  // Finger-grooved AK tactical pistol grip (matching photo 3)
  const s = new THREE.Shape();
  s.moveTo(-0.020, 0);
  s.lineTo(0.020, 0);
  // 3 front finger grooves
  s.quadraticCurveTo(0.025, -0.022, 0.014, -0.036);
  s.quadraticCurveTo(0.021, -0.052, 0.008, -0.068);
  s.quadraticCurveTo(0.014, -0.086, -0.004, -0.106);
  s.lineTo(-0.044, -0.108);
  s.quadraticCurveTo(-0.034, -0.055, -0.020, 0);
  s.closePath();

  const depth = 0.026;
  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.0035,
    bevelSize: 0.003,
    bevelSegments: 2,
  });
  orientWeaponShapeGeo(geo, depth);
  geometries.push(geo);
  return geo;
}

function createAkWaffleMagGeo(geometries: THREE.BufferGeometry[]): THREE.ExtrudeGeometry {
  // Deeply curved AK 7.62 polymer magazine
  const s = new THREE.Shape();
  s.moveTo(-0.032, 0);
  s.lineTo(0.032, 0);
  s.bezierCurveTo(0.048, -0.085, 0.078, -0.165, 0.116, -0.222);
  s.lineTo(0.056, -0.242);
  s.bezierCurveTo(0.022, -0.175, -0.010, -0.095, -0.032, 0);
  s.closePath();

  const depth = 0.026;
  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.0035,
    bevelSize: 0.003,
    bevelSegments: 2,
    curveSegments: 20,
  });
  orientWeaponShapeGeo(geo, depth);
  geometries.push(geo);
  return geo;
}

function createAkFrontSightTowerGeo(geometries: THREE.BufferGeometry[]): THREE.ExtrudeGeometry {
  // Slanted AK front sight tower + hood ears
  const s = new THREE.Shape();
  s.moveTo(-0.018, 0);
  s.lineTo(0.018, 0);
  s.lineTo(0.024, 0.044);
  s.lineTo(0.012, 0.046);
  s.lineTo(-0.004, 0.016);
  s.lineTo(-0.018, 0.014);
  s.closePath();

  const depth = 0.014;
  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.0015,
    bevelSize: 0.0012,
    bevelSegments: 1,
  });
  orientWeaponShapeGeo(geo, depth);
  geometries.push(geo);
  return geo;
}

function createM4CollapsibleStockGeo(geometries: THREE.BufferGeometry[]): THREE.ExtrudeGeometry {
  // Classic 6-position M4 waffle carbine stock with slanted butt & sling slot
  const s = new THREE.Shape();
  s.moveTo(-0.185, 0.028);
  s.lineTo(-0.365, 0.028);
  s.lineTo(-0.398, -0.106);
  s.lineTo(-0.368, -0.110);
  s.lineTo(-0.312, -0.052);
  s.lineTo(-0.232, -0.044);
  s.lineTo(-0.205, -0.016);
  s.lineTo(-0.185, -0.016);
  s.closePath();

  // Triangular sling loop cutout at lower rear
  const hole = new THREE.Path();
  hole.moveTo(-0.365, -0.046);
  hole.lineTo(-0.376, -0.088);
  hole.lineTo(-0.332, -0.054);
  hole.closePath();
  s.holes.push(hole);

  const depth = 0.036;
  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.0025,
    bevelSegments: 2,
  });
  orientWeaponShapeGeo(geo, depth);
  geometries.push(geo);
  return geo;
}

function createM4CarryHandleGeo(geometries: THREE.BufferGeometry[]): THREE.ExtrudeGeometry {
  // Iconic detachable M4A1 carry handle with hollow slot
  const s = new THREE.Shape();
  s.moveTo(-0.088, 0);
  s.lineTo(0.088, 0);
  s.lineTo(0.082, 0.036);
  s.lineTo(-0.072, 0.036);
  s.lineTo(-0.088, 0.042);
  s.lineTo(-0.098, 0.036);
  s.closePath();

  const slot = new THREE.Path();
  slot.moveTo(-0.056, 0.009);
  slot.lineTo(0.058, 0.009);
  slot.lineTo(0.058, 0.024);
  slot.lineTo(-0.056, 0.024);
  slot.closePath();
  s.holes.push(slot);

  const depth = 0.024;
  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.0015,
    bevelSegments: 2,
  });
  orientWeaponShapeGeo(geo, depth);
  geometries.push(geo);
  return geo;
}

function createM4AFrameSightGeo(geometries: THREE.BufferGeometry[]): THREE.ExtrudeGeometry {
  // Iconic triangular M4 A-frame front sight gas block
  const s = new THREE.Shape();
  s.moveTo(-0.024, -0.012);
  s.lineTo(0.028, -0.012);
  s.lineTo(0.018, 0.058);
  s.lineTo(0.002, 0.058);
  s.lineTo(-0.024, 0.008);
  s.closePath();

  const triHole = new THREE.Path();
  triHole.moveTo(-0.008, 0.010);
  triHole.lineTo(0.012, 0.010);
  triHole.lineTo(0.008, 0.038);
  triHole.closePath();
  s.holes.push(triHole);

  const depth = 0.016;
  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.0018,
    bevelSize: 0.0014,
    bevelSegments: 1,
  });
  orientWeaponShapeGeo(geo, depth);
  geometries.push(geo);
  return geo;
}

function createM4StanagMagGeo(geometries: THREE.BufferGeometry[]): THREE.ExtrudeGeometry {
  // Gently curved 30-round M4 STANAG magazine
  const s = new THREE.Shape();
  s.moveTo(-0.028, 0);
  s.lineTo(0.028, 0);
  s.quadraticCurveTo(0.036, -0.095, 0.052, -0.175);
  s.lineTo(-0.006, -0.184);
  s.quadraticCurveTo(-0.018, -0.095, -0.028, 0);
  s.closePath();

  const depth = 0.022;
  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.0018,
    bevelSegments: 2,
  });
  orientWeaponShapeGeo(geo, depth);
  geometries.push(geo);
  return geo;
}

function createDeagleFrameGeo(geometries: THREE.BufferGeometry[]): THREE.ExtrudeGeometry {
  // Sculpted Desert Eagle lower frame: long dustcover, squared trigger guard cutout, swept beavertail & grip frame
  const s = new THREE.Shape();
  s.moveTo(0.168, 0.022);
  s.lineTo(0.164, 0.005);
  s.lineTo(0.056, 0.005);
  // Squared combat trigger guard
  s.lineTo(0.048, -0.032);
  s.lineTo(-0.004, -0.032);
  // Front strap of grip
  s.lineTo(-0.026, -0.126);
  // Heel to backstrap
  s.lineTo(-0.088, -0.126);
  s.quadraticCurveTo(-0.064, -0.055, -0.058, -0.005);
  // Swept beavertail tang
  s.lineTo(-0.092, 0.008);
  s.quadraticCurveTo(-0.095, 0.018, -0.068, 0.022);
  s.closePath();

  // Open trigger guard cutout
  const guardHole = new THREE.Path();
  guardHole.moveTo(0.040, 0.000);
  guardHole.lineTo(0.036, -0.024);
  guardHole.lineTo(0.002, -0.024);
  guardHole.lineTo(0.006, 0.000);
  guardHole.closePath();
  s.holes.push(guardHole);

  const depth = 0.028;
  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.0025,
    bevelSize: 0.002,
    bevelSegments: 2,
  });
  orientWeaponShapeGeo(geo, depth);
  geometries.push(geo);
  return geo;
}

function createDeagleBarrelShroudGeo(geometries: THREE.BufferGeometry[]): THREE.ExtrudeGeometry {
  // Iconic fixed barrel shroud with angled triangular muzzle nose
  const s = new THREE.Shape();
  s.moveTo(0.026, 0.022);
  s.lineTo(0.172, 0.022);
  s.lineTo(0.180, 0.034);
  s.lineTo(0.178, 0.054);
  s.lineTo(0.168, 0.060);
  s.lineTo(0.026, 0.056);
  s.closePath();

  const depth = 0.031;
  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.0028,
    bevelSize: 0.0022,
    bevelSegments: 2,
  });
  orientWeaponShapeGeo(geo, depth);
  geometries.push(geo);
  return geo;
}

function createDeagleSlideGeo(geometries: THREE.BufferGeometry[]): THREE.ExtrudeGeometry {
  // Rear reciprocating slide with sloped tail matching Image 1
  const s = new THREE.Shape();
  s.moveTo(-0.060, 0.022);
  s.lineTo(0.028, 0.022);
  s.lineTo(0.028, 0.056);
  s.lineTo(-0.044, 0.056);
  s.lineTo(-0.068, 0.030);
  s.closePath();

  const depth = 0.032;
  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.0025,
    bevelSize: 0.002,
    bevelSegments: 2,
  });
  orientWeaponShapeGeo(geo, depth);
  geometries.push(geo);
  return geo;
}

function createDeagleRubberGripGeo(geometries: THREE.BufferGeometry[]): THREE.ExtrudeGeometry {
  // Wrap-around black rubber grip scales with flared heel matching Image 1
  const s = new THREE.Shape();
  s.moveTo(-0.012, -0.012);
  s.lineTo(-0.028, -0.118);
  s.lineTo(-0.084, -0.118);
  s.quadraticCurveTo(-0.064, -0.054, -0.056, -0.006);
  s.closePath();

  const depth = 0.033;
  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.0025,
    bevelSegments: 2,
  });
  orientWeaponShapeGeo(geo, depth);
  geometries.push(geo);
  return geo;
}

function createKarambitFrameGeo(geometries: THREE.BufferGeometry[]): THREE.ExtrudeGeometry {
  // Full-tang frame: pommel skull-crusher spike, open finger ring, curved spine, 3 finger scallops & forward guard
  const s = new THREE.Shape();
  // Start at back of ring below spike
  s.moveTo(-0.111, 0.012);
  // Up to pommel spike base & sharp point
  s.lineTo(-0.112, 0.023);
  s.lineTo(-0.125, 0.027);
  s.lineTo(-0.106, 0.034);
  // Top arc of ring into rear spine
  s.quadraticCurveTo(-0.088, 0.039, -0.068, 0.035);
  // Main curved spine arch across handle
  s.bezierCurveTo(-0.036, 0.044, 0.005, 0.043, 0.035, 0.024);
  // Upper blade bolster face down to forward guard lip
  s.lineTo(0.042, 0.012);
  s.lineTo(0.034, -0.016);
  s.quadraticCurveTo(0.030, -0.026, 0.021, -0.025);
  // Finger Scallop 1 (index / forward choil)
  s.quadraticCurveTo(0.010, -0.006, -0.002, -0.016);
  // Finger Scallop 2 (middle finger)
  s.quadraticCurveTo(-0.016, 0.002, -0.029, -0.010);
  // Finger Scallop 3 (ring finger)
  s.quadraticCurveTo(-0.044, 0.007, -0.058, -0.004);
  // Transition into bottom of finger ring
  s.quadraticCurveTo(-0.066, -0.009, -0.072, -0.009);
  s.bezierCurveTo(-0.088, -0.018, -0.111, -0.006, -0.111, 0.012);
  s.closePath();

  // Open circular finger ring hole
  const ringHole = new THREE.Path();
  ringHole.absarc(-0.089, 0.012, 0.0145, 0, Math.PI * 2, true);
  s.holes.push(ringHole);

  const depth = 0.014;
  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.0022,
    bevelSize: 0.0018,
    bevelSegments: 2,
    curveSegments: 24,
  });
  orientWeaponShapeGeo(geo, depth);
  geometries.push(geo);
  return geo;
}

function createKarambitGripScalesGeo(geometries: THREE.BufferGeometry[]): THREE.ExtrudeGeometry {
  // Contoured polymer grip scales over the middle of the handle (leaving full-tang ring & spike exposed)
  const s = new THREE.Shape();
  s.moveTo(-0.064, 0.031);
  s.bezierCurveTo(-0.034, 0.040, 0.004, 0.039, 0.031, 0.021);
  s.lineTo(0.035, 0.009);
  s.lineTo(0.028, -0.015);
  s.quadraticCurveTo(0.024, -0.021, 0.018, -0.019);
  s.quadraticCurveTo(0.009, -0.003, -0.002, -0.012);
  s.quadraticCurveTo(-0.016, 0.004, -0.029, -0.007);
  s.quadraticCurveTo(-0.044, 0.009, -0.058, -0.002);
  s.quadraticCurveTo(-0.066, 0.014, -0.064, 0.031);
  s.closePath();

  const depth = 0.021;
  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.0028,
    bevelSize: 0.002,
    bevelSegments: 2,
    curveSegments: 20,
  });
  orientWeaponShapeGeo(geo, depth);
  geometries.push(geo);
  return geo;
}

function createKarambitBladeBodyGeo(geometries: THREE.BufferGeometry[]): THREE.ExtrudeGeometry {
  // Sweeping Honshu talon blade from bolster out to sharp curved needle tip
  const s = new THREE.Shape();
  s.moveTo(0.034, 0.019);
  // Outer convex spine arc sweeping forward & curving down to talon tip
  s.bezierCurveTo(0.094, 0.005, 0.140, -0.044, 0.141, -0.112);
  // Inner concave belly curving back to heel choil
  s.bezierCurveTo(0.117, -0.056, 0.084, -0.020, 0.031, -0.012);
  s.closePath();

  const depth = 0.0048;
  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.0016,
    bevelSegments: 2,
    curveSegments: 28,
  });
  orientWeaponShapeGeo(geo, depth);
  geometries.push(geo);
  return geo;
}

function createKarambitCuttingEdgeGeo(geometries: THREE.BufferGeometry[]): THREE.ExtrudeGeometry {
  // Gleaming razor-sharp hollow-ground silver inner edge bevel
  const s = new THREE.Shape();
  s.moveTo(0.033, -0.010);
  s.bezierCurveTo(0.085, -0.018, 0.118, -0.054, 0.1415, -0.1135);
  s.bezierCurveTo(0.114, -0.059, 0.082, -0.025, 0.030, -0.0155);
  s.closePath();

  const depth = 0.0024;
  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.0008,
    bevelSize: 0.0007,
    bevelSegments: 1,
    curveSegments: 28,
  });
  orientWeaponShapeGeo(geo, depth);
  geometries.push(geo);
  return geo;
}

function createKarambitSpineSwedgeGeo(geometries: THREE.BufferGeometry[]): THREE.ExtrudeGeometry {
  // Concave false-edge / fuller bevel along the upper outer spine of the blade
  const s = new THREE.Shape();
  s.moveTo(0.041, 0.0185);
  s.bezierCurveTo(0.092, 0.006, 0.127, -0.034, 0.134, -0.088);
  s.bezierCurveTo(0.119, -0.038, 0.087, -0.004, 0.041, 0.0105);
  s.closePath();

  const depth = 0.0064;
  const geo = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.001,
    bevelSize: 0.0008,
    bevelSegments: 1,
    curveSegments: 24,
  });
  orientWeaponShapeGeo(geo, depth);
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
  const textures: THREE.Texture[] = [];

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
    // Tactical Matte-Black AK-47 / AK-103 matching reference photo 3
    const waffleTex = createWaffleMagTexture();
    const gripTex = createKarambitGripTexture();
    textures.push(waffleTex, gripTex);

    const isDefault = skinId === 'default';
    const akBodyMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(isDefault ? '#1c2028' : initialMap ? '#ffffff' : skin.primaryHex),
      map: isDefault ? null : initialMap,
      metalness: isDefault ? 0.58 : skin.metalness,
      roughness: isDefault ? 0.44 : skin.roughness,
      clearcoat: isDefault ? 0.15 : 0.65,
    });
    const akPolymerMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(isDefault ? '#15181e' : skin.secondaryHex),
      map: gripTex,
      bumpMap: gripTex,
      bumpScale: 0.0014,
      metalness: 0.12,
      roughness: 0.78,
    });
    const akMagMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(isDefault ? '#191d24' : skin.secondaryHex),
      map: waffleTex,
      bumpMap: waffleTex,
      bumpScale: 0.0028,
      metalness: 0.18,
      roughness: 0.65,
    });
    materials.push(akBodyMat, akPolymerMat, akMagMat);

    // Stamped receiver + top ribbed dust cover
    addBox(root, 0.044, 0.062, 0.30, 0, 0.002, 0.0, akBodyMat);
    addBox(root, 0.038, 0.022, 0.25, 0, 0.038, -0.02, akBodyMat);
    // Dust cover stiffening ribs
    for (let i = 0; i < 4; i++) {
      addBox(root, 0.040, 0.004, 0.012, 0, 0.049, -0.08 + i * 0.042, gunmetalMat);
    }
    // Rear tangent iron sight block + classic AK safety lever + magwell dimple
    addBox(root, 0.020, 0.018, 0.052, 0, 0.056, 0.115, gunmetalMat);
    addBox(root, 0.005, 0.014, 0.11, -0.025, 0.010, -0.02, gunmetalMat);
    addBox(root, 0.047, 0.012, 0.028, 0, -0.012, 0.085, gunmetalMat);

    // Tactical Polymer Buttstock + rubber buttpad
    const akStock = new THREE.Mesh(createAkTacticalStockGeo(geometries), akPolymerMat);
    akStock.castShadow = true;
    root.add(akStock);
    addBox(root, 0.036, 0.114, 0.016, 0, -0.072, -0.405, polymerMat, 0.08);

    // Finger-grooved AK Tactical Pistol Grip + Trigger Guard
    const akGrip = new THREE.Mesh(createAkFingerGripGeo(geometries), akPolymerMat);
    akGrip.position.set(0, -0.028, -0.105);
    akGrip.castShadow = true;
    root.add(akGrip);
    addTriggerAssembly(-0.030, -0.048);

    // Tactical Railed Handguard + Top Picatinny Rail Lugs + Side Cooling Slots
    addBox(root, 0.050, 0.056, 0.215, 0, 0.004, 0.260, akPolymerMat);
    addBox(root, 0.024, 0.010, 0.215, 0, 0.048, 0.260, akBodyMat); // Top rail base
    addBox(root, 0.018, 0.008, 0.195, 0, -0.028, 0.260, gunmetalMat); // Bottom rail
    // Side Picatinny rails
    addBox(root, 0.058, 0.014, 0.165, 0, 0.004, 0.265, gunmetalMat);
    // Crisp top Picatinny rail teeth (11 lugs)
    for (let i = 0; i < 11; i++) {
      addBox(root, 0.026, 0.004, 0.009, 0, 0.055, 0.168 + i * 0.018, gunmetalMat);
    }

    // Exposed Gas Tube + 45-degree Gas Block
    addCyl(root, 0.011, 0.011, 0.24, 0, 0.032, 0.285, gunmetalMat);
    const gasBlock = addBox(root, 0.018, 0.036, 0.028, 0, 0.020, 0.415, gunmetalMat);
    gasBlock.rotation.x = 0.55;

    // Stepped Heavy Barrel + Under-barrel Cleaning Rod
    addCyl(root, 0.011, 0.013, 0.44, 0, 0.006, 0.495, gunmetalMat);
    addCyl(root, 0.0038, 0.0038, 0.36, 0, -0.013, 0.48, gunmetalMat);

    // Slanted AK Front Sight Tower + Tactical Slant Muzzle Compensator
    const akFrontSight = new THREE.Mesh(createAkFrontSightTowerGeo(geometries), gunmetalMat);
    akFrontSight.position.set(0, 0.008, 0.655);
    root.add(akFrontSight);
    addCyl(root, 0.014, 0.013, 0.046, 0, 0.006, 0.725, gunmetalMat);

    // Curved Waffle Polymer Magazine
    const akMag = new THREE.Mesh(createAkWaffleMagGeo(geometries), akMagMat);
    akMag.position.set(0, -0.026, 0.088);
    akMag.castShadow = true;
    magazineGroup.add(akMag);
    root.add(magazineGroup);

    // Bolt Carrier + Curved AK Charging Handle
    addBox(boltGroup, 0.014, 0.020, 0.072, -0.022, 0.022, 0.045, gunmetalMat);
    addBox(boltGroup, 0.026, 0.010, 0.014, -0.034, 0.022, 0.068, accentMat);
    root.add(boltGroup);

    root.userData.akMats = { bodyMat: akBodyMat, polyMat: akPolymerMat, magMat: akMagMat };
    muzzlePoint.position.set(0, 0.006, 0.755);
  } else if (weaponId === 'm4a1s') {
    // Classic Tactical M4A1 Carbine matching reference photo 2
    const gripTex = createKarambitGripTexture();
    textures.push(gripTex);

    const isDefault = skinId === 'default';
    const m4BodyMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(isDefault ? '#1c2026' : initialMap ? '#ffffff' : skin.primaryHex),
      map: isDefault ? null : initialMap,
      metalness: isDefault ? 0.62 : skin.metalness,
      roughness: isDefault ? 0.38 : skin.roughness,
      clearcoat: isDefault ? 0.18 : 0.65,
    });
    const m4PolymerMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(isDefault ? '#15181e' : skin.secondaryHex),
      map: gripTex,
      bumpMap: gripTex,
      bumpScale: 0.0014,
      metalness: 0.14,
      roughness: 0.76,
    });
    materials.push(m4BodyMat, m4PolymerMat);

    // AR-15 Upper & Lower Receiver + Forward Assist + Brass Deflector + Dust Cover
    addBox(root, 0.044, 0.066, 0.255, 0, 0.0, 0.0, m4BodyMat);
    addBox(root, 0.046, 0.028, 0.088, 0, -0.036, 0.072, m4BodyMat); // Magwell flare
    addBox(root, 0.026, 0.012, 0.245, 0, 0.038, 0.0, gunmetalMat); // Flat-top Picatinny rail
    // Forward assist & brass deflector on right side
    addCyl(root, 0.008, 0.008, 0.038, -0.026, 0.012, -0.065, gunmetalMat);
    addBox(root, 0.016, 0.024, 0.024, -0.026, 0.016, -0.032, m4BodyMat);

    // Detachable Carry Handle Rear Sight + Thumb Nuts
    const carryHandle = new THREE.Mesh(createM4CarryHandleGeo(geometries), m4BodyMat);
    carryHandle.position.set(0, 0.042, -0.012);
    carryHandle.castShadow = true;
    root.add(carryHandle);
    addCyl(root, 0.007, 0.007, 0.010, 0.018, 0.048, -0.068, gunmetalMat);
    addCyl(root, 0.007, 0.007, 0.010, 0.018, 0.048, 0.048, gunmetalMat);

    // Buffer Tube + 6-Position M4 Collapsible Waffle Stock + Ribbed Cheeks
    addCyl(root, 0.017, 0.017, 0.22, 0, 0.008, -0.23, gunmetalMat);
    const m4Stock = new THREE.Mesh(createM4CollapsibleStockGeo(geometries), m4PolymerMat);
    m4Stock.castShadow = true;
    root.add(m4Stock);
    addBox(root, 0.044, 0.016, 0.145, 0, 0.012, -0.275, m4PolymerMat);
    addBox(root, 0.040, 0.132, 0.016, 0, -0.042, -0.388, polymerMat, 0.24);

    // A2 Pistol Grip + Trigger Guard
    const m4Grip = new THREE.Mesh(createAkFingerGripGeo(geometries), m4PolymerMat);
    m4Grip.position.set(0, -0.028, -0.088);
    root.add(m4Grip);
    addTriggerAssembly(-0.032, -0.030);

    // Delta Ring + Classic Ribbed Round Carbine Handguard (matching Image 2)
    addCyl(root, 0.028, 0.026, 0.024, 0, 0.010, 0.135, gunmetalMat);
    addCyl(root, 0.025, 0.025, 0.210, 0, 0.010, 0.252, m4PolymerMat);
    for (let i = 0; i < 10; i++) {
      addCyl(root, 0.0278, 0.0278, 0.008, 0, 0.010, 0.162 + i * 0.019, m4PolymerMat);
    }
    addCyl(root, 0.027, 0.027, 0.016, 0, 0.010, 0.362, gunmetalMat); // Front cap

    // Iconic Triangular A-Frame Front Sight Gas Block + Sling Swivel
    const aFrameSight = new THREE.Mesh(createM4AFrameSightGeo(geometries), gunmetalMat);
    aFrameSight.position.set(0, 0.014, 0.398);
    root.add(aFrameSight);
    addBox(root, 0.008, 0.018, 0.016, 0, -0.010, 0.402, gunmetalMat); // Sling loop under FSP

    // Stepped M4 Carbine Barrel (with M203 cutout) + A2 Birdcage Flash Hider
    addCyl(root, 0.0115, 0.0115, 0.18, 0, 0.010, 0.455, gunmetalMat);
    addCyl(root, 0.0095, 0.0095, 0.036, 0, 0.010, 0.555, gunmetalMat); // M203 notch
    addCyl(root, 0.0115, 0.0115, 0.075, 0, 0.010, 0.605, gunmetalMat);
    addCyl(root, 0.014, 0.013, 0.048, 0, 0.010, 0.662, gunmetalMat); // A2 birdcage
    addCyl(root, 0.0142, 0.0142, 0.012, 0, 0.010, 0.684, accentMat); // Muzzle crown collar

    // Gently Curved 30-Round STANAG Magazine
    const stanagMag = new THREE.Mesh(createM4StanagMagGeo(geometries), gunmetalMat);
    stanagMag.position.set(0, -0.044, 0.072);
    stanagMag.castShadow = true;
    magazineGroup.add(stanagMag);
    addBox(magazineGroup, 0.026, 0.012, 0.062, 0, -0.224, 0.095, polymerMat, 0.14);
    root.add(magazineGroup);

    // Charging Handle Latch + Ejection Port Bolt
    addBox(boltGroup, 0.012, 0.018, 0.065, -0.020, 0.016, 0.028, gunmetalMat);
    addBox(boltGroup, 0.026, 0.012, 0.018, 0, 0.034, -0.125, gunmetalMat);
    root.add(boltGroup);

    root.userData.m4Mats = { bodyMat: m4BodyMat, polyMat: m4PolymerMat };
    muzzlePoint.position.set(0, 0.010, 0.705);
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
    // Brushed Stainless Steel Desert Eagle XIX matching reference photo 1
    const stainlessTex = createDeagleStainlessTexture();
    const gripTex = createKarambitGripTexture();
    textures.push(stainlessTex, gripTex);

    const isDefault = skinId === 'default';
    const deagleMetalMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(isDefault ? '#ffffff' : initialMap ? '#ffffff' : skin.primaryHex),
      map: isDefault ? stainlessTex : initialMap,
      metalness: isDefault ? 0.92 : skin.metalness,
      roughness: isDefault ? 0.22 : skin.roughness,
      clearcoat: 0.55,
      clearcoatRoughness: 0.15,
    });
    const deagleRubberMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#14161a'),
      map: gripTex,
      bumpMap: gripTex,
      bumpScale: 0.0024,
      metalness: 0.08,
      roughness: 0.88,
    });
    const redDotMat = new THREE.MeshBasicMaterial({ color: '#dc2626' });
    materials.push(deagleMetalMat, deagleRubberMat, redDotMat);

    // Sculpted stainless frame + beavertail + open squared trigger guard
    const frameMesh = new THREE.Mesh(createDeagleFrameGeo(geometries), deagleMetalMat);
    frameMesh.castShadow = true;
    root.add(frameMesh);

    // Curved trigger inside open trigger guard + exposed skeleton hammer + slide stop
    addBox(root, 0.007, 0.020, 0.008, 0, -0.010, 0.014, gunmetalMat, 0.30);
    addBox(root, 0.008, 0.018, 0.018, 0, 0.026, -0.068, gunmetalMat, -0.55); // Hammer
    addBox(root, 0.005, 0.008, 0.036, 0.017, 0.014, 0.008, gunmetalMat); // Slide stop

    // Fixed triangular barrel shroud + top & bottom Picatinny rails + muzzle compensator ports
    const shroudMesh = new THREE.Mesh(createDeagleBarrelShroudGeo(geometries), deagleMetalMat);
    shroudMesh.castShadow = true;
    root.add(shroudMesh);
    // Top rail & under-barrel Picatinny rail lugs
    addBox(root, 0.020, 0.005, 0.125, 0, 0.061, 0.098, gunmetalMat);
    addBox(root, 0.020, 0.006, 0.108, 0, 0.001, 0.114, gunmetalMat);
    for (let i = 0; i < 8; i++) {
      addBox(root, 0.022, 0.004, 0.007, 0, 0.064, 0.044 + i * 0.015, gunmetalMat);
      addBox(root, 0.022, 0.005, 0.007, 0, -0.003, 0.064 + i * 0.014, gunmetalMat);
    }
    // Compensator slots near muzzle crown
    for (let i = 0; i < 3; i++) {
      addBox(root, 0.036, 0.012, 0.004, 0, 0.048, 0.155 + i * 0.008, polymerMat);
    }

    // Wrap-around textured black rubber grip + side circular medallion
    const rubberGrip = new THREE.Mesh(createDeagleRubberGripGeo(geometries), deagleRubberMat);
    rubberGrip.castShadow = true;
    root.add(rubberGrip);
    addCyl(root, 0.011, 0.011, 0.036, 0, -0.072, -0.044, gunmetalMat);

    // Reciprocating rear slide (boltGroup) + angled rear serrations + safety lever + combat sights
    const slideMesh = new THREE.Mesh(createDeagleSlideGeo(geometries), deagleMetalMat);
    slideMesh.castShadow = true;
    boltGroup.add(slideMesh);
    for (let i = 0; i < 7; i++) {
      const serr = addBox(boltGroup, 0.037, 0.024, 0.003, 0, 0.038, -0.040 + i * 0.0065, gunmetalMat);
      serr.rotation.x = 0.22;
    }
    // Ambi thumb safety wing + red fire indicator dot + ramped combat front/rear sights
    addBox(boltGroup, 0.042, 0.009, 0.024, 0, 0.046, -0.038, gunmetalMat);
    addBox(boltGroup, 0.040, 0.004, 0.004, 0, 0.039, -0.036, redDotMat);
    addBox(boltGroup, 0.014, 0.010, 0.014, 0, 0.061, -0.036, gunmetalMat); // Rear sight
    addBox(root, 0.008, 0.009, 0.016, 0, 0.065, 0.168, gunmetalMat); // Front sight
    root.add(boltGroup);

    // Protruding Steel Magazine + Baseplate
    addBox(magazineGroup, 0.024, 0.092, 0.044, 0, -0.088, -0.050, gunmetalMat, -0.18);
    addBox(magazineGroup, 0.028, 0.009, 0.056, 0, -0.130, -0.056, polymerMat, -0.02);
    root.add(magazineGroup);

    root.userData.deagleMats = { metalMat: deagleMetalMat, stainlessTex };
    muzzlePoint.position.set(0, 0.042, 0.195);
  } else {
    // Honshu-style Tactical Karambit
    const gripTex = createKarambitGripTexture();
    const defaultBladeTex = createKarambitDefaultBladeTexture();
    textures.push(gripTex, defaultBladeTex);

    const isDefaultSkin = skinId === 'default';
    const karambitBladeMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(isDefaultSkin ? '#ffffff' : initialMap ? '#ffffff' : skin.primaryHex),
      map: isDefaultSkin ? defaultBladeTex : initialMap,
      metalness: isDefaultSkin ? 0.84 : skin.metalness,
      roughness: isDefaultSkin ? 0.28 : skin.roughness,
      clearcoat: 0.72,
      clearcoatRoughness: 0.16,
    });

    const karambitGripMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1a1d24'),
      map: gripTex,
      bumpMap: gripTex,
      bumpScale: 0.0022,
      metalness: 0.14,
      roughness: 0.82,
    });

    const karambitTangMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#13161c'),
      metalness: 0.72,
      roughness: 0.38,
    });

    const karambitEdgeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#e5e9f0'),
      metalness: 0.96,
      roughness: 0.11,
    });

    const karambitRingBevelMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(isDefaultSkin ? '#1e232c' : skin.accentHex),
      metalness: 0.85,
      roughness: 0.25,
    });

    materials.push(
      karambitBladeMat,
      karambitGripMat,
      karambitTangMat,
      karambitEdgeMat,
      karambitRingBevelMat
    );

    const knifeGroup = new THREE.Group();

    // 1. Full-tang frame with integrated circular finger ring & pommel skull-crusher spike
    const frameMesh = new THREE.Mesh(createKarambitFrameGeo(geometries), karambitTangMat);
    frameMesh.castShadow = true;
    knifeGroup.add(frameMesh);

    // Inner bevel collar around finger hole
    const ringCollarGeo = new THREE.TorusGeometry(0.015, 0.0024, 12, 28);
    ringCollarGeo.rotateY(Math.PI / 2);
    geometries.push(ringCollarGeo);
    const ringCollar = new THREE.Mesh(ringCollarGeo, karambitRingBevelMat);
    ringCollar.position.set(0, 0.012, -0.089);
    knifeGroup.add(ringCollar);

    // 2. Ergonomic scalloped G10 polymer handle scales + Torx pivot pins
    const gripScalesMesh = new THREE.Mesh(createKarambitGripScalesGeo(geometries), karambitGripMat);
    gripScalesMesh.castShadow = true;
    knifeGroup.add(gripScalesMesh);

    // Side Torx hardware screws on both cheeks
    const pinGeo = new THREE.CylinderGeometry(0.0028, 0.0028, 0.0268, 12);
    pinGeo.rotateZ(Math.PI / 2);
    geometries.push(pinGeo);
    const frontPin = new THREE.Mesh(pinGeo, gunmetalMat);
    frontPin.position.set(0, 0.013, 0.016);
    const rearPin = new THREE.Mesh(pinGeo, gunmetalMat);
    rearPin.position.set(0, 0.019, -0.052);
    knifeGroup.add(frontPin, rearPin);

    // 3. Spine jimping (front & rear serrated thumb notches matching reference photo)
    const jimpGeo = new THREE.BoxGeometry(0.012, 0.0032, 0.0022);
    geometries.push(jimpGeo);
    const frontJimpZ = [0.004, 0.0085, 0.013, 0.0175, 0.022, 0.0265, 0.031];
    frontJimpZ.forEach((jz, idx) => {
      const tooth = new THREE.Mesh(jimpGeo, karambitTangMat);
      const jy = 0.039 - idx * 0.0024;
      tooth.position.set(0, jy, jz);
      tooth.rotation.x = 0.35;
      knifeGroup.add(tooth);
    });
    const rearJimpZ = [-0.062, -0.057, -0.052, -0.047, -0.042];
    rearJimpZ.forEach((jz, idx) => {
      const tooth = new THREE.Mesh(jimpGeo, karambitTangMat);
      const jy = 0.0365 + idx * 0.0011;
      tooth.position.set(0, jy, jz);
      tooth.rotation.x = -0.18;
      knifeGroup.add(tooth);
    });

    // 4. Multi-layered Curved Talon Blade (coated flat + polished silver edge + top swedge)
    const bladeBody = new THREE.Mesh(createKarambitBladeBodyGeo(geometries), karambitBladeMat);
    bladeBody.castShadow = true;
    const bladeEdge = new THREE.Mesh(createKarambitCuttingEdgeGeo(geometries), karambitEdgeMat);
    const bladeSwedge = new THREE.Mesh(createKarambitSpineSwedgeGeo(geometries), gunmetalMat);
    knifeGroup.add(bladeBody, bladeEdge, bladeSwedge);

    // Register dynamic skin callback target on knifeGroup userData so applySkin updates karambit too
    root.userData.karambitMats = {
      bladeMat: karambitBladeMat,
      ringBevelMat: karambitRingBevelMat,
      defaultBladeTex,
    };

    root.add(knifeGroup);
    muzzlePoint.position.set(0, -0.06, 0.14);
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

    const kMats = root.userData.karambitMats as
      | {
          bladeMat: THREE.MeshPhysicalMaterial;
          ringBevelMat: THREE.MeshStandardMaterial;
          defaultBladeTex: THREE.CanvasTexture;
        }
      | undefined;
    if (kMats) {
      const isDef = nextSkinId === 'default';
      kMats.bladeMat.map = isDef ? kMats.defaultBladeTex : mapTex;
      kMats.bladeMat.color.set(isDef ? '#ffffff' : mapTex ? '#ffffff' : nextSkin.primaryHex);
      kMats.bladeMat.metalness = isDef ? 0.84 : nextSkin.metalness;
      kMats.bladeMat.roughness = isDef ? 0.28 : nextSkin.roughness;
      kMats.ringBevelMat.color.set(isDef ? '#1e232c' : nextSkin.accentHex);
      kMats.bladeMat.needsUpdate = true;
      kMats.ringBevelMat.needsUpdate = true;
    }

    const akMats = root.userData.akMats as
      | {
          bodyMat: THREE.MeshPhysicalMaterial;
          polyMat: THREE.MeshStandardMaterial;
          magMat: THREE.MeshStandardMaterial;
        }
      | undefined;
    if (akMats) {
      const isDef = nextSkinId === 'default';
      akMats.bodyMat.map = isDef ? null : mapTex;
      akMats.bodyMat.color.set(isDef ? '#1c2028' : mapTex ? '#ffffff' : nextSkin.primaryHex);
      akMats.bodyMat.metalness = isDef ? 0.58 : nextSkin.metalness;
      akMats.bodyMat.roughness = isDef ? 0.44 : nextSkin.roughness;
      akMats.polyMat.color.set(isDef ? '#15181e' : nextSkin.secondaryHex);
      akMats.magMat.color.set(isDef ? '#191d24' : nextSkin.secondaryHex);
      akMats.bodyMat.needsUpdate = true;
      akMats.polyMat.needsUpdate = true;
      akMats.magMat.needsUpdate = true;
    }

    const m4Mats = root.userData.m4Mats as
      | {
          bodyMat: THREE.MeshPhysicalMaterial;
          polyMat: THREE.MeshStandardMaterial;
        }
      | undefined;
    if (m4Mats) {
      const isDef = nextSkinId === 'default';
      m4Mats.bodyMat.map = isDef ? null : mapTex;
      m4Mats.bodyMat.color.set(isDef ? '#1c2026' : mapTex ? '#ffffff' : nextSkin.primaryHex);
      m4Mats.bodyMat.metalness = isDef ? 0.62 : nextSkin.metalness;
      m4Mats.bodyMat.roughness = isDef ? 0.38 : nextSkin.roughness;
      m4Mats.polyMat.color.set(isDef ? '#15181e' : nextSkin.secondaryHex);
      m4Mats.bodyMat.needsUpdate = true;
      m4Mats.polyMat.needsUpdate = true;
    }

    const deagleMats = root.userData.deagleMats as
      | {
          metalMat: THREE.MeshPhysicalMaterial;
          stainlessTex: THREE.CanvasTexture;
        }
      | undefined;
    if (deagleMats) {
      const isDef = nextSkinId === 'default';
      deagleMats.metalMat.map = isDef ? deagleMats.stainlessTex : mapTex;
      deagleMats.metalMat.color.set(isDef ? '#ffffff' : mapTex ? '#ffffff' : nextSkin.primaryHex);
      deagleMats.metalMat.metalness = isDef ? 0.92 : nextSkin.metalness;
      deagleMats.metalMat.roughness = isDef ? 0.22 : nextSkin.roughness;
      deagleMats.metalMat.needsUpdate = true;
    }
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
      textures.forEach((t) => t.dispose());
    },
  };
}
