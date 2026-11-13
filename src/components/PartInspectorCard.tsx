import React from 'react';
import { X } from 'lucide-react';
import { InspectedPart } from '@/src/types/car';

interface PartInspectorCardProps {
  part: InspectedPart;
  dockCollapsed: boolean;
  onClose: () => void;
}

export const PartInspectorCard: React.FC<PartInspectorCardProps> = ({
  part,
  dockCollapsed,
  onClose,
}) => {
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-20 w-[min(460px,92vw)] rounded-xl bg-[#11141b]/95 border border-white/12 p-4 shadow-xl transition-transform duration-200"
      style={{
        bottom: dockCollapsed ? '64px' : '168px',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
            <span>{part.category}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular text-zinc-300">{part.spec}</span>
          </div>
          <h3 className="font-display text-base font-semibold text-white">
            {part.title}
          </h3>
          <p className="text-xs leading-relaxed text-zinc-400">
            {part.description}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close part details"
          className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
