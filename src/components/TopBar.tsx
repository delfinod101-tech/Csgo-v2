import React from 'react';
import { Camera } from 'lucide-react';
import { AppMode } from '@/src/types/car';

export type NavSection = 'studio' | 'engineering' | 'specs' | 'drive';

interface TopBarProps {
  activeSection: NavSection;
  mode: AppMode;
  isLightStage: boolean;
  onSelectSection: (section: NavSection) => void;
  onCaptureShot: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeSection,
  isLightStage,
  onSelectSection,
  onCaptureShot,
}) => {
  const navItems: { id: NavSection; label: string }[] = [
    { id: 'studio', label: 'Studio' },
    { id: 'engineering', label: 'Engineering' },
    { id: 'specs', label: 'Specs' },
    { id: 'drive', label: 'Test Drive' },
  ];

  return (
    <header
      className={`fixed top-0 inset-x-0 z-20 flex items-center justify-between gap-8 px-6 py-3.5 border-b transition-colors duration-200 ${
        isLightStage
          ? 'bg-[#e6ebf1]/92 border-slate-900/10 text-slate-900'
          : 'bg-[#0b0d11]/90 border-white/10 text-zinc-100'
      }`}
    >
      {/* Zone 1: Single-line Brand Wordmark */}
      <button
        type="button"
        onClick={() => onSelectSection('studio')}
        className="font-display text-lg font-bold tracking-tight whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-500 rounded"
      >
        CARRO
      </button>

      {/* Zone 2: 4 Clean Single-Line Nav Links */}
      <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectSection(item.id)}
              className={`relative py-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-amber-500 rounded ${
                isActive
                  ? isLightStage
                    ? 'text-slate-950 font-semibold'
                    : 'text-white font-semibold'
                  : isLightStage
                    ? 'text-slate-600 hover:text-slate-950'
                    : 'text-zinc-400 hover:text-white'
              }`}
            >
              {item.label}
              {isActive && (
                <span className="absolute left-0 right-0 -bottom-0.5 h-[2px] bg-amber-500 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1 Primary Action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onCaptureShot}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-amber-500 ${
            isLightStage
              ? 'bg-slate-900 text-white hover:bg-slate-800'
              : 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
          }`}
        >
          <Camera className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Capture Shot</span>
        </button>
      </div>
    </header>
  );
};
