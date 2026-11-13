import * as THREE from 'three';
import { InspectedPart } from '@/src/types/car';
import { CarMaterialLibrary } from './materials';

export interface CarAssembly {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  wheelsSpin: THREE.Group[];
  frontLeftSteer: THREE.Group;
  frontRightSteer: THREE.Group;
  spoilerGroup: THREE.Group;
  steeringWheelMesh: THREE.Mesh;
  headlightBeamLeft: THREE.SpotLight;
  headlightBeamRight: THREE.SpotLight;
  clickableMeshes: THREE.Object3D[];
  applyExploded: (factor: number) => void;
  applySpoiler: (deployFactor: number) => void;
  setDriveKinematics: (
    wheelRotationRad: number,
    steerAngleRad: number,
    pitchRad: number,
    rollRad: number
  ) => void;
  dispose: () => void;
}

interface ExplodablePart {
  object: THREE.Object3D;
  basePos: THREE.Vector3;
  offset: THREE.Vector3;
}

const PART_METADATA: Record<string, InspectedPart> = {
  body: {
    id: 'body',
    title: 'Sculpted Carbon-Composite Body',
    category: 'Chassis & Shell',
    spec: 'Cd 0.21 · Clearcoat Finish',
    description:
      'Active-channeled fastback monocoque body shaped for low drag and high-speed downforce.',
  },
  canopy: {
    id: 'canopy',
    title: 'Panoramic Optical Glass Canopy',
    category: 'Cabin Architecture',
    spec: 'Laminated Acoustic Glass · IOR 1.52',
    description:
      'Wrap-around tinted glasshouse integrating structural A-pillars and seamless roof glazing.',
  },
  aero: {
    id: 'aero',
    title: 'Active Carbon Aero Package',
    category: 'Aerodynamics',
    spec: '380 kg Peak Downforce @ 250 km/h',
    description:
      'Front splitter, Venturi underfloor diffuser, and swan-neck active rear wing with variable pitch.',
  },
  wheels: {
    id: 'wheels',
    title: '21" Forged Turbine Wheel & Carbon-Ceramic Brake',
    category: 'Unsprung Assembly',
    spec: '410 mm Ventilated Discs · 6-Piston Calipers',
    description:
      'Center-lock forged alloy wheels paired with cross-drilled ceramic rotors and fixed monoblock calipers.',
  },
  lighting: {
    id: 'lighting',
    title: 'Matrix LED & Full-Width OLED Optics',
    category: 'Lighting Signature',
    spec: 'Adaptive High-Beam · Micro-Prism Blades',
    description:
      'Dual-element front daytime running blades and continuous rear OLED lightbar with dynamic braking intensity.',
  },
  cockpit: {
    id: 'cockpit',
    title: '2-Seat Grand Touring Cockpit',
    category: 'Interior',
    spec: 'Carbon Bucket Seats · Flat-Bottom Wheel',
    description:
      'Driver-focused low-slung seating position with sculpted bolsters and steering-linked wheel column.',
  },
};

function tagPart(obj: THREE.Object3D, partKey: keyof typeof PART_METADATA): void {
  const info = PART_METADATA[partKey];
  obj.traverse((child) => {
    child.userData.partInfo = info;
  });
}

function createSideBodyShape(): THREE.Shape {
  // Profile in (Z, Y) coordinates — later rotated so Z is length and X is extruded width.
  // Front is +Z (+2.25), Rear is -Z (-2.25). Wheel centers at z = +1.36 and z = -1.36, y = 0.355.
  const s = new THREE.Shape();
  const wheelR = 0.405;
  const frontZ = 1.36;
  const rearZ = -1.36;
  const sillY = 0.16;

  s.moveTo(-2.18, 0.24);
  // Rear bumper lower to rear wheel arch
  s.lineTo(rearZ - wheelR, sillY);
  // Rear wheel arch cutout (clockwise/upward arc)
  s.absarc(rearZ, 0.355, wheelR, Math.PI + 0.49, -0.49, true);
  // Side sill between wheels
  s.lineTo(frontZ - wheelR, sillY);
  // Front wheel arch cutout
  s.absarc(frontZ, 0.355, wheelR, Math.PI + 0.49, -0.49, true);
  // Front overhang under-lip to nose tip
  s.lineTo(2.14, 0.20);
  s.quadraticCurveTo(2.26, 0.31, 2.22, 0.46);
  // Sculpted front hood rising smoothly to windshield base
  s.bezierCurveTo(1.88, 0.63, 1.35, 0.75, 0.88, 0.79);
  // Beltline across door and muscular rear haunch
  s.bezierCurveTo(0.20, 0.82, -0.75, 0.88, -1.48, 0.90);
  // Rear decklid taper
  s.quadraticCurveTo(-1.98, 0.88, -2.18, 0.74);
  // Rear vertical fascia
  s.lineTo(-2.22, 0.42);
  s.closePath();

  return s;
}

function createCanopyShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0.92, 0.77);
  // Raked windshield
  s.bezierCurveTo(0.62, 0.96, 0.35, 1.15, 0.04, 1.18);
  // Fastback roofline tapering to rear deck
  s.bezierCurveTo(-0.45, 1.20, -1.10, 1.06, -1.62, 0.86);
  s.lineTo(-1.45, 0.81);
  s.lineTo(0.75, 0.75);
  s.closePath();
  return s;
}

function createSideWindowShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0.65, 0.81);
  s.bezierCurveTo(0.32, 1.03, 0.02, 1.12, -0.30, 1.11);
  s.bezierCurveTo(-0.68, 1.09, -1.04, 0.96, -1.24, 0.87);
  s.lineTo(0.65, 0.81);
  s.closePath();
  return s;
}

function createTireGeometry(radius: number, width: number): THREE.LatheGeometry {
  const halfW = width * 0.5;
  const rimR = radius * 0.69;
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(rimR, -halfW * 0.86),
    new THREE.Vector2(radius * 0.92, -halfW),
    new THREE.Vector2(radius, -halfW * 0.76),
    new THREE.Vector2(radius, halfW * 0.76),
    new THREE.Vector2(radius * 0.92, halfW),
    new THREE.Vector2(rimR, halfW * 0.86),
  ];
  const geo = new THREE.LatheGeometry(pts, 40);
  geo.rotateZ(Math.PI / 2); // Align rotational axis to X
  return geo;
}

function createWheelAssembly(
  isLeft: boolean,
  radius: number,
  width: number,
  materials: CarMaterialLibrary,
  geometriesToDispose: THREE.BufferGeometry[]
): {
  hubGroup: THREE.Group;
  spinGroup: THREE.Group;
  wheelVisualGroup: THREE.Group;
  brakeGroup: THREE.Group;
} {
  const hubGroup = new THREE.Group();
  const spinGroup = new THREE.Group();
  const wheelVisualGroup = new THREE.Group();
  const brakeGroup = new THREE.Group();

  const sideSign = isLeft ? 1 : -1;

  // Tire
  const tireGeo = createTireGeometry(radius, width);
  geometriesToDispose.push(tireGeo);
  const tireMesh = new THREE.Mesh(tireGeo, materials.tireRubber);
  tireMesh.castShadow = true;
  tireMesh.receiveShadow = true;
  wheelVisualGroup.add(tireMesh);

  // Outer forged barrel
  const rimR = radius * 0.70;
  const barrelGeo = new THREE.CylinderGeometry(rimR, rimR, width * 0.84, 36, 1, true);
  barrelGeo.rotateZ(Math.PI / 2);
  geometriesToDispose.push(barrelGeo);
  const barrelMesh = new THREE.Mesh(barrelGeo, materials.wheelRim);
  wheelVisualGroup.add(barrelMesh);

  // Inner dark barrel backing
  const innerBarrelGeo = new THREE.CylinderGeometry(rimR * 0.94, rimR * 0.94, width * 0.78, 32, 1, true);
  innerBarrelGeo.rotateZ(Math.PI / 2);
  geometriesToDispose.push(innerBarrelGeo);
  const innerMat = materials.darkTrim;
  const innerBarrel = new THREE.Mesh(innerBarrelGeo, innerMat);
  wheelVisualGroup.add(innerBarrel);

  // Outer rim lip ring
  const lipGeo = new THREE.TorusGeometry(rimR * 0.97, 0.014, 10, 36);
  lipGeo.rotateY(Math.PI / 2);
  geometriesToDispose.push(lipGeo);
  const lipMesh = new THREE.Mesh(lipGeo, materials.wheelRim);
  lipMesh.position.x = sideSign * (width * 0.41);
  wheelVisualGroup.add(lipMesh);

  // Center hub & center-lock nut
  const hubGeo = new THREE.CylinderGeometry(0.065, 0.075, 0.07, 20);
  hubGeo.rotateZ(Math.PI / 2);
  geometriesToDispose.push(hubGeo);
  const hubMesh = new THREE.Mesh(hubGeo, materials.wheelRim);
  hubMesh.position.x = sideSign * (width * 0.34);
  wheelVisualGroup.add(hubMesh);

  const lockNutGeo = new THREE.CylinderGeometry(0.032, 0.036, 0.082, 6);
  lockNutGeo.rotateZ(Math.PI / 2);
  geometriesToDispose.push(lockNutGeo);
  const lockNut = new THREE.Mesh(lockNutGeo, materials.brakeCaliper);
  lockNut.position.x = sideSign * (width * 0.35);
  wheelVisualGroup.add(lockNut);

  // 10 Sculpted Turbine/Y-Spokes
  const spokeGeo = new THREE.BoxGeometry(0.022, rimR * 0.92, 0.022);
  geometriesToDispose.push(spokeGeo);
  const spokeCount = 10;
  for (let i = 0; i < spokeCount; i++) {
    const angle = (i / spokeCount) * Math.PI * 2;
    const spoke = new THREE.Mesh(spokeGeo, materials.wheelRim);
    const midR = rimR * 0.50;
    spoke.position.set(
      sideSign * (width * 0.34),
      Math.cos(angle) * midR,
      Math.sin(angle) * midR
    );
    spoke.rotation.x = angle + (i % 2 === 0 ? 0.14 : -0.14);
    spoke.rotation.z = sideSign * -0.11; // Subtle concavity
    spoke.castShadow = true;
    wheelVisualGroup.add(spoke);
  }

  // Ventilated brake disc (spins inside spinGroup)
  const discGeo = new THREE.CylinderGeometry(rimR * 0.78, rimR * 0.78, 0.026, 32);
  discGeo.rotateZ(Math.PI / 2);
  geometriesToDispose.push(discGeo);
  const discMesh = new THREE.Mesh(discGeo, materials.brakeDisc);
  discMesh.position.x = sideSign * (width * 0.14);
  brakeGroup.add(discMesh);

  // Fixed Brake Caliper (mounted on hubGroup so it does not spin with tire!)
  const caliperGeo = new THREE.BoxGeometry(0.068, 0.14, 0.085);
  geometriesToDispose.push(caliperGeo);
  const caliperMesh = new THREE.Mesh(caliperGeo, materials.brakeCaliper);
  caliperMesh.position.set(sideSign * (width * 0.16), 0.075, -0.14);
  caliperMesh.rotation.x = 0.35;
  caliperMesh.castShadow = true;
  brakeGroup.add(caliperMesh);

  spinGroup.add(wheelVisualGroup);
  hubGroup.add(spinGroup);
  hubGroup.add(brakeGroup);

  tagPart(hubGroup, 'wheels');

  return { hubGroup, spinGroup, wheelVisualGroup, brakeGroup };
}

export function buildCarModel(materials: CarMaterialLibrary): CarAssembly {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const geometriesToDispose: THREE.BufferGeometry[] = [];
  const explodables: ExplodablePart[] = [];
  const clickableMeshes: THREE.Object3D[] = [];

  // ---------------------------------------------------------------------------
  // 1. Carbon Chassis & Undertray Floor (Base Layer)
  // ---------------------------------------------------------------------------
  const chassisGroup = new THREE.Group();
  const floorGeo = new THREE.BoxGeometry(1.76, 0.055, 4.18);
  geometriesToDispose.push(floorGeo);
  const floorMesh = new THREE.Mesh(floorGeo, materials.carbon);
  floorMesh.position.set(0, 0.155, 0);
  floorMesh.castShadow = true;
  floorMesh.receiveShadow = true;
  chassisGroup.add(floorMesh);

  // Side aero rocker blades
  const skirtGeo = new THREE.BoxGeometry(0.09, 0.05, 2.02);
  geometriesToDispose.push(skirtGeo);
  for (const side of [-1, 1]) {
    const skirt = new THREE.Mesh(skirtGeo, materials.carbon);
    skirt.position.set(side * 0.94, 0.145, 0);
    skirt.castShadow = true;
    chassisGroup.add(skirt);
  }

  // Front carbon splitter
  const splitterGroup = new THREE.Group();
  const splitterShape = new THREE.Shape();
  splitterShape.moveTo(-0.92, 0);
  splitterShape.lineTo(0.92, 0);
  splitterShape.quadraticCurveTo(0.86, 0.24, 0.42, 0.30);
  splitterShape.lineTo(-0.42, 0.30);
  splitterShape.quadraticCurveTo(-0.86, 0.24, -0.92, 0);
  const splitterGeo = new THREE.ExtrudeGeometry(splitterShape, {
    depth: 0.032,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  splitterGeo.rotateX(Math.PI / 2);
  geometriesToDispose.push(splitterGeo);
  const splitterMesh = new THREE.Mesh(splitterGeo, materials.carbon);
  splitterMesh.position.set(0, 0.155, 2.02);
  splitterMesh.castShadow = true;
  splitterGroup.add(splitterMesh);
  tagPart(splitterGroup, 'aero');

  // Rear carbon diffuser with vertical strakes
  const diffuserGroup = new THREE.Group();
  const diffBaseGeo = new THREE.BoxGeometry(1.66, 0.09, 0.38);
  geometriesToDispose.push(diffBaseGeo);
  const diffBase = new THREE.Mesh(diffBaseGeo, materials.carbon);
  diffBase.position.set(0, 0.20, -2.06);
  diffBase.rotation.x = -0.18;
  diffBase.castShadow = true;
  diffuserGroup.add(diffBase);

  const finGeo = new THREE.BoxGeometry(0.018, 0.12, 0.34);
  geometriesToDispose.push(finGeo);
  for (const fx of [-0.54, -0.22, 0.22, 0.54]) {
    const fin = new THREE.Mesh(finGeo, materials.carbon);
    fin.position.set(fx, 0.18, -2.09);
    diffuserGroup.add(fin);
  }
  // Twin titanium exhaust finishers
  const exhaustGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.18, 20);
  exhaustGeo.rotateX(Math.PI / 2);
  geometriesToDispose.push(exhaustGeo);
  for (const ex of [-0.36, 0.36]) {
    const exMesh = new THREE.Mesh(exhaustGeo, materials.chromeTrim);
    exMesh.position.set(ex, 0.26, -2.18);
    diffuserGroup.add(exMesh);
  }
  tagPart(diffuserGroup, 'aero');

  // Wheel well arch liners (dark recessed tubs)
  const archGeo = new THREE.CylinderGeometry(0.41, 0.41, 0.36, 24, 1, false, 0, Math.PI);
  archGeo.rotateZ(Math.PI / 2);
  geometriesToDispose.push(archGeo);
  for (const [wx, wz] of [
    [0.77, 1.36],
    [-0.77, 1.36],
    [0.76, -1.36],
    [-0.76, -1.36],
  ]) {
    const liner = new THREE.Mesh(archGeo, materials.darkTrim);
    liner.position.set(wx, 0.355, wz);
    chassisGroup.add(liner);
  }

  tagPart(chassisGroup, 'body');
  bodyPivot.add(chassisGroup);
  bodyPivot.add(splitterGroup);
  bodyPivot.add(diffuserGroup);

  // ---------------------------------------------------------------------------
  // 2. Main Sculpted Body Shell (ExtrudeGeometry + Flared Haunches)
  // ---------------------------------------------------------------------------
  const bodyShellGroup = new THREE.Group();
  const bodyShape = createSideBodyShape();

  // Center core hull
  const coreGeo = new THREE.ExtrudeGeometry(bodyShape, {
    depth: 1.56,
    bevelEnabled: true,
    bevelThickness: 0.09,
    bevelSize: 0.045,
    bevelSegments: 4,
    curveSegments: 24,
  });
  // ExtrudeGeometry extrudes along +Z, and shape X/Y map to X/Y.
  // We want shape X (car length Z) along +Z, shape Y along +Y, and extrusion depth along X!
  coreGeo.rotateY(-Math.PI / 2);
  coreGeo.translate(0.78, 0, 0);
  coreGeo.computeVertexNormals();
  geometriesToDispose.push(coreGeo);

  const coreMesh = new THREE.Mesh(coreGeo, materials.bodyPaint);
  coreMesh.castShadow = true;
  coreMesh.receiveShadow = true;
  bodyShellGroup.add(coreMesh);

  // Sculpted side haunches / doors (giving pinched waist & muscular fender flare)
  const fenderGeo = new THREE.ExtrudeGeometry(bodyShape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.055,
    bevelSize: 0.035,
    bevelSegments: 3,
    curveSegments: 20,
  });
  fenderGeo.rotateY(-Math.PI / 2);
  fenderGeo.computeVertexNormals();
  geometriesToDispose.push(fenderGeo);

  for (const side of [-1, 1]) {
    const fender = new THREE.Mesh(fenderGeo, materials.bodyPaint);
    fender.position.x = side === 1 ? 0.90 : -0.76;
    fender.scale.set(1, 0.96, 0.985);
    fender.castShadow = true;
    fender.receiveShadow = true;
    bodyShellGroup.add(fender);
  }

  // Front grille aperture & side cooling intakes
  const grilleGeo = new THREE.BoxGeometry(1.18, 0.15, 0.14);
  geometriesToDispose.push(grilleGeo);
  const grilleMesh = new THREE.Mesh(grilleGeo, materials.darkTrim);
  grilleMesh.position.set(0, 0.29, 2.19);
  bodyShellGroup.add(grilleMesh);

  // Side air curtain blades behind front wheels
  const ventGeo = new THREE.BoxGeometry(0.05, 0.24, 0.22);
  geometriesToDispose.push(ventGeo);
  for (const side of [-1, 1]) {
    const vent = new THREE.Mesh(ventGeo, materials.darkTrim);
    vent.position.set(side * 0.935, 0.44, 0.72);
    vent.rotation.y = side * 0.08;
    bodyShellGroup.add(vent);
  }

  // Sculpted side mirrors on aerodynamic stalks
  const mirrorHousingGeo = new THREE.BoxGeometry(0.18, 0.075, 0.12);
  const mirrorStalkGeo = new THREE.BoxGeometry(0.09, 0.03, 0.05);
  geometriesToDispose.push(mirrorHousingGeo, mirrorStalkGeo);
  for (const side of [-1, 1]) {
    const mirror = new THREE.Mesh(mirrorHousingGeo, materials.carbon);
    mirror.position.set(side * 0.99, 0.84, 0.56);
    mirror.rotation.y = side * -0.18;
    mirror.castShadow = true;
    bodyShellGroup.add(mirror);

    const stalk = new THREE.Mesh(mirrorStalkGeo, materials.darkTrim);
    stalk.position.set(side * 0.89, 0.81, 0.56);
    stalk.rotation.z = side * 0.3;
    bodyShellGroup.add(stalk);
  }

  // Flush anodized door handles
  const handleGeo = new THREE.BoxGeometry(0.02, 0.028, 0.16);
  geometriesToDispose.push(handleGeo);
  for (const side of [-1, 1]) {
    const handle = new THREE.Mesh(handleGeo, materials.chromeTrim);
    handle.position.set(side * 0.96, 0.69, -0.18);
    bodyShellGroup.add(handle);
  }

  tagPart(bodyShellGroup, 'body');
  bodyPivot.add(bodyShellGroup);

  // ---------------------------------------------------------------------------
  // 3. Matrix LED Headlights & Full-Width OLED Taillights
  // ---------------------------------------------------------------------------
  const lightsGroup = new THREE.Group();

  // Front LED daytime running light blades + projector housings
  const hlHousingGeo = new THREE.BoxGeometry(0.32, 0.075, 0.18);
  const hlBladeGeo = new THREE.BoxGeometry(0.30, 0.022, 0.15);
  geometriesToDispose.push(hlHousingGeo, hlBladeGeo);

  for (const side of [-1, 1]) {
    const housing = new THREE.Mesh(hlHousingGeo, materials.darkTrim);
    housing.position.set(side * 0.68, 0.52, 2.07);
    housing.rotation.y = side * 0.24;
    housing.rotation.x = 0.12;
    lightsGroup.add(housing);

    const drl = new THREE.Mesh(hlBladeGeo, materials.headlightEmissive);
    drl.position.set(side * 0.68, 0.53, 2.11);
    drl.rotation.y = side * 0.24;
    drl.rotation.x = 0.12;
    lightsGroup.add(drl);
  }

  // Rear full-width OLED lightbar
  const rearChannelGeo = new THREE.BoxGeometry(1.62, 0.07, 0.08);
  const rearBarGeo = new THREE.BoxGeometry(1.56, 0.026, 0.06);
  geometriesToDispose.push(rearChannelGeo, rearBarGeo);

  const rearChannel = new THREE.Mesh(rearChannelGeo, materials.darkTrim);
  rearChannel.position.set(0, 0.64, -2.21);
  lightsGroup.add(rearChannel);

  const rearBar = new THREE.Mesh(rearBarGeo, materials.taillightEmissive);
  rearBar.position.set(0, 0.64, -2.235);
  lightsGroup.add(rearBar);

  // Spotlights for Headlight beams in dark / drive scenes
  const headlightBeamLeft = new THREE.SpotLight('#e8f2ff', 0, 26, Math.PI / 5.5, 0.55, 1.4);
  headlightBeamLeft.position.set(0.68, 0.54, 2.15);
  headlightBeamLeft.target.position.set(0.55, 0.0, 12.0);
  lightsGroup.add(headlightBeamLeft);
  lightsGroup.add(headlightBeamLeft.target);

  const headlightBeamRight = new THREE.SpotLight('#e8f2ff', 0, 26, Math.PI / 5.5, 0.55, 1.4);
  headlightBeamRight.position.set(-0.68, 0.54, 2.15);
  headlightBeamRight.target.position.set(-0.55, 0.0, 12.0);
  lightsGroup.add(headlightBeamRight);
  lightsGroup.add(headlightBeamRight.target);

  tagPart(lightsGroup, 'lighting');
  bodyPivot.add(lightsGroup);

  // ---------------------------------------------------------------------------
  // 4. Glass Canopy & Roof Spine
  // ---------------------------------------------------------------------------
  const canopyGroup = new THREE.Group();
  const canopyShape = createCanopyShape();
  const canopyGeo = new THREE.ExtrudeGeometry(canopyShape, {
    depth: 1.24,
    bevelEnabled: true,
    bevelThickness: 0.075,
    bevelSize: 0.035,
    bevelSegments: 4,
    curveSegments: 24,
  });
  canopyGeo.rotateY(-Math.PI / 2);
  canopyGeo.translate(0.62, 0, 0);
  canopyGeo.computeVertexNormals();
  geometriesToDispose.push(canopyGeo);

  const canopyMesh = new THREE.Mesh(canopyGeo, materials.glass);
  canopyMesh.renderOrder = 2;
  canopyGroup.add(canopyMesh);

  // Painted roof arches / pillars framing the glass canopy
  const sideWindowShape = createSideWindowShape();
  const sideWinGeo = new THREE.ExtrudeGeometry(sideWindowShape, {
    depth: 0.03,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  sideWinGeo.rotateY(-Math.PI / 2);
  geometriesToDispose.push(sideWinGeo);

  for (const side of [-1, 1]) {
    const sw = new THREE.Mesh(sideWinGeo, materials.glass);
    sw.position.x = side * 0.68;
    sw.renderOrder = 3;
    canopyGroup.add(sw);
  }

  // Painted roof central spine
  const roofSpineGeo = new THREE.BoxGeometry(0.92, 0.035, 1.18);
  geometriesToDispose.push(roofSpineGeo);
  const roofSpine = new THREE.Mesh(roofSpineGeo, materials.bodyPaint);
  roofSpine.position.set(0, 1.19, -0.34);
  roofSpine.rotation.x = 0.06;
  roofSpine.castShadow = true;
  canopyGroup.add(roofSpine);

  tagPart(canopyGroup, 'canopy');
  bodyPivot.add(canopyGroup);

  // ---------------------------------------------------------------------------
  // 5. Interior Cockpit (Visible Through Glass & Exploded View)
  // ---------------------------------------------------------------------------
  const cockpitGroup = new THREE.Group();

  const tubGeo = new THREE.BoxGeometry(1.32, 0.14, 1.48);
  geometriesToDispose.push(tubGeo);
  const tubMesh = new THREE.Mesh(tubGeo, materials.darkTrim);
  tubMesh.position.set(0, 0.34, 0.02);
  cockpitGroup.add(tubMesh);

  // Sculpted bucket seats
  const seatBaseGeo = new THREE.BoxGeometry(0.44, 0.10, 0.48);
  const seatBackGeo = new THREE.BoxGeometry(0.42, 0.56, 0.11);
  geometriesToDispose.push(seatBaseGeo, seatBackGeo);

  for (const side of [-0.34, 0.34]) {
    const sBase = new THREE.Mesh(seatBaseGeo, materials.interiorLeather);
    sBase.position.set(side, 0.43, -0.10);
    cockpitGroup.add(sBase);

    const sBack = new THREE.Mesh(seatBackGeo, materials.interiorLeather);
    sBack.position.set(side, 0.68, -0.34);
    sBack.rotation.x = -0.30;
    cockpitGroup.add(sBack);
  }

  // Dashboard & Center console
  const dashGeo = new THREE.BoxGeometry(1.30, 0.18, 0.36);
  const consoleGeo = new THREE.BoxGeometry(0.18, 0.16, 0.92);
  geometriesToDispose.push(dashGeo, consoleGeo);

  const dashMesh = new THREE.Mesh(dashGeo, materials.interiorLeather);
  dashMesh.position.set(0, 0.68, 0.52);
  cockpitGroup.add(dashMesh);

  const consoleMesh = new THREE.Mesh(consoleGeo, materials.carbon);
  consoleMesh.position.set(0, 0.46, 0.08);
  cockpitGroup.add(consoleMesh);

  // Steering wheel (linked to steering input)
  const steerWheelGeo = new THREE.TorusGeometry(0.145, 0.02, 10, 24);
  geometriesToDispose.push(steerWheelGeo);
  const steeringWheelMesh = new THREE.Mesh(steerWheelGeo, materials.interiorLeather);
  steeringWheelMesh.position.set(0.34, 0.72, 0.32);
  steeringWheelMesh.rotation.x = 0.25;
  cockpitGroup.add(steeringWheelMesh);

  tagPart(cockpitGroup, 'cockpit');
  bodyPivot.add(cockpitGroup);

  // ---------------------------------------------------------------------------
  // 6. Active Carbon Rear Wing (Deployable)
  // ---------------------------------------------------------------------------
  const spoilerGroup = new THREE.Group();
  spoilerGroup.position.set(0, 0.89, -2.02);

  const bladeGeo = new THREE.BoxGeometry(1.62, 0.032, 0.25);
  const endplateGeo = new THREE.BoxGeometry(0.025, 0.14, 0.30);
  const pylonGeo = new THREE.BoxGeometry(0.03, 0.16, 0.14);
  geometriesToDispose.push(bladeGeo, endplateGeo, pylonGeo);

  const wingBlade = new THREE.Mesh(bladeGeo, materials.carbon);
  wingBlade.position.set(0, 0.07, 0);
  wingBlade.rotation.x = -0.06;
  wingBlade.castShadow = true;
  spoilerGroup.add(wingBlade);

  for (const side of [-1, 1]) {
    const endplate = new THREE.Mesh(endplateGeo, materials.carbon);
    endplate.position.set(side * 0.81, 0.055, -0.01);
    endplate.castShadow = true;
    spoilerGroup.add(endplate);

    const pylon = new THREE.Mesh(pylonGeo, materials.darkTrim);
    pylon.position.set(side * 0.40, 0.0, 0.02);
    pylon.rotation.x = 0.22;
    spoilerGroup.add(pylon);
  }

  tagPart(spoilerGroup, 'aero');
  bodyPivot.add(spoilerGroup);

  // ---------------------------------------------------------------------------
  // 7. 4 Independent Wheel, Rim & Carbon-Ceramic Brake Assemblies
  // ---------------------------------------------------------------------------
  const frontLeftSteer = new THREE.Group();
  frontLeftSteer.position.set(0.84, 0.355, 1.36);

  const frontRightSteer = new THREE.Group();
  frontRightSteer.position.set(-0.84, 0.355, 1.36);

  const rearLeftMount = new THREE.Group();
  rearLeftMount.position.set(0.85, 0.365, -1.36);

  const rearRightMount = new THREE.Group();
  rearRightMount.position.set(-0.85, 0.365, -1.36);

  const fl = createWheelAssembly(true, 0.355, 0.27, materials, geometriesToDispose);
  const fr = createWheelAssembly(false, 0.355, 0.27, materials, geometriesToDispose);
  const rl = createWheelAssembly(true, 0.365, 0.31, materials, geometriesToDispose);
  const rr = createWheelAssembly(false, 0.365, 0.31, materials, geometriesToDispose);

  frontLeftSteer.add(fl.hubGroup);
  frontRightSteer.add(fr.hubGroup);
  rearLeftMount.add(rl.hubGroup);
  rearRightMount.add(rr.hubGroup);

  root.add(frontLeftSteer, frontRightSteer, rearLeftMount, rearRightMount);

  const wheelsSpin = [fl.spinGroup, fr.spinGroup, rl.spinGroup, rr.spinGroup];

  // ---------------------------------------------------------------------------
  // 8. Exploded View Layer Mapping (Nothing clips below y=0!)
  // ---------------------------------------------------------------------------
  explodables.push(
    { object: bodyShellGroup, basePos: bodyShellGroup.position.clone(), offset: new THREE.Vector3(0, 0.62, 0) },
    { object: lightsGroup, basePos: lightsGroup.position.clone(), offset: new THREE.Vector3(0, 0.62, 0.35) },
    { object: canopyGroup, basePos: canopyGroup.position.clone(), offset: new THREE.Vector3(0, 1.28, 0) },
    { object: cockpitGroup, basePos: cockpitGroup.position.clone(), offset: new THREE.Vector3(0, 0.28, 0) },
    { object: splitterGroup, basePos: splitterGroup.position.clone(), offset: new THREE.Vector3(0, 0.05, 0.48) },
    { object: diffuserGroup, basePos: diffuserGroup.position.clone(), offset: new THREE.Vector3(0, 0.05, -0.48) },
    { object: spoilerGroup, basePos: spoilerGroup.position.clone(), offset: new THREE.Vector3(0, 0.92, -0.35) },
    { object: fl.wheelVisualGroup, basePos: fl.wheelVisualGroup.position.clone(), offset: new THREE.Vector3(0.55, 0, 0) },
    { object: fr.wheelVisualGroup, basePos: fr.wheelVisualGroup.position.clone(), offset: new THREE.Vector3(-0.55, 0, 0) },
    { object: rl.wheelVisualGroup, basePos: rl.wheelVisualGroup.position.clone(), offset: new THREE.Vector3(0.55, 0, 0) },
    { object: rr.wheelVisualGroup, basePos: rr.wheelVisualGroup.position.clone(), offset: new THREE.Vector3(-0.55, 0, 0) },
    { object: fl.brakeGroup, basePos: fl.brakeGroup.position.clone(), offset: new THREE.Vector3(0.24, 0, 0) },
    { object: fr.brakeGroup, basePos: fr.brakeGroup.position.clone(), offset: new THREE.Vector3(-0.24, 0, 0) },
    { object: rl.brakeGroup, basePos: rl.brakeGroup.position.clone(), offset: new THREE.Vector3(0.24, 0, 0) },
    { object: rr.brakeGroup, basePos: rr.brakeGroup.position.clone(), offset: new THREE.Vector3(-0.24, 0, 0) }
  );

  // Collect meshes for raycasting
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      clickableMeshes.push(obj);
    }
  });

  const spoilerBaseY = 0.89;
  const spoilerBaseZ = -2.02;

  return {
    root,
    bodyPivot,
    wheelsSpin,
    frontLeftSteer,
    frontRightSteer,
    spoilerGroup,
    steeringWheelMesh,
    headlightBeamLeft,
    headlightBeamRight,
    clickableMeshes,
    applyExploded: (factor: number) => {
      for (const item of explodables) {
        if (item.object === spoilerGroup) continue; // handled with spoiler deploy below
        item.object.position.copy(item.basePos).addScaledVector(item.offset, factor);
      }
      // Update spoiler offset with exploded factor
      spoilerGroup.userData.explodedFactor = factor;
    },
    applySpoiler: (deployFactor: number) => {
      const exp = (spoilerGroup.userData.explodedFactor as number) || 0;
      spoilerGroup.position.set(
        0,
        spoilerBaseY + deployFactor * 0.13 + exp * 0.92,
        spoilerBaseZ - deployFactor * 0.05 - exp * 0.35
      );
      spoilerGroup.rotation.x = -deployFactor * 0.22;
    },
    setDriveKinematics: (
      wheelRotationRad: number,
      steerAngleRad: number,
      pitchRad: number,
      rollRad: number
    ) => {
      for (const w of wheelsSpin) {
        w.rotation.x = wheelRotationRad;
      }
      frontLeftSteer.rotation.y = steerAngleRad;
      frontRightSteer.rotation.y = steerAngleRad;
      steeringWheelMesh.rotation.z = -steerAngleRad * 3.2;
      bodyPivot.rotation.x = pitchRad;
      bodyPivot.rotation.z = rollRad;
    },
    dispose: () => {
      geometriesToDispose.forEach((g) => g.dispose());
    },
  };
}
