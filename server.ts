import http from 'node:http';
import path from 'node:path';
import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import { createServer as createViteServer } from 'vite';

type TeamSide = 'ct' | 't';
type MapId = 'mirage' | 'nuke';
type GameModeId = 'deathmatch' | 'tactical';
type WeaponId = 'ak47' | 'm4a1s' | 'awp' | 'deagle' | 'knife';
type SkinId = 'default' | 'asiimov' | 'hyper' | 'gold' | 'carbon';
type BannerId =
  | 'mirage-gold'
  | 'nuke-reactor'
  | 'cyber-cobalt'
  | 'crimson-ops'
  | 'shadow-elite'
  | 'emerald-spec';

interface PlayerDirectoryRecord {
  uid: string;
  shortId: string;
  displayName: string;
  bannerId: BannerId;
  authProvider: 'guest' | 'google' | 'apple';
  kills: number;
  deaths: number;
  wins: number;
  matchesPlayed: number;
  score: number;
}

interface RoomActor {
  id: string;
  shortId: string;
  name: string;
  bannerId: BannerId;
  team: TeamSide;
  weaponId: WeaponId;
  skinId: SkinId;
  x: number;
  y: number;
  z: number;
  yaw: number;
  hp: number;
  armor: number;
  isDead: boolean;
  respawnAt: number;
  crouching: boolean;
  kills: number;
  deaths: number;
  isBot: boolean;
  // Server bot steering
  waypointIdx?: number;
  fireCooldown?: number;
}

interface RoomState {
  code: string;
  name: string;
  mapId: MapId;
  gameMode: GameModeId;
  maxPlayers: number;
  fillBots: boolean;
  hostShortId: string;
  hostName: string;
  ctScore: number;
  tScore: number;
  roundNumber: number;
  roundEndsAt: number;
  matchEnded: boolean;
  winnerTeam: TeamSide | null;
  actors: Map<string, RoomActor>;
  sockets: Map<string, WebSocket>;
}

interface ClientSession {
  ws: WebSocket;
  shortId: string;
  uid: string;
  name: string;
  bannerId: BannerId;
  roomCode: string | null;
}

const WEAPON_DAMAGE: Record<WeaponId, { dmg: number; hs: number }> = {
  ak47: { dmg: 36, hs: 3.1 },
  m4a1s: { dmg: 33, hs: 2.8 },
  awp: { dmg: 115, hs: 4.0 },
  deagle: { dmg: 54, hs: 2.8 },
  knife: { dmg: 65, hs: 1.5 },
};

const MAP_SPAWNS: Record<MapId, { ct: [number, number][]; t: [number, number][]; patrol: [number, number][] }> = {
  mirage: {
    ct: [[-4, -25], [4, -25], [-12, -24], [12, -24], [0, -26]],
    t: [[-4, 25], [4, 25], [-12, 24], [12, 24], [0, 26]],
    patrol: [[-6, 0], [6, 0], [-15, 3], [15, -3], [-14, -10], [14, 10], [0, -11], [0, 11]],
  },
  nuke: {
    ct: [[-4, -25], [4, -25], [-12, -24], [12, -24], [0, -26]],
    t: [[-4, 25], [4, 25], [-12, 24], [12, 24], [0, 26]],
    patrol: [[-6, 0], [6, 0], [-14, 4], [14, -4], [-10, -14], [10, 14], [0, -12], [0, 12]],
  },
};

const BOT_NAMES = ['Viper-AI', 'Kobra-AI', 'Atlas-AI', 'Ghost-AI', 'Titan-AI'];

const directory = new Map<string, PlayerDirectoryRecord>();
const sessionsBySocket = new Map<WebSocket, ClientSession>();
const sessionsByShortId = new Map<string, ClientSession>();
const rooms = new Map<string, RoomState>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function sendJson(ws: WebSocket, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastRoom(room: RoomState, payload: unknown) {
  const raw = JSON.stringify(payload);
  for (const ws of room.sockets.values()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(raw);
    }
  }
}

function serializeRoomsList() {
  return Array.from(rooms.values())
    .filter((r) => r.sockets.size > 0)
    .map((r) => ({
      code: r.code,
      name: r.name,
      mapId: r.mapId,
      gameMode: r.gameMode,
      playerCount: r.sockets.size,
      maxPlayers: r.maxPlayers,
      fillBots: r.fillBots,
      hostName: r.hostName,
    }));
}

function broadcastPresenceAndRooms() {
  const roomsList = serializeRoomsList();
  for (const sess of sessionsBySocket.values()) {
    sendJson(sess.ws, {
      type: 'rooms:list',
      rooms: roomsList,
    });
  }
}

function syncRoomBots(room: RoomState) {
  if (!room.fillBots) {
    for (const [id, actor] of room.actors.entries()) {
      if (actor.isBot) room.actors.delete(id);
    }
    return;
  }

  const humans = Array.from(room.actors.values()).filter((a) => !a.isBot);
  const ctHumans = humans.filter((a) => a.team === 'ct').length;
  const tHumans = humans.filter((a) => a.team === 't').length;

  // Ensure at least 3 combatants per opposing team for exciting instant play
  const targetPerTeam = 3;
  const desiredCtBots = Math.max(0, targetPerTeam - ctHumans);
  const desiredTBots = Math.max(0, targetPerTeam - tHumans);

  // Remove excess bots first
  const existingCtBots = Array.from(room.actors.values()).filter((a) => a.isBot && a.team === 'ct');
  const existingTBots = Array.from(room.actors.values()).filter((a) => a.isBot && a.team === 't');

  while (existingCtBots.length > desiredCtBots) {
    const b = existingCtBots.pop()!;
    room.actors.delete(b.id);
  }
  while (existingTBots.length > desiredTBots) {
    const b = existingTBots.pop()!;
    room.actors.delete(b.id);
  }

  const spawns = MAP_SPAWNS[room.mapId];
  let idx = existingCtBots.length;
  while (idx < desiredCtBots) {
    const botId = `bot-ct-${idx}-${room.code}`;
    const sp = spawns.ct[idx % spawns.ct.length];
    room.actors.set(botId, {
      id: botId,
      shortId: `BOT-${100 + idx}`,
      name: BOT_NAMES[idx % BOT_NAMES.length],
      bannerId: 'cyber-cobalt',
      team: 'ct',
      weaponId: idx % 2 === 0 ? 'm4a1s' : 'ak47',
      skinId: 'default',
      x: sp[0],
      y: 0,
      z: sp[1],
      yaw: Math.PI,
      hp: 100,
      armor: 100,
      isDead: false,
      respawnAt: 0,
      crouching: false,
      kills: 0,
      deaths: 0,
      isBot: true,
      waypointIdx: idx % spawns.patrol.length,
      fireCooldown: 1000,
    });
    idx++;
  }

  let tidx = existingTBots.length;
  while (tidx < desiredTBots) {
    const botId = `bot-t-${tidx}-${room.code}`;
    const sp = spawns.t[tidx % spawns.t.length];
    room.actors.set(botId, {
      id: botId,
      shortId: `BOT-${200 + tidx}`,
      name: BOT_NAMES[(tidx + 2) % BOT_NAMES.length],
      bannerId: 'mirage-gold',
      team: 't',
      weaponId: tidx === 1 ? 'awp' : 'ak47',
      skinId: 'default',
      x: sp[0],
      y: 0,
      z: sp[1],
      yaw: 0,
      hp: 100,
      armor: 100,
      isDead: false,
      respawnAt: 0,
      crouching: false,
      kills: 0,
      deaths: 0,
      isBot: true,
      waypointIdx: (tidx + 3) % spawns.patrol.length,
      fireCooldown: 1000,
    });
    tidx++;
  }
}

function pickTeamForJoin(room: RoomState, preferred?: TeamSide): TeamSide {
  if (preferred === 'ct' || preferred === 't') return preferred;
  let ct = 0;
  let t = 0;
  for (const a of room.actors.values()) {
    if (!a.isBot) {
      if (a.team === 'ct') ct++;
      else t++;
    }
  }
  return ct <= t ? 'ct' : 't';
}

function leaveCurrentRoom(session: ClientSession) {
  if (!session.roomCode) return;
  const room = rooms.get(session.roomCode);
  session.roomCode = null;
  if (!room) return;
  room.actors.delete(session.shortId);
  room.sockets.delete(session.shortId);
  if (room.sockets.size === 0) {
    rooms.delete(room.code);
  } else {
    syncRoomBots(room);
  }
  broadcastPresenceAndRooms();
}

function joinRoom(session: ClientSession, room: RoomState, preferredTeam?: TeamSide) {
  leaveCurrentRoom(session);
  const team = pickTeamForJoin(room, preferredTeam);
  const spawns = MAP_SPAWNS[room.mapId][team];
  const sp = spawns[Math.floor(Math.random() * spawns.length)];

  const actor: RoomActor = {
    id: session.shortId,
    shortId: session.shortId,
    name: session.name,
    bannerId: session.bannerId,
    team,
    weaponId: 'm4a1s',
    skinId: 'asiimov',
    x: sp[0],
    y: 0,
    z: sp[1],
    yaw: team === 'ct' ? Math.PI : 0,
    hp: 100,
    armor: 100,
    isDead: false,
    respawnAt: 0,
    crouching: false,
    kills: 0,
    deaths: 0,
    isBot: false,
  };

  session.roomCode = room.code;
  room.actors.set(session.shortId, actor);
  room.sockets.set(session.shortId, session.ws);
  syncRoomBots(room);

  sendJson(session.ws, {
    type: 'room:joined',
    room: {
      code: room.code,
      name: room.name,
      mapId: room.mapId,
      gameMode: room.gameMode,
      fillBots: room.fillBots,
      team,
      spawn: { x: sp[0], y: 0, z: sp[1], yaw: actor.yaw },
    },
  });
  broadcastPresenceAndRooms();
}

function resetRoomRound(room: RoomState) {
  const spawns = MAP_SPAWNS[room.mapId];
  let ctIdx = 0;
  let tIdx = 0;
  for (const actor of room.actors.values()) {
    const list = actor.team === 'ct' ? spawns.ct : spawns.t;
    const sp = actor.team === 'ct' ? list[ctIdx++ % list.length] : list[tIdx++ % list.length];
    actor.x = sp[0];
    actor.y = 0;
    actor.z = sp[1];
    actor.yaw = actor.team === 'ct' ? Math.PI : 0;
    actor.hp = 100;
    actor.armor = 100;
    actor.isDead = false;
    actor.respawnAt = 0;
  }
  room.roundEndsAt = Date.now() + (room.gameMode === 'deathmatch' ? 180_000 : 90_000);
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, rooms: rooms.size, online: sessionsByShortId.size });
  });

  app.get('/api/rooms', (_req, res) => {
    res.json({ rooms: serializeRoomsList() });
  });

  app.post('/api/profile/sync', (req, res) => {
    const body = req.body as Partial<PlayerDirectoryRecord>;
    if (!body.shortId || !/^STK-[0-9]{6}$/.test(body.shortId)) {
      res.status(400).json({ error: 'Invalid shortId' });
      return;
    }
    const existing = directory.get(body.shortId);
    const merged: PlayerDirectoryRecord = {
      uid: body.uid || existing?.uid || body.shortId,
      shortId: body.shortId,
      displayName: (body.displayName || existing?.displayName || 'Operador').slice(0, 16),
      bannerId: body.bannerId || existing?.bannerId || 'mirage-gold',
      authProvider: body.authProvider || existing?.authProvider || 'guest',
      kills: Math.max(existing?.kills ?? 0, body.kills ?? 0),
      deaths: Math.max(existing?.deaths ?? 0, body.deaths ?? 0),
      wins: Math.max(existing?.wins ?? 0, body.wins ?? 0),
      matchesPlayed: Math.max(existing?.matchesPlayed ?? 0, body.matchesPlayed ?? 0),
      score: Math.max(existing?.score ?? 0, body.score ?? 0),
    };
    directory.set(body.shortId, merged);
    res.json({ ok: true, profile: merged });
  });

  app.get('/api/players/lookup/:shortId', (req, res) => {
    const sid = req.params.shortId.trim().toUpperCase();
    const rec = directory.get(sid);
    const live = sessionsByShortId.get(sid);
    if (!rec && !live) {
      res.status(404).json({ error: 'Jogador não encontrado' });
      return;
    }
    res.json({
      player: {
        uid: rec?.uid ?? live?.uid ?? sid,
        shortId: sid,
        displayName: live?.name ?? rec?.displayName ?? 'Operador',
        bannerId: live?.bannerId ?? rec?.bannerId ?? 'mirage-gold',
        authProvider: rec?.authProvider ?? 'guest',
        kills: rec?.kills ?? 0,
        deaths: rec?.deaths ?? 0,
        wins: rec?.wins ?? 0,
        matchesPlayed: rec?.matchesPlayed ?? 0,
        score: rec?.score ?? 0,
        online: Boolean(live),
        roomCode: live?.roomCode ?? null,
      },
    });
  });

  app.post('/api/players/presence', (req, res) => {
    const ids = Array.isArray(req.body?.shortIds) ? (req.body.shortIds as string[]) : [];
    const statusMap: Record<string, { online: boolean; roomCode: string | null; displayName?: string; bannerId?: BannerId }> = {};
    for (const sid of ids.slice(0, 50)) {
      const upper = String(sid).toUpperCase();
      const live = sessionsByShortId.get(upper);
      const rec = directory.get(upper);
      statusMap[upper] = {
        online: Boolean(live),
        roomCode: live?.roomCode ?? null,
        displayName: live?.name ?? rec?.displayName,
        bannerId: live?.bannerId ?? rec?.bannerId,
      };
    }
    res.json({ statuses: statusMap });
  });

  app.get('/api/leaderboard', (_req, res) => {
    const list = Array.from(directory.values())
      .sort((a, b) => b.score - a.score || b.kills - a.kills)
      .slice(0, 30)
      .map((p) => ({
        ...p,
        online: sessionsByShortId.has(p.shortId),
      }));
    res.json({ players: list });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (req, socket, head) => {
    const pathname = (req.url || '').split('?')[0];
    if (pathname === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
  });

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString()) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = String(msg.type || '');

      if (type === 'ping') {
        sendJson(ws, { type: 'pong', ts: msg.ts });
        return;
      }

      if (type === 'auth:hello') {
        const shortId = String(msg.shortId || '').toUpperCase();
        if (!/^STK-[0-9]{6}$/.test(shortId)) return;
        const name = String(msg.name || 'Operador').slice(0, 16);
        const bannerId = (String(msg.bannerId || 'mirage-gold') as BannerId);
        const uid = String(msg.uid || shortId);

        const prevSession = sessionsBySocket.get(ws);
        if (prevSession && prevSession.shortId === shortId) {
          prevSession.name = name;
          prevSession.bannerId = bannerId;
          prevSession.uid = uid;
        } else {
          const oldSock = sessionsByShortId.get(shortId);
          if (oldSock && oldSock.ws !== ws) {
            leaveCurrentRoom(oldSock);
            sessionsBySocket.delete(oldSock.ws);
          }
          const session: ClientSession = {
            ws,
            shortId,
            uid,
            name,
            bannerId,
            roomCode: null,
          };
          sessionsBySocket.set(ws, session);
          sessionsByShortId.set(shortId, session);
        }

        if (!directory.has(shortId)) {
          directory.set(shortId, {
            uid,
            shortId,
            displayName: name,
            bannerId,
            authProvider: 'guest',
            kills: 0,
            deaths: 0,
            wins: 0,
            matchesPlayed: 0,
            score: 0,
          });
        } else {
          const rec = directory.get(shortId)!;
          rec.displayName = name;
          rec.bannerId = bannerId;
        }

        sendJson(ws, { type: 'rooms:list', rooms: serializeRoomsList() });
        return;
      }

      const session = sessionsBySocket.get(ws);
      if (!session) return;

      if (type === 'room:create') {
        const mapId: MapId = msg.mapId === 'nuke' ? 'nuke' : 'mirage';
        const gameMode: GameModeId = msg.gameMode === 'tactical' ? 'tactical' : 'deathmatch';
        const fillBots = msg.fillBots !== false;
        const preferredTeam: TeamSide = msg.team === 't' ? 't' : 'ct';
        const code = generateRoomCode();
        const room: RoomState = {
          code,
          name: `Sala de ${session.name}`.slice(0, 28),
          mapId,
          gameMode,
          maxPlayers: 10,
          fillBots,
          hostShortId: session.shortId,
          hostName: session.name,
          ctScore: 0,
          tScore: 0,
          roundNumber: 1,
          roundEndsAt: Date.now() + (gameMode === 'deathmatch' ? 180_000 : 90_000),
          matchEnded: false,
          winnerTeam: null,
          actors: new Map(),
          sockets: new Map(),
        };
        rooms.set(code, room);
        joinRoom(session, room, preferredTeam);
        return;
      }

      if (type === 'room:join') {
        const code = String(msg.code || '').trim().toUpperCase();
        const room = rooms.get(code);
        if (!room) {
          sendJson(ws, { type: 'error', message: `Sala ${code} não encontrada.` });
          return;
        }
        if (room.sockets.size >= room.maxPlayers) {
          sendJson(ws, { type: 'error', message: 'Esta sala já está lotada.' });
          return;
        }
        const prefTeam = msg.team === 'ct' || msg.team === 't' ? msg.team : undefined;
        joinRoom(session, room, prefTeam);
        return;
      }

      if (type === 'room:quickmatch') {
        const mapId: MapId = msg.mapId === 'nuke' ? 'nuke' : 'mirage';
        const gameMode: GameModeId = msg.gameMode === 'tactical' ? 'tactical' : 'deathmatch';
        const prefTeam: TeamSide = msg.team === 't' ? 't' : 'ct';

        let target = Array.from(rooms.values()).find(
          (r) =>
            !r.matchEnded &&
            r.mapId === mapId &&
            r.gameMode === gameMode &&
            r.sockets.size < r.maxPlayers
        );
        if (!target) {
          target = Array.from(rooms.values()).find(
            (r) => !r.matchEnded && r.sockets.size < r.maxPlayers
          );
        }
        if (!target) {
          const code = generateRoomCode();
          target = {
            code,
            name: `Arena ${mapId === 'mirage' ? 'Mirage' : 'Nuke'} #${code}`,
            mapId,
            gameMode,
            maxPlayers: 10,
            fillBots: true,
            hostShortId: session.shortId,
            hostName: session.name,
            ctScore: 0,
            tScore: 0,
            roundNumber: 1,
            roundEndsAt: Date.now() + (gameMode === 'deathmatch' ? 180_000 : 90_000),
            matchEnded: false,
            winnerTeam: null,
            actors: new Map(),
            sockets: new Map(),
          };
          rooms.set(code, target);
        }
        joinRoom(session, target, prefTeam);
        return;
      }

      if (type === 'room:leave') {
        leaveCurrentRoom(session);
        return;
      }

      if (type === 'invite:send') {
        const targetShortId = String(msg.targetShortId || '').trim().toUpperCase();
        const target = sessionsByShortId.get(targetShortId);
        if (!target) {
          sendJson(ws, {
            type: 'error',
            message: `Jogador ${targetShortId} não está online no momento.`,
          });
          return;
        }
        let room = session.roomCode ? rooms.get(session.roomCode) : undefined;
        if (!room) {
          const mapId: MapId = msg.mapId === 'nuke' ? 'nuke' : 'mirage';
          const gameMode: GameModeId = msg.gameMode === 'tactical' ? 'tactical' : 'deathmatch';
          const code = generateRoomCode();
          room = {
            code,
            name: `Esquadrão de ${session.name}`,
            mapId,
            gameMode,
            maxPlayers: 10,
            fillBots: true,
            hostShortId: session.shortId,
            hostName: session.name,
            ctScore: 0,
            tScore: 0,
            roundNumber: 1,
            roundEndsAt: Date.now() + (gameMode === 'deathmatch' ? 180_000 : 90_000),
            matchEnded: false,
            winnerTeam: null,
            actors: new Map(),
            sockets: new Map(),
          };
          rooms.set(code, room);
          joinRoom(session, room, msg.team === 't' ? 't' : 'ct');
        }
        sendJson(target.ws, {
          type: 'invite:received',
          invite: {
            inviteId: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            fromShortId: session.shortId,
            fromName: session.name,
            fromBannerId: session.bannerId,
            roomCode: room.code,
            mapId: room.mapId,
            gameMode: room.gameMode,
          },
        });
        sendJson(ws, { type: 'invite:sent', toShortId: targetShortId, roomCode: room.code });
        return;
      }

      if (type === 'player:state' && session.roomCode) {
        const room = rooms.get(session.roomCode);
        const actor = room?.actors.get(session.shortId);
        if (!room || !actor || actor.isDead) return;
        actor.x = Number(msg.x) || 0;
        actor.y = Number(msg.y) || 0;
        actor.z = Number(msg.z) || 0;
        actor.yaw = Number(msg.yaw) || 0;
        actor.weaponId = (msg.weaponId as WeaponId) || actor.weaponId;
        actor.skinId = (msg.skinId as SkinId) || actor.skinId;
        actor.crouching = Boolean(msg.crouching);
        return;
      }

      if (type === 'player:shot' && session.roomCode) {
        const room = rooms.get(session.roomCode);
        const shooter = room?.actors.get(session.shortId);
        if (!room || !shooter || shooter.isDead || room.matchEnded) return;

        const weaponId: WeaponId = (msg.weaponId as WeaponId) || shooter.weaponId;
        const from = msg.from as { x: number; y: number; z: number } | undefined;
        const to = msg.to as { x: number; y: number; z: number } | undefined;
        if (from && to && weaponId !== 'knife') {
          broadcastRoom(room, {
            type: 'combat:tracer',
            shooterId: shooter.id,
            from,
            to,
          });
        }

        const targetId = msg.targetId ? String(msg.targetId) : '';
        if (!targetId) return;
        const victim = room.actors.get(targetId);
        if (!victim || victim.isDead || victim.team === shooter.team) return;

        const isHead = msg.hitZone === 'head';
        const spec = WEAPON_DAMAGE[weaponId] ?? WEAPON_DAMAGE.ak47;
        const rawDmg = Math.round(spec.dmg * (isHead ? spec.hs : 1));
        const absorbed = victim.armor > 0 ? Math.floor(rawDmg * 0.25) : 0;
        victim.armor = Math.max(0, victim.armor - absorbed);
        victim.hp = Math.max(0, victim.hp - (rawDmg - absorbed));

        const hitPoint = msg.hitPoint as { x: number; y: number; z: number } | undefined;
        broadcastRoom(room, {
          type: 'combat:hit',
          shooterId: shooter.id,
          victimId: victim.id,
          isHead,
          dmg: rawDmg,
          hp: victim.hp,
          armor: victim.armor,
          hitPoint: hitPoint ?? { x: victim.x, y: 1.3, z: victim.z },
        });

        if (victim.hp <= 0) {
          victim.isDead = true;
          victim.deaths += 1;
          victim.respawnAt = Date.now() + 3000;
          shooter.kills += 1;
          if (shooter.team === 'ct') room.ctScore += 1;
          else room.tScore += 1;

          // Update server leaderboard directory for human players
          if (!shooter.isBot) {
            const sRec = directory.get(shooter.shortId);
            if (sRec) {
              sRec.kills += 1;
              sRec.score += isHead ? 150 : 100;
            }
          }
          if (!victim.isBot) {
            const vRec = directory.get(victim.shortId);
            if (vRec) vRec.deaths += 1;
          }

          broadcastRoom(room, {
            type: 'combat:kill',
            killerId: shooter.id,
            killerName: shooter.name,
            killerTeam: shooter.team,
            victimId: victim.id,
            victimName: victim.name,
            victimTeam: victim.team,
            weaponId,
            headshot: isHead,
            pos: { x: victim.x, y: victim.y, z: victim.z },
            ctScore: room.ctScore,
            tScore: room.tScore,
          });

          if (room.gameMode === 'tactical') {
            const aliveEnemies = Array.from(room.actors.values()).filter(
              (a) => a.team === victim.team && !a.isDead
            ).length;
            if (aliveEnemies === 0) {
              room.roundNumber += 1;
              if (room.ctScore >= 10 || room.tScore >= 10) {
                room.matchEnded = true;
                room.winnerTeam = room.ctScore >= room.tScore ? 'ct' : 't';
              } else {
                resetRoomRound(room);
              }
            }
          }
        }
        return;
      }

      if (type === 'room:restart' && session.roomCode) {
        const room = rooms.get(session.roomCode);
        if (!room) return;
        room.ctScore = 0;
        room.tScore = 0;
        room.roundNumber = 1;
        room.matchEnded = false;
        room.winnerTeam = null;
        resetRoomRound(room);
      }
    });

    ws.on('close', () => {
      const session = sessionsBySocket.get(ws);
      if (session) {
        leaveCurrentRoom(session);
        sessionsBySocket.delete(ws);
        if (sessionsByShortId.get(session.shortId)?.ws === ws) {
          sessionsByShortId.delete(session.shortId);
        }
      }
    });
  });

  // 20Hz authoritative room snapshot & bot simulation tick
  setInterval(() => {
    const now = Date.now();
    for (const room of rooms.values()) {
      if (room.sockets.size === 0) continue;

      if (!room.matchEnded && now >= room.roundEndsAt) {
        if (room.gameMode === 'deathmatch') {
          room.matchEnded = true;
          room.winnerTeam = room.ctScore >= room.tScore ? 'ct' : 't';
          for (const a of room.actors.values()) {
            if (!a.isBot) {
              const rec = directory.get(a.shortId);
              if (rec) {
                rec.matchesPlayed += 1;
                if (a.team === room.winnerTeam) {
                  rec.wins += 1;
                  rec.score += 250;
                }
              }
            }
          }
        } else {
          room.roundNumber += 1;
          resetRoomRound(room);
        }
      }

      const spawns = MAP_SPAWNS[room.mapId];
      const dt = 0.05;

      for (const actor of room.actors.values()) {
        if (actor.isDead) {
          if (room.gameMode === 'deathmatch' && now >= actor.respawnAt) {
            const spList = spawns[actor.team];
            const sp = spList[Math.floor(Math.random() * spList.length)];
            actor.x = sp[0];
            actor.y = 0;
            actor.z = sp[1];
            actor.hp = 100;
            actor.armor = 100;
            actor.isDead = false;
          }
          continue;
        }

        if (actor.isBot && !room.matchEnded) {
          // Simple smooth patrol + engage nearest enemy within range
          let nearestEnemy: RoomActor | null = null;
          let nearestDist = 26;
          for (const other of room.actors.values()) {
            if (other.team === actor.team || other.isDead) continue;
            const d = Math.hypot(other.x - actor.x, other.z - actor.z);
            if (d < nearestDist) {
              nearestDist = d;
              nearestEnemy = other;
            }
          }

          if (nearestEnemy) {
            actor.yaw = Math.atan2(nearestEnemy.x - actor.x, nearestEnemy.z - actor.z);
            actor.fireCooldown = (actor.fireCooldown ?? 0) - 50;
            if ((actor.fireCooldown ?? 0) <= 0) {
              actor.fireCooldown = 480 + Math.random() * 420;
              const hitChance = Math.max(0.18, 0.5 - nearestDist * 0.012);
              const didHit = Math.random() < hitChance;
              broadcastRoom(room, {
                type: 'combat:tracer',
                shooterId: actor.id,
                from: { x: actor.x, y: 1.5, z: actor.z },
                to: {
                  x: nearestEnemy.x + (didHit ? 0 : (Math.random() - 0.5) * 1.4),
                  y: 1.35,
                  z: nearestEnemy.z + (didHit ? 0 : (Math.random() - 0.5) * 1.4),
                },
              });

              if (didHit) {
                const dmg = 11 + Math.floor(Math.random() * 7);
                const absorbed = nearestEnemy.armor > 0 ? Math.floor(dmg * 0.35) : 0;
                nearestEnemy.armor = Math.max(0, nearestEnemy.armor - absorbed);
                nearestEnemy.hp = Math.max(0, nearestEnemy.hp - (dmg - absorbed));

                broadcastRoom(room, {
                  type: 'combat:hit',
                  shooterId: actor.id,
                  victimId: nearestEnemy.id,
                  isHead: false,
                  dmg,
                  hp: nearestEnemy.hp,
                  armor: nearestEnemy.armor,
                  hitPoint: { x: nearestEnemy.x, y: 1.35, z: nearestEnemy.z },
                });

                if (nearestEnemy.hp <= 0) {
                  nearestEnemy.isDead = true;
                  nearestEnemy.deaths += 1;
                  nearestEnemy.respawnAt = now + 3000;
                  actor.kills += 1;
                  if (actor.team === 'ct') room.ctScore += 1;
                  else room.tScore += 1;

                  broadcastRoom(room, {
                    type: 'combat:kill',
                    killerId: actor.id,
                    killerName: actor.name,
                    killerTeam: actor.team,
                    victimId: nearestEnemy.id,
                    victimName: nearestEnemy.name,
                    victimTeam: nearestEnemy.team,
                    weaponId: actor.weaponId,
                    headshot: false,
                    pos: { x: nearestEnemy.x, y: nearestEnemy.y, z: nearestEnemy.z },
                    ctScore: room.ctScore,
                    tScore: room.tScore,
                  });
                }
              }
            }
          } else {
            const wpIdx = actor.waypointIdx ?? 0;
            const wp = spawns.patrol[wpIdx % spawns.patrol.length];
            const dx = wp[0] - actor.x;
            const dz = wp[1] - actor.z;
            const dist = Math.hypot(dx, dz);
            if (dist < 1.2) {
              actor.waypointIdx = (wpIdx + 1) % spawns.patrol.length;
            } else {
              actor.yaw = Math.atan2(dx, dz);
              actor.x += (dx / dist) * 3.0 * dt;
              actor.z += (dz / dist) * 3.0 * dt;
            }
          }
        }
      }

      broadcastRoom(room, {
        type: 'room:snapshot',
        code: room.code,
        ctScore: room.ctScore,
        tScore: room.tScore,
        roundNumber: room.roundNumber,
        roundTimeSec: Math.max(0, Math.ceil((room.roundEndsAt - now) / 1000)),
        matchEnded: room.matchEnded,
        winnerTeam: room.winnerTeam,
        actors: Array.from(room.actors.values()).map((a) => ({
          id: a.id,
          shortId: a.shortId,
          name: a.name,
          bannerId: a.bannerId,
          team: a.team,
          weaponId: a.weaponId,
          skinId: a.skinId,
          x: Math.round(a.x * 100) / 100,
          y: Math.round(a.y * 100) / 100,
          z: Math.round(a.z * 100) / 100,
          yaw: Math.round(a.yaw * 1000) / 1000,
          hp: a.hp,
          isDead: a.isDead,
          crouching: a.crouching,
          kills: a.kills,
          deaths: a.deaths,
          isBot: a.isBot,
        })),
      });
    }
  }, 50);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false, watch: null },
      appType: 'spa',
    });
    app.get('/@vite/client', async (req, res, next) => {
      try {
        const result = await vite.transformRequest(req.originalUrl || '/@vite/client');
        if (!result) return next();
        const patched = result.code.replace(
          /transport\.connect\([^;]*\);/,
          '/* HMR disabled */'
        );
        res.status(200).type('application/javascript').send(patched);
      } catch (err) {
        next(err);
      }
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = 3000;
  server.listen(port, '0.0.0.0', () => {
    console.log(`STRIKE 2 server listening on http://0.0.0.0:${port}`);
  });
}

void startServer();
