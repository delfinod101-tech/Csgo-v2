import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Globe,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Trophy,
  UserPlus,
  Users,
  Wifi,
  X,
} from 'lucide-react';
import {
  FriendRecord,
  GameModeId,
  MAP_LIST,
  MapId,
  OnlineRoomSummary,
  PROFILE_BANNERS,
  PlayerProfile,
  PublicPlayerInfo,
  TeamSide,
} from '@/src/types/game';
import { soundEngine } from '@/src/game/sound';
import {
  fetchFirestoreLeaderboard,
  lookupDirectoryByShortId,
} from '@/src/game/firebase';

export type SocialTab = 'rooms' | 'friends' | 'leaderboard';

interface SocialModalProps {
  initialTab?: SocialTab;
  profile: PlayerProfile;
  friends: FriendRecord[];
  rooms: OnlineRoomSummary[];
  wsConnected: boolean;
  pingMs: number;
  selectedMap: MapId;
  selectedMode: GameModeId;
  selectedTeam: TeamSide;
  onAddFriend: (friend: FriendRecord) => void;
  onRemoveFriend: (friendUid: string) => void;
  onInviteFriend: (shortId: string) => void;
  onQuickMatch: () => void;
  onCreateRoom: (fillBots: boolean) => void;
  onJoinRoom: (code: string) => void;
  onClose: () => void;
}

export const SocialModal: React.FC<SocialModalProps> = ({
  initialTab = 'rooms',
  profile,
  friends,
  rooms,
  wsConnected,
  pingMs,
  selectedMap,
  selectedMode,
  onAddFriend,
  onRemoveFriend,
  onInviteFriend,
  onQuickMatch,
  onCreateRoom,
  onJoinRoom,
  onClose,
}) => {
  const [tab, setTab] = useState<SocialTab>(initialTab);
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [fillBots, setFillBots] = useState(true);

  const [friendIdInput, setFriendIdInput] = useState('');
  const [friendMsg, setFriendMsg] = useState<string | null>(null);
  const [searchingFriend, setSearchingFriend] = useState(false);
  const [friendPresence, setFriendPresence] = useState<
    Record<string, { online: boolean; roomCode: string | null }>
  >({});
  const [invitedId, setInvitedId] = useState<string | null>(null);
  const [copiedMyId, setCopiedMyId] = useState(false);

  const [leaderboard, setLeaderboard] = useState<PublicPlayerInfo[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(false);

  const refreshPresence = async () => {
    if (friends.length === 0) return;
    try {
      const res = await fetch('/api/players/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shortIds: friends.map((f) => f.friendShortId),
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          statuses?: Record<string, { online: boolean; roomCode: string | null }>;
        };
        if (data.statuses) setFriendPresence(data.statuses);
      }
    } catch {
      // ignore offline
    }
  };

  const refreshLeaderboard = async () => {
    setLoadingBoard(true);
    try {
      const mergedMap = new Map<string, PublicPlayerInfo>();

      // Always include self
      mergedMap.set(profile.shortId, {
        uid: profile.uid,
        shortId: profile.shortId,
        displayName: profile.displayName,
        bannerId: profile.bannerId,
        authProvider: profile.authProvider,
        kills: profile.kills,
        deaths: profile.deaths,
        wins: profile.wins,
        matchesPlayed: profile.matchesPlayed,
        score: profile.score,
        online: wsConnected,
      });

      const [serverRes, fsList] = await Promise.allSettled([
        fetch('/api/leaderboard').then((r) => (r.ok ? r.json() : { players: [] })),
        fetchFirestoreLeaderboard(25),
      ]);

      if (fsList.status === 'fulfilled') {
        for (const p of fsList.value) {
          mergedMap.set(p.shortId, p);
        }
      }
      if (serverRes.status === 'fulfilled') {
        const list = (serverRes.value?.players ?? []) as PublicPlayerInfo[];
        for (const p of list) {
          const prev = mergedMap.get(p.shortId);
          if (!prev || p.score >= prev.score) {
            mergedMap.set(p.shortId, { ...prev, ...p });
          }
        }
      }

      const sorted = Array.from(mergedMap.values()).sort(
        (a, b) => b.score - a.score || b.kills - a.kills
      );
      setLeaderboard(sorted);
    } finally {
      setLoadingBoard(false);
    }
  };

  useEffect(() => {
    if (tab === 'friends') void refreshPresence();
    if (tab === 'leaderboard') void refreshLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, friends.length]);

  const handleAddFriendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sid = friendIdInput.trim().toUpperCase();
    if (!/^STK-[0-9]{6}$/.test(sid)) {
      setFriendMsg('Use o formato STK-123456.');
      return;
    }
    if (sid === profile.shortId) {
      setFriendMsg('Você não pode adicionar seu próprio ID.');
      return;
    }
    if (friends.some((f) => f.friendShortId === sid)) {
      setFriendMsg('Este jogador já está na sua lista.');
      return;
    }

    setSearchingFriend(true);
    setFriendMsg(null);
    try {
      let found: PublicPlayerInfo | null = null;
      try {
        const res = await fetch(`/api/players/lookup/${encodeURIComponent(sid)}`);
        if (res.ok) {
          const json = (await res.json()) as { player?: PublicPlayerInfo };
          if (json.player) found = json.player;
        }
      } catch {
        // fallback to Firestore
      }
      if (!found) {
        try {
          found = await lookupDirectoryByShortId(sid);
        } catch {
          // ignore if unauthenticated
        }
      }

      if (!found) {
        setFriendMsg('ID não encontrado. Peça para seu amigo abrir o jogo online.');
        return;
      }

      onAddFriend({
        friendUid: found.uid,
        friendShortId: found.shortId,
        friendName: found.displayName,
        friendBannerId: found.bannerId,
        online: found.online,
        roomCode: found.roomCode,
      });
      soundEngine.playEquip();
      setFriendIdInput('');
      setFriendMsg(`${found.displayName} adicionado aos amigos!`);
    } finally {
      setSearchingFriend(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[88dvh] rounded-2xl bg-[#0e131b] border border-white/15 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-sky-400" />
            <div>
              <h2 className="font-display text-base font-bold text-white">
                Multiplayer, Amigos & Placar
              </h2>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                <Wifi
                  className={`w-3 h-3 ${wsConnected ? 'text-emerald-400' : 'text-amber-400'}`}
                />
                <span>
                  {wsConnected ? `Servidor Online · ${pingMs}ms` : 'Conectando ao servidor...'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela social"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Compact Tabs */}
        <div className="px-4 py-2 border-b border-white/8 bg-black/25 flex items-center gap-1.5 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setTab('rooms');
            }}
            className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              tab === 'rooms'
                ? 'bg-amber-500 text-zinc-950'
                : 'bg-white/5 text-zinc-300 hover:bg-white/10'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Salas Online</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setTab('friends');
            }}
            className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              tab === 'friends'
                ? 'bg-amber-500 text-zinc-950'
                : 'bg-white/5 text-zinc-300 hover:bg-white/10'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Amigos ({friends.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setTab('leaderboard');
            }}
            className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              tab === 'leaderboard'
                ? 'bg-amber-500 text-zinc-950'
                : 'bg-white/5 text-zinc-300 hover:bg-white/10'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Placar Global</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {tab === 'rooms' && (
            <>
              {/* Quick Match & Create Room */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playEquip();
                    onQuickMatch();
                    onClose();
                  }}
                  className="min-h-[46px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Globe className="w-4 h-4" />
                  <span>Partida Rápida Online</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playEquip();
                    onCreateRoom(fillBots);
                    onClose();
                  }}
                  className="min-h-[46px] px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-display text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Criar Sala ({MAP_LIST.find((m) => m.id === selectedMap)?.name})</span>
                </button>
              </div>

              {/* Fill Bots Toggle & Join by Code */}
              <div className="rounded-xl bg-black/30 border border-white/10 p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-white">
                      Preencher vaga vazia com Bots
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {selectedMode === 'deathmatch' ? 'Mata-Mata' : 'Duelo Tático'} · Jogadores entram a qualquer hora
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFillBots((v) => !v)}
                    className={`min-h-[32px] px-3 rounded-lg text-xs font-bold cursor-pointer ${
                      fillBots
                        ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300'
                        : 'bg-white/5 border border-white/10 text-zinc-400'
                    }`}
                  >
                    {fillBots ? 'Sim' : 'Só Jogadores'}
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!roomCodeInput.trim()) return;
                    soundEngine.playEquip();
                    onJoinRoom(roomCodeInput.trim().toUpperCase());
                    onClose();
                  }}
                  className="flex items-center gap-2 pt-2 border-t border-white/8"
                >
                  <input
                    type="text"
                    maxLength={8}
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    placeholder="Código da sala (ex: X7K2P)"
                    className="flex-1 min-h-[38px] px-3 rounded-lg bg-black/45 border border-white/12 font-mono-tabular text-xs text-white uppercase focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    className="min-h-[38px] px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white cursor-pointer"
                  >
                    Entrar
                  </button>
                </form>
              </div>

              {/* Active Rooms List */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-zinc-400">
                  Salas Abertas ({rooms.length})
                </div>
                {rooms.length === 0 ? (
                  <div className="rounded-xl bg-black/25 border border-white/8 p-4 text-center text-xs text-zinc-400">
                    Nenhuma sala ativa no momento. Clique em <strong>Criar Sala</strong> ou{' '}
                    <strong>Partida Rápida Online</strong>!
                  </div>
                ) : (
                  rooms.map((room) => (
                    <div
                      key={room.code}
                      className="rounded-xl bg-[#121824] border border-white/10 p-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-xs font-bold text-white truncate">
                            {room.name}
                          </span>
                          <span className="font-mono-tabular text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">
                            #{room.code}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          {MAP_LIST.find((m) => m.id === room.mapId)?.name} ·{' '}
                          {room.playerCount}/{room.maxPlayers} jogadores
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playEquip();
                          onJoinRoom(room.code);
                          onClose();
                        }}
                        className="min-h-[36px] px-3.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display text-xs font-bold shrink-0 cursor-pointer"
                      >
                        Entrar
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {tab === 'friends' && (
            <>
              {/* My ID Copy Banner */}
              <div className="rounded-xl bg-black/35 border border-white/10 p-3 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] text-zinc-400">Seu ID Único para amigos</div>
                  <div className="font-mono-tabular text-sm font-bold text-amber-300">
                    {profile.shortId}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    void navigator.clipboard?.writeText(profile.shortId);
                    setCopiedMyId(true);
                    setTimeout(() => setCopiedMyId(false), 1600);
                  }}
                  className="min-h-[36px] px-3 rounded-lg bg-white/8 hover:bg-white/12 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedMyId ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedMyId ? 'Copiado!' : 'Copiar ID'}</span>
                </button>
              </div>

              {/* Add Friend by STK ID */}
              <form onSubmit={handleAddFriendSubmit} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={10}
                    value={friendIdInput}
                    onChange={(e) => setFriendIdInput(e.target.value.toUpperCase())}
                    placeholder="Adicionar por ID (ex: STK-482910)"
                    className="flex-1 min-h-[38px] px-3 rounded-lg bg-black/45 border border-white/12 font-mono-tabular text-xs text-white uppercase focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={searchingFriend}
                    className="min-h-[38px] px-3.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{searchingFriend ? '...' : 'Adicionar'}</span>
                  </button>
                </div>
                {friendMsg && (
                  <p className="text-[11px] text-amber-300">{friendMsg}</p>
                )}
              </form>

              {/* Friends List */}
              <div className="space-y-2">
                {friends.length === 0 ? (
                  <div className="rounded-xl bg-black/25 border border-white/8 p-4 text-center text-xs text-zinc-400">
                    Adicione um amigo digitando o ID <strong>STK-XXXXXX</strong> dele para jogar na mesma sala!
                  </div>
                ) : (
                  friends.map((fr) => {
                    const st = friendPresence[fr.friendShortId];
                    const isOnline = st?.online ?? fr.online ?? false;
                    const roomCode = st?.roomCode ?? fr.roomCode ?? null;
                    const banner =
                      PROFILE_BANNERS.find((b) => b.id === fr.friendBannerId) ??
                      PROFILE_BANNERS[0];

                    return (
                      <div
                        key={fr.friendShortId}
                        className="rounded-xl bg-[#121824] border border-white/10 p-3 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-2 h-8 rounded-full shrink-0"
                            style={{ backgroundColor: banner.accentHex }}
                          />
                          <div className="min-w-0">
                            <div className="font-display text-xs font-bold text-white truncate">
                              {fr.friendName}
                            </div>
                            <div className="text-[10px] font-mono-tabular text-zinc-400">
                              {fr.friendShortId} ·{' '}
                              <span
                                className={
                                  isOnline ? 'text-emerald-400 font-semibold' : 'text-zinc-500'
                                }
                              >
                                {roomCode
                                  ? `Na sala #${roomCode}`
                                  : isOnline
                                    ? 'Online no Lobby'
                                    : 'Offline'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {roomCode ? (
                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playEquip();
                                onJoinRoom(roomCode);
                                onClose();
                              }}
                              className="min-h-[34px] px-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-[11px] font-bold cursor-pointer"
                            >
                              Entrar
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={!isOnline}
                              onClick={() => {
                                soundEngine.playEquip();
                                onInviteFriend(fr.friendShortId);
                                setInvitedId(fr.friendShortId);
                                setTimeout(() => setInvitedId(null), 2000);
                              }}
                              className="min-h-[34px] px-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-white/5 disabled:text-zinc-500 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Send className="w-3 h-3" />
                              <span>
                                {invitedId === fr.friendShortId ? 'Convidado!' : 'Jogar Junto'}
                              </span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => onRemoveFriend(fr.friendUid)}
                            aria-label="Remover amigo"
                            className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:text-red-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {tab === 'leaderboard' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300">
                  Top Jogadores — Ranking Global
                </span>
                <button
                  type="button"
                  onClick={() => void refreshLeaderboard()}
                  className="text-[11px] text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingBoard ? 'animate-spin' : ''}`} />
                  <span>Atualizar</span>
                </button>
              </div>

              <div className="space-y-1.5">
                {leaderboard.map((p, idx) => {
                  const banner =
                    PROFILE_BANNERS.find((b) => b.id === p.bannerId) ?? PROFILE_BANNERS[0];
                  const isMe = p.shortId === profile.shortId;
                  const kd =
                    p.deaths > 0 ? (p.kills / p.deaths).toFixed(2) : p.kills.toFixed(2);
                  return (
                    <div
                      key={p.shortId}
                      className={`rounded-xl border px-3 py-2.5 flex items-center justify-between gap-2 ${
                        isMe
                          ? 'bg-amber-500/12 border-amber-500/50'
                          : 'bg-[#121824] border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`font-mono-tabular text-xs font-bold w-6 text-center shrink-0 ${
                            idx === 0
                              ? 'text-amber-400'
                              : idx === 1
                                ? 'text-zinc-200'
                                : idx === 2
                                  ? 'text-orange-400'
                                  : 'text-zinc-500'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <span
                          className="w-1.5 h-7 rounded-full shrink-0"
                          style={{ backgroundColor: banner.accentHex }}
                        />
                        <div className="min-w-0">
                          <div className="font-display text-xs font-bold text-white truncate">
                            {p.displayName} {isMe ? '(Você)' : ''}
                          </div>
                          <div className="font-mono-tabular text-[10px] text-zinc-400">
                            {p.shortId} · {p.kills} Abates · K/D {kd}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono-tabular text-xs font-bold text-amber-300">
                          {p.score} pts
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {p.wins} vitórias
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
