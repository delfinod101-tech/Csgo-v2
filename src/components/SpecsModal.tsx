import React from 'react';
import { X } from 'lucide-react';
import { CAR_SPECS } from '@/src/types/car';

interface SpecsModalProps {
  onClose: () => void;
}

export const SpecsModal: React.FC<SpecsModalProps> = ({ onClose }) => {
  const rows: { label: string; value: string }[] = [
    { label: 'Model', value: CAR_SPECS.model },
    { label: 'Powertrain', value: CAR_SPECS.powertrain },
    { label: '0–100 km/h', value: CAR_SPECS.acceleration },
    { label: 'Top Speed', value: CAR_SPECS.topSpeed },
    { label: 'Chassis', value: CAR_SPECS.weight },
    { label: 'Aerodynamics', value: CAR_SPECS.drag },
    { label: 'Wheelbase', value: '2,720 mm' },
    { label: 'Braking System', value: '410 mm Carbon-Ceramic · 6-Piston' },
  ];

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="specs-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-[#11141b] border border-white/12 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="text-xs text-amber-400 font-medium">
              Technical Dossier
            </div>
            <h2
              id="specs-title"
              className="font-display text-2xl font-semibold text-white mt-0.5"
            >
              {CAR_SPECS.model}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close specifications"
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <dl className="divide-y divide-white/8 mt-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-4 py-3 text-sm"
            >
              <dt className="text-zinc-400">{row.label}</dt>
              <dd className="font-mono-tabular text-right font-medium text-zinc-100">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};
