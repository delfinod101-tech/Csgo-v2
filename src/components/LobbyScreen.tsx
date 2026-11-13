import React, { useState } from 'react';
import {
  Check,
  Coins,
  Eye,
  Flame,
  Globe,
  Lock,
  Play,
  SlidersHorizontal,
  Smartphone,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import {
  GameModeId,
  HIT_EFFECTS,
  HitEffectId,
  KILL_EFFECTS,
  KillEffectId,
  MAP_LIST,
  MapId,
  PROFILE_BANNERS,
  PlayModeKind,
  PlayerProfile,
  RoomInviteEvent,
  ScreenView,
  SkinId,
  TeamSide,
  WEAPON_SKINS,
  WEAPON_SPECS,
  WeaponId,
} from '@/src/types/game';
import { SocialTab } from '@/src/components/SocialModal';
import { soundEngine } from '@/src/game/sound';

type InventoryTab = 'skins' | 'hit-fx' | 'kill-fx';

interface LobbyScreenProps {
  view: Extract<ScreenView, 'lobby' | 'inventory' | 'store'>;
  playMode: PlayModeKind;
  wsConnected: boolean;
  team: TeamSide;
  mapId: MapId;
  gameMode: GameModeId;
  weaponId: WeaponId;
  profile: PlayerProfile;
  muted: boolean;
  pendingInvite: RoomInviteEvent | null;
  onChangeView: (v: Extract<ScreenView, 'lobby' | 'inventory' | 'store'>) => void;
  onChangePlayMode: (pm: PlayModeKind) => void;
  onChangeTeam: (t: TeamSide) => void;
  onChangeMap: (m: MapId) => void;
  onChangeGameMode: (gm: GameModeId) => void;
  onChangeWeapon: (w: WeaponId) => void;
  onEquipSkin: (s: SkinId) => void;
  onEquipHitFx: (id: HitEffectId) => void;
  onEquipKillFx: (id: KillEffectId) => void;
  onTriggerInspect: () => void;
  onToggleMute: () => void;
  onOpenProfile: () => void;
  onOpenSocial: (tab?: SocialTab) => void;
  onAcceptInvite: (invite: RoomInviteEvent) => void;
  onDismissInvite: () => void;
  onOpenSettings: () => void;
  onOpenHudEditor: () => void;
  onStartMatch: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  view,
  playMode,
  wsConnected,
  team,
  mapId,
  gameMode,
  weaponId,
  profile,
  muted,
  pendingInvite,
  onChangeView,
  onChangePlayMode,
  onChangeTeam,
  onChangeMap,
  onChangeGameMode,
  onChangeWeapon,
  onEquipSkin,
  onEquipHitFx,
  onEquipKillFx,
  onTriggerInspect,
  onToggleMute,
  onOpenProfile,
  onOpenSocial,
  onAcceptInvite,
  onDismissInvite,
  onOpenSettings,
  onOpenHudEditor,
  onStartMatch,
}) => {
  const [invTab, setInvTab] = useState<InventoryTab>('skins');

  const selectedWeapon = WEAPON_SPECS[weaponId];
  const selectedSkin =
    WEAPON_SKINS.find((s) => s.id === profile.equippedSkin) ?? WEAPON_SKINS[0];
  const equippedHitFx =
    HIT_EFFECTS.find((h) => h.id === profile.equippedHitFx) ?? HIT_EFFECTS[0];
  const equippedKillFx =
    KILL_EFFECTS.find((k) => k.id === profile.equippedKillFx) ?? KILL_EFFECTS[0];
  const activeBanner =
    PROFILE_BANNERS.find((b) => b.id === profile.bannerId) ?? PROFILE_BANNERS[0];

  const weaponIds: WeaponId[] = ['ak47', 'm4a1s', 'awp', 'deagle', 'knife'];

  return (
    <>
      {/* Compact Top Bar — 3-Zone Mobile & Desktop Responsive */}
      <header className="fixed top-0 inset-x-0 z-20 safe-top bg-[#0b0e14]/94 border-b border-white/10">
        <div className="flex items-center justify-between gap-2 sm:gap-4 px-2.5 sm:px-5 py-2">
          {/* Zone 1: Brand + Compact Profile Pill */}
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onChangeView('lobby');
              }}
              className="font-display text-sm sm:text-lg font-bold tracking-wider text-white whitespace-nowrap cursor-pointer"
            >
              STRIKE 2
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onOpenProfile();
              }}
              title="Abrir Perfil, Banner e Conta"
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/6 hover:bg-white/12 border border-white/12 max-w-[115px] sm:max-w-[165px] cursor-pointer"
            >
              <span
                className="w-2 h-3.5 rounded-sm shrink-0"
                style={{ backgroundColor: activeBanner.accentHex }}
              />
              <span className="text-[11px] font-semibold text-white truncate">
                {profile.displayName}
              </span>
            </button>
          </div>

          {/* Zone 2: Single-Line Scrollable Nav Links */}
          <nav className="flex items-center gap-2.5 sm:gap-5 text-[11px] sm:text-xs font-medium overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onChangeView('lobby');
              }}
              className={`relative py-1 whitespace-nowrap shrink-0 cursor-pointer ${
                view === 'lobby' ? 'text-white font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Lobby
              {view === 'lobby' && (
                <span className="absolute left-0 right-0 -bottom-0.5 h-[2px] bg-amber-500 rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onChangeView('inventory');
              }}
              className={`relative py-1 whitespace-nowrap shrink-0 cursor-pointer ${
                view === 'inventory' ? 'text-white font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Armas
              {view === 'inventory' && (
                <span className="absolute left-0 right-0 -bottom-0.5 h-[2px] bg-amber-500 rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onChangeView('store');
              }}
              className={`relative py-1 whitespace-nowrap shrink-0 cursor-pointer ${
                view === 'store' ? 'text-white font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Loja
              {view === 'store' && (
                <span className="absolute left-0 right-0 -bottom-0.5 h-[2px] bg-amber-500 rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onOpenSocial('leaderboard');
              }}
              className="py-1 text-zinc-400 hover:text-white inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Trophy className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">Placar</span>
            </button>
          </nav>

          {/* Zone 3: Credits + Social + Settings + Play */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onChangeView('store');
              }}
              className="hidden md:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/40 border border-amber-500/25 text-[11px] font-mono-tabular font-bold text-amber-300 cursor-pointer"
            >
              <Coins className="w-3 h-3 text-amber-400" />
              <span>{profile.credits}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onOpenSocial('friends');
              }}
              aria-label="Amigos e Salas Online"
              title="Amigos & Jogar Junto"
              className="min-h-[34px] min-w-[34px] sm:min-h-[36px] sm:px-2.5 flex items-center justify-center gap-1 rounded-lg border border-white/12 bg-white/5 hover:bg-white/10 text-zinc-200 text-xs cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden lg:inline">Amigos</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onOpenSettings();
              }}
              aria-label="Configurações"
              className="min-h-[34px] min-w-[34px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-lg border border-white/12 bg-white/5 hover:bg-white/10 text-zinc-200 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playEquip();
                onStartMatch();
              }}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display text-[11px] sm:text-xs font-bold tracking-wide whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current" aria-hidden="true" />
              <span>JOGAR</span>
            </button>
          </div>
        </div>
      </header>

      {/* Live Party Invite Banner */}
      {pendingInvite && (
        <div className="fixed top-14 right-3 z-30 w-[min(320px,92vw)] rounded-xl bg-[#101622] border border-sky-400/60 p-3 shadow-2xl">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                Convite para Jogar Junto
              </div>
              <div className="font-display text-xs font-bold text-white mt-0.5">
                {pendingInvite.fromName} ({pendingInvite.fromShortId})
              </div>
              <div className="text-[11px] text-zinc-400">
                Sala #{pendingInvite.roomCode} ·{' '}
                {MAP_LIST.find((m) => m.id === pendingInvite.mapId)?.name}
              </div>
            </div>
            <button
              type="button"
              onClick={onDismissInvite}
              className="p-1 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                soundEngine.playEquip();
                onAcceptInvite(pendingInvite);
              }}
              className="flex-1 min-h-[34px] rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-display text-xs font-bold inline-flex items-center justify-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Entrar na Sala</span>
            </button>
            <button
              type="button"
              onClick={onDismissInvite}
              className="min-h-[34px] px-3 rounded-lg border border-white/12 text-xs text-zinc-300 cursor-pointer"
            >
              Recusar
            </button>
          </div>
        </div>
      )}

      {/* Compact Left-Top Operative / Profile Context */}
      {view !== 'store' && (
        <div className="fixed top-16 left-3 sm:left-5 z-10 pointer-events-none">
          {view === 'lobby' ? (
            <div>
              <div className="text-[11px] font-medium text-amber-400 flex items-center gap-1.5">
                <span>{team === 'ct' ? 'CT Force' : 'Terroristas'}</span>
                <span>·</span>
                <span className="text-zinc-300">
                  {MAP_LIST.find((m) => m.id === mapId)?.name}
                </span>
                <span className="hidden sm:inline">·</span>
                <span className="hidden sm:inline text-sky-400 font-mono-tabular">
                  {profile.shortId}
                </span>
              </div>
              <h1 className="font-display text-base sm:text-xl font-bold text-white tracking-wide">
                {selectedWeapon.name} · {selectedSkin.name}
              </h1>
              <div className="text-[10px] sm:text-[11px] text-zinc-400 hidden sm:flex items-center gap-2">
                <span>Acerto: {equippedHitFx.name}</span>
                <span>·</span>
                <span>Kill: {equippedKillFx.name}</span>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-[11px] font-medium text-amber-400">
                {selectedWeapon.category} ·{' '}
                <span style={{ color: selectedSkin.rarityColor }}>{selectedSkin.rarity}</span>
              </div>
              <h1 className="font-display text-base sm:text-xl font-bold text-white">
                {selectedWeapon.name} | {selectedSkin.name}
              </h1>
              <p className="text-[11px] text-zinc-400">
                Dano {selectedWeapon.damage} · {profile.credits} Cr
              </p>
            </div>
          )}
        </div>
      )}

      {/* Compact Bottom Dock (Fits Cleanly on Mobile Portrait & Desktop) */}
      {view !== 'store' && (
        <div className="fixed bottom-2.5 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 w-[min(940px,96vw)] safe-bottom">
          <div className="rounded-xl bg-[#0e1219]/94 border border-white/12 p-2.5 sm:p-3.5 shadow-2xl">
            {view === 'lobby' ? (
              <div className="flex flex-col gap-2">
                {/* Row 1: Offline vs Online + Team */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        onChangePlayMode('offline');
                      }}
                      className={`min-h-[34px] px-2.5 sm:px-3 rounded-md text-[11px] sm:text-xs font-semibold whitespace-nowrap cursor-pointer ${
                        playMode === 'offline'
                          ? 'bg-zinc-800 text-amber-400 border border-amber-500/50'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Offline (Bots)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        onChangePlayMode('online');
                      }}
                      className={`min-h-[34px] px-2.5 sm:px-3 rounded-md text-[11px] sm:text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        playMode === 'online'
                          ? 'bg-sky-600 text-white'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Wifi
                        className={`w-3 h-3 ${wsConnected ? 'text-emerald-300' : 'text-zinc-300'}`}
                      />
                      <span>Online Multiplayer</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        onChangeTeam('ct');
                      }}
                      className={`min-h-[34px] px-2.5 rounded-md text-[11px] sm:text-xs font-semibold cursor-pointer ${
                        team === 'ct'
                          ? 'bg-sky-600 text-white'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      CT
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        onChangeTeam('t');
                      }}
                      className={`min-h-[34px] px-2.5 rounded-md text-[11px] sm:text-xs font-semibold cursor-pointer ${
                        team === 't'
                          ? 'bg-amber-600 text-white'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      TR
                    </button>
                  </div>
                </div>

                {/* Row 2: Map, Rules, Salas/HUD/Audio */}
                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1 bg-black/35 p-0.5 rounded-lg">
                      {MAP_LIST.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick();
                            onChangeMap(m.id);
                          }}
                          className={`min-h-[32px] px-2.5 py-1 text-[11px] font-medium rounded-md whitespace-nowrap cursor-pointer ${
                            mapId === m.id
                              ? 'bg-zinc-800 text-white border border-amber-500/50'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 bg-black/35 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          onChangeGameMode('deathmatch');
                        }}
                        className={`min-h-[32px] px-2.5 py-1 text-[11px] font-medium rounded-md whitespace-nowrap cursor-pointer ${
                          gameMode === 'deathmatch'
                            ? 'bg-zinc-800 text-amber-400'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Mata-Mata
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          onChangeGameMode('tactical');
                        }}
                        className={`min-h-[32px] px-2.5 py-1 text-[11px] font-medium rounded-md whitespace-nowrap cursor-pointer ${
                          gameMode === 'tactical'
                            ? 'bg-zinc-800 text-amber-400'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Tático
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {playMode === 'online' && (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          onOpenSocial('rooms');
                        }}
                        className="min-h-[34px] px-2.5 flex items-center gap-1 rounded-lg bg-sky-500/15 border border-sky-400/50 text-[11px] font-semibold text-sky-300 cursor-pointer"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Salas / Código</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        onOpenHudEditor();
                      }}
                      className="min-h-[34px] px-2.5 flex items-center gap-1 rounded-lg border border-white/12 bg-white/5 text-[11px] font-medium text-zinc-200 cursor-pointer"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                      <span>HUD</span>
                    </button>

                    <button
                      type="button"
                      onClick={onToggleMute}
                      aria-label={muted ? 'Ativar áudio' : 'Silenciar áudio'}
                      className="min-h-[34px] min-w-[34px] flex items-center justify-center rounded-lg border border-white/10 text-zinc-300 hover:text-white cursor-pointer"
                    >
                      {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1 overflow-x-auto">
                    {weaponIds.map((id) => {
                      const spec = WEAPON_SPECS[id];
                      const active = weaponId === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            soundEngine.playEquip();
                            onChangeWeapon(id);
                          }}
                          className={`min-h-[34px] px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-lg border whitespace-nowrap shrink-0 cursor-pointer ${
                            active
                              ? 'bg-amber-500 border-amber-400 text-zinc-950'
                              : 'bg-black/30 border-white/10 text-zinc-300'
                          }`}
                        >
                          {spec.name}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playEquip();
                      onTriggerInspect();
                    }}
                    className="inline-flex items-center gap-1 min-h-[34px] px-3 py-1 text-[11px] sm:text-xs font-semibold rounded-lg border border-white/15 bg-zinc-800 text-white cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspecionar</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-white/8 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setInvTab('skins')}
                        className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                          invTab === 'skins' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-400'
                        }`}
                      >
                        Skins
                      </button>
                      <button
                        type="button"
                        onClick={() => setInvTab('hit-fx')}
                        className={`px-2 py-1 rounded text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer ${
                          invTab === 'hit-fx' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-400'
                        }`}
                      >
                        <Zap className="w-3 h-3" />
                        <span>Acerto</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setInvTab('kill-fx')}
                        className={`px-2 py-1 rounded text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer ${
                          invTab === 'kill-fx' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-400'
                        }`}
                      >
                        <Flame className="w-3 h-3" />
                        <span>Kill</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onChangeView('store')}
                      className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
                    >
                      Abrir Caixas →
                    </button>
                  </div>

                  {invTab === 'skins' && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                      {WEAPON_SKINS.map((sk) => {
                        const owned = profile.unlockedSkins.includes(sk.id);
                        const active = sk.id === profile.equippedSkin;
                        return (
                          <button
                            key={sk.id}
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick();
                              if (owned) onEquipSkin(sk.id);
                              else onChangeView('store');
                            }}
                            className={`inline-flex items-center gap-1.5 min-h-[32px] px-2.5 py-1 text-[11px] font-medium rounded-lg border whitespace-nowrap shrink-0 cursor-pointer ${
                              active
                                ? 'bg-zinc-800 border-amber-500 text-white'
                                : owned
                                  ? 'bg-black/25 border-white/10 text-zinc-300'
                                  : 'bg-black/20 border-white/5 text-zinc-500'
                            }`}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: sk.accentHex }}
                            />
                            <span>{sk.name}</span>
                            {!owned && <Lock className="w-2.5 h-2.5" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {invTab === 'hit-fx' && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                      {HIT_EFFECTS.map((fx) => {
                        const owned = profile.unlockedHitFx.includes(fx.id);
                        const active = fx.id === profile.equippedHitFx;
                        return (
                          <button
                            key={fx.id}
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick();
                              if (owned) onEquipHitFx(fx.id);
                              else onChangeView('store');
                            }}
                            className={`inline-flex items-center gap-1.5 min-h-[32px] px-2.5 py-1 text-[11px] font-medium rounded-lg border whitespace-nowrap shrink-0 cursor-pointer ${
                              active
                                ? 'bg-zinc-800 border-amber-500 text-white'
                                : owned
                                  ? 'bg-black/25 border-white/10 text-zinc-300'
                                  : 'bg-black/20 border-white/5 text-zinc-500'
                            }`}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: fx.colorHex }}
                            />
                            <span>{fx.name}</span>
                            {!owned && <Lock className="w-2.5 h-2.5" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {invTab === 'kill-fx' && (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                      {KILL_EFFECTS.map((fx) => {
                        const owned = profile.unlockedKillFx.includes(fx.id);
                        const active = fx.id === profile.equippedKillFx;
                        return (
                          <button
                            key={fx.id}
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick();
                              if (owned) onEquipKillFx(fx.id);
                              else onChangeView('store');
                            }}
                            className={`inline-flex items-center gap-1.5 min-h-[32px] px-2.5 py-1 text-[11px] font-medium rounded-lg border whitespace-nowrap shrink-0 cursor-pointer ${
                              active
                                ? 'bg-zinc-800 border-amber-500 text-white'
                                : owned
                                  ? 'bg-black/25 border-white/10 text-zinc-300'
                                  : 'bg-black/20 border-white/5 text-zinc-500'
                            }`}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: fx.colorHex }}
                            />
                            <span>{fx.name}</span>
                            {!owned && <Lock className="w-2.5 h-2.5" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
