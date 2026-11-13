import React from 'react';
import { Play } from 'lucide-react';
import { GameModeId, MAP_LIST, MapId, PlayModeKind, TeamSide } from '@/src/types/game';
import { soundEngine } from '@/src/game/sound';

interface LobbyPlayDockProps {
  playMode: PlayModeKind;
  team: TeamSide;
  mapId: MapId;
  gameMode: GameModeId;
  onChangePlayMode: (pm: PlayModeKind) => void;
  onChangeTeam: (t: TeamSide) => void;
  onStartMatch: () => void;
}

const Segment: React.FC<{
  options: { id: string; label: string; activeClass: string }[];
  value: string;
  label: string;
  onChange: (id: string) => void;
}> = ({ options, value, label, onChange }) => (
  <div role="group" aria-label={label} className="flex flex-1 bg-black/60 p-0.5 rounded-sm">
    {options.map((o) => (
      <button
        key={o.id}
        type="button"
        aria-pressed={value === o.id}
        onClick={() => {
          soundEngine.playUiClick();
          onChange(o.id);
        }}
        className={`flex-1 h-7 px-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide rounded-sm cursor-pointer transition-colors ${
          value === o.id ? o.activeClass : 'text-zinc-400 hover:text-white'
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

export const LobbyPlayDock: React.FC<LobbyPlayDockProps> = ({
  playMode,
  team,
  mapId,
  gameMode,
  onChangePlayMode,
  onChangeTeam,
  onStartMatch,
}) => {
  const mapName = MAP_LIST.find((m) => m.id === mapId)?.name ?? '';
  return (
    <div className="fixed z-20 right-2 sm:right-4 bottom-2 sm:bottom-4 safe-bottom w-[180px] sm:w-[260px] flex flex-col gap-1">
      <div className="flex gap-1">
        <Segment
          label="Modo de conexão"
          value={playMode}
          onChange={(id) => onChangePlayMode(id as PlayModeKind)}
          options={[
            { id: 'offline', label: 'Bots', activeClass: 'bg-zinc-700 text-amber-300' },
            { id: 'online', label: 'Online', activeClass: 'bg-sky-600 text-white' },
          ]}
        />
        <Segment
          label="Time"
          value={team}
          onChange={(id) => onChangeTeam(id as TeamSide)}
          options={[
            { id: 'ct', label: 'CT', activeClass: 'bg-sky-600 text-white' },
            { id: 't', label: 'TR', activeClass: 'bg-amber-600 text-white' },
          ]}
        />
      </div>
      <button
        type="button"
        onClick={() => {
          soundEngine.playEquip();
          onStartMatch();
        }}
        className="group relative flex items-center justify-between gap-2 h-12 sm:h-14 pl-3 sm:pl-4 pr-3 rounded-sm bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-[0_0_30px_rgba(245,158,11,0.35)] cursor-pointer transition-colors"
      >
        <span className="flex flex-col items-start leading-none">
          <span className="font-display text-lg sm:text-2xl font-black italic tracking-wide">JOGAR</span>
          <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide opacity-80 mt-0.5 truncate max-w-[120px] sm:max-w-[190px]">
            {gameMode === 'tactical' ? 'Tático' : 'Mata-Mata'} · {mapName}
          </span>
        </span>
        <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </button>
    </div>
  );
};
