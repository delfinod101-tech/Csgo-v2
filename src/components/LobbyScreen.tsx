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
import { LobbyTopBar } from '@/src/components/lobby/LobbyTopBar';
import { LobbyModeRail } from '@/src/components/lobby/LobbyModeRail';
import { InviteCard, LobbyFeed } from '@/src/components/lobby/LobbyFeed';
import { LobbyPlayDock } from '@/src/components/lobby/LobbyPlayDock';

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
      <LobbyTopBar
        view={view}
        profile={profile}
        muted={muted}
        onChangeView={onChangeView}
        onOpenProfile={onOpenProfile}
        onOpenLeaderboard={() => onOpenSocial('leaderboard')}
        onOpenSettings={onOpenSettings}
        onToggleMute={onToggleMute}
      />

      {view === 'lobby' && (
        <>
          <LobbyModeRail
            gameMode={gameMode}
            mapId={mapId}
            onChangeGameMode={onChangeGameMode}
            onChangeMap={onChangeMap}
            onOpenRooms={() => {
              if (playMode !== 'online') onChangePlayMode('online');
              onOpenSocial('rooms');
            }}
          />
          <LobbyFeed
            playMode={playMode}
            wsConnected={wsConnected}
            pendingInvite={pendingInvite}
            loadoutLabel={`${selectedWeapon.name} · ${selectedSkin.name}`}
            onOpenFriends={() => onOpenSocial('friends')}
            onOpenSettings={onOpenSettings}
            onOpenHudEditor={onOpenHudEditor}
            onOpenInventory={() => onChangeView('inventory')}
            onAcceptInvite={onAcceptInvite}
            onDismissInvite={onDismissInvite}
          />
          {pendingInvite && (
            <div className="sm:hidden fixed z-30 right-2 top-12 w-[190px]">
              <InviteCard invite={pendingInvite} onAccept={onAcceptInvite} onDismiss={onDismissInvite} />
            </div>
          )}
          <LobbyPlayDock
            playMode={playMode}
            team={team}
            mapId={mapId}
            gameMode={gameMode}
            onChangePlayMode={onChangePlayMode}
            onChangeTeam={onChangeTeam}
            onStartMatch={onStartMatch}
          />
        </>
      )}

      {view === 'inventory' && (
        <div className="fixed top-14 left-3 sm:left-5 z-10 pointer-events-none">
          <div className="text-[11px] font-medium text-amber-400">
            {selectedWeapon.category} ·{' '}
            <span style={{ color: selectedSkin.rarityColor }}>{selectedSkin.rarity}</span>
          </div>
          <h1 className="font-display text-base sm:text-xl font-bold text-white">
            {selectedWeapon.name} | {selectedSkin.name}
          </h1>
          <p className="text-[11px] text-zinc-400">
            Dano {selectedWeapon.damage} · {profile.credits} Cr · Acerto: {equippedHitFx.name} · Kill: {equippedKillFx.name}
          </p>
        </div>
      )}

      {/* Compact Bottom Dock (Fits Cleanly on Mobile Portrait & Desktop) */}
      {view === 'inventory' && (
        <div className="fixed bottom-2.5 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 w-[min(940px,96vw)] safe-bottom">
          <div className="rounded-xl bg-[#0e1219]/94 border border-white/12 p-2.5 sm:p-3.5 shadow-2xl">
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
          </div>
        </div>
      )}
    </>
  );
};
