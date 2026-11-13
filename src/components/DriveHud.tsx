import React from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw, Square } from 'lucide-react';
import { DriveTelemetry } from '@/src/types/car';
import { TouchDriveInput } from './CarViewport';

interface DriveHudProps {
  telemetry: DriveTelemetry;
  onExitDrive: () => void;
  onResetPosition: () => void;
  onTouchInput: (patch: Partial<TouchDriveInput>) => void;
}

export const DriveHud: React.FC<DriveHudProps> = ({
  telemetry,
  onExitDrive,
  onResetPosition,
  onTouchInput,
}) => {
  return (
    <>
      {/* Touch Drive Controls for mobile/tablet */}
      <div className="fixed bottom-28 inset-x-4 z-20 flex items-center justify-between md:hidden pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            aria-label="Steer Left"
            onPointerDown={() => onTouchInput({ left: true })}
            onPointerUp={() => onTouchInput({ left: false })}
            onPointerLeave={() => onTouchInput({ left: false })}
            className="w-12 h-12 rounded-xl bg-[#11141b]/95 border border-white/15 flex items-center justify-center text-white active:bg-amber-500 active:text-zinc-950"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Steer Right"
            onPointerDown={() => onTouchInput({ right: true })}
            onPointerUp={() => onTouchInput({ right: false })}
            onPointerLeave={() => onTouchInput({ right: false })}
            className="w-12 h-12 rounded-xl bg-[#11141b]/95 border border-white/15 flex items-center justify-center text-white active:bg-amber-500 active:text-zinc-950"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            aria-label="Brake or Reverse"
            onPointerDown={() => onTouchInput({ brake: true })}
            onPointerUp={() => onTouchInput({ brake: false })}
            onPointerLeave={() => onTouchInput({ brake: false })}
            className="w-12 h-12 rounded-xl bg-[#11141b]/95 border border-white/15 flex items-center justify-center text-red-400 active:bg-red-500 active:text-white"
          >
            <ArrowDown className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Accelerate"
            onPointerDown={() => onTouchInput({ throttle: true })}
            onPointerUp={() => onTouchInput({ throttle: false })}
            onPointerLeave={() => onTouchInput({ throttle: false })}
            className="w-12 h-14 rounded-xl bg-amber-500 border border-amber-400 flex items-center justify-center text-zinc-950 font-semibold"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bottom-Center Telemetry Strip */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-20 w-[min(640px,94vw)] rounded-xl bg-[#11141b]/95 border border-white/12 px-5 py-3 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-4">
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono-tabular text-3xl font-semibold text-white">
                {String(telemetry.speedKmh).padStart(3, '0')}
              </span>
              <span className="text-xs text-zinc-400">km/h</span>
            </div>

            <div className="h-6 w-px bg-white/10" aria-hidden="true" />

            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-400">Gear</span>
              <span className="font-mono-tabular font-semibold text-amber-400">
                {telemetry.gear}
              </span>
            </div>

            <div className="hidden sm:block text-xs text-zinc-400">
              WASD / Arrows · Space brake · R reset
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onResetPosition}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-white/12 text-zinc-200 hover:text-white hover:border-white/25 cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={onExitDrive}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-amber-500 text-zinc-950 hover:bg-amber-400 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Square className="w-3 h-3 fill-current" aria-hidden="true" />
              <span>Return to Studio</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
