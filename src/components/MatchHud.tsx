import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Coins,
  Copy,
  Crosshair,
  Eye,
  Move,
  Pause,
  RotateCw,
  Shield,
  ShoppingBag,
  SlidersHorizontal,
  Smartphone,
  Trophy,
  Wifi,
  X,
} from 'lucide-react';
import {
  GameSettings,
  HudLayout,
  MatchHudState,
  WEAPON_SPECS,
  WeaponId,
} from '@/src/types/game';
import { GameViewportHandle } from './GameViewport';

interface MatchHudProps {
  hud: MatchHudState;
  viewportRef: React.RefObject<GameViewportHandle | null>;
  hudLayout: HudLayout;
  settings: GameSettings;
  buyMenuOpen: boolean;
  scoreboardOpen: boolean;
  paused: boolean;
  onToggleBuyMenu: () => void;
  onToggleScoreboard: () => void;
  onTogglePause: () => void;
  onOpenSettings: () => void;
  onOpenHudEditor: () => void;
  onExitToLobby: () => void;
}

export const MatchHud: React.FC<MatchHudProps> = ({
  hud,
  viewportRef,
  hudLayout,
  settings,
  buyMenuOpen,
  scoreboardOpen,
  paused,
  onToggleBuyMenu,
  onToggleScoreboard,
  onTogglePause,
  onOpenSettings,
  onOpenHudEditor,
  onExitToLobby,
}) => {
  const [touchHudEnabled, setTouchHudEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches
    );
  });
  const [copiedRoom, setCopiedRoom] = useState(false);

  const joyRef = useRef<HTMLDivElement | null>(null);
  const joyTouchId = useRef<number | null>(null);
  const [joyKnob, setJoyKnob] = useState({ x: 0, y: 0 });

  const fireTouchId = useRef<number | null>(null);
  const fireLastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    return () => {
      viewportRef.current?.setMoveVector(0, 0);
      viewportRef.current?.setFiring(false);
    };
  }, [viewportRef]);

  const handleJoystickStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (joyTouchId.current !== null) return;
    const t = e.changedTouches[0];
    joyTouchId.current = t.identifier;
    updateJoystick(t.clientX, t.clientY);
  };

  const handleJoystickMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === joyTouchId.current) {
        updateJoystick(t.clientX, t.clientY);
      }
    }
  };

  const handleJoystickEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joyTouchId.current) {
        joyTouchId.current = null;
        setJoyKnob({ x: 0, y: 0 });
        viewportRef.current?.setMoveVector(0, 0);
      }
    }
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    const el = joyRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.4;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setJoyKnob({ x: dx, y: dy });
    viewportRef.current?.setMoveVector(dx / maxR, -dy / maxR);
  };

  const handleFireTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const t = e.changedTouches[0];
    fireTouchId.current = t.identifier;
    fireLastPos.current = { x: t.clientX, y: t.clientY };
    viewportRef.current?.setFiring(true);
  };

  const handleFireTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === fireTouchId.current) {
        const dx = t.clientX - fireLastPos.current.x;
        const dy = t.clientY - fireLastPos.current.y;
        fireLastPos.current = { x: t.clientX, y: t.clientY };
        viewportRef.current?.addLookDelta(dx, dy);
      }
    }
  };

  const handleFireTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === fireTouchId.current) {
        fireTouchId.current = null;
        viewportRef.current?.setFiring(false);
      }
    }
  };

  const activeAmmo = hud.ammo[hud.activeWeapon];
  const mins = Math.floor(hud.roundTimeSec / 60);
  const secs = hud.roundTimeSec % 60;
  const gap = Math.min(18, Math.max(4, Math.round(hud.crosshairSpread * 0.45)));
  const tickLen = settings.crosshairSize;
  const tickColor = settings.crosshairColor;

  const buyableWeapons: WeaponId[] = ['ak47', 'm4a1s', 'awp', 'deagle'];
  const c = hudLayout.controls;

  const controlStyle = (id: keyof HudLayout['controls']): React.CSSProperties => ({
    left: `${c[id].xPct}%`,
    top: `${c[id].yPct}%`,
    opacity: hudLayout.opacity,
    transform: `translate(-50%, -50%) scale(${c[id].scale})`,
  });

  const ctRows = hud.scoreboard.filter((r) => r.team === 'ct');
  const tRows = hud.scoreboard.filter((r) => r.team === 't');

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none">
      {/* AWP Optical Scope Overlay */}
      {hud.scoped && (
        <div className="fixed inset-0 z-10 pointer-events-none flex items-center justify-center">
          <div
            className="w-full h-full"
            style={{
              background:
                'radial-gradient(circle at center, transparent 32%, rgba(4,6,10,0.97) 35%)',
            }}
          />
          <div className="absolute inset-x-0 top-1/2 h-[1.5px] bg-black/85" />
          <div className="absolute inset-y-0 left-1/2 w-[1.5px] bg-black/85" />
          <div className="absolute w-2 h-2 rounded-full bg-red-500" />
        </div>
      )}

      {/* Dynamic Customizable Crosshair + Hitmarker */}
      {!hud.scoped && !paused && !buyMenuOpen && !scoreboardOpen && !hud.matchEnded && (
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
          <div
            className="absolute left-1/2 -translate-x-1/2 w-[2px] shadow-[0_0_2px_rgba(0,0,0,0.9)]"
            style={{
              bottom: `${gap}px`,
              height: `${tickLen}px`,
              backgroundColor: tickColor,
            }}
          />
          <div
            className="absolute left-1/2 -translate-x-1/2 w-[2px] shadow-[0_0_2px_rgba(0,0,0,0.9)]"
            style={{
              top: `${gap}px`,
              height: `${tickLen}px`,
              backgroundColor: tickColor,
            }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 h-[2px] shadow-[0_0_2px_rgba(0,0,0,0.9)]"
            style={{
              right: `${gap}px`,
              width: `${tickLen}px`,
              backgroundColor: tickColor,
            }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 h-[2px] shadow-[0_0_2px_rgba(0,0,0,0.9)]"
            style={{
              left: `${gap}px`,
              width: `${tickLen}px`,
              backgroundColor: tickColor,
            }}
          />

          {hud.hitmarkerKind !== 'none' && (
            <div
              className={`w-6 h-6 -translate-x-1/2 -translate-y-1/2 absolute left-0 top-0 ${
                hud.hitmarkerKind === 'head' ? 'text-red-500' : 'text-white'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 5l4 4M19 5l-4 4M5 19l4-4M19 19l-4-4" />
              </svg>
            </div>
          )}
        </div>
      )}

      {/* Top Bar: Scoreboard + Utility Controls */}
      <div className="fixed top-2 inset-x-2 sm:inset-x-3 z-20 safe-top flex items-start justify-between gap-1.5">
        {/* Left Utility Buttons */}
        <div className="flex items-center gap-1 pointer-events-auto flex-wrap">
          <button
            type="button"
            onClick={onTogglePause}
            aria-label="Pausar"
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg bg-[#0c1017]/90 border border-white/12 text-zinc-200 hover:text-white cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onToggleBuyMenu}
            className="min-h-[38px] px-2.5 flex items-center gap-1 rounded-lg bg-[#0c1017]/90 border border-white/12 text-[11px] font-semibold text-amber-400 cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Loja (B)</span>
          </button>

          <button
            type="button"
            onClick={onToggleScoreboard}
            title="Placar da Partida (Tab)"
            className="min-h-[38px] px-2.5 flex items-center gap-1 rounded-lg bg-[#0c1017]/90 border border-white/12 text-[11px] font-semibold text-zinc-200 cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Placar</span>
          </button>

          <button
            type="button"
            onClick={() => setTouchHudEnabled((v) => !v)}
            title="Alternar controles touch iOS/Android"
            className={`min-h-[38px] px-2 flex items-center gap-1 rounded-lg border text-[11px] font-medium cursor-pointer ${
              touchHudEnabled
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                : 'bg-[#0c1017]/90 border-white/12 text-zinc-400'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>

          {settings.showFps && (
            <div className="px-2 py-1 rounded-lg bg-[#0c1017]/90 border border-white/10 font-mono-tabular text-[10px] font-bold text-emerald-400">
              {hud.fps} FPS
            </div>
          )}

          {hud.isOnline && hud.roomCode && (
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(hud.roomCode || '');
                setCopiedRoom(true);
                setTimeout(() => setCopiedRoom(false), 1400);
              }}
              className="px-2 py-1 rounded-lg bg-[#0c1017]/90 border border-sky-500/35 font-mono-tabular text-[10px] font-bold text-sky-300 inline-flex items-center gap-1 cursor-pointer"
            >
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span>#{hud.roomCode}</span>
              <span className="hidden sm:inline text-zinc-400">· {hud.pingMs}ms</span>
              {copiedRoom ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
            </button>
          )}
        </div>

        {/* Center Scoreboard & Timer */}
        <div className="flex items-center gap-2.5 px-3 py-1 rounded-lg bg-[#0c1017]/92 border border-white/12 shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-semibold text-sky-400">CT</span>
            <span className="font-mono-tabular text-sm sm:text-base font-bold text-white">
              {hud.ctScore}
            </span>
          </div>

          <div className="px-2 border-x border-white/10 text-center">
            <div className="font-mono-tabular text-xs sm:text-sm font-bold text-zinc-100">
              {mins}:{String(secs).padStart(2, '0')}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <span className="font-mono-tabular text-sm sm:text-base font-bold text-white">
              {hud.tScore}
            </span>
            <span className="text-[10px] font-semibold text-amber-400">TR</span>
          </div>
        </div>

        {/* Right Killfeed */}
        <div className="hidden sm:flex flex-col items-end gap-1 max-w-[38vw]">
          {hud.killFeed.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0c1017]/90 border border-white/10 text-[10px] whitespace-nowrap"
            >
              <span
                className={
                  entry.killerTeam === 'ct' ? 'text-sky-400 font-semibold' : 'text-amber-400 font-semibold'
                }
              >
                {entry.killer}
              </span>
              <span className="text-zinc-400">[{WEAPON_SPECS[entry.weaponId].name}]</span>
              {entry.headshot && <span className="text-red-400 font-bold">HS</span>}
              <span
                className={
                  entry.victimTeam === 'ct' ? 'text-sky-300' : 'text-amber-300'
                }
              >
                {entry.victim}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop Pointer Lock Prompt */}
      {!touchHudEnabled && !hud.pointerLocked && !paused && !buyMenuOpen && !scoreboardOpen && !hud.matchEnded && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
          <button
            type="button"
            onClick={() => viewportRef.current?.requestDesktopPointerLock()}
            className="px-3 py-1 rounded-lg bg-[#0c1017]/92 border border-amber-500/50 text-[11px] font-medium text-amber-300 cursor-pointer"
          >
            Clique na tela para travar mira (TAB placar · ESC pausa)
          </button>
        </div>
      )}

      {/* Compact Bottom Health / Armor & Weapon Strip */}
      <div className="fixed bottom-2.5 left-1/2 -translate-x-1/2 z-20 safe-bottom flex items-center gap-2 sm:gap-3 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-[#0c1017]/92 border border-white/12 pointer-events-auto max-w-[96vw]">
        <div className="flex items-center gap-2.5 pr-2 border-r border-white/10">
          <div>
            <div className="text-[9px] text-zinc-400">HP</div>
            <div
              className={`font-mono-tabular text-sm sm:text-lg font-bold leading-none ${
                hud.hp <= 25 ? 'text-red-400' : 'text-white'
              }`}
            >
              {hud.hp}
            </div>
          </div>
          <div>
            <div className="text-[9px] text-zinc-400">Colete</div>
            <div className="font-mono-tabular text-sm sm:text-lg font-bold leading-none text-sky-400">
              {hud.armor}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {(
            [
              { slot: 1 as const, id: hud.slot1Weapon },
              { slot: 2 as const, id: 'deagle' as WeaponId },
              { slot: 3 as const, id: 'knife' as WeaponId },
            ] as const
          ).map((item) => {
            const active = hud.activeWeapon === item.id;
            return (
              <button
                key={item.slot}
                type="button"
                onClick={() => viewportRef.current?.switchSlot(item.slot)}
                className={`min-h-[32px] px-2 py-1 rounded-md text-[11px] font-semibold cursor-pointer ${
                  active
                    ? 'bg-amber-500 text-zinc-950'
                    : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                }`}
              >
                {WEAPON_SPECS[item.id].name}
              </button>
            );
          })}
        </div>

        <div className="pl-2 border-l border-white/10 text-right min-w-[48px]">
          {hud.reloading ? (
            <span className="text-[10px] font-semibold text-amber-400">Rec...</span>
          ) : hud.activeWeapon === 'knife' ? (
            <span className="font-mono-tabular text-xs font-bold text-zinc-300">FACA</span>
          ) : (
            <div className="font-mono-tabular leading-none">
              <span className="text-sm sm:text-lg font-bold text-white">{activeAmmo.mag}</span>
              <span className="text-[10px] text-zinc-400">/{activeAmmo.reserve}</span>
            </div>
          )}
        </div>
      </div>

      {/* Customizable iOS & Android Multi-Touch Overlay */}
      {touchHudEnabled && !paused && !buyMenuOpen && !scoreboardOpen && !hud.matchEnded && (
        <>
          <div
            ref={joyRef}
            style={controlStyle('joystick')}
            onTouchStart={handleJoystickStart}
            onTouchMove={handleJoystickMove}
            onTouchEnd={handleJoystickEnd}
            onTouchCancel={handleJoystickEnd}
            className="fixed z-30 w-26 h-26 rounded-full bg-[#0c1017]/65 border border-white/20 flex items-center justify-center pointer-events-auto touch-none"
          >
            <div
              className="w-11 h-11 rounded-full bg-amber-500/85 border-2 border-white/60 shadow-lg"
              style={{
                transform: `translate(${joyKnob.x}px, ${joyKnob.y}px)`,
              }}
            />
          </div>

          <button
            type="button"
            aria-label="Atirar"
            style={controlStyle('fire')}
            onTouchStart={handleFireTouchStart}
            onTouchMove={handleFireTouchMove}
            onTouchEnd={handleFireTouchEnd}
            onTouchCancel={handleFireTouchEnd}
            onMouseDown={() => viewportRef.current?.setFiring(true)}
            onMouseUp={() => viewportRef.current?.setFiring(false)}
            className="fixed z-30 w-16 h-16 rounded-full bg-amber-500 border-2 border-amber-300 flex items-center justify-center font-display text-[11px] font-bold text-zinc-950 shadow-xl pointer-events-auto touch-none active:scale-95"
          >
            ATIRAR
          </button>

          <button
            type="button"
            aria-label="Mirar / Scope"
            style={controlStyle('aim')}
            onTouchStart={(e) => {
              e.stopPropagation();
              viewportRef.current?.toggleAds();
            }}
            onClick={() => viewportRef.current?.toggleAds()}
            className={`fixed z-30 w-12 h-12 rounded-full border flex items-center justify-center pointer-events-auto touch-none ${
              hud.scoped
                ? 'bg-sky-500 border-sky-300 text-zinc-950'
                : 'bg-[#0c1017]/88 border-white/18 text-white'
            }`}
          >
            <Crosshair className="w-5 h-5" />
          </button>

          <button
            type="button"
            aria-label="Recarregar"
            style={controlStyle('reload')}
            onTouchStart={(e) => {
              e.stopPropagation();
              viewportRef.current?.triggerReload();
            }}
            onClick={() => viewportRef.current?.triggerReload()}
            className="fixed z-30 w-11 h-11 rounded-full bg-[#0c1017]/88 border border-white/18 flex items-center justify-center text-zinc-200 pointer-events-auto touch-none"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            aria-label="Pular"
            style={controlStyle('jump')}
            onTouchStart={(e) => {
              e.stopPropagation();
              viewportRef.current?.triggerJump();
            }}
            onClick={() => viewportRef.current?.triggerJump()}
            className="fixed z-30 w-11 h-11 rounded-full bg-[#0c1017]/88 border border-white/18 flex items-center justify-center text-[11px] font-bold text-zinc-200 pointer-events-auto touch-none"
          >
            PUL
          </button>

          <button
            type="button"
            aria-label="Agachar"
            style={controlStyle('crouch')}
            onTouchStart={(e) => {
              e.stopPropagation();
              viewportRef.current?.toggleCrouch();
            }}
            onClick={() => viewportRef.current?.toggleCrouch()}
            className={`fixed z-30 w-11 h-11 rounded-full border flex items-center justify-center text-[11px] font-bold pointer-events-auto touch-none ${
              hud.crouching
                ? 'bg-amber-500 border-amber-400 text-zinc-950'
                : 'bg-[#0c1017]/88 border-white/18 text-zinc-200'
            }`}
          >
            AG
          </button>

          <button
            type="button"
            aria-label="Inspecionar Arma"
            style={controlStyle('inspect')}
            onTouchStart={(e) => {
              e.stopPropagation();
              viewportRef.current?.triggerInspect();
            }}
            onClick={() => viewportRef.current?.triggerInspect()}
            className="fixed z-30 w-11 h-11 rounded-full bg-[#0c1017]/88 border border-white/18 flex items-center justify-center text-zinc-200 pointer-events-auto touch-none"
          >
            <Eye className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Live Match Scoreboard Overlay */}
      {scoreboardOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/78 p-3 pointer-events-auto"
          onClick={onToggleScoreboard}
        >
          <div
            className="w-full max-w-lg max-h-[82dvh] rounded-2xl bg-[#0e131b] border border-white/15 p-4 shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
              <div>
                <h2 className="font-display text-base font-bold text-white">
                  Placar da Partida {hud.roomCode ? `· Sala #${hud.roomCode}` : '· Offline'}
                </h2>
                <p className="text-[11px] text-zinc-400">
                  CT {hud.ctScore} × {hud.tScore} Terroristas
                </p>
              </div>
              <button
                type="button"
                onClick={onToggleScoreboard}
                className="p-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {[
                { label: 'CT Force', color: 'text-sky-400', rows: ctRows },
                { label: 'Terroristas', color: 'text-amber-400', rows: tRows },
              ].map((group) => (
                <div key={group.label}>
                  <div className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${group.color}`}>
                    {group.label}
                  </div>
                  <div className="rounded-xl bg-black/35 border border-white/10 divide-y divide-white/8">
                    {group.rows.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-zinc-500">Sem combatentes</div>
                    ) : (
                      group.rows.map((row) => (
                        <div
                          key={row.id}
                          className={`px-3 py-2 flex items-center justify-between text-xs ${
                            row.isSelf ? 'bg-amber-500/10' : ''
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-white truncate">
                              {row.name}
                            </span>
                            <span className="font-mono-tabular text-[10px] text-zinc-500">
                              {row.isBot ? 'BOT' : row.shortId}
                            </span>
                          </div>
                          <div className="font-mono-tabular text-xs font-bold text-zinc-200 shrink-0">
                            {row.kills} / {row.deaths}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tactical Buy Menu Modal */}
      {buyMenuOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3 pointer-events-auto"
          onClick={onToggleBuyMenu}
        >
          <div
            className="w-full max-w-md max-h-[84dvh] rounded-xl bg-[#10141c] border border-white/15 p-4 shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h2 className="font-display text-base font-bold text-white">Loja Tática</h2>
                <p className="font-mono-tabular text-xs text-emerald-400">
                  Saldo da Partida: ${hud.money}
                </p>
              </div>
              <button
                type="button"
                onClick={onToggleBuyMenu}
                className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-semibold text-white cursor-pointer"
              >
                Fechar
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2">
              {buyableWeapons.map((wId) => {
                const spec = WEAPON_SPECS[wId];
                const canAfford = hud.money >= spec.cost;
                return (
                  <button
                    key={wId}
                    type="button"
                    disabled={!canAfford}
                    onClick={() => {
                      viewportRef.current?.buyWeapon(wId);
                      onToggleBuyMenu();
                    }}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-left cursor-pointer ${
                      canAfford
                        ? 'bg-black/35 border-white/12 hover:border-amber-500 text-white'
                        : 'bg-black/20 border-white/5 text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <div className="font-display text-sm font-bold">{spec.name}</div>
                      <div className="text-[11px] text-zinc-400">
                        {spec.category} · Dano {spec.damage}
                      </div>
                    </div>
                    <span className="font-mono-tabular text-sm font-bold text-amber-400">
                      ${spec.cost}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                disabled={hud.money < 650 || hud.armor >= 100}
                onClick={() => {
                  viewportRef.current?.buyArmor();
                  onToggleBuyMenu();
                }}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-left cursor-pointer ${
                  hud.money >= 650 && hud.armor < 100
                    ? 'bg-black/35 border-white/12 hover:border-sky-400 text-white'
                    : 'bg-black/20 border-white/5 text-zinc-500 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-sky-400" />
                  <div>
                    <div className="font-display text-sm font-bold">Colete Kevlar</div>
                    <div className="text-[11px] text-zinc-400">Proteção balística 100</div>
                  </div>
                </div>
                <span className="font-mono-tabular text-sm font-bold text-sky-400">$650</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pause or Match Finished Modal */}
      {(paused || hud.matchEnded) && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-3 pointer-events-auto">
          <div className="w-full max-w-sm rounded-xl bg-[#10141c] border border-white/15 p-5 text-center shadow-2xl">
            <h2 className="font-display text-xl font-bold text-white">
              {hud.matchEnded
                ? hud.winnerTeam === 'ct'
                  ? 'Vitória Contraterrorista'
                  : 'Vitória dos Terroristas'
                : 'Partida Pausada'}
            </h2>
            <p className="font-mono-tabular text-xs text-zinc-400 mt-1.5">
              Abates: {hud.kills} · Mortes: {hud.deaths}
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/35 text-xs font-mono-tabular font-bold text-amber-300">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>+{hud.creditsEarnedMatch} Créditos ganhos</span>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {!hud.matchEnded ? (
                <button
                  type="button"
                  onClick={onTogglePause}
                  className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display text-sm font-bold cursor-pointer"
                >
                  Continuar Partida
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => viewportRef.current?.restartMatch()}
                  className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display text-sm font-bold cursor-pointer"
                >
                  Jogar Novamente
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="py-2 px-3 rounded-lg border border-white/12 bg-white/5 text-xs font-semibold text-zinc-200 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                  <span>Config</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenHudEditor}
                  className="py-2 px-3 rounded-lg border border-white/12 bg-white/5 text-xs font-semibold text-zinc-200 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Move className="w-3.5 h-3.5 text-sky-400" />
                  <span>HUD</span>
                </button>
              </div>

              <button
                type="button"
                onClick={onExitToLobby}
                className="w-full py-2.5 rounded-lg border border-white/15 text-zinc-200 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Voltar ao Lobby
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
