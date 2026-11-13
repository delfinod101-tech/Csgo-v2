import {
  BannerId,
  GameModeId,
  MapId,
  OnlineRoomSummary,
  PlayerProfile,
  RemoteActorState,
  RoomInviteEvent,
  SkinId,
  TeamSide,
  WeaponId,
} from '@/src/types/game';

export interface JoinedRoomInfo {
  code: string;
  name: string;
  mapId: MapId;
  gameMode: GameModeId;
  fillBots: boolean;
  team: TeamSide;
  spawn: { x: number; y: number; z: number; yaw: number };
}

export interface RoomSnapshotEvent {
  code: string;
  ctScore: number;
  tScore: number;
  roundNumber: number;
  roundTimeSec: number;
  matchEnded: boolean;
  winnerTeam: TeamSide | null;
  actors: RemoteActorState[];
}

export interface CombatHitEvent {
  shooterId: string;
  victimId: string;
  isHead: boolean;
  dmg: number;
  hp: number;
  armor: number;
  hitPoint: { x: number; y: number; z: number };
}

export interface CombatKillEvent {
  killerId: string;
  killerName: string;
  killerTeam: TeamSide;
  victimId: string;
  victimName: string;
  victimTeam: TeamSide;
  weaponId: WeaponId;
  headshot: boolean;
  pos: { x: number; y: number; z: number };
  ctScore: number;
  tScore: number;
}

export interface CombatTracerEvent {
  shooterId: string;
  from: { x: number; y: number; z: number };
  to: { x: number; y: number; z: number };
}

type ListenerMap = {
  status: Set<(connected: boolean, pingMs: number) => void>;
  rooms: Set<(rooms: OnlineRoomSummary[]) => void>;
  joined: Set<(info: JoinedRoomInfo) => void>;
  snapshot: Set<(snap: RoomSnapshotEvent) => void>;
  hit: Set<(ev: CombatHitEvent) => void>;
  kill: Set<(ev: CombatKillEvent) => void>;
  tracer: Set<(ev: CombatTracerEvent) => void>;
  invite: Set<(inv: RoomInviteEvent) => void>;
  error: Set<(message: string) => void>;
};

class MultiplayerClient {
  private ws: WebSocket | null = null;
  private connected = false;
  private pingMs = 24;
  private profile: PlayerProfile | null = null;
  private reconnectTimer: number | null = null;
  private pingTimer: number | null = null;
  private queue: string[] = [];

  private listeners: ListenerMap = {
    status: new Set(),
    rooms: new Set(),
    joined: new Set(),
    snapshot: new Set(),
    hit: new Set(),
    kill: new Set(),
    tracer: new Set(),
    invite: new Set(),
    error: new Set(),
  };

  public connect(profile: PlayerProfile): void {
    this.profile = profile;
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.sendHello(profile);
      }
      return;
    }

    const wsUrl = `${window.location.origin.replace(/^http/, 'ws')}/ws`;
    try {
      const sock = new WebSocket(wsUrl);
      this.ws = sock;

      sock.onopen = () => {
        this.connected = true;
        if (this.profile) {
          this.sendHello(this.profile);
        }
        while (this.queue.length > 0) {
          const item = this.queue.shift();
          if (item) sock.send(item);
        }
        this.listeners.status.forEach((cb) => cb(true, this.pingMs));
        if (this.pingTimer) clearInterval(this.pingTimer);
        this.pingTimer = window.setInterval(() => {
          this.send({ type: 'ping', ts: performance.now() });
        }, 5000);
      };

      sock.onmessage = (event) => {
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(String(event.data)) as Record<string, unknown>;
        } catch {
          return;
        }
        const type = String(data.type || '');
        if (type === 'pong') {
          const rtt = Math.max(4, Math.round(performance.now() - Number(data.ts || 0)));
          this.pingMs = rtt;
          this.listeners.status.forEach((cb) => cb(this.connected, this.pingMs));
          return;
        }
        if (type === 'rooms:list') {
          this.listeners.rooms.forEach((cb) => cb(data.rooms as OnlineRoomSummary[]));
          return;
        }
        if (type === 'room:joined') {
          this.listeners.joined.forEach((cb) => cb(data.room as JoinedRoomInfo));
          return;
        }
        if (type === 'room:snapshot') {
          this.listeners.snapshot.forEach((cb) => cb(data as unknown as RoomSnapshotEvent));
          return;
        }
        if (type === 'combat:hit') {
          this.listeners.hit.forEach((cb) => cb(data as unknown as CombatHitEvent));
          return;
        }
        if (type === 'combat:kill') {
          this.listeners.kill.forEach((cb) => cb(data as unknown as CombatKillEvent));
          return;
        }
        if (type === 'combat:tracer') {
          this.listeners.tracer.forEach((cb) => cb(data as unknown as CombatTracerEvent));
          return;
        }
        if (type === 'invite:received') {
          this.listeners.invite.forEach((cb) => cb(data.invite as RoomInviteEvent));
          return;
        }
        if (type === 'error') {
          this.listeners.error.forEach((cb) => cb(String(data.message || 'Erro de conexão')));
        }
      };

      sock.onclose = () => {
        this.connected = false;
        if (this.pingTimer) {
          clearInterval(this.pingTimer);
          this.pingTimer = null;
        }
        this.listeners.status.forEach((cb) => cb(false, this.pingMs));
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = window.setTimeout(() => {
          if (this.profile) this.connect(this.profile);
        }, 2500);
      };

      sock.onerror = () => {
        // handled via onclose auto-reconnect
      };
    } catch {
      // ignore if environment temporarily blocks ws
    }
  }

  public updateIdentity(profile: PlayerProfile): void {
    this.profile = profile;
    if (this.connected) {
      this.sendHello(profile);
    } else {
      this.connect(profile);
    }
  }

  private sendHello(profile: PlayerProfile) {
    this.send({
      type: 'auth:hello',
      uid: profile.uid,
      shortId: profile.shortId,
      name: profile.displayName,
      bannerId: profile.bannerId as BannerId,
    });
  }

  public send(payload: unknown): void {
    const raw = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(raw);
    } else {
      if (this.queue.length < 20) {
        this.queue.push(raw);
      }
    }
  }

  public createRoom(opts: {
    mapId: MapId;
    gameMode: GameModeId;
    team: TeamSide;
    fillBots: boolean;
  }): void {
    this.send({ type: 'room:create', ...opts });
  }

  public joinRoom(code: string, team?: TeamSide): void {
    this.send({ type: 'room:join', code, team });
  }

  public quickMatch(opts: { mapId: MapId; gameMode: GameModeId; team: TeamSide }): void {
    this.send({ type: 'room:quickmatch', ...opts });
  }

  public leaveRoom(): void {
    this.send({ type: 'room:leave' });
  }

  public sendInvite(targetShortId: string, opts: { mapId: MapId; gameMode: GameModeId; team: TeamSide }): void {
    this.send({ type: 'invite:send', targetShortId, ...opts });
  }

  public sendPlayerState(state: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    weaponId: WeaponId;
    skinId: SkinId;
    crouching: boolean;
  }): void {
    this.send({ type: 'player:state', ...state });
  }

  public sendShot(shot: {
    weaponId: WeaponId;
    from: { x: number; y: number; z: number };
    to: { x: number; y: number; z: number };
    targetId?: string;
    hitZone?: 'head' | 'body';
    hitPoint?: { x: number; y: number; z: number };
  }): void {
    this.send({ type: 'player:shot', ...shot });
  }

  public restartRoom(): void {
    this.send({ type: 'room:restart' });
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public getPingMs(): number {
    return this.pingMs;
  }

  public on<K extends keyof ListenerMap>(
    event: K,
    cb: ListenerMap[K] extends Set<infer T> ? T : never
  ): () => void {
    const set = this.listeners[event] as Set<unknown>;
    set.add(cb);
    return () => {
      set.delete(cb);
    };
  }
}

export const multiplayerClient = new MultiplayerClient();
