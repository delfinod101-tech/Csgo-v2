/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BannerId,
  CaseDefinition,
  FriendRecord,
  GameModeId,
  GameSettings,
  HitEffectId,
  HudLayout,
  KillEffectId,
  MapId,
  MatchHudState,
  OnlineRoomSummary,
  PlayModeKind,
  PlayerProfile,
  RoomInviteEvent,
  ScreenView,
  SkinId,
  TeamSide,
  WEAPON_SPECS,
  WeaponId,
} from '@/src/types/game';
import {
  loadFriends,
  loadHudLayout,
  loadProfile,
  loadSettings,
  saveFriends,
  saveHudLayout,
  saveProfile,
  saveSettings,
} from '@/src/game/storage';
import {
  detectProviderFromUser,
  loadAccountFromFirestore,
  removeFriendFromFirestore,
  saveFriendToFirestore,
  signInGuestSession,
  signInOrLinkApple,
  signInOrLinkGoogle,
  signOutFirebase,
  subscribeAuth,
  syncProfileToFirestore,
} from '@/src/game/firebase';
import { JoinedRoomInfo, multiplayerClient } from '@/src/game/multiplayerClient';
import { soundEngine } from '@/src/game/sound';
import { CaseOpeningModal } from '@/src/components/CaseOpeningModal';
import { GameViewport, GameViewportHandle } from '@/src/components/GameViewport';
import { HudEditorOverlay } from '@/src/components/HudEditorOverlay';
import { LobbyScreen } from '@/src/components/LobbyScreen';
import { LobbyViewport, LobbyViewportHandle } from '@/src/components/LobbyViewport';
import { MatchHud } from '@/src/components/MatchHud';
import { ProfileModal } from '@/src/components/ProfileModal';
import { SettingsModal } from '@/src/components/SettingsModal';
import { SocialModal, SocialTab } from '@/src/components/SocialModal';
import { StoreScreen } from '@/src/components/StoreScreen';

const INITIAL_HUD: MatchHudState = {
  hp: 100,
  armor: 100,
  money: 4200,
  fps: 60,
  isOnline: false,
  roomCode: null,
  pingMs: 24,
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
  scoreboard: [],
  pointerLocked: false,
};

export default function App() {
  const lobbyRef = useRef<LobbyViewportHandle | null>(null);
  const gameRef = useRef<GameViewportHandle | null>(null);

  const [view, setView] = useState<ScreenView>('lobby');
  const [playMode, setPlayMode] = useState<PlayModeKind>('offline');
  const [team, setTeam] = useState<TeamSide>('ct');
  const [mapId, setMapId] = useState<MapId>('mirage');
  const [gameMode, setGameMode] = useState<GameModeId>('deathmatch');
  const [weaponId, setWeaponId] = useState<WeaponId>('m4a1s');

  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const [friends, setFriends] = useState<FriendRecord[]>(() => loadFriends());
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [hudLayout, setHudLayout] = useState<HudLayout>(() => loadHudLayout());

  const [activeCase, setActiveCase] = useState<CaseDefinition | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hudEditorOpen, setHudEditorOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [socialModal, setSocialModal] = useState<{ open: boolean; tab: SocialTab }>({
    open: false,
    tab: 'rooms',
  });

  const [authBusy, setAuthBusy] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  // Real-time Multiplayer state
  const [wsConnected, setWsConnected] = useState(false);
  const [pingMs, setPingMs] = useState(24);
  const [onlineRooms, setOnlineRooms] = useState<OnlineRoomSummary[]>([]);
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [initialSpawn, setInitialSpawn] = useState<{
    x: number;
    y: number;
    z: number;
    yaw: number;
  } | null>(null);
  const [pendingInvite, setPendingInvite] = useState<RoomInviteEvent | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [hud, setHud] = useState<MatchHudState>(INITIAL_HUD);
  const [buyMenuOpen, setBuyMenuOpen] = useState(false);
  const [scoreboardOpen, setScoreboardOpen] = useState(false);
  const [paused, setPaused] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((cur) => (cur === msg ? null : cur));
    }, 3200);
  }, []);

  // Boot Firebase auth listener + Guest session
  useEffect(() => {
    void signInGuestSession();
    const unsub = subscribeAuth((user) => {
      if (!user) return;
      const provider = detectProviderFromUser(user);
      void loadAccountFromFirestore(user.uid, loadProfile())
        .then((remote) => {
          if (remote) {
            setProfile((prev) => ({
              ...prev,
              ...remote,
              uid: user.uid,
              authProvider: provider,
            }));
          } else {
            setProfile((prev) => ({
              ...prev,
              uid: user.uid,
              authProvider: provider,
              displayName:
                prev.authProvider === 'guest' && user.displayName
                  ? user.displayName.slice(0, 16)
                  : prev.displayName,
            }));
          }
        })
        .catch(() => {
          // Keep local profile cleanly if Firestore is temporarily unreachable
        });
    });
    return unsub;
  }, []);

  // Persist local storage & sync to Server Directory + Firestore
  useEffect(() => {
    saveProfile(profile);
    multiplayerClient.updateIdentity(profile);
    void fetch('/api/profile/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
      }),
    }).catch(() => {});

    void syncProfileToFirestore(profile).catch(() => {});
  }, [profile]);

  useEffect(() => {
    saveFriends(friends);
  }, [friends]);

  useEffect(() => {
    saveSettings(settings);
    soundEngine.setVolume(settings.masterVolume, settings.muted);
  }, [settings]);

  useEffect(() => {
    saveHudLayout(hudLayout);
  }, [hudLayout]);

  // Connect WebSocket Multiplayer Client
  useEffect(() => {
    multiplayerClient.connect(profile);

    const unsubStatus = multiplayerClient.on('status', (connected, ping) => {
      setWsConnected(connected);
      setPingMs(ping);
    });
    const unsubRooms = multiplayerClient.on('rooms', (list) => {
      setOnlineRooms(list);
    });
    const unsubJoined = multiplayerClient.on('joined', (info: JoinedRoomInfo) => {
      setPlayMode('online');
      setMapId(info.mapId);
      setGameMode(info.gameMode);
      setTeam(info.team);
      setActiveRoomCode(info.code);
      setInitialSpawn(info.spawn);
      setBuyMenuOpen(false);
      setScoreboardOpen(false);
      setPaused(false);
      setHud({ ...INITIAL_HUD, isOnline: true, roomCode: info.code });
      setView('playing');
    });
    const unsubInvite = multiplayerClient.on('invite', (inv: RoomInviteEvent) => {
      setPendingInvite(inv);
      soundEngine.playEquip();
    });
    const unsubError = multiplayerClient.on('error', (msg: string) => {
      showToast(msg);
    });

    return () => {
      unsubStatus();
      unsubRooms();
      unsubJoined();
      unsubInvite();
      unsubError();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showToast]);

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

  const handleRecordCareerStat = useCallback(
    (delta: {
      kills?: number;
      deaths?: number;
      wins?: number;
      matches?: number;
      score?: number;
    }) => {
      setProfile((prev) => ({
        ...prev,
        kills: prev.kills + (delta.kills ?? 0),
        deaths: prev.deaths + (delta.deaths ?? 0),
        wins: prev.wins + (delta.wins ?? 0),
        matchesPlayed: prev.matchesPlayed + (delta.matches ?? 0),
        score: prev.score + (delta.score ?? 0),
      }));
    },
    []
  );

  const handleStartMatch = useCallback(() => {
    if (playMode === 'online') {
      if (!wsConnected) {
        showToast('Conectando ao servidor multiplayer...');
        multiplayerClient.connect(profile);
      }
      multiplayerClient.quickMatch({ mapId, gameMode, team });
      return;
    }
    setActiveRoomCode(null);
    setInitialSpawn(null);
    setBuyMenuOpen(false);
    setScoreboardOpen(false);
    setPaused(false);
    setHud(INITIAL_HUD);
    setView('playing');
  }, [playMode, wsConnected, profile, mapId, gameMode, team, showToast]);

  const handleExitToLobby = useCallback(() => {
    if (playMode === 'online') {
      multiplayerClient.leaveRoom();
    }
    setActiveRoomCode(null);
    setInitialSpawn(null);
    setBuyMenuOpen(false);
    setScoreboardOpen(false);
    setPaused(false);
    setView('lobby');
  }, [playMode]);

  // Auth Handlers (Google, Apple iOS, Guest)
  const handleLinkGoogle = useCallback(async () => {
    setAuthBusy(true);
    setAuthNotice(null);
    const res = await signInOrLinkGoogle();
    if (res.ok && res.user) {
      const remote = await loadAccountFromFirestore(res.user.uid, profile).catch(() => null);
      if (remote) {
        setProfile({ ...remote, uid: res.user.uid, authProvider: 'google' });
      } else {
        setProfile((prev) => ({
          ...prev,
          uid: res.user!.uid,
          authProvider: 'google',
          displayName:
            prev.authProvider === 'guest' && res.user!.displayName
              ? res.user!.displayName.slice(0, 16)
              : prev.displayName,
        }));
      }
      setAuthNotice('Conta Google vinculada com sucesso!');
    } else if (res.message) {
      setAuthNotice(res.message);
    }
    setAuthBusy(false);
  }, [profile]);

  const handleLinkApple = useCallback(async () => {
    setAuthBusy(true);
    setAuthNotice(null);
    const res = await signInOrLinkApple();
    if (res.ok && res.user) {
      const remote = await loadAccountFromFirestore(res.user.uid, profile).catch(() => null);
      if (remote) {
        setProfile({ ...remote, uid: res.user.uid, authProvider: 'apple' });
      } else {
        setProfile((prev) => ({
          ...prev,
          uid: res.user!.uid,
          authProvider: 'apple',
        }));
      }
      setAuthNotice('Conta Apple / iOS vinculada com sucesso!');
    } else if (res.message) {
      setAuthNotice(res.message);
    }
    setAuthBusy(false);
  }, [profile]);

  const handleUseGuest = useCallback(async () => {
    setAuthBusy(true);
    setAuthNotice(null);
    await signOutFirebase();
    await signInGuestSession();
    setProfile((prev) => ({
      ...prev,
      authProvider: 'guest',
    }));
    setAuthNotice('Você está jogando no Modo Convidado.');
    setAuthBusy(false);
  }, []);

  // Friends & Social Handlers
  const handleAddFriend = useCallback((friend: FriendRecord) => {
    setFriends((prev) => {
      if (prev.some((f) => f.friendShortId === friend.friendShortId)) return prev;
      return [friend, ...prev];
    });
    void saveFriendToFirestore(friend).catch(() => {});
  }, []);

  const handleRemoveFriend = useCallback((friendUid: string) => {
    setFriends((prev) => prev.filter((f) => f.friendUid !== friendUid));
    void removeFriendFromFirestore(friendUid).catch(() => {});
  }, []);

  const handleInviteFriend = useCallback(
    (targetShortId: string) => {
      multiplayerClient.sendInvite(targetShortId, { mapId, gameMode, team });
      showToast(`Convite enviado para ${targetShortId}!`);
    },
    [mapId, gameMode, team, showToast]
  );

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
        if (hudEditorOpen) setHudEditorOpen(false);
        else if (settingsOpen) setSettingsOpen(false);
        else if (scoreboardOpen) setScoreboardOpen(false);
        else if (buyMenuOpen) setBuyMenuOpen(false);
        else setPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [view, buyMenuOpen, scoreboardOpen, settingsOpen, hudEditorOpen]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0b0e14] touch-none">
      {toastMsg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-[#101622] border border-amber-500/60 text-xs font-semibold text-amber-200 shadow-2xl">
          {toastMsg}
        </div>
      )}

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
            playMode={playMode}
            wsConnected={wsConnected}
            team={team}
            mapId={mapId}
            gameMode={gameMode}
            weaponId={weaponId}
            profile={profile}
            muted={settings.muted}
            pendingInvite={pendingInvite}
            onChangeView={setView}
            onChangePlayMode={setPlayMode}
            onChangeTeam={setTeam}
            onChangeMap={setMapId}
            onChangeGameMode={setGameMode}
            onChangeWeapon={setWeaponId}
            onEquipSkin={handleEquipSkin}
            onEquipHitFx={handleEquipHitFx}
            onEquipKillFx={handleEquipKillFx}
            onTriggerInspect={() => lobbyRef.current?.triggerInspect()}
            onToggleMute={handleToggleMute}
            onOpenProfile={() => setProfileOpen(true)}
            onOpenSocial={(tab = 'rooms') => setSocialModal({ open: true, tab })}
            onAcceptInvite={(inv) => {
              setPendingInvite(null);
              multiplayerClient.joinRoom(inv.roomCode);
            }}
            onDismissInvite={() => setPendingInvite(null)}
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
            playMode={playMode}
            roomCode={activeRoomCode}
            selfShortId={profile.shortId}
            selfName={profile.displayName}
            initialSpawn={initialSpawn}
            team={team}
            mapId={mapId}
            gameMode={gameMode}
            initialPrimaryWeapon={weaponId}
            skinId={profile.equippedSkin}
            hitEffectId={profile.equippedHitFx}
            killEffectId={profile.equippedKillFx}
            settings={settings}
            paused={paused || buyMenuOpen || scoreboardOpen || settingsOpen || hudEditorOpen}
            onHudUpdate={setHud}
            onEarnCredits={handleEarnCredits}
            onRecordCareerStat={handleRecordCareerStat}
            onToggleBuyMenu={() => setBuyMenuOpen((b) => !b)}
            onToggleScoreboard={() => setScoreboardOpen((s) => !s)}
          />
          <MatchHud
            hud={hud}
            viewportRef={gameRef}
            hudLayout={hudLayout}
            settings={settings}
            buyMenuOpen={buyMenuOpen}
            scoreboardOpen={scoreboardOpen}
            paused={paused}
            onToggleBuyMenu={() => setBuyMenuOpen((b) => !b)}
            onToggleScoreboard={() => setScoreboardOpen((s) => !s)}
            onTogglePause={() => setPaused((p) => !p)}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenHudEditor={() => setHudEditorOpen(true)}
            onExitToLobby={handleExitToLobby}
          />
        </>
      )}

      {profileOpen && (
        <ProfileModal
          profile={profile}
          authBusy={authBusy}
          authNotice={authNotice}
          onUpdateName={(displayName) =>
            setProfile((prev) => ({ ...prev, displayName }))
          }
          onSelectBanner={(bannerId: BannerId) =>
            setProfile((prev) => ({ ...prev, bannerId }))
          }
          onLinkGoogle={() => void handleLinkGoogle()}
          onLinkApple={() => void handleLinkApple()}
          onUseGuest={() => void handleUseGuest()}
          onClose={() => setProfileOpen(false)}
        />
      )}

      {socialModal.open && (
        <SocialModal
          initialTab={socialModal.tab}
          profile={profile}
          friends={friends}
          rooms={onlineRooms}
          wsConnected={wsConnected}
          pingMs={pingMs}
          selectedMap={mapId}
          selectedMode={gameMode}
          selectedTeam={team}
          onAddFriend={handleAddFriend}
          onRemoveFriend={handleRemoveFriend}
          onInviteFriend={handleInviteFriend}
          onQuickMatch={() => {
            setPlayMode('online');
            multiplayerClient.quickMatch({ mapId, gameMode, team });
          }}
          onCreateRoom={(fillBots) => {
            setPlayMode('online');
            multiplayerClient.createRoom({ mapId, gameMode, team, fillBots });
          }}
          onJoinRoom={(code) => {
            setPlayMode('online');
            multiplayerClient.joinRoom(code, team);
          }}
          onClose={() => setSocialModal((s) => ({ ...s, open: false }))}
        />
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
