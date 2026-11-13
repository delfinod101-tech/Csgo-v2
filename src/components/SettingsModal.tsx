import React, { useState } from 'react';
import {
  Crosshair,
  Gauge,
  Monitor,
  RotateCcw,
  SlidersHorizontal,
  Smartphone,
  Volume2,
  X,
} from 'lucide-react';
import {
  CrosshairColor,
  GameSettings,
  GraphicsPreset,
} from '@/src/types/game';
import { DEFAULT_SETTINGS } from '@/src/game/storage';
import { soundEngine } from '@/src/game/sound';

type SettingsTab = 'sensitivity' | 'graphics' | 'crosshair' | 'audio';

interface SettingsModalProps {
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  onOpenHudEditor: () => void;
  onClose: () => void;
}

const CROSSHAIR_COLORS: { color: CrosshairColor; label: string }[] = [
  { color: '#34d399', label: 'Verde Esmeralda' },
  { color: '#38bdf8', label: 'Ciano Tático' },
  { color: '#facc15', label: 'Amarelo Ouro' },
  { color: '#ffffff', label: 'Branco Puro' },
  { color: '#ef4444', label: 'Vermelho Laser' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onChange,
  onOpenHudEditor,
  onClose,
}) => {
  const [tab, setTab] = useState<SettingsTab>('sensitivity');

  const applyPreset = (preset: GraphicsPreset) => {
    soundEngine.playUiClick();
    if (preset === 'light') {
      onChange({
        ...settings,
        graphicsPreset: 'light',
        resolutionScale: 0.65,
        shadowsEnabled: false,
        particlesEnabled: false,
      });
    } else if (preset === 'balanced') {
      onChange({
        ...settings,
        graphicsPreset: 'balanced',
        resolutionScale: 0.85,
        shadowsEnabled: true,
        particlesEnabled: true,
      });
    } else {
      onChange({
        ...settings,
        graphicsPreset: 'high',
        resolutionScale: 1.0,
        shadowsEnabled: true,
        particlesEnabled: true,
      });
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'sensitivity', label: 'Sensibilidade', icon: <Gauge className="w-3.5 h-3.5" /> },
    { id: 'graphics', label: 'Gráficos', icon: <Monitor className="w-3.5 h-3.5" /> },
    { id: 'crosshair', label: 'Mira', icon: <Crosshair className="w-3.5 h-3.5" /> },
    { id: 'audio', label: 'Áudio', icon: <Volume2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] rounded-2xl bg-[#0e131b] border border-white/15 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="font-display text-lg font-bold text-white">
                Configurações Completas
              </h2>
              <p className="text-xs text-zinc-400">
                Ajuste sensibilidade, desempenho gráfico, mira e HUD mobile
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar configurações"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="px-5 py-2.5 border-b border-white/8 flex items-center gap-2 overflow-x-auto bg-black/25 shrink-0">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setTab(t.id);
                }}
                className={`min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  active
                    ? 'bg-amber-500 text-zinc-950'
                    : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {tab === 'sensitivity' && (
            <div className="space-y-4">
              {/* Touch Sensitivity */}
              <div className="rounded-xl bg-black/30 border border-white/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white">
                    Sensibilidade Touch (iOS / Android)
                  </span>
                  <span className="font-mono-tabular text-xs font-bold text-amber-400">
                    {settings.touchSensitivity.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0.3}
                  max={2.5}
                  step={0.05}
                  value={settings.touchSensitivity}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      touchSensitivity: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Mouse Sensitivity */}
              <div className="rounded-xl bg-black/30 border border-white/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white">
                    Sensibilidade Mouse (PC)
                  </span>
                  <span className="font-mono-tabular text-xs font-bold text-amber-400">
                    {settings.mouseSensitivity.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0.3}
                  max={2.5}
                  step={0.05}
                  value={settings.mouseSensitivity}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      mouseSensitivity: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* ADS / Scope Multiplier */}
              <div className="rounded-xl bg-black/30 border border-white/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white">
                    Multiplicador de Mira / Scope AWP
                  </span>
                  <span className="font-mono-tabular text-xs font-bold text-sky-400">
                    {settings.adsSensitivityMult.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0.25}
                  max={1.5}
                  step={0.05}
                  value={settings.adsSensitivityMult}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      adsSensitivityMult: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              {/* Invert Y & HUD Editor shortcut */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    onChange({ ...settings, invertY: !settings.invertY });
                  }}
                  className={`min-h-[48px] px-4 py-3 rounded-xl border flex items-center justify-between text-xs font-semibold cursor-pointer ${
                    settings.invertY
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                      : 'bg-black/30 border-white/10 text-zinc-300'
                  }`}
                >
                  <span>Inverter Eixo Y</span>
                  <span>{settings.invertY ? 'Ativado' : 'Desativado'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playEquip();
                    onOpenHudEditor();
                  }}
                  className="min-h-[48px] px-4 py-3 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-400/50 flex items-center justify-center gap-2 text-xs font-bold text-sky-200 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Personalizar HUD Mobile</span>
                </button>
              </div>
            </div>
          )}

          {tab === 'graphics' && (
            <div className="space-y-4">
              {/* Quick Presets */}
              <div>
                <div className="text-xs font-semibold text-zinc-400 mb-2">
                  Perfis Rápidos de Desempenho
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {(
                    [
                      {
                        id: 'light' as GraphicsPreset,
                        title: 'Ultra Leve',
                        desc: 'Máximo FPS · Celular fraco',
                      },
                      {
                        id: 'balanced' as GraphicsPreset,
                        title: 'Balanceado',
                        desc: 'Recomendado · Nítido e fluido',
                      },
                      {
                        id: 'high' as GraphicsPreset,
                        title: 'Alto',
                        desc: 'Resolução nativa + sombras',
                      },
                    ] as const
                  ).map((p) => {
                    const active = settings.graphicsPreset === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => applyPreset(p.id)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
                          active
                            ? 'bg-amber-500/15 border-amber-500 text-white'
                            : 'bg-black/30 border-white/10 text-zinc-300 hover:border-white/25'
                        }`}
                      >
                        <div className="font-display text-xs font-bold">{p.title}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">{p.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Resolution Scale */}
              <div className="rounded-xl bg-black/30 border border-white/10 p-4">
                <div className="text-xs font-semibold text-white mb-2.5">
                  Escala de Resolução 3D
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 0.65, label: '65% (Leve)' },
                    { val: 0.85, label: '85% (Padrão)' },
                    { val: 1.0, label: '100% (Nativo)' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        onChange({ ...settings, resolutionScale: opt.val });
                      }}
                      className={`min-h-[40px] rounded-lg border text-xs font-semibold cursor-pointer ${
                        Math.abs(settings.resolutionScale - opt.val) < 0.05
                          ? 'bg-amber-500 border-amber-400 text-zinc-950'
                          : 'bg-black/40 border-white/10 text-zinc-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Granular Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    onChange({ ...settings, shadowsEnabled: !settings.shadowsEnabled });
                  }}
                  className={`min-h-[48px] px-3.5 py-2.5 rounded-xl border text-left cursor-pointer ${
                    settings.shadowsEnabled
                      ? 'bg-emerald-500/15 border-emerald-500/60 text-white'
                      : 'bg-black/30 border-white/10 text-zinc-400'
                  }`}
                >
                  <div className="text-xs font-bold">Sombras 3D</div>
                  <div className="text-[11px] opacity-80">
                    {settings.shadowsEnabled ? 'Ativadas' : 'Desligadas (Leve)'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    onChange({
                      ...settings,
                      particlesEnabled: !settings.particlesEnabled,
                    });
                  }}
                  className={`min-h-[48px] px-3.5 py-2.5 rounded-xl border text-left cursor-pointer ${
                    settings.particlesEnabled
                      ? 'bg-emerald-500/15 border-emerald-500/60 text-white'
                      : 'bg-black/30 border-white/10 text-zinc-400'
                  }`}
                >
                  <div className="text-xs font-bold">Partículas & FX</div>
                  <div className="text-[11px] opacity-80">
                    {settings.particlesEnabled ? 'Ativadas' : 'Reduzidas'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    onChange({ ...settings, showFps: !settings.showFps });
                  }}
                  className={`min-h-[48px] px-3.5 py-2.5 rounded-xl border text-left cursor-pointer ${
                    settings.showFps
                      ? 'bg-sky-500/15 border-sky-500/60 text-white'
                      : 'bg-black/30 border-white/10 text-zinc-400'
                  }`}
                >
                  <div className="text-xs font-bold">Contador FPS</div>
                  <div className="text-[11px] opacity-80">
                    {settings.showFps ? 'Visível na partida' : 'Oculto'}
                  </div>
                </button>
              </div>
            </div>
          )}

          {tab === 'crosshair' && (
            <div className="space-y-4">
              {/* Live Crosshair Preview */}
              <div className="h-32 rounded-xl bg-[#070a0f] border border-white/10 flex items-center justify-center relative">
                <div className="relative">
                  <div
                    className="absolute left-1/2 -translate-x-1/2 w-[2px]"
                    style={{
                      height: `${settings.crosshairSize}px`,
                      bottom: '5px',
                      backgroundColor: settings.crosshairColor,
                    }}
                  />
                  <div
                    className="absolute left-1/2 -translate-x-1/2 w-[2px]"
                    style={{
                      height: `${settings.crosshairSize}px`,
                      top: '5px',
                      backgroundColor: settings.crosshairColor,
                    }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-[2px]"
                    style={{
                      width: `${settings.crosshairSize}px`,
                      right: '5px',
                      backgroundColor: settings.crosshairColor,
                    }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-[2px]"
                    style={{
                      width: `${settings.crosshairSize}px`,
                      left: '5px',
                      backgroundColor: settings.crosshairColor,
                    }}
                  />
                </div>
                <span className="absolute bottom-2 right-3 text-[10px] text-zinc-500">
                  Prévia em tempo real
                </span>
              </div>

              {/* Color Swatches */}
              <div className="rounded-xl bg-black/30 border border-white/10 p-4">
                <div className="text-xs font-semibold text-white mb-2.5">
                  Cor da Mira
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {CROSSHAIR_COLORS.map((item) => {
                    const active = settings.crosshairColor === item.color;
                    return (
                      <button
                        key={item.color}
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          onChange({ ...settings, crosshairColor: item.color });
                        }}
                        className={`min-h-[40px] px-3 py-1.5 rounded-lg border inline-flex items-center gap-2 text-xs font-medium cursor-pointer ${
                          active
                            ? 'bg-zinc-800 border-amber-500 text-white'
                            : 'bg-black/40 border-white/10 text-zinc-300'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-white/30"
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Crosshair Size */}
              <div className="rounded-xl bg-black/30 border border-white/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white">
                    Tamanho das Hastes da Mira
                  </span>
                  <span className="font-mono-tabular text-xs font-bold text-amber-400">
                    {settings.crosshairSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min={6}
                  max={14}
                  step={1}
                  value={settings.crosshairSize}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      crosshairSize: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {tab === 'audio' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-black/30 border border-white/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-white">
                    Volume Geral (Efeitos & Disparos)
                  </span>
                  <span className="font-mono-tabular text-xs font-bold text-amber-400">
                    {Math.round(settings.masterVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={settings.masterVolume}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      masterVolume: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={() => onChange({ ...settings, muted: !settings.muted })}
                className={`w-full min-h-[48px] px-4 py-3 rounded-xl border flex items-center justify-between text-xs font-semibold cursor-pointer ${
                  settings.muted
                    ? 'bg-red-500/15 border-red-500/60 text-red-300'
                    : 'bg-black/30 border-white/10 text-zinc-200'
                }`}
              >
                <span>Silenciar Todo o Áudio</span>
                <span>{settings.muted ? 'Silenciado' : 'Som Ativo'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-white/10 flex items-center justify-between gap-3 bg-black/30 shrink-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onChange(DEFAULT_SETTINGS);
            }}
            className="min-h-[40px] px-3.5 py-2 rounded-lg border border-white/12 text-xs font-semibold text-zinc-300 hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrões</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display text-xs font-bold cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
