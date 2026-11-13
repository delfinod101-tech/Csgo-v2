import React, { useRef, useState } from 'react';
import {
  Check,
  Crosshair,
  Eye,
  Move,
  RotateCcw,
  RotateCw,
  X,
} from 'lucide-react';
import { HudElementId, HudLayout } from '@/src/types/game';
import { DEFAULT_HUD_LAYOUT } from '@/src/game/storage';
import { soundEngine } from '@/src/game/sound';

interface HudEditorOverlayProps {
  layout: HudLayout;
  onSave: (layout: HudLayout) => void;
  onClose: () => void;
}

const CONTROL_LABELS: Record<HudElementId, string> = {
  joystick: 'Analógico',
  fire: 'ATIRAR',
  aim: 'Mirar / Scope',
  reload: 'Recarregar',
  jump: 'Pular',
  crouch: 'Agachar',
  inspect: 'Inspecionar',
};

export const HudEditorOverlay: React.FC<HudEditorOverlayProps> = ({
  layout,
  onSave,
  onClose,
}) => {
  const [draft, setDraft] = useState<HudLayout>(() => ({
    opacity: layout.opacity,
    controls: { ...layout.controls },
  }));
  const [selectedId, setSelectedId] = useState<HudElementId>('fire');
  const dragTargetRef = useRef<HudElementId | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const updateControlPosition = (id: HudElementId, clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const xPct = Math.min(94, Math.max(6, ((clientX - rect.left) / rect.width) * 100));
    const yPct = Math.min(88, Math.max(16, ((clientY - rect.top) / rect.height) * 100));
    setDraft((prev) => ({
      ...prev,
      controls: {
        ...prev.controls,
        [id]: {
          ...prev.controls[id],
          xPct: Math.round(xPct * 10) / 10,
          yPct: Math.round(yPct * 10) / 10,
        },
      },
    }));
  };

  const handlePointerDown = (id: HudElementId, e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragTargetRef.current = id;
    setSelectedId(id);
  };

  const handlePointerMove = (id: HudElementId, e: React.PointerEvent<HTMLDivElement>) => {
    if (dragTargetRef.current !== id) return;
    updateControlPosition(id, e.clientX, e.clientY);
  };

  const handlePointerUp = (id: HudElementId, e: React.PointerEvent<HTMLDivElement>) => {
    if (dragTargetRef.current === id) {
      dragTargetRef.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    }
  };

  const selectedControl = draft.controls[selectedId];

  const renderControlVisual = (id: HudElementId) => {
    if (id === 'joystick') {
      return (
        <div className="w-28 h-28 rounded-full bg-[#0c1017]/80 border-2 border-white/30 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-amber-500/85 border-2 border-white/70" />
        </div>
      );
    }
    if (id === 'fire') {
      return (
        <div className="w-18 h-18 rounded-full bg-amber-500 border-2 border-amber-300 flex items-center justify-center font-display text-xs font-bold text-zinc-950 shadow-xl">
          ATIRAR
        </div>
      );
    }
    if (id === 'aim') {
      return (
        <div className="w-13 h-13 rounded-full bg-[#0c1017]/90 border border-white/25 flex items-center justify-center text-white">
          <Crosshair className="w-5 h-5" />
        </div>
      );
    }
    if (id === 'reload') {
      return (
        <div className="w-12 h-12 rounded-full bg-[#0c1017]/90 border border-white/25 flex items-center justify-center text-zinc-100">
          <RotateCw className="w-5 h-5" />
        </div>
      );
    }
    if (id === 'inspect') {
      return (
        <div className="w-12 h-12 rounded-full bg-[#0c1017]/90 border border-white/25 flex items-center justify-center text-zinc-100">
          <Eye className="w-5 h-5" />
        </div>
      );
    }
    if (id === 'jump') {
      return (
        <div className="w-12 h-12 rounded-full bg-[#0c1017]/90 border border-white/25 flex items-center justify-center text-xs font-bold text-zinc-100">
          PUL
        </div>
      );
    }
    return (
      <div className="w-12 h-12 rounded-full bg-[#0c1017]/90 border border-white/25 flex items-center justify-center text-xs font-bold text-zinc-100">
        AG
      </div>
    );
  };

  return (
    <div
      ref={canvasRef}
      className="fixed inset-0 z-50 bg-[#080b10]/90 select-none touch-none overflow-hidden"
    >
      {/* Subtle Blueprint Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Top Toolbar */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-30 w-[min(780px,95vw)] safe-top rounded-2xl bg-[#10151f] border border-white/15 p-3 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Move className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <h2 className="font-display text-sm font-bold text-white">
                Editor de HUD Mobile — {CONTROL_LABELS[selectedId]}
              </h2>
              <p className="text-[11px] text-zinc-400">
                Arraste qualquer botão na tela para reposicionar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setDraft({
                  opacity: DEFAULT_HUD_LAYOUT.opacity,
                  controls: { ...DEFAULT_HUD_LAYOUT.controls },
                });
              }}
              className="min-h-[38px] px-3 py-1.5 rounded-lg border border-white/12 text-xs font-semibold text-zinc-300 hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resetar</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="min-h-[38px] px-3 py-1.5 rounded-lg border border-white/12 text-xs font-semibold text-zinc-300 hover:text-white inline-flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancelar</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playEquip();
                onSave(draft);
                onClose();
              }}
              className="min-h-[38px] px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Salvar HUD</span>
            </button>
          </div>
        </div>

        {/* Scale & Global Opacity Sliders */}
        <div className="mt-3 pt-2.5 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-medium text-zinc-300 whitespace-nowrap">
              Tamanho ({CONTROL_LABELS[selectedId]}):{' '}
              <strong className="font-mono-tabular text-amber-400">
                {Math.round(selectedControl.scale * 100)}%
              </strong>
            </span>
            <input
              type="range"
              min={0.7}
              max={1.45}
              step={0.05}
              value={selectedControl.scale}
              onChange={(e) => {
                const nextScale = parseFloat(e.target.value);
                setDraft((prev) => ({
                  ...prev,
                  controls: {
                    ...prev.controls,
                    [selectedId]: {
                      ...prev.controls[selectedId],
                      scale: nextScale,
                    },
                  },
                }));
              }}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-medium text-zinc-300 whitespace-nowrap">
              Opacidade Global:{' '}
              <strong className="font-mono-tabular text-sky-400">
                {Math.round(draft.opacity * 100)}%
              </strong>
            </span>
            <input
              type="range"
              min={0.4}
              max={1.0}
              step={0.05}
              value={draft.opacity}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  opacity: parseFloat(e.target.value),
                }))
              }
              className="w-full accent-sky-400 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Draggable Controls */}
      {(Object.keys(draft.controls) as HudElementId[]).map((id) => {
        const ctrl = draft.controls[id];
        const isSelected = selectedId === id;
        return (
          <div
            key={id}
            onPointerDown={(e) => handlePointerDown(id, e)}
            onPointerMove={(e) => handlePointerMove(id, e)}
            onPointerUp={(e) => handlePointerUp(id, e)}
            onPointerCancel={(e) => handlePointerUp(id, e)}
            style={{
              left: `${ctrl.xPct}%`,
              top: `${ctrl.yPct}%`,
              opacity: draft.opacity,
              transform: `translate(-50%, -50%) scale(${ctrl.scale})`,
            }}
            className={`fixed z-20 cursor-grab active:cursor-grabbing touch-none rounded-full transition-shadow ${
              isSelected ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#080b10]' : ''
            }`}
          >
            {renderControlVisual(id)}
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-zinc-200 bg-black/80 px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none">
              {CONTROL_LABELS[id]}
            </span>
          </div>
        );
      })}
    </div>
  );
};
