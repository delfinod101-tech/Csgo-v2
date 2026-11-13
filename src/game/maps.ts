import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
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

export interface WalkableRamp {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  startY: number;
  endY: number;
  axis: 'x' | 'z';
  dir: 1 | -1;
}

export interface BuiltMap {
  root: THREE.Group;
  colliders: AABBCollider[];
  ramps: WalkableRamp[];
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
  const ramps: WalkableRamp[] = [];
  const obstacleMeshes: THREE.Object3D[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const isMirage = mapId === 'mirage';

  const groundMat = new THREE.MeshStandardMaterial({
    map: isMirage ? textures.miragePaver : textures.hangarFloor,
    bumpMap: isMirage ? textures.miragePaverBump : undefined,
    bumpScale: isMirage ? 0.035 : 0,
    roughness: isMirage ? 0.84 : 0.78,
    metalness: isMirage ? 0.04 : 0.08,
  });
  const wallMat = new THREE.MeshStandardMaterial({
    map: isMirage ? textures.mirageSandstone : textures.hangarWall,
    bumpMap: isMirage ? textures.mirageWallBump : undefined,
    bumpScale: isMirage ? 0.045 : 0,
    color: isMirage ? '#f6ebd9' : '#eef2f6',
    roughness: 0.85,
    metalness: isMirage ? 0.04 : 0.1,
  });
  const crateMat = new THREE.MeshStandardMaterial({
    map: textures.woodCrateWarm,
    roughness: 0.74,
    metalness: 0.05,
  });
  const accentTrimMat = new THREE.MeshStandardMaterial({
    map: isMirage ? undefined : textures.hazardTrim,
    color: isMirage ? '#b7976b' : '#ffffff',
    roughness: 0.65,
    metalness: isMirage ? 0.1 : 0.22,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: '#46505d',
    roughness: 0.44,
    metalness: 0.62,
  });

  materials.push(groundMat, wallMat, crateMat, accentTrimMat, steelMat);

  // Outer ground + arena floor
  const floorGeo = new THREE.PlaneGeometry(180, 180);
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
    registerCollider = true,
    castShadow = true
  ) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    geometries.push(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, yCenter, z);
    mesh.castShadow = castShadow;
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

  // Shared sloped walkable ramp wedge along Z
  const addRampZ = (
    xMin: number,
    xMax: number,
    zMin: number,
    zMax: number,
    yLow: number,
    yHigh: number,
    dir: 1 | -1, // 1: climbs toward +Z, -1: climbs toward -Z
    mat: THREE.Material
  ) => {
    const w = xMax - xMin;
    const len = zMax - zMin;
    const h = yHigh - yLow;
    const shape = new THREE.Shape();
    if (dir === 1) {
      shape.moveTo(0, 0);
      shape.lineTo(len, 0);
      shape.lineTo(len, h);
      shape.closePath();
    } else {
      shape.moveTo(0, 0);
      shape.lineTo(len, 0);
      shape.lineTo(0, h);
      shape.closePath();
    }
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: w,
      bevelEnabled: false,
    });
    geo.translate(0, 0, -w * 0.5);
    geo.rotateY(-Math.PI / 2);
    geo.translate((xMin + xMax) * 0.5, yLow, zMin);
    geometries.push(geo);

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    obstacleMeshes.push(mesh);

    ramps.push({
      minX: xMin,
      maxX: xMax,
      minZ: zMin,
      maxZ: zMax,
      startY: dir === 1 ? yLow : yHigh,
      endY: dir === 1 ? yHigh : yLow,
      axis: 'z',
      dir,
    });
  };

  // Shared decal plane helper
  const addDecalPlane = (
    w: number,
    h: number,
    x: number,
    y: number,
    z: number,
    rotX: number,
    rotY: number,
    mat: THREE.Material
  ) => {
    const geo = new THREE.PlaneGeometry(w, h);
    geometries.push(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rotX, rotY, 0);
    root.add(mesh);
    return mesh;
  };

  if (isMirage) {
    // =========================================================================
    // MIRAGE PÁTIO — Sunlit Sandstone Courtyards, Yellow-Tank Pallet,
    // Palace Wooden Balcony, Stone Stairs, Moorish Archway & Minaret,
    // Bazaar Market Awning, Dripping A/B Sprays, Carpets & Palm Trees
    // =========================================================================

    const timberMat = new THREE.MeshStandardMaterial({
      color: '#5b3d24',
      roughness: 0.8,
      metalness: 0.05,
    });
    const hazardCrateMat = new THREE.MeshStandardMaterial({
      map: textures.hazardWoodCrate,
      roughness: 0.72,
      metalness: 0.08,
    });
    const tankYellowMat = new THREE.MeshStandardMaterial({
      color: '#eab308',
      roughness: 0.3,
      metalness: 0.45,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: '#c89238',
      roughness: 0.32,
      metalness: 0.78,
    });
    const lanternGlowMat = new THREE.MeshStandardMaterial({
      color: '#ffe3a3',
      emissive: '#ffaa3b',
      emissiveIntensity: 2.2,
      roughness: 0.2,
    });
    const terracottaMat = new THREE.MeshStandardMaterial({
      color: '#b8623d',
      roughness: 0.78,
      metalness: 0.04,
    });
    const latticeMat = new THREE.MeshStandardMaterial({
      map: textures.mirageLattice,
      roughness: 0.76,
      metalness: 0.08,
    });
    const carpetMat = new THREE.MeshStandardMaterial({
      map: textures.redCarpet,
      roughness: 0.88,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    const canopyOliveMat = new THREE.MeshStandardMaterial({
      color: '#55703d',
      roughness: 0.9,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    const canopyTanMat = new THREE.MeshStandardMaterial({
      color: '#9c865b',
      roughness: 0.9,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    const palmTrunkMat = new THREE.MeshStandardMaterial({
      color: '#7a5738',
      roughness: 0.88,
    });
    const palmLeafMat = new THREE.MeshStandardMaterial({
      color: '#46822f',
      roughness: 0.66,
      side: THREE.DoubleSide,
    });
    const palmLeafHighlightMat = new THREE.MeshStandardMaterial({
      color: '#62a33d',
      roughness: 0.62,
      side: THREE.DoubleSide,
    });
    const moorishArchMat = new THREE.MeshStandardMaterial({
      map: textures.moorishCarving,
      roughness: 0.76,
    });
    const sprayAMat = new THREE.MeshStandardMaterial({
      map: textures.sprayA,
      transparent: true,
      alphaTest: 0.2,
      roughness: 0.8,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const sprayBMat = new THREE.MeshStandardMaterial({
      map: textures.sprayB,
      transparent: true,
      alphaTest: 0.2,
      roughness: 0.8,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const sprayLeftAMat = new THREE.MeshStandardMaterial({
      map: textures.sprayLeftA,
      transparent: true,
      alphaTest: 0.2,
      roughness: 0.8,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const sprayRightBMat = new THREE.MeshStandardMaterial({
      map: textures.sprayRightB,
      transparent: true,
      alphaTest: 0.2,
      roughness: 0.8,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const floorCircleAMat = new THREE.MeshStandardMaterial({
      map: textures.floorCircleA,
      transparent: true,
      alphaTest: 0.15,
      roughness: 0.82,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const darkArchVoidMat = new THREE.MeshStandardMaterial({
      color: '#2d251d',
      roughness: 0.9,
    });

    materials.push(
      timberMat,
      hazardCrateMat,
      tankYellowMat,
      brassMat,
      lanternGlowMat,
      terracottaMat,
      latticeMat,
      carpetMat,
      canopyOliveMat,
      canopyTanMat,
      palmTrunkMat,
      palmLeafMat,
      palmLeafHighlightMat,
      moorishArchMat,
      sprayAMat,
      sprayBMat,
      sprayLeftAMat,
      sprayRightBMat,
      floorCircleAMat,
      darkArchVoidMat
    );

    // -------------------------------------------------------------------------
    // MIRAGE GEOMETRY BATCHER: Merges static meshes per (material, obstacle, shadow)
    // to reduce ~260+ courtyard draw calls down to ~18 batched GPU calls.
    // -------------------------------------------------------------------------
    interface BatchBucket {
      mat: THREE.Material;
      isObstacle: boolean;
      castShadow: boolean;
      geos: THREE.BufferGeometry[];
    }
    const batchBuckets = new Map<string, BatchBucket>();
    const matIds = new Map<THREE.Material, number>();
    let nextMatId = 1;
    const tempMatrix = new THREE.Matrix4();
    const tempPos = new THREE.Vector3();
    const tempEuler = new THREE.Euler();
    const tempQuat = new THREE.Quaternion();
    const tempScale = new THREE.Vector3();

    const getMatId = (mat: THREE.Material) => {
      let id = matIds.get(mat);
      if (!id) {
        id = nextMatId++;
        matIds.set(mat, id);
      }
      return id;
    };

    const normalizeForMerge = (raw: THREE.BufferGeometry): THREE.BufferGeometry => {
      const g = raw.index ? raw.toNonIndexed() : raw.clone();
      raw.dispose();
      // Keep strict uniform attribute set (position, normal, uv) so mergeGeometries never fails
      for (const name of Object.keys(g.attributes)) {
        if (name !== 'position' && name !== 'normal' && name !== 'uv') {
          g.deleteAttribute(name);
        }
      }
      if (!g.getAttribute('normal')) {
        g.computeVertexNormals();
      }
      if (!g.getAttribute('uv')) {
        const count = g.getAttribute('position').count;
        g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
      }
      return g;
    };

    const batchGeo = (
      rawGeo: THREE.BufferGeometry,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number,
      isObstacle: boolean,
      castShadow: boolean,
      rotX = 0,
      rotY = 0,
      rotZ = 0,
      scaleX = 1,
      scaleY = 1,
      scaleZ = 1
    ) => {
      const geo = normalizeForMerge(rawGeo);
      tempPos.set(x, y, z);
      tempEuler.set(rotX, rotY, rotZ);
      tempQuat.setFromEuler(tempEuler);
      tempScale.set(scaleX, scaleY, scaleZ);
      tempMatrix.compose(tempPos, tempQuat, tempScale);
      geo.applyMatrix4(tempMatrix);

      const key = `${getMatId(mat)}|${isObstacle ? 1 : 0}|${castShadow ? 1 : 0}`;
      let bucket = batchBuckets.get(key);
      if (!bucket) {
        bucket = { mat, isObstacle, castShadow, geos: [] };
        batchBuckets.set(key, bucket);
      }
      bucket.geos.push(geo);
    };

    const addBatchedBox = (
      w: number,
      h: number,
      d: number,
      x: number,
      yCenter: number,
      z: number,
      mat: THREE.Material,
      registerCollider = true,
      castShadow = true,
      rotX = 0,
      rotY = 0,
      rotZ = 0
    ) => {
      if (registerCollider) {
        colliders.push({
          minX: x - w * 0.5,
          maxX: x + w * 0.5,
          minY: yCenter - h * 0.5,
          maxY: yCenter + h * 0.5,
          minZ: z - d * 0.5,
          maxZ: z + d * 0.5,
        });
      }
      batchGeo(
        new THREE.BoxGeometry(w, h, d),
        mat,
        x,
        yCenter,
        z,
        registerCollider,
        castShadow,
        rotX,
        rotY,
        rotZ
      );
    };

    const addBatchedRampZ = (
      xMin: number,
      xMax: number,
      zMin: number,
      zMax: number,
      yLow: number,
      yHigh: number,
      dir: 1 | -1,
      mat: THREE.Material
    ) => {
      const w = xMax - xMin;
      const len = zMax - zMin;
      const h = yHigh - yLow;
      const shape = new THREE.Shape();
      if (dir === 1) {
        shape.moveTo(0, 0);
        shape.lineTo(len, 0);
        shape.lineTo(len, h);
        shape.closePath();
      } else {
        shape.moveTo(0, 0);
        shape.lineTo(len, 0);
        shape.lineTo(0, h);
        shape.closePath();
      }
      const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
      geo.translate(0, 0, -w * 0.5);
      geo.rotateY(-Math.PI / 2);
      batchGeo(geo, mat, (xMin + xMax) * 0.5, yLow, zMin, true, true);
      ramps.push({
        minX: xMin,
        maxX: xMax,
        minZ: zMin,
        maxZ: zMax,
        startY: dir === 1 ? yLow : yHigh,
        endY: dir === 1 ? yHigh : yLow,
        axis: 'z',
        dir,
      });
    };

    // Reusable lathe profile for Moroccan terracotta clay amphoras / urns
    const urnPoints = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.22, 0.0),
      new THREE.Vector2(0.26, 0.14),
      new THREE.Vector2(0.36, 0.42),
      new THREE.Vector2(0.31, 0.64),
      new THREE.Vector2(0.15, 0.78),
      new THREE.Vector2(0.17, 0.90),
      new THREE.Vector2(0.22, 0.95),
      new THREE.Vector2(0.18, 0.96),
      new THREE.Vector2(0.13, 0.88),
    ];
    const addTerracottaUrn = (x: number, yBase: number, z: number, scale = 1.0) => {
      const geo = new THREE.LatheGeometry(urnPoints, 12);
      batchGeo(geo, terracottaMat, x, yBase, z, true, true, 0, 0, 0, scale, scale, scale);
      colliders.push({
        minX: x - 0.34 * scale,
        maxX: x + 0.34 * scale,
        minY: yBase,
        maxY: yBase + 0.96 * scale,
        minZ: z - 0.34 * scale,
        maxZ: z + 0.34 * scale,
      });
    };

    // Helper: Hanging Hammered-Brass Moroccan Wall Lantern (visual only, batched)
    const addBrassLantern = (x: number, y: number, z: number, bracketOffsetX = 0, bracketOffsetZ = 0) => {
      if (bracketOffsetX !== 0 || bracketOffsetZ !== 0) {
        addBatchedBox(
          Math.abs(bracketOffsetX) > 0 ? Math.abs(bracketOffsetX) + 0.08 : 0.06,
          0.06,
          Math.abs(bracketOffsetZ) > 0 ? Math.abs(bracketOffsetZ) + 0.08 : 0.06,
          x - bracketOffsetX * 0.5,
          y + 0.24,
          z - bracketOffsetZ * 0.5,
          steelMat,
          false,
          false
        );
      }
      batchGeo(new THREE.CylinderGeometry(0.11, 0.08, 0.24, 6), lanternGlowMat, x, y, z, false, false);
      batchGeo(new THREE.ConeGeometry(0.16, 0.14, 6), brassMat, x, y + 0.18, z, false, false);
      batchGeo(new THREE.CylinderGeometry(0.09, 0.03, 0.10, 6), brassMat, x, y - 0.16, z, false, false);
    };

    // Helper: Recessed Moroccan Carved Door or Mashrabiya Upper Window on Wall Face
    const addCourtyardFacadeDetail = (
      x: number,
      yCenter: number,
      z: number,
      w: number,
      h: number,
      axis: 'x' | 'z', // 'x' faces +/-X, 'z' faces +/-Z
      withLintel = true
    ) => {
      if (axis === 'x') {
        addBatchedBox(0.1, h, w, x, yCenter, z, latticeMat, false, false);
        if (withLintel) {
          addBatchedBox(0.2, 0.18, w + 0.32, x, yCenter + h * 0.5 + 0.08, z, accentTrimMat, false, false);
          addBatchedBox(0.18, 0.14, w + 0.24, x, yCenter - h * 0.5 - 0.06, z, accentTrimMat, false, false);
        }
      } else {
        addBatchedBox(w, h, 0.1, x, yCenter, z, latticeMat, false, false);
        if (withLintel) {
          addBatchedBox(w + 0.32, 0.18, 0.2, x, yCenter + h * 0.5 + 0.08, z, accentTrimMat, false, false);
          addBatchedBox(w + 0.24, 0.14, 0.18, x, yCenter - h * 0.5 - 0.06, z, accentTrimMat, false, false);
        }
      }
    };

    // Helper: Stylized Lush Two-Tone Palm Tree (fully batched!)
    const addPalmTree = (x: number, z: number, height = 6.2, tiltX = 0.08) => {
      const segs = 5;
      const segH = height / segs;
      let curX = 0;
      let curY = 0;
      for (let i = 0; i < segs; i++) {
        const rBot = 0.28 - i * 0.03;
        const rTop = 0.24 - i * 0.03;
        const lean = tiltX * (i + 0.5);
        batchGeo(
          new THREE.CylinderGeometry(rTop, rBot, segH + 0.15, 7),
          palmTrunkMat,
          x + curX + lean * 0.22,
          curY + segH * 0.5,
          z,
          false,
          true,
          0,
          0,
          -lean * 0.35
        );
        curX += lean * 0.42;
        curY += segH;
      }

      // Coconut cluster under crown
      for (const [cx, cz] of [[0.14, 0.1], [-0.14, 0.08], [0, -0.15]]) {
        batchGeo(
          new THREE.SphereGeometry(0.14, 7, 6),
          timberMat,
          x + curX + cx,
          curY - 0.12,
          z + cz,
          false,
          true
        );
      }

      const crownX = x + curX;
      const crownY = curY;
      const frondCount = 11;
      for (let f = 0; f < frondCount; f++) {
        const angle = (f / frondCount) * Math.PI * 2;
        const sinA = Math.sin(angle);
        const cosA = Math.cos(angle);
        const mat = f % 2 === 0 ? palmLeafMat : palmLeafHighlightMat;
        // Inner arched blade
        batchGeo(
          new THREE.BoxGeometry(0.46, 0.07, 1.55),
          mat,
          crownX + sinA * 0.72,
          crownY + 0.28,
          z + cosA * 0.72,
          false,
          true,
          -0.32,
          angle,
          0
        );
        // Drooping outer tip
        batchGeo(
          new THREE.BoxGeometry(0.32, 0.05, 1.25),
          mat,
          crownX + sinA * 1.9,
          crownY + 0.06,
          z + cosA * 1.9,
          false,
          true,
          0.38,
          angle,
          0
        );
      }
    };

    // Helper: Wooden Barrel (batched!)
    const addWoodenBarrel = (x: number, yBase: number, z: number) => {
      batchGeo(new THREE.CylinderGeometry(0.42, 0.39, 1.08, 12), timberMat, x, yBase + 0.54, z, true, true);
      for (const hy of [0.22, 0.86]) {
        batchGeo(new THREE.CylinderGeometry(0.435, 0.435, 0.08, 12), steelMat, x, yBase + hy, z, false, false);
      }
      colliders.push({
        minX: x - 0.42,
        maxX: x + 0.42,
        minY: yBase,
        maxY: yBase + 1.08,
        minZ: z - 0.42,
        maxZ: z + 0.42,
      });
    };

    // Helper: Sandstone Staircase (WalkableRamp + stepped stone treads, batched)
    const addStoneStairsZ = (
      xMin: number,
      xMax: number,
      zMin: number,
      zMax: number,
      yLow: number,
      yHigh: number,
      dir: 1 | -1
    ) => {
      addBatchedRampZ(xMin, xMax, zMin, zMax, yLow, yHigh, dir, wallMat);
      const steps = 10;
      const w = xMax - xMin;
      const cx = (xMin + xMax) * 0.5;
      const stepDepth = (zMax - zMin) / steps;
      const stepHeight = (yHigh - yLow) / steps;
      for (let i = 0; i < steps; i++) {
        const idx = dir === 1 ? i : steps - 1 - i;
        const h = (idx + 1) * stepHeight;
        const zc = zMin + (i + 0.5) * stepDepth;
        addBatchedBox(w + 0.04, 0.14, stepDepth * 0.9, cx, yLow + h - 0.04, zc, accentTrimMat, false);
      }
    };

    // -------------------------------------------------------------------------
    // 1. OUTER PERIMETER WALLS, CORNICES, PILASTERS, MOORISH ARCH & MINARET
    // -------------------------------------------------------------------------
    const halfW = 24;
    const halfL = 30;
    const wallH = 6.2;

    addBatchedBox(halfW * 2 + 2, wallH, 1.4, 0, wallH / 2, -halfL, wallMat);
    addBatchedBox(halfW * 2 + 2, wallH, 1.4, 0, wallH / 2, halfL, wallMat);
    addBatchedBox(1.4, wallH, halfL * 2 + 2, -halfW, wallH / 2, 0, wallMat);
    addBatchedBox(1.4, wallH, halfL * 2 + 2, halfW, wallH / 2, 0, wallMat);

    // Sandstone cornice caps along all 4 perimeter walls
    addBatchedBox(halfW * 2 + 2.4, 0.28, 1.7, 0, wallH + 0.1, -halfL, accentTrimMat, false);
    addBatchedBox(halfW * 2 + 2.4, 0.28, 1.7, 0, wallH + 0.1, halfL, accentTrimMat, false);
    addBatchedBox(1.7, 0.28, halfL * 2 + 2.4, -halfW, wallH + 0.1, 0, accentTrimMat, false);
    addBatchedBox(1.7, 0.28, halfL * 2 + 2.4, halfW, wallH + 0.1, 0, accentTrimMat, false);

    // Grand Carved Moorish Archway Facade on North Wall (behind CT) + Flanking Lanterns
    addBatchedBox(9.0, 7.6, 1.0, 0, 3.8, -29.1, wallMat, false);
    addBatchedBox(5.2, 5.2, 0.35, 0, 2.6, -28.55, moorishArchMat, false);
    addBatchedBox(9.6, 0.45, 1.3, 0, 7.7, -29.1, accentTrimMat, false);
    addBrassLantern(-4.1, 3.6, -28.25, 0, 0.28);
    addBrassLantern(4.1, 3.6, -28.25, 0, 0.28);

    // Upper Moroccan Mashrabiya Courtyard Windows & Recessed Wooden Doors
    addCourtyardFacadeDetail(-14.5, 4.4, -29.25, 1.5, 1.8, 'z');
    addCourtyardFacadeDetail(14.5, 4.4, -29.25, 1.5, 1.8, 'z');
    addCourtyardFacadeDetail(-16.0, 4.4, 29.25, 1.5, 1.8, 'z');
    addCourtyardFacadeDetail(16.0, 4.4, 29.25, 1.5, 1.8, 'z');
    addCourtyardFacadeDetail(23.25, 1.35, 19.0, 1.8, 2.5, 'x'); // Recessed cedar door on East wall
    addCourtyardFacadeDetail(-23.25, 4.8, -11.0, 1.4, 1.6, 'x'); // Palace upper window
    addCourtyardFacadeDetail(-23.25, 4.8, 1.0, 1.4, 1.6, 'x');

    // Tall Minaret / Clock Tower rising above North Wall
    addBatchedBox(6.2, 16.5, 6.2, -5.8, 8.25, -33.6, wallMat, false);
    addBatchedBox(6.6, 0.45, 6.6, -5.8, 16.5, -33.6, accentTrimMat, false);
    for (const wx of [-7.4, -5.8, -4.2]) {
      addBatchedBox(0.75, 1.8, 0.3, wx, 13.8, -30.45, darkArchVoidMat, false);
    }

    // Surrounding Desert Skyline Buildings & Rooftop Antennas (castShadow: false for high perf)
    const skylineBuildings: [number, number, number, number, number, number][] = [
      [12, 10, 10, -33, 5, -33],
      [14, 12, 10, 16, 6, -34],
      [12, 10, 12, 33, 5, -28],
      [10, 11, 14, -34, 5.5, 10],
      [12, 12, 12, 34, 6, 14],
      [14, 9, 10, -28, 4.5, 35],
      [16, 11, 10, 22, 5.5, 36],
    ];
    for (const [bw, bh, bd, bx, by, bz] of skylineBuildings) {
      addBatchedBox(bw, bh, bd, bx, by, bz, wallMat, false, false);
      addBatchedBox(bw + 0.4, 0.35, bd + 0.4, bx, bh + 0.15, bz, accentTrimMat, false, false);
      addBatchedBox(0.08, 3.2, 0.08, bx + 1.2, bh + 1.7, bz, steelMat, false, false);
      addBatchedBox(1.3, 0.06, 0.06, bx + 1.2, bh + 2.8, bz, steelMat, false, false);
    }

    // -------------------------------------------------------------------------
    // 2. SITE A CENTERPIECE: DOME-TOP YELLOW-TANK PALLET + (A) FLOOR CIRCLE + HAZARD CRATE
    // -------------------------------------------------------------------------
    addBatchedBox(2.45, 0.22, 2.45, 0, 0.11, -1.0, steelMat, true);
    addBatchedBox(2.45, 0.14, 2.45, 0, 2.28, -1.0, steelMat, true);
    for (const px of [-1.14, 1.14]) {
      for (const pz of [-2.14, 0.14]) {
        addBatchedBox(0.14, 2.2, 0.14, px, 1.12, pz, steelMat, false);
      }
    }
    addBatchedBox(2.48, 0.12, 2.48, 0, 1.2, -1.0, steelMat, false);

    // 3x2 Array of Rounded-Dome Pressurized Yellow Tanks + Brass Valves (batched)
    for (const tx of [-0.72, 0, 0.72]) {
      for (const tz of [-1.52, -0.48]) {
        batchGeo(new THREE.CylinderGeometry(0.32, 0.32, 1.72, 12), tankYellowMat, tx, 1.08, tz, true, true);
        batchGeo(
          new THREE.SphereGeometry(0.32, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
          tankYellowMat,
          tx,
          1.94,
          tz,
          true,
          true
        );
        batchGeo(new THREE.CylinderGeometry(0.09, 0.13, 0.12, 10), brassMat, tx, 2.26, tz, false, false);
        batchGeo(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 10), steelMat, tx, 2.34, tz, false, false);
      }
    }
    colliders.push({
      minX: -1.25,
      maxX: 1.25,
      minY: 0,
      maxY: 2.38,
      minZ: -2.25,
      maxZ: 0.25,
    });

    // Red "(A)" Floor Circle Decal
    addDecalPlane(3.2, 3.2, 0, 0.02, 3.8, -Math.PI / 2, 0, floorCircleAMat);
    addDecalPlane(3.2, 3.2, 0, 0.02, -5.0, -Math.PI / 2, Math.PI, floorCircleAMat);

    // Dark Timber Crate with Orange-Black Hazard Stripe Band ("Firebox") + Barrel
    addBatchedBox(1.65, 1.44, 1.35, 5.2, 0.72, 4.4, hazardCrateMat);
    addWoodenBarrel(6.55, 0, 4.4);

    // -------------------------------------------------------------------------
    // 3. CT ARCHWAY PORTAL (Z = -18.5) WITH PILASTERS & CORNICE
    // -------------------------------------------------------------------------
    addBatchedBox(3.2, 4.8, 1.8, -6.2, 2.4, -18.5, wallMat);
    addBatchedBox(3.2, 4.8, 1.8, 6.2, 2.4, -18.5, wallMat);
    addBatchedBox(15.6, 1.8, 1.9, 0, 4.9, -18.5, wallMat, true);
    addBatchedBox(16.0, 0.28, 2.1, 0, 5.9, -18.5, accentTrimMat, false);
    // Pilasters framing portal opening
    addBatchedBox(0.32, 4.8, 2.05, -4.6, 2.4, -18.5, accentTrimMat, false);
    addBatchedBox(0.32, 4.8, 2.05, 4.6, 2.4, -18.5, accentTrimMat, false);

    // -------------------------------------------------------------------------
    // 4. WEST TWO-STORY WOODEN BALCONY ("PALACE") + RAFTERS + LANTERNS + STAIRS
    // -------------------------------------------------------------------------
    // Palace Balcony Deck (X: -23.3 .. -18.8, Z: -18 .. +8, y = 3.3 .. 3.55)
    addBatchedBox(4.5, 0.25, 26.0, -21.05, 3.425, -5.0, timberMat, true);
    // Palace Sandstone Staircase (Z: +8 .. +16, y: 0 -> 3.55)
    addStoneStairsZ(-23.3, -18.8, 8.0, 16.0, 0, 3.55, -1);

    // Dark Timber Balcony Support Posts, Diagonal Knee-Braces, Wall Lanterns & Balustrade
    for (const pz of [-17.5, -11.5, -5.5, 0.5, 7.5]) {
      addBatchedBox(0.28, 6.4, 0.28, -19.0, 3.2, pz, timberMat, false);
      // Timber knee-brace supporting balcony underside
      addBatchedBox(0.18, 0.9, 0.18, -19.38, 2.98, pz, timberMat, false, false, 0, 0, 0.65);
    }
    // Warm hammered-brass wall lanterns along Palace posts
    addBrassLantern(-18.65, 2.65, -11.5, 0.24, 0);
    addBrassLantern(-18.65, 2.65, 0.5, 0.24, 0);

    addBatchedBox(0.18, 0.92, 26.0, -18.95, 4.01, -5.0, timberMat, false);
    colliders.push({
      minX: -19.12,
      maxX: -18.78,
      minY: 3.55,
      maxY: 4.55,
      minZ: -18.0,
      maxZ: 8.0,
    });
    // Balcony Overhanging Timber Roof + Exposed Ceiling Rafters (y = 6.32 .. 6.65)
    addBatchedBox(4.8, 0.3, 26.5, -21.1, 6.5, -5.0, timberMat, true);
    for (let rz = -17.0; rz <= 7.5; rz += 2.2) {
      addBatchedBox(4.6, 0.18, 0.16, -21.1, 6.26, rz, timberMat, false, false);
    }
    // Red Moroccan Carpet hanging on interior West Palace Wall + Carved Door underneath
    addDecalPlane(2.2, 2.8, -23.26, 4.9, -4.5, 0, Math.PI / 2, carpetMat);
    addCourtyardFacadeDetail(-23.26, 1.35, -5.5, 1.9, 2.5, 'x');
    // Wooden crates tucked under Balcony
    addBatchedBox(1.5, 1.5, 1.5, -21.5, 0.75, -10.0, crateMat);
    addBatchedBox(1.5, 1.5, 1.5, -21.5, 0.75, 2.5, crateMat);

    // West Courtyard Sandstone Block Wall with Dripping Red "A" & Stacked Crates
    addBatchedBox(1.5, 4.2, 7.6, -10.2, 2.1, 9.2, wallMat);
    addBatchedBox(1.75, 0.24, 7.85, -10.2, 4.3, 9.2, accentTrimMat, false);
    addDecalPlane(2.6, 2.2, -9.42, 2.2, 9.2, 0, Math.PI / 2, sprayAMat);
    // Stacked X-Braced Wooden Crates beside A Wall
    addBatchedBox(1.55, 1.55, 1.55, -11.9, 0.775, 11.4, crateMat);
    addBatchedBox(1.55, 1.55, 1.55, -11.9, 2.325, 11.4, crateMat);
    addBatchedBox(1.55, 1.55, 1.55, -13.5, 0.775, 11.4, crateMat);

    // West Mid Alley Archway + "<- A" Dripping Spray Stencil
    addBatchedBox(12.8, 1.9, 1.6, -16.9, 4.95, -14.5, wallMat, true);
    addBatchedBox(12.8, 0.24, 1.85, -16.9, 6.0, -14.5, accentTrimMat, false);
    addDecalPlane(3.0, 1.6, -10.2, 2.2, -14.5, 0, Math.PI / 2, sprayLeftAMat);

    // -------------------------------------------------------------------------
    // 5. EAST STONE STAIRS + TERRACE + CARPET + CONNECTOR ARCH ("B")
    // -------------------------------------------------------------------------
    addStoneStairsZ(18.8, 23.3, -6.0, 2.0, 0, 3.0, -1);
    addBatchedBox(4.5, 3.0, 12.0, 21.05, 1.5, -12.0, wallMat, true);
    addStoneStairsZ(18.8, 23.3, -24.0, -18.0, 0, 3.0, 1);

    // Low Sandstone Parapet & Draped Crimson Carpet on East Terrace
    addBatchedBox(0.35, 0.9, 12.0, 18.98, 3.45, -12.0, wallMat, true);
    addBatchedBox(0.45, 0.14, 12.1, 18.98, 3.95, -12.0, accentTrimMat, false);
    addDecalPlane(3.2, 2.1, 18.78, 2.85, -12.0, 0, -Math.PI / 2, carpetMat);

    // East Courtyard Divider Wall + Timber Archway ("Connector / Site B")
    addBatchedBox(1.5, 4.4, 9.0, 10.5, 2.2, -9.5, wallMat);
    addBatchedBox(1.5, 4.4, 9.0, 10.5, 2.2, 8.5, wallMat);
    addBatchedBox(1.75, 0.24, 27.2, 10.5, 4.5, -0.5, accentTrimMat, false);
    addBatchedBox(1.5, 1.8, 9.0, 10.5, 4.9, -0.5, wallMat, true);
    addBatchedBox(1.8, 0.3, 9.0, 10.5, 3.9, -0.5, timberMat, false);
    addCourtyardFacadeDetail(9.72, 2.8, 7.5, 1.3, 1.5, 'x');

    // "B ->" & "B" Dripping Spray Stencils + Site B Crates & Barrels
    addDecalPlane(3.0, 1.6, 23.24, 2.4, 8.5, 0, -Math.PI / 2, sprayRightBMat);
    addDecalPlane(2.6, 2.2, 11.28, 2.3, 8.5, 0, Math.PI / 2, sprayBMat);
    addBatchedBox(1.6, 1.6, 1.6, 15.8, 0.8, 15.2, crateMat);
    addBatchedBox(1.6, 1.6, 1.6, 15.8, 2.4, 15.2, crateMat);
    addBatchedBox(1.5, 1.4, 1.5, 13.8, 0.7, -12.5, crateMat);
    addWoodenBarrel(17.4, 0, 15.2);

    // -------------------------------------------------------------------------
    // 6. SOUTH T-SIDE BAZAAR MARKET CANOPY, LANTERNS, TERRACOTTA URNS & ROLLED RUGS
    // -------------------------------------------------------------------------
    for (const px of [-13.8, -5.6]) {
      for (const pz of [16.0, 21.4]) {
        addBatchedBox(0.22, 3.4, 0.22, px, 1.7, pz, timberMat, true);
      }
    }
    addBrassLantern(-5.95, 2.7, 16.0, -0.22, 0);
    addBrassLantern(-13.45, 2.7, 21.4, 0.22, 0);
    addBatchedBox(8.4, 0.16, 0.16, -9.7, 3.35, 16.0, timberMat, false);
    addBatchedBox(8.4, 0.16, 0.16, -9.7, 3.35, 21.4, timberMat, false);
    addBatchedBox(8.6, 0.08, 3.4, -9.7, 3.48, 17.5, canopyOliveMat, false, true, 0.09, 0, 0);
    addBatchedBox(8.6, 0.08, 2.8, -9.7, 3.42, 20.1, canopyTanMat, false, true, -0.08, 0, 0);
    // Market crates + rolled crimson rugs under Bazaar canopy
    addBatchedBox(1.6, 1.4, 1.35, -7.8, 0.7, 18.6, hazardCrateMat);
    addBatchedBox(1.4, 1.4, 1.4, -11.6, 0.7, 18.6, crateMat);
    batchGeo(
      new THREE.CylinderGeometry(0.16, 0.16, 1.35, 10),
      carpetMat,
      -12.55,
      0.66,
      18.6,
      false,
      true,
      0.16,
      0.22,
      -0.18
    );
    batchGeo(
      new THREE.CylinderGeometry(0.14, 0.14, 1.25, 10),
      carpetMat,
      -12.82,
      0.62,
      18.95,
      false,
      true,
      -0.12,
      0.4,
      -0.22
    );

    // LatheGeometry Terracotta Clay Amphoras / Urns tucked along safe wall corners
    addTerracottaUrn(-9.1, 0, 12.6, 1.05);
    addTerracottaUrn(-18.2, 0, -17.2, 0.95);
    addTerracottaUrn(11.65, 0, 5.2, 1.0);
    addTerracottaUrn(18.2, 0, -2.5, 0.95);
    addTerracottaUrn(-6.3, 0, 16.4, 0.9);

    // -------------------------------------------------------------------------
    // 7. LUSH TWO-TONE PALM TREES AROUND COURTYARDS & PERIMETER
    // -------------------------------------------------------------------------
    addPalmTree(-10.8, 6.2, 6.4, 0.1);
    addPalmTree(7.5, -23.5, 7.0, -0.08);
    addPalmTree(16.5, 20.5, 6.5, -0.1);
    addPalmTree(-17.0, -23.0, 6.8, 0.09);
    addPalmTree(22.2, 4.2, 6.2, -0.07);

    // Flush all Mirage geometry buckets into single batched meshes
    for (const bucket of batchBuckets.values()) {
      if (bucket.geos.length === 0) continue;
      const merged = mergeGeometries(bucket.geos, false);
      bucket.geos.forEach((g) => g.dispose());
      if (!merged) continue;
      geometries.push(merged);
      const mesh = new THREE.Mesh(merged, bucket.mat);
      mesh.castShadow = bucket.castShadow;
      mesh.receiveShadow = true;
      root.add(mesh);
      if (bucket.isObstacle) {
        obstacleMeshes.push(mesh);
      }
    }
    batchBuckets.clear();
  } else {
    // =========================================================================
    // NUKE HANGAR — Bright Industrial Hangar, Twin Red/White Reactor Silos,
    // Overhead Yellow Bridge Crane, Steel Catwalk, Control Room ("Heaven"),
    // Sloped B Ramp, Sunny Outdoor Yard & B Underpass Corridor
    // =========================================================================

    const wainscotMat = new THREE.MeshStandardMaterial({
      map: textures.hangarWainscot,
      color: '#cfd5dc',
      roughness: 0.82,
      metalness: 0.14,
    });
    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: '#3c4552',
      roughness: 0.42,
      metalness: 0.72,
    });
    const craneYellowMat = new THREE.MeshStandardMaterial({
      color: '#eab308',
      roughness: 0.36,
      metalness: 0.35,
    });
    const safetyLineMat = new THREE.MeshStandardMaterial({
      color: '#eab308',
      roughness: 0.72,
      metalness: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const grayContainerMat = new THREE.MeshStandardMaterial({
      map: textures.corrugatedGray,
      roughness: 0.48,
      metalness: 0.58,
    });
    const blueContainerMat = new THREE.MeshStandardMaterial({
      map: textures.corrugatedBlue,
      roughness: 0.46,
      metalness: 0.52,
    });
    const yellowContainerMat = new THREE.MeshStandardMaterial({
      map: textures.corrugatedYellow,
      roughness: 0.48,
      metalness: 0.48,
    });
    const siloMat = new THREE.MeshStandardMaterial({
      map: textures.siloTank,
      roughness: 0.38,
      metalness: 0.25,
    });
    const redAccentMat = new THREE.MeshStandardMaterial({
      color: '#b92b27',
      roughness: 0.45,
      metalness: 0.28,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#bfe3ff',
      roughness: 0.08,
      metalness: 0.05,
      transparent: true,
      opacity: 0.32,
      clearcoat: 0.9,
      depthWrite: false,
    });
    const ledLightMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#f8fafc',
      emissiveIntensity: 2.0,
      roughness: 0.2,
    });
    const fenceMat = new THREE.MeshStandardMaterial({
      map: textures.chainLinkFence,
      alphaTest: 0.35,
      transparent: true,
      side: THREE.DoubleSide,
      roughness: 0.5,
      metalness: 0.65,
    });
    const signAMat = new THREE.MeshStandardMaterial({
      map: textures.signA,
      roughness: 0.45,
      metalness: 0.1,
    });
    const signBMat = new THREE.MeshStandardMaterial({
      map: textures.signB,
      roughness: 0.45,
      metalness: 0.1,
    });
    const stencilLeftAMat = new THREE.MeshStandardMaterial({
      map: textures.stencilLeftA,
      transparent: true,
      alphaTest: 0.2,
      roughness: 0.7,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const stencilRightBMat = new THREE.MeshStandardMaterial({
      map: textures.stencilRightB,
      transparent: true,
      alphaTest: 0.2,
      roughness: 0.7,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const floorCircleAMat = new THREE.MeshStandardMaterial({
      map: textures.floorCircleA,
      transparent: true,
      alphaTest: 0.15,
      roughness: 0.8,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const screenMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      emissive: '#1e293b',
      emissiveIntensity: 0.4,
      roughness: 0.2,
      metalness: 0.3,
    });

    materials.push(
      wainscotMat,
      darkSteelMat,
      craneYellowMat,
      safetyLineMat,
      grayContainerMat,
      blueContainerMat,
      yellowContainerMat,
      siloMat,
      redAccentMat,
      glassMat,
      ledLightMat,
      fenceMat,
      signAMat,
      signBMat,
      stencilLeftAMat,
      stencilRightBMat,
      floorCircleAMat,
      screenMat
    );

    // Helper for two-tone hangar wall segment (lower slate wainscot + upper light concrete + clerestory gap)
    const addHangarWallSegment = (
      x: number,
      z: number,
      w: number,
      d: number,
      withClerestory = true
    ) => {
      // Lower slate wainscot (0 .. 2.7m)
      addBoxObstacle(w, 2.7, d, x, 1.35, z, wainscotMat);
      if (withClerestory) {
        // Middle light concrete block wall (2.7 .. 8.5m)
        addBoxObstacle(w, 5.8, d, x, 5.6, z, wallMat);
        // Top header fascia above clerestory windows (10.3 .. 11.4m)
        addBoxObstacle(w, 1.1, d, x, 10.85, z, wallMat, false);
      } else {
        addBoxObstacle(w, 8.7, d, x, 7.05, z, wallMat);
      }
    };

    // Helper for sloped walkable ramp wedge along Z
    const addRampZ = (
      xMin: number,
      xMax: number,
      zMin: number,
      zMax: number,
      yLow: number,
      yHigh: number,
      dir: 1 | -1, // 1: climbs toward +Z, -1: climbs toward -Z
      mat: THREE.Material
    ) => {
      const w = xMax - xMin;
      const len = zMax - zMin;
      const h = yHigh - yLow;
      const shape = new THREE.Shape();
      if (dir === 1) {
        shape.moveTo(0, 0);
        shape.lineTo(len, 0);
        shape.lineTo(len, h);
        shape.closePath();
      } else {
        shape.moveTo(0, 0);
        shape.lineTo(len, 0);
        shape.lineTo(0, h);
        shape.closePath();
      }
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: w,
        bevelEnabled: false,
      });
      geo.translate(0, 0, -w * 0.5);
      geo.rotateY(-Math.PI / 2);
      geo.translate((xMin + xMax) * 0.5, yLow, zMin);
      geometries.push(geo);

      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
      obstacleMeshes.push(mesh);

      ramps.push({
        minX: xMin,
        maxX: xMax,
        minZ: zMin,
        maxZ: zMax,
        startY: dir === 1 ? yLow : yHigh,
        endY: dir === 1 ? yHigh : yLow,
        axis: 'z',
        dir,
      });
    };

    // Helper for yellow safety guardrail segment along Z
    const addRailingZ = (
      x: number,
      yBase: number,
      zStart: number,
      zEnd: number,
      addCollider = true
    ) => {
      const len = Math.abs(zEnd - zStart);
      const zMid = (zStart + zEnd) * 0.5;
      // Top & mid horizontal rails
      addBoxObstacle(0.08, 0.08, len, x, yBase + 0.95, zMid, craneYellowMat, false, false);
      addBoxObstacle(0.08, 0.07, len, x, yBase + 0.50, zMid, craneYellowMat, false, false);
      // Posts every ~2.5m
      const steps = Math.max(2, Math.ceil(len / 2.5));
      for (let i = 0; i <= steps; i++) {
        const pz = zStart + (zEnd - zStart) * (i / steps);
        addBoxObstacle(0.08, 0.98, 0.08, x, yBase + 0.49, pz, craneYellowMat, false, false);
      }
      if (addCollider) {
        colliders.push({
          minX: x - 0.14,
          maxX: x + 0.14,
          minY: yBase,
          maxY: yBase + 1.05,
          minZ: Math.min(zStart, zEnd),
          maxZ: Math.max(zStart, zEnd),
        });
      }
    };

    // Helper for yellow safety guardrail segment along X
    const addRailingX = (
      z: number,
      yBase: number,
      xStart: number,
      xEnd: number,
      addCollider = true
    ) => {
      const len = Math.abs(xEnd - xStart);
      const xMid = (xStart + xEnd) * 0.5;
      addBoxObstacle(len, 0.08, 0.08, xMid, yBase + 0.95, z, craneYellowMat, false, false);
      addBoxObstacle(len, 0.07, 0.08, xMid, yBase + 0.50, z, craneYellowMat, false, false);
      const steps = Math.max(1, Math.ceil(len / 2.0));
      for (let i = 0; i <= steps; i++) {
        const px = xStart + (xEnd - xStart) * (i / steps);
        addBoxObstacle(0.08, 0.98, 0.08, px, yBase + 0.49, z, craneYellowMat, false, false);
      }
      if (addCollider) {
        colliders.push({
          minX: Math.min(xStart, xEnd),
          maxX: Math.max(xStart, xEnd),
          minY: yBase,
          maxY: yBase + 1.05,
          minZ: z - 0.14,
          maxZ: z + 0.14,
        });
      }
    };

    // Helper for Yellow Ladder
    const addYellowLadder = (
      x: number,
      yBottom: number,
      yTop: number,
      z: number,
      facingAxis: 'x' | 'z'
    ) => {
      const h = yTop - yBottom;
      const yMid = (yBottom + yTop) * 0.5;
      if (facingAxis === 'x') {
        addBoxObstacle(0.08, h, 0.08, x, yMid, z - 0.36, craneYellowMat, false, false);
        addBoxObstacle(0.08, h, 0.08, x, yMid, z + 0.36, craneYellowMat, false, false);
        for (let ry = yBottom + 0.38; ry < yTop - 0.15; ry += 0.42) {
          addBoxObstacle(0.06, 0.06, 0.72, x, ry, z, craneYellowMat, false, false);
        }
      } else {
        addBoxObstacle(0.08, h, 0.08, x - 0.36, yMid, z, craneYellowMat, false, false);
        addBoxObstacle(0.08, h, 0.08, x + 0.36, yMid, z, craneYellowMat, false, false);
        for (let ry = yBottom + 0.38; ry < yTop - 0.15; ry += 0.42) {
          addBoxObstacle(0.72, 0.06, 0.06, x, ry, z, craneYellowMat, false, false);
        }
      }
    };

    // Helper for wall/floor decal plane
    const addDecalPlane = (
      w: number,
      h: number,
      x: number,
      y: number,
      z: number,
      rotX: number,
      rotY: number,
      mat: THREE.Material
    ) => {
      const geo = new THREE.PlaneGeometry(w, h);
      geometries.push(geo);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.rotation.set(rotX, rotY, 0);
      root.add(mesh);
      return mesh;
    };

    // -------------------------------------------------------------------------
    // 1. NORTH & SOUTH PERIMETER WALLS (Z = ±30)
    // -------------------------------------------------------------------------
    addHangarWallSegment(0, -30, 49.2, 1.3, true);
    addHangarWallSegment(0, 30, 49.2, 1.3, true);

    // -------------------------------------------------------------------------
    // 2. WEST WALL (X = -24) WITH TWO GARAGE / YARD DOORWAYS
    //    - Doorway A Main: Z in [-7, +1] (8m wide, height 4.4m)
    //    - South Yard Door: Z in [+15, +21] (6m wide, height 4.2m)
    // -------------------------------------------------------------------------
    addHangarWallSegment(-24, -18.5, 1.3, 23.0, true); // Z: -30 .. -7
    addHangarWallSegment(-24, +8.0, 1.3, 14.0, true); // Z: +1 .. +15
    addHangarWallSegment(-24, +25.5, 1.3, 9.0, true); // Z: +21 .. +30

    // Header + rolled-up shutter above Doorway A (Z: -7 .. +1)
    addBoxObstacle(1.3, 7.0, 8.0, -24, 7.9, -3.0, wallMat); // y = 4.4..11.4
    addBoxObstacle(1.6, 0.9, 8.2, -24, 4.65, -3.0, darkSteelMat); // Shutter drum box
    // Doorframe jambs
    addBoxObstacle(1.5, 4.4, 0.45, -24, 2.2, -7.0, darkSteelMat);
    addBoxObstacle(1.5, 4.4, 0.45, -24, 2.2, 1.0, darkSteelMat);

    // Header + shutter above South Yard Door (Z: +15 .. +21)
    addBoxObstacle(1.3, 7.2, 6.0, -24, 7.8, 18.0, wallMat); // y = 4.2..11.4
    addBoxObstacle(1.6, 0.85, 6.2, -24, 4.4, 18.0, darkSteelMat);
    addBoxObstacle(1.5, 4.2, 0.45, -24, 2.1, 15.0, darkSteelMat);
    addBoxObstacle(1.5, 4.2, 0.45, -24, 2.1, 21.0, darkSteelMat);

    // Red "A" Square Sign above A Garage Doorway + "<- A" Stencil + Red Fire Cabinet
    addBoxObstacle(0.14, 2.3, 2.3, -23.22, 6.55, -3.0, signAMat, false);
    addDecalPlane(2.8, 1.4, -23.32, 2.4, 3.6, 0, Math.PI / 2, stencilLeftAMat);
    // Red fire-hose cabinet inside wall next to South Yard Door
    addBoxObstacle(0.32, 1.25, 0.85, -23.18, 1.55, 13.5, redAccentMat, false);

    // -------------------------------------------------------------------------
    // 3. EAST WALL (X = +24) WITH B DOORWAY & UNDERPASS CONNECTOR
    //    - North Underpass Exit: Z in [-18, -13] (5m wide, height 4.0m)
    //    - B Doorway under Bridge: Z in [+8, +14] (6m wide, height 3.0m)
    // -------------------------------------------------------------------------
    addHangarWallSegment(24, -24.0, 1.3, 12.0, true); // Z: -30 .. -18
    addHangarWallSegment(24, -2.5, 1.3, 21.0, true); // Z: -13 .. +8
    addHangarWallSegment(24, +22.0, 1.3, 16.0, true); // Z: +14 .. +30

    // Header above North Underpass Exit (Z: -18 .. -13)
    addBoxObstacle(1.3, 7.4, 5.0, 24, 7.7, -15.5, wallMat); // y = 4.0..11.4
    addBoxObstacle(1.5, 0.75, 5.2, 24, 4.2, -15.5, darkSteelMat);

    // Header above B Doorway (Z: +8 .. +14, y = 3.0..11.4)
    addBoxObstacle(1.3, 8.4, 6.0, 24, 7.2, 11.0, wallMat);
    addBoxObstacle(1.5, 0.45, 6.2, 24, 3.15, 11.0, darkSteelMat);

    // Red "B" Square Sign above B Doorway + "B ->" Stencil near Ramp
    addBoxObstacle(0.14, 2.2, 2.2, 23.22, 5.2, 11.0, signBMat, false);
    addDecalPlane(2.8, 1.4, 23.32, 3.8, 16.5, 0, -Math.PI / 2, stencilRightBMat);

    // -------------------------------------------------------------------------
    // 4. HANGAR STRUCTURAL COLUMNS, ROOF DECK, SKYLIGHTS & BRIDGE CRANE
    // -------------------------------------------------------------------------
    for (const pz of [-24, -12, 0, 12, 24]) {
      addBoxObstacle(1.05, 11.2, 1.05, -23.35, 5.6, pz, darkSteelMat);
      addBoxObstacle(1.05, 11.2, 1.05, 23.35, 5.6, pz, darkSteelMat);
    }
    for (const px of [-16, 0, 16]) {
      addBoxObstacle(1.05, 11.2, 1.05, px, 5.6, -29.35, darkSteelMat);
      addBoxObstacle(1.05, 11.2, 1.05, px, 5.6, 29.35, darkSteelMat);
    }

    // Roof Wing Slabs & Crossbeams (leaving open blue-sky Skylights down the center!)
    addBoxObstacle(13.0, 0.55, 61.0, -18.0, 11.35, 0, darkSteelMat, false, false);
    addBoxObstacle(13.0, 0.55, 61.0, 18.0, 11.35, 0, darkSteelMat, false, false);
    for (const rz of [-26.5, -15.0, -3.5, 8.0, 19.5, 27.5]) {
      addBoxObstacle(24.0, 0.5, 3.6, 0, 11.35, rz, darkSteelMat, false, false);
    }

    // Steel Roof Trusses + Glowing Rectangular Ceiling LED Fixtures
    for (let tz = -24; tz <= 24; tz += 8) {
      addBoxObstacle(47.0, 0.42, 0.48, 0, 10.55, tz, darkSteelMat, false, false);
      // Diagonal truss webbing
      for (const tx of [-14, -5, 5, 14]) {
        const strut = addBoxObstacle(0.22, 1.3, 0.22, tx, 10.95, tz, darkSteelMat, false, false);
        strut.rotation.z = tx < 0 ? 0.55 : -0.55;
      }
      // Fluorescent / LED overhead light fixtures
      for (const lx of [-13, 0, 13]) {
        addBoxObstacle(2.2, 0.12, 0.55, lx, 10.22, tz, ledLightMat, false, false);
      }
    }

    // Iconic Bright Yellow Overhead Bridge Crane (spanning East-West above Silos)
    addBoxObstacle(46.2, 0.95, 0.72, 0, 8.95, -2.4, craneYellowMat, false, false);
    addBoxObstacle(46.2, 0.95, 0.72, 0, 8.95, -0.6, craneYellowMat, false, false);
    // Crane end trucks riding on wall rails
    addBoxObstacle(1.2, 1.25, 3.4, -22.5, 8.8, -1.5, darkSteelMat, false, false);
    addBoxObstacle(1.2, 1.25, 3.4, 22.5, 8.8, -1.5, darkSteelMat, false, false);
    // Central hoist trolley + dangling steel cable + hook above Twin Silos
    addBoxObstacle(2.2, 1.15, 2.3, 0.6, 9.0, -1.5, craneYellowMat, false, false);
    addBoxObstacle(0.08, 2.4, 0.08, 0.6, 7.3, -1.5, darkSteelMat, false, false);
    addBoxObstacle(0.38, 0.45, 0.38, 0.6, 6.0, -1.5, darkSteelMat, false, false);

    // -------------------------------------------------------------------------
    // 5. SITE A CENTERPIECE: TWIN WHITE & RED REACTOR SILOS + HAZARD PLINTH
    // -------------------------------------------------------------------------
    // Raised concrete & yellow-black hazard plinth
    addBoxObstacle(9.4, 0.22, 5.2, 0, 0.11, 0, darkSteelMat, true);
    addBoxObstacle(9.7, 0.16, 5.5, 0, 0.08, 0, accentTrimMat, false);

    // Twin 12-sided White Reactor Silos with Double Red Bands
    const siloGeo = new THREE.CylinderGeometry(1.82, 1.86, 5.3, 12);
    const siloCapGeo = new THREE.CylinderGeometry(1.55, 1.78, 0.36, 12);
    const siloRimGeo = new THREE.CylinderGeometry(1.9, 1.9, 0.18, 12);
    geometries.push(siloGeo, siloCapGeo, siloRimGeo);

    for (const sx of [-2.45, 2.45]) {
      const silo = new THREE.Mesh(siloGeo, siloMat);
      silo.position.set(sx, 2.87, 0);
      silo.castShadow = true;
      silo.receiveShadow = true;
      root.add(silo);
      obstacleMeshes.push(silo);

      const cap = new THREE.Mesh(siloCapGeo, darkSteelMat);
      cap.position.set(sx, 5.68, 0);
      cap.castShadow = true;
      root.add(cap);

      const rim = new THREE.Mesh(siloRimGeo, darkSteelMat);
      rim.position.set(sx, 0.3, 0);
      root.add(rim);

      colliders.push({
        minX: sx - 1.78,
        maxX: sx + 1.78,
        minY: 0,
        maxY: 5.85,
        minZ: -1.78,
        maxZ: 1.78,
      });
    }

    // Small armored control box tucked between the two silos
    addBoxObstacle(1.15, 1.35, 1.15, 0, 0.89, 0.8, grayContainerMat);

    // Red "A" stencil decals on front & back of left Reactor Silo
    const siloAMat = new THREE.MeshStandardMaterial({
      map: textures.signA,
      roughness: 0.45,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    materials.push(siloAMat);
    addDecalPlane(1.15, 1.15, -2.45, 2.75, 1.86, 0, 0, siloAMat);
    addDecalPlane(1.15, 1.15, -2.45, 2.75, -1.86, 0, Math.PI, siloAMat);

    // Red "(A)" Floor Circle Decal + Yellow Site A Perimeter Floor Stripes
    addDecalPlane(3.0, 3.0, 0, 0.02, 4.8, -Math.PI / 2, 0, floorCircleAMat);
    addDecalPlane(3.0, 3.0, 0, 0.02, -4.8, -Math.PI / 2, Math.PI, floorCircleAMat);
    // Yellow safety markings around Site A & lanes
    addBoxObstacle(12.0, 0.02, 0.2, 0, 0.015, 3.8, safetyLineMat, false, false);
    addBoxObstacle(12.0, 0.02, 0.2, 0, 0.015, -3.8, safetyLineMat, false, false);
    addBoxObstacle(0.2, 0.02, 7.8, -6.0, 0.015, 0, safetyLineMat, false, false);
    addBoxObstacle(0.2, 0.02, 7.8, 6.0, 0.015, 0, safetyLineMat, false, false);
    addBoxObstacle(0.22, 0.02, 54.0, -17.5, 0.015, 0, safetyLineMat, false, false);
    addBoxObstacle(0.22, 0.02, 54.0, 16.5, 0.015, 0, safetyLineMat, false, false);

    // -------------------------------------------------------------------------
    // 6. WEST ELEVATED CATWALK + RAMP + YELLOW GUARDRAILS
    // -------------------------------------------------------------------------
    // Catwalk Deck (X: -23.35 .. -19.25, Z: -24 .. +5, y = 3.5 .. 3.7)
    addBoxObstacle(4.1, 0.22, 29.0, -21.3, 3.59, -9.5, darkSteelMat, true);
    // Catwalk Ramp (Z: +5 .. +13, climbing smoothly from y=0 at +13 to y=3.7 at +5)
    addRampZ(-23.35, -19.25, 5.0, 13.0, 0, 3.7, -1, darkSteelMat);
    // Support columns under Catwalk (placed clear of both West doorways!)
    for (const cz of [-22, -11, 4.6]) {
      addBoxObstacle(0.32, 3.5, 0.32, -19.45, 1.75, cz, darkSteelMat, true);
    }
    // Yellow safety railing along Catwalk inner edge & north end
    addRailingZ(-19.35, 3.7, -24.0, 5.0, true);
    addRailingX(-24.0, 3.7, -23.3, -19.35, true);

    // -------------------------------------------------------------------------
    // 7. EAST CONTROL ROOM ("HEAVEN"), YELLOW LADDER, B BRIDGE & B RAMP
    // -------------------------------------------------------------------------
    // Control Room Lower Concrete Base (X: +17.6 .. +23.35, Z: -12 .. +8, y = 0..3.2)
    addBoxObstacle(5.75, 3.2, 20.0, 20.475, 1.6, -2.0, wainscotMat, true);
    // Yellow Vertical Ladder on Control Room Front Face
    addYellowLadder(17.52, 0, 3.2, -3.5, 'x');

    // Bridge Deck over B Doorway (Z: +8 .. +14, y = 3.0..3.2)
    addBoxObstacle(4.55, 0.22, 6.0, 21.075, 3.09, 11.0, darkSteelMat, true);
    addRailingZ(18.88, 3.2, 8.0, 14.0, true);

    // B Concrete Sloped Ramp (Z: +14 .. +22, y: 0 at +22 -> 3.2 at +14)
    addRampZ(18.8, 23.35, 14.0, 22.0, 0, 3.2, -1, wainscotMat);
    // Decorative concrete side curb along B Ramp
    addBoxObstacle(0.35, 1.4, 8.0, 18.625, 0.7, 18.0, wainscotMat, true);

    // Control Room Upper Interior ("Heaven", y = 3.2..6.2)
    // Knee wall under panoramic windows (X = +17.7, Z: -8 .. +8, y = 3.2..4.15)
    addBoxObstacle(0.28, 0.95, 16.0, 17.74, 3.675, 0.0, wallMat, true);
    // Open lookout balcony section at Z: -12 .. -8 with yellow railing
    addRailingZ(17.74, 3.2, -12.0, -8.0, true);
    // Glass window strip (X = +17.74, Z: -8 .. +8, y = 4.15..5.65)
    addBoxObstacle(0.08, 1.5, 16.0, 17.74, 4.9, 0.0, glassMat, false, false);
    // Window mullions
    for (const mz of [-8.0, -4.0, 0.0, 4.0, 8.0]) {
      addBoxObstacle(0.24, 2.0, 0.22, 17.74, 4.85, mz, darkSteelMat, false);
    }
    // Control Room Upper Header & Roof (y = 5.65..6.4)
    addBoxObstacle(0.32, 0.75, 20.0, 17.74, 6.025, -2.0, wallMat, true);
    addBoxObstacle(5.85, 0.35, 20.4, 20.52, 6.35, -2.0, wallMat, true);
    // North & South Walls of Control Room (South has doorway X: +19.2..+22.2)
    addBoxObstacle(5.75, 3.0, 0.35, 20.475, 4.7, -11.82, wallMat, true);
    addBoxObstacle(1.5, 3.0, 0.35, 18.45, 4.7, 7.82, wallMat, true);
    addBoxObstacle(1.2, 3.0, 0.35, 22.8, 4.7, 7.82, wallMat, true);

    // Control Room Interior Props (Desk, Dual Monitors, Chair, Locker)
    addBoxObstacle(1.1, 0.82, 2.6, 19.3, 3.61, -2.0, darkSteelMat, true); // Desk
    addBoxObstacle(0.08, 0.55, 0.9, 19.0, 4.32, -2.55, screenMat, false); // Monitor 1
    addBoxObstacle(0.08, 0.55, 0.9, 19.0, 4.32, -1.45, screenMat, false); // Monitor 2
    addBoxObstacle(0.55, 0.85, 0.55, 20.3, 3.625, -2.0, steelMat, false); // Chair
    addBoxObstacle(0.85, 2.1, 1.4, 22.4, 4.25, -9.8, steelMat, true); // Filing locker

    // -------------------------------------------------------------------------
    // 8. MAIN HANGAR FLOOR COVER (CONTAINERS & WARM X-BRACED CRATES)
    // -------------------------------------------------------------------------
    // Corrugated Dark-Gray Containers (Site A flanks)
    addBoxObstacle(2.6, 2.6, 5.8, -11.2, 1.3, 4.5, grayContainerMat);
    addBoxObstacle(2.6, 2.6, 5.4, 11.2, 1.3, -9.5, grayContainerMat);

    // Corrugated Blue Container (CT Left)
    addBoxObstacle(5.6, 2.6, 2.6, -14.2, 1.3, -14.5, blueContainerMat);

    // Warm X-Braced Wooden Crates (Single & Double Stacked)
    // Foreground left stack (T-side A approach)
    addBoxObstacle(1.55, 1.55, 1.55, -13.8, 0.775, 15.5, crateMat);
    addBoxObstacle(1.55, 1.55, 1.55, -13.8, 2.325, 15.5, crateMat);
    addBoxObstacle(1.55, 1.55, 1.55, -15.4, 0.775, 15.5, crateMat);
    // Foreground right pair
    addBoxObstacle(1.55, 1.55, 1.55, 9.0, 0.775, 16.4, crateMat);
    addBoxObstacle(1.55, 1.55, 1.55, 10.6, 0.775, 16.4, crateMat);
    // Mid & CT-side wooden crates
    addBoxObstacle(1.5, 1.5, 1.5, -9.6, 0.75, -8.5, crateMat);
    addBoxObstacle(1.5, 1.5, 1.5, 13.0, 0.75, 1.5, crateMat);
    addBoxObstacle(1.5, 1.5, 1.5, 14.55, 0.75, 1.5, crateMat);
    addBoxObstacle(1.45, 1.45, 1.45, 13.0, 2.225, 1.5, crateMat);
    // Crates beside B Ramp
    addBoxObstacle(1.5, 1.5, 1.5, 16.5, 0.75, 19.0, crateMat);
    addBoxObstacle(1.5, 1.5, 1.5, 16.5, 2.25, 19.0, crateMat);
    addBoxObstacle(1.5, 1.5, 1.5, 16.5, 0.75, 20.55, crateMat);

    // Spawn Tactical Concrete Barriers (keeps CT z=-24..-26 and T z=+24..+26 clear)
    addBoxObstacle(5.2, 1.45, 1.1, 0, 0.725, -20.5, wainscotMat);
    addBoxObstacle(5.2, 1.45, 1.1, 0, 0.725, 20.5, wainscotMat);

    // -------------------------------------------------------------------------
    // 9. SUNNY OUTDOOR YARD (X: -38 .. -24, Z: -22 .. +23)
    // -------------------------------------------------------------------------
    // Concrete curb & Chain-link Security Fence
    addBoxObstacle(0.6, 0.5, 45.0, -38.0, 0.25, 0.5, wainscotMat);
    addBoxObstacle(0.08, 3.6, 45.0, -38.0, 2.3, 0.5, fenceMat, true, false);
    addBoxObstacle(14.0, 0.5, 0.6, -31.0, 0.25, -22.0, wainscotMat);
    addBoxObstacle(14.0, 3.6, 0.08, -31.0, 2.3, -22.0, fenceMat, true, false);
    addBoxObstacle(14.0, 0.5, 0.6, -31.0, 0.25, 23.0, wainscotMat);
    addBoxObstacle(14.0, 3.6, 0.08, -31.0, 2.3, 23.0, fenceMat, true, false);

    // Fence steel posts
    for (let fz = -22; fz <= 23; fz += 4.5) {
      addBoxObstacle(0.16, 4.1, 0.16, -38.0, 2.05, fz, darkSteelMat, false);
    }

    // Blue & Yellow Shipping Containers + Crates in Sunny Yard
    addBoxObstacle(2.7, 2.7, 6.2, -31.5, 1.35, 3.5, blueContainerMat);
    addBoxObstacle(5.8, 2.7, 2.7, -33.0, 1.35, -10.5, yellowContainerMat);
    addBoxObstacle(1.5, 1.5, 1.5, -27.5, 0.75, -13.0, crateMat);
    addBoxObstacle(1.5, 1.5, 1.5, -27.5, 0.75, 11.5, crateMat);

    // Exterior Distant Twin Silos visible beyond yard fence (atmosphere)
    for (const ez of [-14.0, -8.5]) {
      const extSilo = new THREE.Mesh(siloGeo, siloMat);
      extSilo.position.set(-48.5, 3.5, ez);
      extSilo.scale.set(1.3, 1.35, 1.3);
      root.add(extSilo);
    }

    // -------------------------------------------------------------------------
    // 10. B UNDERPASS / SIDE HALL (X: +24 .. +36, Z: -18.5 .. +16)
    // -------------------------------------------------------------------------
    addHangarWallSegment(36.0, -1.25, 1.2, 35.5, false); // Outer east wall
    addHangarWallSegment(30.0, -18.8, 13.0, 1.2, false); // North end wall
    addHangarWallSegment(30.0, +16.2, 13.0, 1.2, false); // South end wall
    // Low Industrial Concrete Roof over B Underpass (y = 4.8m)
    addBoxObstacle(13.2, 0.45, 36.2, 30.0, 4.95, -1.25, wainscotMat, true);
    // Ceiling LED strips inside B Underpass
    for (const uz of [-12, -2, 8]) {
      addBoxObstacle(1.8, 0.12, 0.55, 30.0, 4.65, uz, ledLightMat, false, false);
    }
    // Blue & Gray Shipping Containers + Wooden Crates + Yellow Ladders + Red Barrel
    addBoxObstacle(2.7, 2.6, 6.0, 30.8, 1.3, 2.5, blueContainerMat);
    addBoxObstacle(2.6, 2.6, 5.2, 27.2, 1.3, -6.5, grayContainerMat);
    addBoxObstacle(1.45, 1.45, 1.45, 33.8, 0.725, -12.0, crateMat);
    addBoxObstacle(1.45, 1.45, 1.45, 27.0, 0.725, 13.2, crateMat);
    addYellowLadder(35.3, 0, 4.5, 10.5, 'x');
    addYellowLadder(35.3, 0, 4.5, 12.2, 'x');

    // Red chemical barrel in B Underpass
    const barrelGeo = new THREE.CylinderGeometry(0.42, 0.42, 1.15, 14);
    geometries.push(barrelGeo);
    const barrel = new THREE.Mesh(barrelGeo, redAccentMat);
    barrel.position.set(34.2, 0.575, 14.0);
    barrel.castShadow = true;
    barrel.receiveShadow = true;
    root.add(barrel);
    obstacleMeshes.push(barrel);
    colliders.push({
      minX: 33.75,
      maxX: 34.65,
      minY: 0,
      maxY: 1.15,
      minZ: 13.55,
      maxZ: 14.45,
    });
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

  const patrolPoints = isMirage
    ? [
        new THREE.Vector3(-6, 0, 0),
        new THREE.Vector3(6, 0, 0),
        new THREE.Vector3(-15, 0, 3),
        new THREE.Vector3(15, 0, -3),
        new THREE.Vector3(-14, 0, -10),
        new THREE.Vector3(14, 0, 10),
        new THREE.Vector3(0, 0, -11),
        new THREE.Vector3(0, 0, 11),
      ]
    : [
        new THREE.Vector3(-6, 0, 0),
        new THREE.Vector3(6, 0, 0),
        new THREE.Vector3(-14, 0, 4),
        new THREE.Vector3(14, 0, -4),
        new THREE.Vector3(-10, 0, -14),
        new THREE.Vector3(10, 0, 14),
        new THREE.Vector3(0, 0, -12),
        new THREE.Vector3(0, 0, 12),
        new THREE.Vector3(-29, 0, -2),
        new THREE.Vector3(28, 0, 10),
      ];

  return {
    root,
    colliders,
    ramps,
    obstacleMeshes,
    ctSpawns,
    tSpawns,
    patrolPoints,
    skyColor: '#5aa6e8',
    fogColor: isMirage ? '#d8cab0' : '#9dc4e4',
    fogDensity: isMirage ? 0.0046 : 0.0042,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
