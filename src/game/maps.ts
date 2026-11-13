import * as THREE from 'three';
import { MapId } from '@/src/types/game';
import { GameTextures } from './textures';

export interface AABBCollider {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface BuiltMap {
  root: THREE.Group;
  colliders: AABBCollider[];
  obstacleMeshes: THREE.Object3D[];
  ctSpawns: THREE.Vector3[];
  tSpawns: THREE.Vector3[];
  patrolPoints: THREE.Vector3[];
  skyColor: string;
  fogColor: string;
  fogDensity: number;
  dispose: () => void;
}

export function buildArenaMap(mapId: MapId, textures: GameTextures): BuiltMap {
  const root = new THREE.Group();
  const colliders: AABBCollider[] = [];
  const obstacleMeshes: THREE.Object3D[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const isMirage = mapId === 'mirage';

  const groundMat = new THREE.MeshStandardMaterial({
    map: isMirage ? textures.sandGround : textures.concreteFloor,
    roughness: 0.88,
    metalness: isMirage ? 0.04 : 0.14,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    map: isMirage ? textures.sandWall : textures.concreteFloor,
    color: isMirage ? '#e8d8bc' : '#525b68',
    roughness: 0.85,
    metalness: isMirage ? 0.05 : 0.25,
  });
  const crateMat = new THREE.MeshStandardMaterial({
    map: isMirage ? textures.woodCrate : textures.steelContainer,
    roughness: isMirage ? 0.72 : 0.42,
    metalness: isMirage ? 0.08 : 0.55,
  });
  const accentTrimMat = new THREE.MeshStandardMaterial({
    map: isMirage ? undefined : textures.hazardTrim,
    color: isMirage ? '#9a7b56' : '#ffffff',
    roughness: 0.65,
    metalness: 0.2,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: '#28323e',
    roughness: 0.45,
    metalness: 0.72,
  });

  materials.push(groundMat, wallMat, crateMat, accentTrimMat, steelMat);

  // Vast outer ground + arena floor
  const floorGeo = new THREE.PlaneGeometry(160, 160);
  floorGeo.rotateX(-Math.PI / 2);
  geometries.push(floorGeo);
  const floor = new THREE.Mesh(floorGeo, groundMat);
  floor.receiveShadow = true;
  root.add(floor);

  const addBoxObstacle = (
    w: number,
    h: number,
    d: number,
    x: number,
    yCenter: number,
    z: number,
    mat: THREE.Material,
    registerCollider = true
  ) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    geometries.push(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, yCenter, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    if (registerCollider) {
      obstacleMeshes.push(mesh);
      colliders.push({
        minX: x - w * 0.5,
        maxX: x + w * 0.5,
        minY: yCenter - h * 0.5,
        maxY: yCenter + h * 0.5,
        minZ: z - d * 0.5,
        maxZ: z + d * 0.5,
      });
    }
    return mesh;
  };

  // Outer Arena Boundary (48m x 60m tactical combat yard)
  const halfW = 24;
  const halfL = 30;
  const wallH = 5.4;

  // Perimeter walls
  addBoxObstacle(halfW * 2 + 2, wallH, 1.4, 0, wallH / 2, -halfL, wallMat);
  addBoxObstacle(halfW * 2 + 2, wallH, 1.4, 0, wallH / 2, halfL, wallMat);
  addBoxObstacle(1.4, wallH, halfL * 2 + 2, -halfW, wallH / 2, 0, wallMat);
  addBoxObstacle(1.4, wallH, halfL * 2 + 2, halfW, wallH / 2, 0, wallMat);

  // Decorative horizon buildings outside perimeter (for depth)
  const skylineGeo = new THREE.BoxGeometry(10, 14, 10);
  geometries.push(skylineGeo);
  const skylineMat = new THREE.MeshStandardMaterial({
    color: isMirage ? '#c7ae88' : '#1e2530',
    roughness: 0.9,
  });
  materials.push(skylineMat);
  const skylinePositions: [number, number, number][] = [
    [-36, 7, -34],
    [0, 9, -44],
    [36, 7, -32],
    [-38, 8, 34],
    [36, 10, 36],
    [-40, 6, 0],
    [40, 8, 2],
  ];
  for (const [sx, sy, sz] of skylinePositions) {
    const b = new THREE.Mesh(skylineGeo, skylineMat);
    b.position.set(sx, sy, sz);
    root.add(b);
  }

  if (isMirage) {
    // Central Sniper Nest / Mid Pillar & Courtyard Arches
    addBoxObstacle(3.8, 3.2, 3.8, 0, 1.6, 0, wallMat);
    addBoxObstacle(4.2, 0.35, 4.2, 0, 3.35, 0, accentTrimMat, false);

    // Mid Cover Wooden Crates
    addBoxObstacle(1.6, 1.6, 1.6, -4.5, 0.8, 4.5, crateMat);
    addBoxObstacle(1.6, 1.6, 1.6, 4.8, 0.8, -4.5, crateMat);
    addBoxObstacle(1.4, 1.4, 1.4, -3.5, 2.2, 4.5, crateMat); // stacked double crate

    // Site A (West Lane, x = -14)
    addBoxObstacle(1.4, 4.2, 11.0, -9.5, 2.1, -6.0, wallMat);
    addBoxObstacle(1.4, 4.2, 11.0, -9.5, 2.1, 10.5, wallMat);
    addBoxObstacle(2.2, 1.8, 2.2, -15.5, 0.9, -2.0, crateMat);
    addBoxObstacle(2.2, 1.8, 2.2, -15.5, 2.7, -2.0, crateMat);
    addBoxObstacle(2.0, 1.5, 3.2, -16.8, 0.75, 9.0, crateMat);
    addBoxObstacle(2.6, 1.4, 1.6, -13.5, 0.7, -14.0, crateMat);

    // Site B (East Lane, x = +14)
    addBoxObstacle(1.4, 4.2, 10.0, 9.5, 2.1, -9.0, wallMat);
    addBoxObstacle(1.4, 4.2, 10.0, 9.5, 2.1, 8.5, wallMat);
    addBoxObstacle(2.4, 1.8, 2.4, 15.8, 0.9, 1.5, crateMat);
    addBoxObstacle(1.8, 1.5, 1.8, 13.5, 0.75, -12.0, crateMat);
    addBoxObstacle(2.2, 1.6, 2.2, 16.5, 0.8, 14.0, crateMat);

    // Spawn Cover Walls (CT at -Z, T at +Z)
    addBoxObstacle(6.5, 2.2, 1.2, 0, 1.1, -18.5, wallMat);
    addBoxObstacle(6.5, 2.2, 1.2, 0, 1.1, 18.5, wallMat);
    addBoxObstacle(2.4, 1.5, 2.4, -7.0, 0.75, -20.5, crateMat);
    addBoxObstacle(2.4, 1.5, 2.4, 7.0, 0.75, 20.5, crateMat);
  } else {
    // NUKE HANGAR — Steel Containers, Reactor Silo & Overhead Beams
    // Overhead steel roof trusses (visual immersion)
    for (let z = -22; z <= 22; z += 11) {
      addBoxObstacle(46, 0.6, 0.8, 0, 7.6, z, steelMat, false);
    }

    // Central Reactor Silo + Hazard Base
    const siloGeo = new THREE.CylinderGeometry(2.6, 2.6, 4.8, 24);
    geometries.push(siloGeo);
    const silo = new THREE.Mesh(siloGeo, steelMat);
    silo.position.set(0, 2.4, 0);
    silo.castShadow = true;
    silo.receiveShadow = true;
    root.add(silo);
    obstacleMeshes.push(silo);
    colliders.push({
      minX: -2.4,
      maxX: 2.4,
      minY: 0,
      maxY: 4.8,
      minZ: -2.4,
      maxZ: 2.4,
    });
    addBoxObstacle(5.6, 0.35, 5.6, 0, 0.18, 0, accentTrimMat, false);

    // Blue Shipping Containers
    addBoxObstacle(2.8, 2.8, 6.2, -10.5, 1.4, -6.5, crateMat);
    addBoxObstacle(2.8, 2.8, 6.2, 10.5, 1.4, 6.5, crateMat);
    addBoxObstacle(6.0, 2.8, 2.8, -13.5, 1.4, 11.0, crateMat);
    addBoxObstacle(6.0, 2.8, 2.8, 13.5, 1.4, -11.0, crateMat);
    // Double-stacked container
    addBoxObstacle(2.8, 2.8, 5.8, -16.5, 4.2, -6.5, crateMat);
    addBoxObstacle(2.8, 2.8, 5.8, -16.5, 1.4, -6.5, crateMat);

    // Low concrete tactical barriers
    addBoxObstacle(5.2, 1.45, 1.1, -5.0, 0.725, 12.0, wallMat);
    addBoxObstacle(5.2, 1.45, 1.1, 5.0, 0.725, -12.0, wallMat);
    addBoxObstacle(4.8, 1.6, 1.2, 0, 0.8, -20.0, accentTrimMat);
    addBoxObstacle(4.8, 1.6, 1.2, 0, 0.8, 20.0, accentTrimMat);

    // Side pillars
    for (const px of [-19, 19]) {
      for (const pz of [-16, 0, 16]) {
        addBoxObstacle(1.5, 5.4, 1.5, px, 2.7, pz, steelMat);
      }
    }
  }

  const ctSpawns = [
    new THREE.Vector3(-4, 0, -25),
    new THREE.Vector3(4, 0, -25),
    new THREE.Vector3(-12, 0, -24),
    new THREE.Vector3(12, 0, -24),
    new THREE.Vector3(0, 0, -26),
  ];

  const tSpawns = [
    new THREE.Vector3(-4, 0, 25),
    new THREE.Vector3(4, 0, 25),
    new THREE.Vector3(-12, 0, 24),
    new THREE.Vector3(12, 0, 24),
    new THREE.Vector3(0, 0, 26),
  ];

  const patrolPoints = [
    new THREE.Vector3(-6, 0, 0),
    new THREE.Vector3(6, 0, 0),
    new THREE.Vector3(-15, 0, 3),
    new THREE.Vector3(15, 0, -3),
    new THREE.Vector3(-14, 0, -10),
    new THREE.Vector3(14, 0, 10),
    new THREE.Vector3(0, 0, -11),
    new THREE.Vector3(0, 0, 11),
  ];

  return {
    root,
    colliders,
    obstacleMeshes,
    ctSpawns,
    tSpawns,
    patrolPoints,
    skyColor: isMirage ? '#b7cce0' : '#1b222e',
    fogColor: isMirage ? '#d6c7ad' : '#1b222e',
    fogDensity: isMirage ? 0.0085 : 0.012,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
