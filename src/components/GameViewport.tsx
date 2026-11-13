import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  GameModeId,
  GameSettings,
  HIT_EFFECTS,
  HitEffectId,
  KILL_EFFECTS,
  KillEffectId,
  KillFeedEntry,
  MapId,
  MatchHudState,
  SkinId,
  TeamSide,
  WEAPON_SPECS,
  WeaponId,
} from '@/src/types/game';
import { buildCharacterRig, CharacterRig } from '@/src/game/character';
import { AABBCollider, buildArenaMap } from '@/src/game/maps';
import { soundEngine } from '@/src/game/sound';
import { createGameTextures } from '@/src/game/textures';
import { buildWeaponModel, WeaponModelHandle } from '@/src/game/weapons';

export interface GameViewportHandle {
  setMoveVector: (x: number, y: number) => void;
  addLookDelta: (dx: number, dy: number) => void;
  setFiring: (firing: boolean) => void;
  toggleAds: () => void;
  triggerReload: () => void;
  triggerJump: () => void;
  toggleCrouch: () => void;
  triggerInspect: () => void;
  switchSlot: (slot: 1 | 2 | 3) => void;
  buyWeapon: (weaponId: WeaponId) => void;
  buyArmor: () => void;
  requestDesktopPointerLock: () => void;
  restartMatch: () => void;
}

interface GameViewportProps {
  team: TeamSide;
  mapId: MapId;
  gameMode: GameModeId;
  initialPrimaryWeapon: WeaponId;
  skinId: SkinId;
  hitEffectId: HitEffectId;
  killEffectId: KillEffectId;
  settings: GameSettings;
  paused: boolean;
  onHudUpdate: (hud: MatchHudState) => void;
  onEarnCredits: (amount: number) => void;
  onToggleBuyMenu: () => void;
}

interface BotEntity {
  id: string;
  name: string;
  team: TeamSide;
  rig: CharacterRig;
  hp: number;
  maxHp: number;
  pos: THREE.Vector3;
  yaw: number;
  waypoint: THREE.Vector3;
  strafeDir: number;
  strafeTimer: number;
  fireCooldown: number;
  reactionTimer: number;
  recoilFlash: number;
  hitFlash: number;
  isDead: boolean;
  deathTimer: number;
  respawnTimer: number;
}

interface TracerFX {
  mesh: THREE.Mesh;
  life: number;
}

interface SparkParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  gravity: number;
}

interface KillEffectInstance {
  group: THREE.Group;
  pillar: THREE.Mesh;
  ring: THREE.Mesh;
  life: number;
  maxLife: number;
  mat: THREE.MeshBasicMaterial;
}

const BOT_CALLSIGNS = ['Viper', 'Kobra', 'Atlas', 'Ghost', 'Titan'];

// Zero-GC scratch objects
const _raycaster = new THREE.Raycaster();
const _dir = new THREE.Vector3();
const _botEye = new THREE.Vector3();
const _playerEye = new THREE.Vector3();
const _toPlayer = new THREE.Vector3();
const _ndc = new THREE.Vector2();
const _tracerMid = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

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

function resolveCircleAABB(
  x: number,
  z: number,
  y: number,
  radius: number,
  colliders: AABBCollider[]
): { x: number; z: number } {
  let rx = x;
  let rz = z;
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (y >= c.maxY - 0.15) continue;
    const closestX = Math.max(c.minX, Math.min(rx, c.maxX));
    const closestZ = Math.max(c.minZ, Math.min(rz, c.maxZ));
    const dx = rx - closestX;
    const dz = rz - closestZ;
    const distSq = dx * dx + dz * dz;
    if (distSq < radius * radius) {
      const dist = Math.sqrt(distSq);
      if (dist > 0.0001) {
        const push = radius - dist;
        rx += (dx / dist) * push;
        rz += (dz / dist) * push;
      } else {
        rx += radius;
      }
    }
  }
  return { x: rx, z: rz };
}

export const GameViewport = React.forwardRef<GameViewportHandle, GameViewportProps>(
  (
    {
      team,
      mapId,
      gameMode,
      initialPrimaryWeapon,
      skinId,
      hitEffectId,
      killEffectId,
      settings,
      paused,
      onHudUpdate,
      onEarnCredits,
      onToggleBuyMenu,
    },
    ref
  ) => {
    const mountRef = useRef<HTMLDivElement | null>(null);
    const [webglError, setWebglError] = useState(false);

    const pausedRef = useRef(paused);
    pausedRef.current = paused;
    const settingsRef = useRef(settings);
    settingsRef.current = settings;
    const hitFxRef = useRef(hitEffectId);
    hitFxRef.current = hitEffectId;
    const killFxRef = useRef(killEffectId);
    killFxRef.current = killEffectId;
    const onHudRef = useRef(onHudUpdate);
    onHudRef.current = onHudUpdate;
    const onEarnRef = useRef(onEarnCredits);
    onEarnRef.current = onEarnCredits;
    const onBuyMenuRef = useRef(onToggleBuyMenu);
    onBuyMenuRef.current = onToggleBuyMenu;

    const apiRef = useRef<GameViewportHandle | null>(null);
    const applyGraphicsRef = useRef<(() => void) | null>(null);

    useImperativeHandle(ref, () => ({
      setMoveVector: (x, y) => apiRef.current?.setMoveVector(x, y),
      addLookDelta: (dx, dy) => apiRef.current?.addLookDelta(dx, dy),
      setFiring: (firing) => apiRef.current?.setFiring(firing),
      toggleAds: () => apiRef.current?.toggleAds(),
      triggerReload: () => apiRef.current?.triggerReload(),
      triggerJump: () => apiRef.current?.triggerJump(),
      toggleCrouch: () => apiRef.current?.toggleCrouch(),
      triggerInspect: () => apiRef.current?.triggerInspect(),
      switchSlot: (slot) => apiRef.current?.switchSlot(slot),
      buyWeapon: (w) => apiRef.current?.buyWeapon(w),
      buyArmor: () => apiRef.current?.buyArmor(),
      requestDesktopPointerLock: () => apiRef.current?.requestDesktopPointerLock(),
      restartMatch: () => apiRef.current?.restartMatch(),
    }));

    useEffect(() => {
      applyGraphicsRef.current?.();
    }, [settings]);

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
      renderer.toneMappingExposure = 1.1;
      renderer.autoClear = false;
      const baseDpr = isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2);
      renderer.setPixelRatio(baseDpr * settingsRef.current.resolutionScale);
      renderer.shadowMap.enabled = !isSoftwareGl && settingsRef.current.shadowsEnabled;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const aspect = Math.max(container.clientWidth, 1) / Math.max(container.clientHeight, 1);
      const camera = new THREE.PerspectiveCamera(74, aspect, 0.1, 220);
      camera.rotation.order = 'YXZ';

      const pmrem = new THREE.PMREMGenerator(renderer);
      const roomEnv = new RoomEnvironment();
      const envTex = pmrem.fromScene(roomEnv, 0.04).texture;
      scene.environment = envTex;

      const weaponScene = new THREE.Scene();
      weaponScene.environment = envTex;
      const weaponCamera = new THREE.PerspectiveCamera(56, aspect, 0.02, 8);
      const vmKey = new THREE.DirectionalLight('#fff4e0', 2.2);
      vmKey.position.set(1.5, 2.5, 2.0);
      weaponScene.add(vmKey);
      weaponScene.add(new THREE.HemisphereLight('#bfd7ff', '#1e293b', 0.9));

      roomEnv.dispose();
      pmrem.dispose();

      const textures = createGameTextures(renderer.capabilities.getMaxAnisotropy());
      const arena = buildArenaMap(mapId, textures);
      scene.add(arena.root);
      scene.background = new THREE.Color(arena.skyColor);
      scene.fog = new THREE.FogExp2(arena.fogColor, arena.fogDensity);

      const sunLight = new THREE.DirectionalLight(
        mapId === 'mirage' ? '#fff0d4' : '#dbeafe',
        mapId === 'mirage' ? 2.4 : 1.9
      );
      sunLight.position.set(22, 34, 18);
      sunLight.castShadow = !isSoftwareGl && settingsRef.current.shadowsEnabled;
      sunLight.shadow.mapSize.set(2048, 2048);
      sunLight.shadow.camera.near = 2;
      sunLight.shadow.camera.far = 90;
      sunLight.shadow.camera.left = -32;
      sunLight.shadow.camera.right = 32;
      sunLight.shadow.camera.top = 32;
      sunLight.shadow.camera.bottom = -32;
      sunLight.shadow.bias = -0.0006;
      scene.add(sunLight);
      scene.add(
        new THREE.HemisphereLight(
          mapId === 'mirage' ? '#b3d4f5' : '#64748b',
          mapId === 'mirage' ? '#7c6244' : '#0f172a',
          0.78
        )
      );

      applyGraphicsRef.current = () => {
        const s = settingsRef.current;
        renderer.setPixelRatio(baseDpr * s.resolutionScale);
        renderer.shadowMap.enabled = !isSoftwareGl && s.shadowsEnabled;
        sunLight.castShadow = !isSoftwareGl && s.shadowsEnabled;
      };

      const viewmodelPivot = new THREE.Group();
      weaponScene.add(viewmodelPivot);
      let viewmodelWeapon: WeaponModelHandle | null = null;

      const enemyTeam: TeamSide = team === 'ct' ? 't' : 'ct';
      const playerSpawns = team === 'ct' ? arena.ctSpawns : arena.tSpawns;
      const enemySpawns = enemyTeam === 'ct' ? arena.ctSpawns : arena.tSpawns;

      const playerPos = new THREE.Vector3().copy(playerSpawns[0]);
      let playerVelY = 0;
      let isGrounded = true;
      let yaw = team === 'ct' ? Math.PI : 0;
      let pitch = 0;
      let eyeHeight = 1.65;

      let hp = 100;
      let armor = 100;
      let money = 4200;
      let slot1Weapon: WeaponId =
        initialPrimaryWeapon === 'deagle' || initialPrimaryWeapon === 'knife'
          ? 'ak47'
          : initialPrimaryWeapon;
      let activeWeapon: WeaponId = slot1Weapon;
      const ammo: Record<WeaponId, { mag: number; reserve: number }> = {
        ak47: { mag: WEAPON_SPECS.ak47.magSize, reserve: WEAPON_SPECS.ak47.reserveMax },
        m4a1s: { mag: WEAPON_SPECS.m4a1s.magSize, reserve: WEAPON_SPECS.m4a1s.reserveMax },
        awp: { mag: WEAPON_SPECS.awp.magSize, reserve: WEAPON_SPECS.awp.reserveMax },
        deagle: { mag: WEAPON_SPECS.deagle.magSize, reserve: WEAPON_SPECS.deagle.reserveMax },
        knife: { mag: 1, reserve: 0 },
      };

      let ctScore = 0;
      let tScore = 0;
      let roundNumber = 1;
      let roundTimeSec = gameMode === 'deathmatch' ? 180 : 90;
      let kills = 0;
      let deaths = 0;
      let creditsEarnedMatch = 0;
      let matchEnded = false;
      let winnerTeam: TeamSide | null = null;
      let killFeed: KillFeedEntry[] = [];

      let isFiring = false;
      let fireCooldown = 0;
      let isReloading = false;
      let reloadElapsed = 0;
      let reloadDuration = 2.0;
      let isScoped = false;
      let isCrouching = false;
      let equipAnim = 0.3;
      let inspectAnim = 0;
      let recoilKick = 0;
      let recoilPitch = 0;
      let boltSlide = 0;
      let muzzleFlashTimer = 0;
      let walkPhase = 0;
      let adsProgress = 0;
      let hitmarkerKind: 'none' | 'body' | 'head' = 'none';
      let hitmarkerTimer = 0;
      let playerRespawnTimer = 0;

      const keys: Record<string, boolean> = {};
      let touchMoveX = 0;
      let touchMoveY = 0;
      let pointerLocked = false;

      // FX Geometries & Pools
      const tracerGeo = new THREE.CylinderGeometry(0.008, 0.008, 1, 6);
      tracerGeo.rotateX(Math.PI / 2);
      const tracerMat = new THREE.MeshBasicMaterial({
        color: '#fde68a',
        transparent: true,
        opacity: 0.85,
      });
      const sparkGeo = new THREE.BoxGeometry(0.055, 0.055, 0.055);
      const pillarGeo = new THREE.CylinderGeometry(0.42, 0.68, 7.5, 16, 1, true);
      const shockRingGeo = new THREE.RingGeometry(0.45, 0.72, 28);
      shockRingGeo.rotateX(-Math.PI / 2);

      const activeTracers: TracerFX[] = [];
      const activeSparks: SparkParticle[] = [];
      const activeKillFx: KillEffectInstance[] = [];

      function spawnTracer(from: THREE.Vector3, to: THREE.Vector3) {
        const dist = from.distanceTo(to);
        if (dist < 0.2) return;
        const mesh = new THREE.Mesh(tracerGeo, tracerMat);
        _tracerMid.addVectors(from, to).multiplyScalar(0.5);
        mesh.position.copy(_tracerMid);
        mesh.lookAt(to);
        mesh.scale.set(1, 1, dist);
        scene.add(mesh);
        activeTracers.push({ mesh, life: 0.065 });
      }

      function spawnHitEffect(pos: THREE.Vector3, isHead: boolean) {
        if (!settingsRef.current.particlesEnabled) return;
        const fxSpec = HIT_EFFECTS.find((h) => h.id === hitFxRef.current) ?? HIT_EFFECTS[0];
        const count = fxSpec.id === 'none' ? 4 : isHead ? 14 : 9;
        const color1 = fxSpec.id === 'none' ? (isHead ? '#ef4444' : '#e2e8f0') : fxSpec.colorHex;
        const color2 = fxSpec.secondaryHex;

        for (let i = 0; i < count; i++) {
          const mat = new THREE.MeshBasicMaterial({
            color: i % 2 === 0 ? color1 : color2,
            transparent: true,
            opacity: 0.95,
          });
          const mesh = new THREE.Mesh(sparkGeo, mat);
          mesh.position.copy(pos);
          scene.add(mesh);
          const speed = fxSpec.id === 'none' ? 2.5 : 4.2 + Math.random() * 3.5;
          activeSparks.push({
            mesh,
            vel: new THREE.Vector3(
              (Math.random() - 0.5) * speed,
              Math.random() * speed * 0.8 + 1.0,
              (Math.random() - 0.5) * speed
            ),
            life: 0.34,
            maxLife: 0.34,
            gravity: 11,
          });
        }
      }

      function spawnKillEffect(pos: THREE.Vector3) {
        if (!settingsRef.current.particlesEnabled) return;
        const fxSpec = KILL_EFFECTS.find((k) => k.id === killFxRef.current) ?? KILL_EFFECTS[0];
        if (fxSpec.id === 'none') return;

        const group = new THREE.Group();
        group.position.set(pos.x, 0.04, pos.z);

        const mat = new THREE.MeshBasicMaterial({
          color: fxSpec.colorHex,
          transparent: true,
          opacity: 0.82,
          side: THREE.DoubleSide,
          depthWrite: false,
        });

        const pillar = new THREE.Mesh(pillarGeo, mat);
        pillar.position.y = 3.75;
        const ring = new THREE.Mesh(shockRingGeo, mat);
        ring.position.y = 0.05;
        group.add(pillar, ring);
        scene.add(group);

        activeKillFx.push({
          group,
          pillar,
          ring,
          life: 0.95,
          maxLife: 0.95,
          mat,
        });

        // Rising embers
        for (let i = 0; i < 18; i++) {
          const sm = new THREE.MeshBasicMaterial({
            color: i % 2 === 0 ? fxSpec.colorHex : fxSpec.secondaryHex,
            transparent: true,
            opacity: 0.95,
          });
          const mesh = new THREE.Mesh(sparkGeo, sm);
          mesh.position.set(
            pos.x + (Math.random() - 0.5) * 0.8,
            0.4 + Math.random() * 1.1,
            pos.z + (Math.random() - 0.5) * 0.8
          );
          mesh.scale.setScalar(1.4);
          scene.add(mesh);
          activeSparks.push({
            mesh,
            vel: new THREE.Vector3(
              (Math.random() - 0.5) * 3.4,
              3.5 + Math.random() * 4.5,
              (Math.random() - 0.5) * 3.4
            ),
            life: 0.75,
            maxLife: 0.75,
            gravity: -1.5, // float upward
          });
        }
      }

      function equipViewmodel(wId: WeaponId) {
        if (viewmodelWeapon) {
          viewmodelPivot.remove(viewmodelWeapon.root);
          viewmodelWeapon.dispose();
        }
        viewmodelWeapon = buildWeaponModel(wId, skinId, textures.skinMaps);
        viewmodelWeapon.root.rotation.y = Math.PI;
        viewmodelPivot.add(viewmodelWeapon.root);
        activeWeapon = wId;
        isReloading = false;
        isScoped = false;
        equipAnim = 1.0;
        soundEngine.playEquip();
      }

      equipViewmodel(activeWeapon);

      const bots: BotEntity[] = [];
      for (let i = 0; i < 5; i++) {
        const spawn = enemySpawns[i % enemySpawns.length];
        const rig = buildCharacterRig(enemyTeam, {
          includeHitboxes: true,
          entityId: `bot-${i}`,
        });
        const botWeapon: WeaponId = i === 2 ? 'awp' : i % 2 === 0 ? 'ak47' : 'm4a1s';
        rig.setWeapon(botWeapon, 'default', textures.skinMaps);
        rig.root.position.set(spawn.x, 0, spawn.z);
        scene.add(rig.root);

        bots.push({
          id: `bot-${i}`,
          name: BOT_CALLSIGNS[i],
          team: enemyTeam,
          rig,
          hp: 100,
          maxHp: 100,
          pos: spawn.clone(),
          yaw: enemyTeam === 'ct' ? Math.PI : 0,
          waypoint: arena.patrolPoints[(i * 2) % arena.patrolPoints.length].clone(),
          strafeDir: i % 2 === 0 ? 1 : -1,
          strafeTimer: 1.2 + Math.random(),
          fireCooldown: 0.5 + Math.random() * 0.6,
          reactionTimer: 0.45,
          recoilFlash: 0,
          hitFlash: 0,
          isDead: false,
          deathTimer: 0,
          respawnTimer: 0,
        });
      }

      const pushKillFeed = (
        killer: string,
        killerTeam: TeamSide,
        victim: string,
        victimTeam: TeamSide,
        weaponId: WeaponId,
        headshot: boolean
      ) => {
        const entry: KillFeedEntry = {
          id: `${Date.now()}-${Math.random()}`,
          killer,
          killerTeam,
          victim,
          victimTeam,
          weaponId,
          headshot,
          timestamp: Date.now(),
        };
        killFeed = [entry, ...killFeed].slice(0, 5);
      };

      const resetRoundEntities = () => {
        const pSpawn = playerSpawns[0];
        playerPos.copy(pSpawn);
        playerVelY = 0;
        isGrounded = true;
        hp = 100;
        armor = 100;
        isReloading = false;
        isScoped = false;
        yaw = team === 'ct' ? Math.PI : 0;
        pitch = 0;

        bots.forEach((b, idx) => {
          const sp = enemySpawns[idx % enemySpawns.length];
          b.pos.copy(sp);
          b.rig.root.position.copy(sp);
          b.hp = 100;
          b.isDead = false;
          b.deathTimer = 0;
          b.respawnTimer = 0;
          b.reactionTimer = 0.5;
          b.rig.root.visible = true;
        });
      };

      const startReload = () => {
        if (isReloading || activeWeapon === 'knife') return;
        const spec = WEAPON_SPECS[activeWeapon];
        const st = ammo[activeWeapon];
        if (st.mag >= spec.magSize || st.reserve <= 0) return;
        isReloading = true;
        isScoped = false;
        reloadElapsed = 0;
        reloadDuration = spec.reloadTimeMs / 1000;
        soundEngine.playReload();
      };

      const finishReload = () => {
        const spec = WEAPON_SPECS[activeWeapon];
        const st = ammo[activeWeapon];
        const needed = spec.magSize - st.mag;
        const take = Math.min(needed, st.reserve);
        st.mag += take;
        st.reserve -= take;
        isReloading = false;
      };

      const fireActiveWeapon = () => {
        if (isReloading || playerRespawnTimer > 0 || matchEnded) return;
        const spec = WEAPON_SPECS[activeWeapon];

        if (activeWeapon !== 'knife') {
          const st = ammo[activeWeapon];
          if (st.mag <= 0) {
            startReload();
            return;
          }
          st.mag -= 1;
        }

        fireCooldown = spec.fireRateMs / 1000;
        recoilKick = Math.min(recoilKick + spec.recoilKick * 2.2, 0.16);
        recoilPitch = Math.min(recoilPitch + spec.recoilKick * 1.1, 0.12);
        pitch = Math.min(pitch + spec.recoilKick * 0.45, 1.4);
        boltSlide = 1.0;
        muzzleFlashTimer = 0.045;
        inspectAnim = 0;

        soundEngine.playWeaponFire(activeWeapon);

        const moveMag = Math.hypot(
          touchMoveX || (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0),
          touchMoveY || (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0)
        );
        const spreadAmount =
          spec.baseSpread * (isScoped ? 0.15 : 1) +
          (moveMag > 0.2 ? 0.015 : 0) +
          recoilKick * 0.22;
        _ndc.set(
          (Math.random() - 0.5) * spreadAmount * 2,
          (Math.random() - 0.5) * spreadAmount * 2
        );

        _raycaster.setFromCamera(_ndc, camera);
        _raycaster.far = activeWeapon === 'knife' ? 2.4 : 160;

        const targets: THREE.Object3D[] = [...arena.obstacleMeshes];
        for (const b of bots) {
          if (!b.isDead) {
            targets.push(b.rig.headHitbox, b.rig.bodyHitbox);
          }
        }

        const hits = _raycaster.intersectObjects(targets, false);
        const endPoint =
          hits.length > 0
            ? hits[0].point
            : camera.position.clone().add(_raycaster.ray.direction.clone().multiplyScalar(60));

        if (activeWeapon !== 'knife') {
          const tracerOrigin = camera.position
            .clone()
            .add(new THREE.Vector3(0.18, -0.14, 0).applyAxisAngle(_up, yaw))
            .add(_raycaster.ray.direction.clone().multiplyScalar(0.7));
          spawnTracer(tracerOrigin, endPoint);
        }

        if (hits.length > 0) {
          const hitObj = hits[0].object;
          const entityId = hitObj.userData.entityId as string | undefined;
          const hitZone = hitObj.userData.hitZone as 'head' | 'body' | undefined;

          if (entityId && hitZone) {
            const bot = bots.find((b) => b.id === entityId);
            if (bot && !bot.isDead) {
              const isHead = hitZone === 'head';
              const dmg = Math.round(spec.damage * (isHead ? spec.headshotMult : 1));
              bot.hp -= dmg;
              bot.hitFlash = 1.0;

              spawnHitEffect(hits[0].point, isHead);

              hitmarkerKind = isHead ? 'head' : 'body';
              hitmarkerTimer = 0.18;

              if (isHead) soundEngine.playHeadshotDink();
              else soundEngine.playHitmarker();

              if (bot.hp <= 0) {
                bot.hp = 0;
                bot.isDead = true;
                bot.deathTimer = 0;
                bot.respawnTimer = 3.5;
                kills += 1;
                money = Math.min(16000, money + (isHead ? 450 : 300));
                const creditReward = isHead ? 45 : 25;
                creditsEarnedMatch += creditReward;
                onEarnRef.current(creditReward);

                spawnKillEffect(bot.pos);

                if (team === 'ct') ctScore += 1;
                else tScore += 1;
                pushKillFeed('Você', team, bot.name, bot.team, activeWeapon, isHead);

                if (gameMode === 'tactical') {
                  const aliveBots = bots.filter((x) => !x.isDead).length;
                  if (aliveBots === 0) {
                    roundNumber += 1;
                    if (ctScore >= 10 || tScore >= 10) {
                      matchEnded = true;
                      winnerTeam = team;
                      creditsEarnedMatch += 150;
                      onEarnRef.current(150);
                    } else {
                      roundTimeSec = 90;
                      resetRoundEntities();
                    }
                  }
                }
              }
            }
          }
        }

        if (activeWeapon === 'awp' && isScoped) {
          isScoped = false;
        }
        if (activeWeapon !== 'knife' && ammo[activeWeapon].mag === 0 && ammo[activeWeapon].reserve > 0) {
          startReload();
        }
      };

      apiRef.current = {
        setMoveVector: (x, y) => {
          touchMoveX = x;
          touchMoveY = y;
        },
        addLookDelta: (dx, dy) => {
          if (pausedRef.current) return;
          const s = settingsRef.current;
          const sens = 0.0042 * s.touchSensitivity * (isScoped ? s.adsSensitivityMult : 1.0);
          const ySign = s.invertY ? -1 : 1;
          yaw -= dx * sens;
          pitch = THREE.MathUtils.clamp(pitch - dy * sens * ySign, -1.42, 1.42);
        },
        setFiring: (firing) => {
          isFiring = firing;
          if (firing && !WEAPON_SPECS[activeWeapon].automatic && fireCooldown <= 0) {
            fireActiveWeapon();
          }
        },
        toggleAds: () => {
          if (activeWeapon === 'knife') return;
          isScoped = !isScoped;
          soundEngine.playUiClick();
        },
        triggerReload: () => startReload(),
        triggerJump: () => {
          if (isGrounded) {
            playerVelY = 6.2;
            isGrounded = false;
          }
        },
        toggleCrouch: () => {
          isCrouching = !isCrouching;
        },
        triggerInspect: () => {
          if (!isReloading) inspectAnim = 1.0;
        },
        switchSlot: (slot) => {
          if (slot === 1) equipViewmodel(slot1Weapon);
          else if (slot === 2) equipViewmodel('deagle');
          else equipViewmodel('knife');
        },
        buyWeapon: (wId) => {
          const spec = WEAPON_SPECS[wId];
          if (money < spec.cost) return;
          money -= spec.cost;
          ammo[wId] = { mag: spec.magSize, reserve: spec.reserveMax };
          if (spec.slot === 1) slot1Weapon = wId;
          equipViewmodel(wId);
          soundEngine.playReload();
        },
        buyArmor: () => {
          if (armor >= 100 || money < 650) return;
          money -= 650;
          armor = 100;
          soundEngine.playEquip();
        },
        requestDesktopPointerLock: () => {
          if (window.matchMedia('(pointer: fine)').matches) {
            renderer.domElement.requestPointerLock?.();
          }
        },
        restartMatch: () => {
          ctScore = 0;
          tScore = 0;
          roundNumber = 1;
          roundTimeSec = gameMode === 'deathmatch' ? 180 : 90;
          kills = 0;
          deaths = 0;
          creditsEarnedMatch = 0;
          money = 4200;
          matchEnded = false;
          winnerTeam = null;
          killFeed = [];
          resetRoundEntities();
        },
      };

      const onKeyDown = (e: KeyboardEvent) => {
        keys[e.code] = true;
        if (pausedRef.current) return;
        if (e.code === 'KeyR') startReload();
        if (e.code === 'KeyF') apiRef.current?.triggerInspect();
        if (e.code === 'Digit1') apiRef.current?.switchSlot(1);
        if (e.code === 'Digit2') apiRef.current?.switchSlot(2);
        if (e.code === 'Digit3') apiRef.current?.switchSlot(3);
        if (e.code === 'Space' && isGrounded) {
          playerVelY = 6.2;
          isGrounded = false;
        }
        if (e.code === 'KeyC' || e.code === 'ControlLeft') {
          isCrouching = true;
        }
        if (e.code === 'KeyB') {
          if (document.pointerLockElement) document.exitPointerLock?.();
          onBuyMenuRef.current();
        }
      };
      const onKeyUp = (e: KeyboardEvent) => {
        keys[e.code] = false;
        if (e.code === 'KeyC' || e.code === 'ControlLeft') {
          isCrouching = false;
        }
      };

      const onMouseMove = (e: MouseEvent) => {
        if (document.pointerLockElement !== renderer.domElement || pausedRef.current) return;
        const s = settingsRef.current;
        const sens = 0.0022 * s.mouseSensitivity * (isScoped ? s.adsSensitivityMult : 1.0);
        const ySign = s.invertY ? -1 : 1;
        yaw -= e.movementX * sens;
        pitch = THREE.MathUtils.clamp(pitch - e.movementY * sens * ySign, -1.42, 1.42);
      };

      const onMouseDown = (e: MouseEvent) => {
        if (pausedRef.current) return;
        if (
          window.matchMedia('(pointer: fine)').matches &&
          document.pointerLockElement !== renderer.domElement
        ) {
          renderer.domElement.requestPointerLock?.();
          return;
        }
        if (e.button === 0) apiRef.current?.setFiring(true);
        else if (e.button === 2) apiRef.current?.toggleAds();
      };
      const onMouseUp = (e: MouseEvent) => {
        if (e.button === 0) apiRef.current?.setFiring(false);
      };
      const onContextMenu = (e: MouseEvent) => e.preventDefault();
      const onPointerLockChange = () => {
        pointerLocked = document.pointerLockElement === renderer.domElement;
      };

      let lookTouchId: number | null = null;
      let lastTouchX = 0;
      let lastTouchY = 0;
      const onTouchStart = (e: TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.clientX > window.innerWidth * 0.36 && lookTouchId === null) {
            lookTouchId = t.identifier;
            lastTouchX = t.clientX;
            lastTouchY = t.clientY;
          }
        }
      };
      const onTouchMove = (e: TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === lookTouchId) {
            const dx = t.clientX - lastTouchX;
            const dy = t.clientY - lastTouchY;
            lastTouchX = t.clientX;
            lastTouchY = t.clientY;
            apiRef.current?.addLookDelta(dx, dy);
          }
        }
      };
      const onTouchEnd = (e: TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === lookTouchId) {
            lookTouchId = null;
          }
        }
      };

      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('mousemove', onMouseMove);
      renderer.domElement.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mouseup', onMouseUp);
      renderer.domElement.addEventListener('contextmenu', onContextMenu);
      document.addEventListener('pointerlockchange', onPointerLockChange);
      renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
      renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: true });
      renderer.domElement.addEventListener('touchend', onTouchEnd);

      const onResize = () => {
        if (!container) return;
        const w = Math.max(container.clientWidth, 1);
        const h = Math.max(container.clientHeight, 1);
        const a = w / h;
        camera.aspect = a;
        camera.updateProjectionMatrix();
        weaponCamera.aspect = a;
        weaponCamera.updateProjectionMatrix();
        renderer.setSize(w, h);
        renderer.setPixelRatio(baseDpr * settingsRef.current.resolutionScale);
      };
      window.addEventListener('resize', onResize);

      const clock = new THREE.Clock();
      let frameId = 0;
      let isDisposed = false;
      let lastHudPush = 0;
      let fpsFrames = 0;
      let fpsTimer = 0;
      let currentFps = 60;

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
        const rawDelta = clock.getDelta();
        const dt = Math.min(rawDelta, 0.05);
        const elapsed = clock.getElapsedTime();

        fpsFrames += 1;
        fpsTimer += rawDelta;
        if (fpsTimer >= 0.5) {
          currentFps = Math.round(fpsFrames / fpsTimer);
          fpsFrames = 0;
          fpsTimer = 0;
        }

        if (!pausedRef.current && !matchEnded) {
          roundTimeSec = Math.max(0, roundTimeSec - dt);
          if (roundTimeSec <= 0) {
            if (gameMode === 'deathmatch') {
              matchEnded = true;
              winnerTeam = ctScore >= tScore ? 'ct' : 't';
              if ((winnerTeam === team)) {
                creditsEarnedMatch += 120;
                onEarnRef.current(120);
              }
            } else {
              if (team === 'ct') ctScore += 1;
              else tScore += 1;
              roundNumber += 1;
              if (ctScore >= 10 || tScore >= 10) {
                matchEnded = true;
                winnerTeam = ctScore > tScore ? 'ct' : 't';
                if (winnerTeam === team) {
                  creditsEarnedMatch += 150;
                  onEarnRef.current(150);
                }
              } else {
                roundTimeSec = 90;
                resetRoundEntities();
              }
            }
          }

          if (playerRespawnTimer > 0) {
            playerRespawnTimer -= dt;
            if (playerRespawnTimer <= 0) {
              const sp = playerSpawns[Math.floor(Math.random() * playerSpawns.length)];
              playerPos.copy(sp);
              hp = 100;
              armor = 100;
            }
          }

          const spec = WEAPON_SPECS[activeWeapon];
          const kbX = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);
          const kbY = (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0);
          const inX = Math.abs(touchMoveX) > 0.05 ? touchMoveX : kbX;
          const inY = Math.abs(touchMoveY) > 0.05 ? touchMoveY : kbY;

          const inputLen = Math.hypot(inX, inY);
          const normX = inputLen > 1 ? inX / inputLen : inX;
          const normY = inputLen > 1 ? inY / inputLen : inY;

          const baseSpeed = 6.2 * spec.moveSpeedMult * (isCrouching || isScoped ? 0.56 : 1.0);
          const sinY = Math.sin(yaw);
          const cosY = Math.cos(yaw);

          const vx = (-sinY * normY + cosY * normX) * baseSpeed;
          const vz = (-cosY * normY - sinY * normX) * baseSpeed;

          if (playerRespawnTimer <= 0) {
            const resX = resolveCircleAABB(
              playerPos.x + vx * dt,
              playerPos.z,
              playerPos.y,
              0.38,
              arena.colliders
            );
            playerPos.x = resX.x;
            const resZ = resolveCircleAABB(
              playerPos.x,
              playerPos.z + vz * dt,
              playerPos.y,
              0.38,
              arena.colliders
            );
            playerPos.z = resZ.z;

            playerVelY -= 18.5 * dt;
            playerPos.y += playerVelY * dt;
            if (playerPos.y <= 0) {
              playerPos.y = 0;
              playerVelY = 0;
              isGrounded = true;
            }
          }

          const targetEye = isCrouching ? 1.12 : 1.65;
          eyeHeight = THREE.MathUtils.damp(eyeHeight, targetEye, 12, dt);

          camera.position.set(playerPos.x, playerPos.y + eyeHeight, playerPos.z);
          camera.rotation.set(pitch, yaw, 0, 'YXZ');

          const targetFov = isScoped ? (activeWeapon === 'awp' ? 20 : 48) : 74;
          if (Math.abs(camera.fov - targetFov) > 0.1) {
            camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 14, dt);
            camera.updateProjectionMatrix();
          }

          fireCooldown = Math.max(0, fireCooldown - dt);
          if (isFiring && spec.automatic && fireCooldown <= 0) {
            fireActiveWeapon();
          }

          if (isReloading) {
            reloadElapsed += dt;
            if (reloadElapsed >= reloadDuration) {
              finishReload();
            }
          }

          if (hitmarkerTimer > 0) {
            hitmarkerTimer -= dt;
            if (hitmarkerTimer <= 0) hitmarkerKind = 'none';
          }

          equipAnim = Math.max(0, equipAnim - dt * 3.2);
          if (inspectAnim > 0) inspectAnim = Math.max(0, inspectAnim - dt * 0.65);
          recoilKick = THREE.MathUtils.damp(recoilKick, 0, 14, dt);
          recoilPitch = THREE.MathUtils.damp(recoilPitch, 0, 12, dt);
          boltSlide = THREE.MathUtils.damp(boltSlide, 0, 22, dt);
          muzzleFlashTimer = Math.max(0, muzzleFlashTimer - dt);

          const moveRatio = Math.min(Math.hypot(vx, vz) / 6.0, 1);
          if (moveRatio > 0.05 && isGrounded) {
            walkPhase += dt * (8.5 + moveRatio * 3.5);
          }

          adsProgress = THREE.MathUtils.damp(adsProgress, isScoped ? 1 : 0, 12, dt);
          const hideForScope = activeWeapon === 'awp' && adsProgress > 0.65;
          viewmodelPivot.visible = !hideForScope && playerRespawnTimer <= 0;

          if (viewmodelWeapon) {
            const bobX = Math.sin(walkPhase) * 0.011 * moveRatio * (1 - adsProgress * 0.8);
            const bobY = Math.abs(Math.cos(walkPhase)) * 0.013 * moveRatio * (1 - adsProgress * 0.8);

            const reloadArc = isReloading
              ? Math.sin((reloadElapsed / reloadDuration) * Math.PI)
              : 0;
            const inspectWave = inspectAnim > 0 ? Math.sin(inspectAnim * Math.PI) : 0;

            const baseX = THREE.MathUtils.lerp(0.24, 0.0, adsProgress);
            const baseY = THREE.MathUtils.lerp(-0.22, -0.14, adsProgress);
            const baseZ = THREE.MathUtils.lerp(-0.45, -0.36, adsProgress);

            viewmodelPivot.position.set(
              baseX + bobX - inspectWave * 0.08,
              baseY - bobY - equipAnim * 0.24 - reloadArc * 0.14,
              baseZ + recoilKick * 0.48
            );
            viewmodelPivot.rotation.set(
              recoilPitch - equipAnim * 0.55 + inspectWave * 0.28,
              inspectWave * 0.72,
              reloadArc * 0.42 + inspectWave * 0.45
            );

            viewmodelWeapon.magazineGroup.position.y = -reloadArc * 0.22;
            viewmodelWeapon.boltGroup.position.z = -boltSlide * 0.055;
            viewmodelWeapon.muzzleFlash.visible = muzzleFlashTimer > 0;
            viewmodelWeapon.muzzleFlash.rotation.z = elapsed * 45;
          }

          // Bots Update
          _playerEye.set(playerPos.x, playerPos.y + 1.45, playerPos.z);

          for (let i = 0; i < bots.length; i++) {
            const bot = bots[i];
            if (bot.isDead) {
              bot.deathTimer = Math.min(1, bot.deathTimer + dt * 2.4);
              bot.rig.updateCombatPose(elapsed, 0, 0, true, bot.deathTimer, 0);
              if (gameMode === 'deathmatch') {
                bot.respawnTimer -= dt;
                if (bot.respawnTimer <= 0) {
                  const sp = enemySpawns[Math.floor(Math.random() * enemySpawns.length)];
                  bot.pos.copy(sp);
                  bot.rig.root.position.copy(sp);
                  bot.hp = 100;
                  bot.isDead = false;
                  bot.deathTimer = 0;
                  bot.reactionTimer = 0.55;
                }
              }
              continue;
            }

            bot.hitFlash = Math.max(0, bot.hitFlash - dt * 5);
            bot.recoilFlash = Math.max(0, bot.recoilFlash - dt * 8);
            bot.fireCooldown = Math.max(0, bot.fireCooldown - dt);

            _botEye.set(bot.pos.x, 1.52, bot.pos.z);
            _toPlayer.subVectors(_playerEye, _botEye);
            const distToPlayer = _toPlayer.length();
            let seesPlayer = false;

            if (distToPlayer < 42 && playerRespawnTimer <= 0) {
              _dir.copy(_toPlayer).divideScalar(distToPlayer);
              _raycaster.set(_botEye, _dir);
              _raycaster.far = distToPlayer;
              const occ = _raycaster.intersectObjects(arena.obstacleMeshes, false);
              if (occ.length === 0) seesPlayer = true;
            }

            let moveSpeedRatio = 0;
            if (seesPlayer) {
              bot.yaw = Math.atan2(_toPlayer.x, _toPlayer.z);
              bot.strafeTimer -= dt;
              if (bot.strafeTimer <= 0) {
                bot.strafeDir *= -1;
                bot.strafeTimer = 0.9 + Math.random() * 1.1;
              }

              const strafeSpeed = distToPlayer > 12 ? 2.4 : 1.8;
              const sx = Math.cos(bot.yaw) * bot.strafeDir * strafeSpeed;
              const sz = -Math.sin(bot.yaw) * bot.strafeDir * strafeSpeed;
              const bx = resolveCircleAABB(bot.pos.x + sx * dt, bot.pos.z, 0, 0.42, arena.colliders);
              bot.pos.x = bx.x;
              const bz = resolveCircleAABB(bot.pos.x, bot.pos.z + sz * dt, 0, 0.42, arena.colliders);
              bot.pos.z = bz.z;
              moveSpeedRatio = 0.65;

              if (bot.reactionTimer > 0) {
                bot.reactionTimer -= dt;
              } else if (bot.fireCooldown <= 0) {
                bot.fireCooldown = 0.24 + Math.random() * 0.22;
                bot.recoilFlash = 1.0;

                const accuracy = Math.max(0.28, 0.68 - distToPlayer * 0.012);
                const hitPlayer = Math.random() < accuracy;
                const aimPoint = _playerEye.clone();
                if (!hitPlayer) {
                  aimPoint.x += (Math.random() - 0.5) * 1.6;
                  aimPoint.y += (Math.random() - 0.5) * 1.2;
                }
                spawnTracer(_botEye, aimPoint);

                if (hitPlayer) {
                  const rawDmg = 12 + Math.floor(Math.random() * 8);
                  const absorbed = armor > 0 ? Math.floor(rawDmg * 0.45) : 0;
                  armor = Math.max(0, armor - absorbed);
                  hp = Math.max(0, hp - (rawDmg - absorbed));
                  if (hp <= 0) {
                    deaths += 1;
                    if (enemyTeam === 'ct') ctScore += 1;
                    else tScore += 1;
                    pushKillFeed(bot.name, bot.team, 'Você', team, 'ak47', false);
                    if (gameMode === 'deathmatch') {
                      playerRespawnTimer = 2.5;
                    } else {
                      roundNumber += 1;
                      if (ctScore >= 10 || tScore >= 10) {
                        matchEnded = true;
                        winnerTeam = enemyTeam;
                      } else {
                        roundTimeSec = 90;
                        resetRoundEntities();
                      }
                    }
                  }
                }
              }
            } else {
              bot.reactionTimer = 0.42;
              const dx = bot.waypoint.x - bot.pos.x;
              const dz = bot.waypoint.z - bot.pos.z;
              const d = Math.hypot(dx, dz);
              if (d < 1.6) {
                bot.waypoint.copy(
                  arena.patrolPoints[Math.floor(Math.random() * arena.patrolPoints.length)]
                );
              } else {
                const moveSpd = 3.2;
                bot.yaw = Math.atan2(dx, dz);
                const nx = (dx / d) * moveSpd;
                const nz = (dz / d) * moveSpd;
                const prevX = bot.pos.x;
                const prevZ = bot.pos.z;
                const bx = resolveCircleAABB(bot.pos.x + nx * dt, bot.pos.z, 0, 0.42, arena.colliders);
                bot.pos.x = bx.x;
                const bz = resolveCircleAABB(bot.pos.x, bot.pos.z + nz * dt, 0, 0.42, arena.colliders);
                bot.pos.z = bz.z;
                if (Math.hypot(bot.pos.x - prevX, bot.pos.z - prevZ) < 0.01) {
                  bot.waypoint.copy(
                    arena.patrolPoints[Math.floor(Math.random() * arena.patrolPoints.length)]
                  );
                }
                moveSpeedRatio = 1.0;
              }
            }

            bot.rig.root.position.set(bot.pos.x, 0, bot.pos.z);
            bot.rig.root.rotation.y = bot.yaw;
            bot.rig.updateCombatPose(
              elapsed + i * 1.1,
              moveSpeedRatio,
              bot.recoilFlash,
              false,
              0,
              bot.hitFlash
            );
          }

          // Update Tracers
          for (let i = activeTracers.length - 1; i >= 0; i--) {
            activeTracers[i].life -= dt;
            if (activeTracers[i].life <= 0) {
              scene.remove(activeTracers[i].mesh);
              activeTracers.splice(i, 1);
            }
          }

          // Update Hit & Kill Spark Particles
          for (let i = activeSparks.length - 1; i >= 0; i--) {
            const p = activeSparks[i];
            p.life -= dt;
            if (p.life <= 0) {
              scene.remove(p.mesh);
              (p.mesh.material as THREE.Material).dispose();
              activeSparks.splice(i, 1);
            } else {
              p.vel.y -= p.gravity * dt;
              p.mesh.position.addScaledVector(p.vel, dt);
              const ratio = p.life / p.maxLife;
              (p.mesh.material as THREE.MeshBasicMaterial).opacity = ratio;
              p.mesh.scale.setScalar(0.5 + ratio * 0.8);
            }
          }

          // Update Kill Light Pillars & Rings
          for (let i = activeKillFx.length - 1; i >= 0; i--) {
            const kf = activeKillFx[i];
            kf.life -= dt;
            if (kf.life <= 0) {
              scene.remove(kf.group);
              kf.mat.dispose();
              activeKillFx.splice(i, 1);
            } else {
              const t = 1 - kf.life / kf.maxLife;
              kf.mat.opacity = (1 - t) * 0.85;
              const ringScale = 1 + t * 4.5;
              kf.ring.scale.set(ringScale, ringScale, ringScale);
              kf.pillar.scale.set(1 - t * 0.65, 1 + t * 0.4, 1 - t * 0.65);
            }
          }
        }

        renderer.clear();
        renderer.render(scene, camera);
        renderer.clearDepth();
        renderer.render(weaponScene, weaponCamera);

        const now = performance.now();
        if (now - lastHudPush > 66) {
          lastHudPush = now;
          onHudRef.current({
            hp,
            armor,
            money,
            fps: currentFps,
            activeWeapon,
            slot1Weapon,
            ammo: {
              ak47: { ...ammo.ak47 },
              m4a1s: { ...ammo.m4a1s },
              awp: { ...ammo.awp },
              deagle: { ...ammo.deagle },
              knife: { ...ammo.knife },
            },
            reloading: isReloading,
            scoped: isScoped && activeWeapon === 'awp' && adsProgress > 0.65,
            crouching: isCrouching,
            ctScore,
            tScore,
            roundNumber,
            roundTimeSec: Math.ceil(roundTimeSec),
            kills,
            deaths,
            creditsEarnedMatch,
            hitmarkerKind,
            crosshairSpread: Math.round(
              (WEAPON_SPECS[activeWeapon].baseSpread * 1000 + recoilKick * 120) *
                (isCrouching ? 0.65 : 1)
            ),
            matchEnded,
            winnerTeam,
            killFeed,
            pointerLocked,
          });
        }

        if (isSoftwareGl) afterDraw(tick);
        else frameId = requestAnimationFrame(tick);
      }

      tick();

      return () => {
        isDisposed = true;
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
        if (document.pointerLockElement === renderer.domElement) {
          document.exitPointerLock?.();
        }
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('mousemove', onMouseMove);
        renderer.domElement.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mouseup', onMouseUp);
        renderer.domElement.removeEventListener('contextmenu', onContextMenu);
        document.removeEventListener('pointerlockchange', onPointerLockChange);
        renderer.domElement.removeEventListener('touchstart', onTouchStart);
        renderer.domElement.removeEventListener('touchmove', onTouchMove);
        renderer.domElement.removeEventListener('touchend', onTouchEnd);
        window.removeEventListener('resize', onResize);

        activeTracers.forEach((t) => scene.remove(t.mesh));
        activeSparks.forEach((p) => {
          scene.remove(p.mesh);
          (p.mesh.material as THREE.Material).dispose();
        });
        activeKillFx.forEach((k) => {
          scene.remove(k.group);
          k.mat.dispose();
        });
        tracerGeo.dispose();
        tracerMat.dispose();
        sparkGeo.dispose();
        pillarGeo.dispose();
        shockRingGeo.dispose();
        viewmodelWeapon?.dispose();
        bots.forEach((b) => b.rig.dispose());
        arena.dispose();
        textures.dispose();
        envTex.dispose();
        renderer.dispose();
        apiRef.current = null;
      };
    }, [team, mapId, gameMode, initialPrimaryWeapon, skinId]);

    if (webglError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#0b0e14] text-zinc-300">
          WebGL indisponível neste dispositivo.
        </div>
      );
    }

    return <div ref={mountRef} className="w-full h-full touch-none" />;
  }
);

GameViewport.displayName = 'GameViewport';
