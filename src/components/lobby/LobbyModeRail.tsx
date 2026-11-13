import React from 'react';
import { ChevronRight, Globe } from 'lucide-react';
import { GameModeId, MAP_LIST, MapId } from '@/src/types/game';
import { soundEngine } from '@/src/game/sound';

interface LobbyModeRailProps {
  gameMode: GameModeId;
  mapId: MapId;
  onChangeGameMode: (gm: GameModeId) => void;
  onChangeMap: (m: MapId) => void;
  onOpenRooms: () => void;
}

const MODES: { id: GameModeId; title: string; tag: string; image: string }[] = [
  { id: 'deathmatch', title: 'Mata-Mata', tag: 'Partida rápida · Respawn', image: '/lobby/mode-deathmatch.png' },
  { id: 'tactical', title: 'Tático', tag: 'Plantar & desarmar', image: '/lobby/mode-tactical.png' },
];

const MAP_IMAGES: Record<MapId, string> = {
  mirage: '/lobby/map-mirage.png',
  nuke: '/lobby/map-nuke.png',
};

const RailCard: React.FC<{
  title: string;
  tag: string;
  image: string;
  active: boolean;
  onClick: () => void;
}> = ({ title, tag, image, active, onClick }) => (
  <button
    type="button"
    onClick={() => {
      soundEngine.playUiClick();
      onClick();
    }}
    aria-pressed={active}
    className={`group relative w-full h-11 sm:h-14 lg:h-[72px] overflow-hidden text-left cursor-pointer transition-all border-l-[3px] ${
      active ? 'border-amber-400 bg-zinc-800' : 'border-transparent bg-zinc-900/85 hover:bg-zinc-800/90'
    }`}
  >
    <img
      src={image}
      alt=""
      aria-hidden="true"
      className={`absolute inset-y-0 right-0 h-full w-[68%] object-cover transition-all duration-300 ${
        active ? 'opacity-90' : 'opacity-55 group-hover:opacity-80 group-hover:scale-105'
      }`}
    />
    <span className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent" />
    <span className="relative flex h-full flex-col justify-center pl-2.5 sm:pl-3.5 pr-2">
      <span className="font-display text-[11px] sm:text-sm lg:text-base font-bold uppercase tracking-wide text-white leading-tight">
        {title}
      </span>
      <span className="hidden sm:block text-[10px] text-zinc-400 mt-0.5 truncate">{tag}</span>
    </span>
  </button>
);

export const LobbyModeRail: React.FC<LobbyModeRailProps> = ({
  gameMode,
  mapId,
  onChangeGameMode,
  onChangeMap,
  onOpenRooms,
}) => (
  <aside
    aria-label="Modos e mapas"
    className="fixed z-10 left-2 sm:left-4 top-12 sm:top-16 w-[148px] sm:w-[220px] lg:w-[290px] flex flex-col"
  >
    <h2 className="sr-only">Modo de jogo</h2>
    <div className="flex flex-col gap-px rounded-sm overflow-hidden shadow-2xl">
      {MODES.map((m) => (
        <RailCard
          key={m.id}
          title={m.title}
          tag={m.tag}
          image={m.image}
          active={gameMode === m.id}
          onClick={() => onChangeGameMode(m.id)}
        />
      ))}
    </div>

    <h2 className="mt-2 sm:mt-3 mb-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
      Mapa
    </h2>
    <div className="flex flex-col gap-px rounded-sm overflow-hidden shadow-2xl">
      {MAP_LIST.map((m) => (
        <RailCard
          key={m.id}
          title={m.name}
          tag={m.subtitle}
          image={MAP_IMAGES[m.id]}
          active={mapId === m.id}
          onClick={() => onChangeMap(m.id)}
        />
      ))}
    </div>

    <button
      type="button"
      onClick={() => {
        soundEngine.playUiClick();
        onOpenRooms();
      }}
      className="mt-px flex items-center justify-between h-8 sm:h-9 px-2.5 sm:px-3.5 bg-zinc-700/80 hover:bg-zinc-600/80 text-[11px] sm:text-xs font-medium text-zinc-100 cursor-pointer"
    >
      <span className="flex items-center gap-1.5">
        <Globe className="w-3.5 h-3.5 text-sky-300" />
        Jogo Personalizado
      </span>
      <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
    </button>
  </aside>
);
