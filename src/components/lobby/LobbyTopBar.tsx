import React from 'react';
import { Coins, Crosshair, Gift, Home, SlidersHorizontal, Trophy, Volume2, VolumeX } from 'lucide-react';
import { PROFILE_BANNERS, PlayerProfile, ScreenView } from '@/src/types/game';
import { soundEngine } from '@/src/game/sound';

type LobbyView = Extract<ScreenView, 'lobby' | 'inventory' | 'store'>;

interface LobbyTopBarProps {
  view: LobbyView;
  profile: PlayerProfile;
  muted: boolean;
  onChangeView: (v: LobbyView) => void;
  onOpenProfile: () => void;
  onOpenLeaderboard: () => void;
  onOpenSettings: () => void;
  onToggleMute: () => void;
}

const XP_PER_LEVEL = 500;

export function getProfileLevel(score: number) {
  const safe = Math.max(0, score);
  return {
    level: Math.floor(safe / XP_PER_LEVEL) + 1,
    progress: (safe % XP_PER_LEVEL) / XP_PER_LEVEL,
  };
}

const NavIcon: React.FC<{
  label: string;
  active?: boolean;
  dot?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ label, active, dot, onClick, children }) => (
  <button
    type="button"
    onClick={() => {
      soundEngine.playUiClick();
      onClick();
    }}
    aria-label={label}
    title={label}
    aria-current={active ? 'page' : undefined}
    className={`relative h-8 w-9 sm:w-11 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
      active ? 'bg-white/12 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/6'
    }`}
  >
    {children}
    {dot && <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />}
    {active && <span className="absolute inset-x-2 -bottom-[7px] h-[2px] rounded-full bg-amber-400" />}
  </button>
);

export const LobbyTopBar: React.FC<LobbyTopBarProps> = ({
  view,
  profile,
  muted,
  onChangeView,
  onOpenProfile,
  onOpenLeaderboard,
  onOpenSettings,
  onToggleMute,
}) => {
  const { level, progress } = getProfileLevel(profile.score);
  const banner = PROFILE_BANNERS.find((b) => b.id === profile.bannerId) ?? PROFILE_BANNERS[0];

  return (
    <header className="fixed top-0 inset-x-0 z-20 safe-top bg-gradient-to-b from-black/85 via-black/60 to-transparent">
      <div className="flex items-center justify-between gap-2 px-2 sm:px-4 pt-1.5 pb-3">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onChangeView('lobby');
            }}
            className="font-display italic font-black text-base sm:text-xl tracking-tight text-white leading-none cursor-pointer pr-1"
            aria-label="STRIKE 2 — Lobby"
          >
            S<span className="text-amber-400">2</span>
            <span className="hidden md:inline text-sm font-bold not-italic tracking-widest ml-1.5 text-zinc-300">
              STRIKE
            </span>
          </button>

          <div className="hidden sm:flex flex-col items-center justify-center h-9 px-3 rounded-md bg-gradient-to-b from-amber-300/90 to-amber-600/90 text-zinc-950 leading-none">
            <span className="text-[9px] font-black">#1</span>
            <span className="text-[10px] font-display font-bold tracking-wide">TEMPORADA 1</span>
          </div>

          <nav className="flex items-center gap-0.5" aria-label="Navegação do lobby">
            <NavIcon label="Lobby" active={view === 'lobby'} onClick={() => onChangeView('lobby')}>
              <Home className="w-4 h-4" />
            </NavIcon>
            <NavIcon label="Armas e Skins" active={view === 'inventory'} dot onClick={() => onChangeView('inventory')}>
              <Crosshair className="w-4 h-4" />
            </NavIcon>
            <NavIcon label="Placar" onClick={onOpenLeaderboard}>
              <Trophy className="w-4 h-4" />
            </NavIcon>
          </nav>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onChangeView('store');
            }}
            className={`h-8 sm:h-9 px-2 sm:px-3 flex items-center gap-1.5 rounded-md border font-display text-[10px] sm:text-[11px] font-bold tracking-wide cursor-pointer transition-colors ${
              view === 'store'
                ? 'bg-emerald-500 border-emerald-300 text-zinc-950'
                : 'bg-emerald-600/25 border-emerald-400/50 text-emerald-300 hover:bg-emerald-600/40'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CAIXAS</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <div className="hidden md:flex items-center gap-1 text-[11px] font-mono-tabular font-bold text-amber-300">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            {profile.credits}
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onOpenProfile();
            }}
            title="Abrir perfil"
            className="flex items-center gap-2 cursor-pointer group"
          >
            <span className="flex items-center gap-1 h-7 pl-1.5 pr-2 rounded-md bg-emerald-500/20 border border-emerald-400/40">
              <span
                className="w-1.5 h-4 rounded-sm"
                style={{ backgroundColor: banner.accentHex }}
                aria-hidden="true"
              />
              <span className="font-display text-sm font-bold text-white font-mono-tabular">{level}</span>
              <span className="sr-only">Nível</span>
            </span>
            <span className="hidden sm:flex flex-col items-start min-w-[96px] max-w-[140px]">
              <span className="text-xs font-semibold text-white truncate max-w-full group-hover:text-amber-300">
                {profile.displayName}
              </span>
              <span className="w-full h-1 mt-1 rounded-full bg-white/15 overflow-hidden">
                <span
                  className="block h-full bg-emerald-400"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </span>
              <span className="text-[9px] text-amber-400 mt-0.5">
                {Math.round(progress * XP_PER_LEVEL)} / {XP_PER_LEVEL} XP
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Ativar áudio' : 'Silenciar áudio'}
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-md text-zinc-300 hover:text-white hover:bg-white/8 cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onOpenSettings();
            }}
            aria-label="Configurações"
            className="h-8 w-8 flex items-center justify-center rounded-md text-zinc-300 hover:text-white hover:bg-white/8 cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
