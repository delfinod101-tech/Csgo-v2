/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CaseDefinition,
  GameModeId,
  GameSettings,
  HitEffectId,
  HudLayout,
  KillEffectId,
  MapId,
  MatchHudState,
  PlayerProfile,
  ScreenView,
  SkinId,
  TeamSide,
  WEAPON_SPECS,
  WeaponId,
} from '@/src/types/game';
import {
  loadHudLayout,
  loadProfile,
  loadSettings,
  saveHudLayout,
  saveProfile,
  saveSettings,
} from '@/src/game/storage';
import { soundEngine } from '@/src/game/sound';
import { CaseOpeningModal } from '@/src/components/CaseOpeningModal';
import { GameViewport, GameViewportHandle } from '@/src/components/GameViewport';
import { HudEditorOverlay } from '@/src/components/HudEditorOverlay';
import { LobbyScreen } from '@/src/components/LobbyScreen';
import { LobbyViewport, LobbyViewportHandle } from '@/src/components/LobbyViewport';
import { MatchHud } from '@/src/components/MatchHud';
import { SettingsModal } from '@/src/components/SettingsModal';
import { StoreScreen } from '@/src/components/StoreScreen';

const INITIAL_HUD: MatchHudState = {
  hp: 100,
  armor: 100,
  money: 4200,
  fps: 60,
  activeWeapon: 'm4a1s',
  slot1Weapon: 'm4a1s',
  ammo: {
    ak47: { mag: WEAPON_SPECS.ak47.magSize, reserve: WEAPON_SPECS.ak47.reserveMax },
    m4a1s: { mag: WEAPON_SPECS.m4a1s.magSize, reserve: WEAPON_SPECS.m4a1s.reserveMax },
    awp: { mag: WEAPON_SPECS.awp.magSize, reserve: WEAPON_SPECS.awp.reserveMax },
    deagle: { mag: WEAPON_SPECS.deagle.magSize, reserve: WEAPON_SPECS.deagle.reserveMax },
    knife: { mag: 1, reserve: 0 },
  },
  reloading: false,
  scoped: false,
  crouching: false,
  ctScore: 0,
  tScore: 0,
  roundNumber: 1,
  roundTimeSec: 180,
  kills: 0,
  deaths: 0,
  creditsEarnedMatch: 0,
  hitmarkerKind: 'none',
  crosshairSpread: 8,
  matchEnded: false,
  winnerTeam: null,
  killFeed: [],
  pointerLocked: false,
};

export default function App() {
  const lobbyRef = useRef<LobbyViewportHandle | null>(null);
  const gameRef = useRef<GameViewportHandle | null>(null);

  const [view, setView] = useState<ScreenView>('lobby');
  const [team, setTeam] = useState<TeamSide>('ct');
  const [mapId, setMapId] = useState<MapId>('mirage');
  const [gameMode, setGameMode] = useState<GameModeId>('deathmatch');
  const [weaponId, setWeaponId] = useState<WeaponId>('m4a1s');

  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [hudLayout, setHudLayout] = useState<HudLayout>(() => loadHudLayout());

  const [activeCase, setActiveCase] = useState<CaseDefinition | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hudEditorOpen, setHudEditorOpen] = useState(false);

  const [hud, setHud] = useState<MatchHudState>(INITIAL_HUD);
  const [buyMenuOpen, setBuyMenuOpen] = useState(false);
  const [paused, setPaused] = useState(false);

  // Persist profile, settings, and HUD layout
  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  useEffect(() => {
    saveSettings(settings);
    soundEngine.setVolume(settings.masterVolume, settings.muted);
  }, [settings]);

  useEffect(() => {
    saveHudLayout(hudLayout);
  }, [hudLayout]);

  const handleToggleMute = useCallback(() => {
    setSettings((prev) => ({ ...prev, muted: !prev.muted }));
  }, []);

  const handleEarnCredits = useCallback((amount: number) => {
    if (amount <= 0) return;
    setProfile((prev) => ({
      ...prev,
      credits: prev.credits + amount,
    }));
  }, []);

  const handleStartMatch = useCallback(() => {
    setBuyMenuOpen(false);
    setPaused(false);
    setHud(INITIAL_HUD);
    setView('playing');
  }, []);

  const handleExitToLobby = useCallback(() => {
    setBuyMenuOpen(false);
    setPaused(false);
    setView('lobby');
  }, []);

  // Case opening & Store handlers
  const handleOpenCase = useCallback(
    (caseDef: CaseDefinition) => {
      if (profile.credits < caseDef.price) return;
      setProfile((prev) => ({
        ...prev,
        credits: prev.credits - caseDef.price,
        casesOpened: prev.casesOpened + 1,
      }));
      setActiveCase(caseDef);
    },
    [profile.credits]
  );

  const handleReopenActiveCase = useCallback(() => {
    if (!activeCase) return;
    setProfile((prev) => {
      if (prev.credits < activeCase.price) return prev;
      return {
        ...prev,
        credits: prev.credits - activeCase.price,
        casesOpened: prev.casesOpened + 1,
      };
    });
  }, [activeCase]);

  const handleCompleteCaseRoll = useCallback(
    (wonSkinId: SkinId, isDuplicate: boolean, refundAmount: number) => {
      setProfile((prev) => {
        const nextSkins = prev.unlockedSkins.includes(wonSkinId)
          ? prev.unlockedSkins
          : [...prev.unlockedSkins, wonSkinId];
        return {
          ...prev,
          credits: prev.credits + (isDuplicate ? refundAmount : 0),
          unlockedSkins: nextSkins,
        };
      });
    },
    []
  );

  const handleEquipSkin = useCallback((skinId: SkinId) => {
    setProfile((prev) => ({
      ...prev,
      equippedSkin: prev.unlockedSkins.includes(skinId) ? skinId : prev.equippedSkin,
    }));
  }, []);

  const handleBuySkin = useCallback((skinId: SkinId, price: number) => {
    setProfile((prev) => {
      if (prev.unlockedSkins.includes(skinId) || prev.credits < price) return prev;
      return {
        ...prev,
        credits: prev.credits - price,
        unlockedSkins: [...prev.unlockedSkins, skinId],
        equippedSkin: skinId,
      };
    });
  }, []);

  const handleEquipHitFx = useCallback((id: HitEffectId) => {
    setProfile((prev) => ({
      ...prev,
      equippedHitFx: prev.unlockedHitFx.includes(id) ? id : prev.equippedHitFx,
    }));
  }, []);

  const handleBuyHitFx = useCallback((id: HitEffectId, price: number) => {
    setProfile((prev) => {
      if (prev.unlockedHitFx.includes(id) || prev.credits < price) return prev;
      return {
        ...prev,
        credits: prev.credits - price,
        unlockedHitFx: [...prev.unlockedHitFx, id],
        equippedHitFx: id,
      };
    });
  }, []);

  const handleEquipKillFx = useCallback((id: KillEffectId) => {
    setProfile((prev) => ({
      ...prev,
      equippedKillFx: prev.unlockedKillFx.includes(id) ? id : prev.equippedKillFx,
    }));
  }, []);

  const handleBuyKillFx = useCallback((id: KillEffectId, price: number) => {
    setProfile((prev) => {
      if (prev.unlockedKillFx.includes(id) || prev.credits < price) return prev;
      return {
        ...prev,
        credits: prev.credits - price,
        unlockedKillFx: [...prev.unlockedKillFx, id],
        equippedKillFx: id,
      };
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (view !== 'playing') return;
      if (e.key === 'Escape') {
        if (hudEditorOpen) {
          setHudEditorOpen(false);
        } else if (settingsOpen) {
          setSettingsOpen(false);
        } else if (buyMenuOpen) {
          setBuyMenuOpen(false);
        } else {
          setPaused((p) => !p);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [view, buyMenuOpen, settingsOpen, hudEditorOpen]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0b0e14] touch-none">
      {view !== 'playing' ? (
        <>
          <LobbyViewport
            ref={lobbyRef}
            view={view}
            team={team}
            mapId={mapId}
            weaponId={weaponId}
            skinId={profile.equippedSkin}
            settings={settings}
          />
          <LobbyScreen
            view={view}
            team={team}
            mapId={mapId}
            gameMode={gameMode}
            weaponId={weaponId}
            profile={profile}
            muted={settings.muted}
            onChangeView={setView}
            onChangeTeam={setTeam}
            onChangeMap={setMapId}
            onChangeGameMode={setGameMode}
            onChangeWeapon={setWeaponId}
            onEquipSkin={handleEquipSkin}
            onEquipHitFx={handleEquipHitFx}
            onEquipKillFx={handleEquipKillFx}
            onTriggerInspect={() => lobbyRef.current?.triggerInspect()}
            onToggleMute={handleToggleMute}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenHudEditor={() => setHudEditorOpen(true)}
            onStartMatch={handleStartMatch}
          />

          {view === 'store' && (
            <StoreScreen
              profile={profile}
              onOpenCase={handleOpenCase}
              onBuySkin={handleBuySkin}
              onEquipSkin={handleEquipSkin}
              onBuyHitFx={handleBuyHitFx}
              onEquipHitFx={handleEquipHitFx}
              onBuyKillFx={handleBuyKillFx}
              onEquipKillFx={handleEquipKillFx}
            />
          )}
        </>
      ) : (
        <>
          <GameViewport
            ref={gameRef}
            team={team}
            mapId={mapId}
            gameMode={gameMode}
            initialPrimaryWeapon={weaponId}
            skinId={profile.equippedSkin}
            hitEffectId={profile.equippedHitFx}
            killEffectId={profile.equippedKillFx}
            settings={settings}
            paused={paused || buyMenuOpen || settingsOpen || hudEditorOpen}
            onHudUpdate={setHud}
            onEarnCredits={handleEarnCredits}
            onToggleBuyMenu={() => setBuyMenuOpen((b) => !b)}
          />
          <MatchHud
            hud={hud}
            viewportRef={gameRef}
            hudLayout={hudLayout}
            settings={settings}
            buyMenuOpen={buyMenuOpen}
            paused={paused}
            onToggleBuyMenu={() => setBuyMenuOpen((b) => !b)}
            onTogglePause={() => setPaused((p) => !p)}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenHudEditor={() => setHudEditorOpen(true)}
            onExitToLobby={handleExitToLobby}
          />
        </>
      )}

      {activeCase && (
        <CaseOpeningModal
          caseDef={activeCase}
          credits={profile.credits}
          unlockedSkins={profile.unlockedSkins}
          onCompleteRoll={handleCompleteCaseRoll}
          onEquipSkin={handleEquipSkin}
          onReopenCase={handleReopenActiveCase}
          onClose={() => setActiveCase(null)}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onChange={setSettings}
          onOpenHudEditor={() => {
            setSettingsOpen(false);
            setHudEditorOpen(true);
          }}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {hudEditorOpen && (
        <HudEditorOverlay
          layout={hudLayout}
          onSave={setHudLayout}
          onClose={() => setHudEditorOpen(false)}
        />
      )}
    </div>
  );
}
