import React from 'react';
import { Crosshair, Settings, Smartphone, Users, Wifi, WifiOff, X } from 'lucide-react';
import { MAP_LIST, PlayModeKind, RoomInviteEvent } from '@/src/types/game';
import { soundEngine } from '@/src/game/sound';

interface LobbyFeedProps {
  playMode: PlayModeKind;
  wsConnected: boolean;
  pendingInvite: RoomInviteEvent | null;
  loadoutLabel: string;
  onOpenFriends: () => void;
  onOpenSettings: () => void;
  onOpenHudEditor: () => void;
  onOpenInventory: () => void;
  onAcceptInvite: (invite: RoomInviteEvent) => void;
  onDismissInvite: () => void;
}

const FeedCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`rounded-md border border-emerald-300/20 bg-emerald-950/70 backdrop-blur-sm p-2.5 ${className}`}>
    {children}
  </div>
);

const SideButton: React.FC<{ label: string; onClick: () => void; children: React.ReactNode }> = ({
  label,
  onClick,
  children,
}) => (
  <button
    type="button"
    onClick={() => {
      soundEngine.playUiClick();
      onClick();
    }}
    className="flex items-center gap-1.5 h-7 px-2.5 rounded-sm bg-zinc-800/85 hover:bg-zinc-700 text-[11px] text-zinc-200 cursor-pointer"
  >
    {children}
    {label}
  </button>
);

export const InviteCard: React.FC<{
  invite: RoomInviteEvent;
  onAccept: (invite: RoomInviteEvent) => void;
  onDismiss: () => void;
}> = ({ invite, onAccept, onDismiss }) => (
  <FeedCard className="border-emerald-300/50">
    <div className="flex items-start justify-between gap-2">
      <p className="text-xs text-white leading-snug">
        <span className="font-semibold">{invite.fromName}</span> te convidou para a sala{' '}
        <span className="font-mono-tabular text-emerald-300">#{invite.roomCode}</span>
        <span className="block text-[10px] text-zinc-400">
          {MAP_LIST.find((m) => m.id === invite.mapId)?.name}
        </span>
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Fechar convite"
        className="p-0.5 text-zinc-400 hover:text-white cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
    <div className="mt-2 flex gap-2">
      <button
        type="button"
        onClick={() => {
          soundEngine.playEquip();
          onAccept(invite);
        }}
        className="flex-1 h-7 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-[11px] font-bold cursor-pointer"
      >
        Entrar
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="flex-1 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] cursor-pointer"
      >
        Recusar
      </button>
    </div>
  </FeedCard>
);

export const LobbyFeed: React.FC<LobbyFeedProps> = ({
  playMode,
  wsConnected,
  pendingInvite,
  loadoutLabel,
  onOpenFriends,
  onOpenSettings,
  onOpenHudEditor,
  onOpenInventory,
  onAcceptInvite,
  onDismissInvite,
}) => (
  <aside
    aria-label="Notificações"
    className="hidden sm:flex fixed z-10 right-4 top-16 w-[230px] lg:w-[260px] flex-col items-end gap-1.5"
  >
    <div className="flex flex-col items-end gap-1">
      <SideButton label="Amigos" onClick={onOpenFriends}>
        <Users className="w-3.5 h-3.5 text-sky-300" />
      </SideButton>
      <SideButton label="HUD" onClick={onOpenHudEditor}>
        <Smartphone className="w-3.5 h-3.5 text-sky-300" />
      </SideButton>
      <SideButton label="Opções" onClick={onOpenSettings}>
        <Settings className="w-3.5 h-3.5" />
      </SideButton>
    </div>

    <div className="w-full mt-2 flex flex-col gap-1.5" aria-live="polite">
      {pendingInvite && (
        <InviteCard invite={pendingInvite} onAccept={onAcceptInvite} onDismiss={onDismissInvite} />
      )}

      <FeedCard>
        <div className="flex items-center gap-2 text-xs text-white">
          {playMode === 'online' && wsConnected ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-300" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-zinc-400" />
          )}
          {playMode === 'online'
            ? wsConnected
              ? 'Conectado ao servidor'
              : 'Conectando ao servidor...'
            : 'Modo offline contra bots'}
        </div>
        {playMode === 'online' && (
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onOpenFriends();
            }}
            className="mt-2 h-7 w-full rounded-full bg-emerald-500/90 hover:bg-emerald-400 text-zinc-950 text-[11px] font-bold cursor-pointer"
          >
            Convidar para o Lobby
          </button>
        )}
      </FeedCard>

      <FeedCard>
        <div className="flex items-center gap-2 text-xs text-white min-w-0">
          <Crosshair className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span className="truncate">{loadoutLabel}</span>
        </div>
        <button
          type="button"
          onClick={() => {
            soundEngine.playUiClick();
            onOpenInventory();
          }}
          className="mt-2 h-7 w-full rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] cursor-pointer"
        >
          Trocar Equipamento
        </button>
      </FeedCard>
    </div>
  </aside>
);
