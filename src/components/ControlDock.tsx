import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Lightbulb,
  RotateCw,
  Volume2,
  VolumeX,
  Wind,
} from 'lucide-react';
import {
  CALIPER_FINISHES,
  CAMERA_PRESETS,
  CameraPresetId,
  CarConfig,
  LIGHTING_PRESETS,
  PAINT_FINISHES,
  WHEEL_FINISHES,
} from '@/src/types/car';

export type DockTab = 'finish' | 'wheels' | 'engineering' | 'stage';

interface ControlDockProps {
  config: CarConfig;
  collapsed: boolean;
  activeTab: DockTab;
  onChangeTab: (tab: DockTab) => void;
  onToggleCollapse: () => void;
  onUpdateConfig: (patch: Partial<CarConfig>) => void;
  onSelectCameraPreset: (preset: CameraPresetId) => void;
  onPlayMechanicalFeedback: () => void;
}

export const ControlDock: React.FC<ControlDockProps> = ({
  config,
  collapsed,
  activeTab,
  onChangeTab,
  onToggleCollapse,
  onUpdateConfig,
  onSelectCameraPreset,
  onPlayMechanicalFeedback,
}) => {
  const [hoveredPaintName, setHoveredPaintName] = useState<string | null>(null);

  const selectedPaint =
    PAINT_FINISHES.find((p) => p.id === config.paintId) ?? PAINT_FINISHES[0];

  const tabs: { id: DockTab; label: string }[] = [
    { id: 'finish', label: 'Finish' },
    { id: 'wheels', label: 'Wheels' },
    { id: 'engineering', label: 'Engineering' },
    { id: 'stage', label: 'Stage' },
  ];

  return (
    <div
      className="fixed bottom-5 left-1/2 z-20 w-[min(860px,94vw)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
      style={{
        transform: collapsed
          ? 'translate(-50%, calc(100% + 20px))'
          : 'translate(-50%, 0)',
      }}
    >
      {/* Attached Collapse / Expand Tab */}
      <div className="flex justify-center mb-2 pointer-events-auto">
        <button
          type="button"
          onClick={onToggleCollapse}
          style={{
            transform: collapsed ? 'translateY(-46px)' : 'translateY(0)',
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-t-lg rounded-b-lg bg-[#11141b]/95 border border-white/12 text-xs font-medium text-zinc-200 hover:text-white hover:border-white/25 transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-500"
          title="Toggle Controls (H)"
        >
          {collapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Show Controls</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Hide Controls</span>
            </>
          )}
        </button>
      </div>

      {/* Main Dock Surface (Solid/RGBA dark surface, NO backdrop-filter over WebGL) */}
      <div className="pointer-events-auto rounded-xl bg-[#11141b]/95 border border-white/12 shadow-2xl overflow-hidden">
        {/* Dock Tab Row */}
        <div className="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-white/8">
          <div className="flex items-center gap-1 bg-black/30 p-1 rounded-lg">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onChangeTab(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-amber-500 ${
                    active
                      ? 'bg-amber-500 text-zinc-950 font-semibold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Quick Utility Toggles */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onPlayMechanicalFeedback();
                onUpdateConfig({ headlightsOn: !config.headlightsOn });
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
                config.headlightsOn
                  ? 'bg-zinc-800 border-amber-500/60 text-amber-400'
                  : 'bg-transparent border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Optics</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onPlayMechanicalFeedback();
                onUpdateConfig({ spoilerDeployed: !config.spoilerDeployed });
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
                config.spoilerDeployed
                  ? 'bg-zinc-800 border-amber-500/60 text-amber-400'
                  : 'bg-transparent border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              <Wind className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Aero Wing</span>
            </button>

            <button
              type="button"
              onClick={() => onUpdateConfig({ audioEnabled: !config.audioEnabled })}
              aria-label={config.audioEnabled ? 'Mute Audio' : 'Enable Audio'}
              className={`inline-flex items-center justify-center w-8 h-8 rounded-md border cursor-pointer transition-colors duration-150 ${
                config.audioEnabled
                  ? 'bg-zinc-800 border-amber-500/60 text-amber-400'
                  : 'bg-transparent border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              {config.audioEnabled ? (
                <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Active Tab Controls */}
        <div className="px-5 py-3.5">
          {activeTab === 'finish' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs text-zinc-400">Exterior Paint</div>
                <div className="text-sm font-medium text-white mt-0.5">
                  {hoveredPaintName ?? selectedPaint.name}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {PAINT_FINISHES.map((paint) => {
                  const selected = paint.id === config.paintId;
                  return (
                    <button
                      key={paint.id}
                      type="button"
                      onClick={() => {
                        onPlayMechanicalFeedback();
                        onUpdateConfig({ paintId: paint.id });
                      }}
                      onMouseEnter={() => setHoveredPaintName(paint.name)}
                      onMouseLeave={() => setHoveredPaintName(null)}
                      aria-label={`Select ${paint.name}`}
                      className={`w-8 h-8 rounded-full cursor-pointer transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-amber-500 ${
                        selected
                          ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-[#11141b] scale-110'
                          : 'ring-1 ring-white/20 hover:scale-105'
                      }`}
                      style={{ backgroundColor: paint.hex }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'wheels' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-zinc-400 mr-1">Rim Finish</span>
                {WHEEL_FINISHES.map((w) => {
                  const active = config.wheelFinishId === w.id;
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => {
                        onPlayMechanicalFeedback();
                        onUpdateConfig({ wheelFinishId: w.id });
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
                        active
                          ? 'bg-zinc-800 border-amber-500 text-white'
                          : 'bg-black/25 border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {w.name}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2.5">
                <span className="text-xs text-zinc-400 mr-1">Calipers</span>
                {CALIPER_FINISHES.map((cal) => {
                  const selected = cal.id === config.caliperId;
                  return (
                    <button
                      key={cal.id}
                      type="button"
                      onClick={() => {
                        onPlayMechanicalFeedback();
                        onUpdateConfig({ caliperId: cal.id });
                      }}
                      aria-label={`Caliper ${cal.name}`}
                      className={`w-6 h-6 rounded-full cursor-pointer transition-transform duration-150 ${
                        selected
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-[#11141b] scale-110'
                          : 'ring-1 ring-white/20 hover:scale-105'
                      }`}
                      style={{ backgroundColor: cal.hex }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'engineering' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="shrink-0">
                  <div className="text-xs text-zinc-400">Exploded Assembly</div>
                  <div className="font-mono-tabular text-xs font-medium text-amber-400">
                    {Math.round(config.exploded * 100)}%
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(config.exploded * 100)}
                  onChange={(e) =>
                    onUpdateConfig({ exploded: Number(e.target.value) / 100 })
                  }
                  aria-label="Exploded view separation"
                  className="carro-slider flex-1 min-w-[140px]"
                />
                <button
                  type="button"
                  onClick={() => {
                    onPlayMechanicalFeedback();
                    onUpdateConfig({ exploded: config.exploded > 0.5 ? 0 : 1 });
                  }}
                  className="px-3 py-1.5 text-xs font-medium rounded-md border border-white/12 bg-black/25 text-zinc-200 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {config.exploded > 0.5 ? 'Assemble' : 'Explode All'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => onUpdateConfig({ turntableSpin: !config.turntableSpin })}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
                  config.turntableSpin
                    ? 'bg-zinc-800 border-amber-500/70 text-amber-400'
                    : 'bg-black/25 border-white/10 text-zinc-300 hover:text-white'
                }`}
              >
                <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Turntable Spin</span>
              </button>
            </div>
          )}

          {activeTab === 'stage' && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                {CAMERA_PRESETS.map((cam) => {
                  const active = config.cameraPreset === cam.id;
                  return (
                    <button
                      key={cam.id}
                      type="button"
                      onClick={() => onSelectCameraPreset(cam.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
                        active
                          ? 'bg-zinc-800 border-amber-500 text-white'
                          : 'bg-black/25 border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {cam.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5">
                {LIGHTING_PRESETS.map((light) => {
                  const active = config.lightingId === light.id;
                  return (
                    <button
                      key={light.id}
                      type="button"
                      onClick={() => onUpdateConfig({ lightingId: light.id })}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md border whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 ${
                        active
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                          : 'bg-black/25 border-white/10 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {light.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
