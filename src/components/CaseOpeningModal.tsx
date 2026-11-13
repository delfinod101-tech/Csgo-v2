import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, PackageOpen, Sparkles, X } from 'lucide-react';
import {
  CASE_CATALOG,
  CaseDefinition,
  CaseItemDrop,
  SkinId,
  WEAPON_SKINS,
} from '@/src/types/game';
import { soundEngine } from '@/src/game/sound';

interface CaseOpeningModalProps {
  caseDef: CaseDefinition;
  credits: number;
  unlockedSkins: SkinId[];
  onCompleteRoll: (skinId: SkinId, isDuplicate: boolean, refundAmount: number) => void;
  onEquipSkin: (skinId: SkinId) => void;
  onReopenCase: () => void;
  onClose: () => void;
}

const CARD_WIDTH = 132;
const CARD_GAP = 8;
const CARD_STEP = CARD_WIDTH + CARD_GAP;
const TOTAL_CARDS = 44;
const WIN_INDEX = 36;
const SPIN_DURATION_MS = 4600;

function pickWeightedDrop(drops: CaseItemDrop[]): CaseItemDrop {
  const totalWeight = drops.reduce((acc, d) => acc + d.weight, 0);
  let r = Math.random() * totalWeight;
  for (const d of drops) {
    r -= d.weight;
    if (r <= 0) return d;
  }
  return drops[drops.length - 1];
}

export const CaseOpeningModal: React.FC<CaseOpeningModalProps> = ({
  caseDef,
  credits,
  unlockedSkins,
  onCompleteRoll,
  onEquipSkin,
  onReopenCase,
  onClose,
}) => {
  const [rollSeed, setRollSeed] = useState(0);
  const [phase, setPhase] = useState<'spinning' | 'revealed'>('spinning');
  const [offsetX, setOffsetX] = useState(0);
  const [wasDuplicate, setWasDuplicate] = useState(false);
  const [refundCr, setRefundCr] = useState(0);
  const [equippedNow, setEquippedNow] = useState(false);

  const trackViewportRef = useRef<HTMLDivElement | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onCompleteRoll);
  onCompleteRef.current = onCompleteRoll;

  const { reel, winningDrop } = useMemo(() => {
    const items: CaseItemDrop[] = [];
    for (let i = 0; i < TOTAL_CARDS; i++) {
      items.push(pickWeightedDrop(caseDef.drops));
    }
    const win = pickWeightedDrop(caseDef.drops);
    items[WIN_INDEX] = win;
    return { reel: items, winningDrop: win };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseDef.id, rollSeed]);

  const winningSkin =
    WEAPON_SKINS.find((s) => s.id === winningDrop.skinId) ?? WEAPON_SKINS[0];

  useEffect(() => {
    completedRef.current = false;
    setPhase('spinning');
    setEquippedNow(false);

    const alreadyOwned = unlockedSkins.includes(winningDrop.skinId);
    const refund = alreadyOwned
      ? Math.max(120, Math.round((winningSkin.directPrice || 240) * 0.5))
      : 0;
    setWasDuplicate(alreadyOwned);
    setRefundCr(refund);

    const viewportW = trackViewportRef.current?.clientWidth || 640;
    const jitter = (Math.random() - 0.5) * (CARD_WIDTH * 0.55);
    const targetOffset =
      WIN_INDEX * CARD_STEP + CARD_WIDTH / 2 - viewportW / 2 + jitter;

    let rafId = 0;
    const startTime = performance.now();
    let lastTickSlot = -1;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / SPIN_DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 4.1);
      const currentX = targetOffset * eased;
      setOffsetX(currentX);

      const centerWorldX = currentX + viewportW / 2;
      const currentSlot = Math.floor(centerWorldX / CARD_STEP);
      if (currentSlot !== lastTickSlot) {
        lastTickSlot = currentSlot;
        soundEngine.playCaseTick();
      }

      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setPhase('revealed');
        const highTier =
          winningDrop.skinId === 'gold' ||
          winningDrop.skinId === 'asiimov' ||
          winningDrop.skinId === 'carbon';
        soundEngine.playCaseUnlock(highTier);
        if (!completedRef.current) {
          completedRef.current = true;
          onCompleteRef.current(winningDrop.skinId, alreadyOwned, refund);
        }
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollSeed, caseDef.id]);

  const canReopen = credits >= caseDef.price;
  const activeCaseIndex = CASE_CATALOG.findIndex((c) => c.id === caseDef.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/88 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-[#0e131b] border border-white/15 p-5 sm:p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/15"
              style={{ backgroundColor: `${caseDef.accentHex}22` }}
            >
              <PackageOpen className="w-5 h-5" style={{ color: caseDef.accentHex }} />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Abertura de Caixa #{activeCaseIndex + 1}
              </div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                {caseDef.name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            disabled={phase === 'spinning'}
            onClick={onClose}
            aria-label="Fechar abertura de caixa"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:text-white disabled:opacity-40 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CS2 Horizontal Roulette Viewport */}
        <div className="mt-5">
          <div
            ref={trackViewportRef}
            className="relative h-40 w-full overflow-hidden rounded-xl bg-[#070a0f] border border-white/12 shadow-inner"
          >
            {/* Center Gold Laser Line */}
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] bg-amber-400 z-20 shadow-[0_0_12px_rgba(251,191,36,0.9)]" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-r-[7px] border-t-[9px] border-l-transparent border-r-transparent border-t-amber-400 z-20" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-r-[7px] border-b-[9px] border-l-transparent border-r-transparent border-b-amber-400 z-20" />

            {/* Side Edge Fades */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#070a0f] to-transparent z-10" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#070a0f] to-transparent z-10" />

            {/* Moving Reel */}
            <div
              className="absolute top-4 bottom-4 left-0 flex items-stretch"
              style={{
                gap: `${CARD_GAP}px`,
                transform: `translate3d(-${offsetX}px, 0, 0)`,
              }}
            >
              {reel.map((item, idx) => {
                const skin =
                  WEAPON_SKINS.find((s) => s.id === item.skinId) ?? WEAPON_SKINS[0];
                const isWinnerCard = phase === 'revealed' && idx === WIN_INDEX;
                return (
                  <div
                    key={idx}
                    style={{
                      width: `${CARD_WIDTH}px`,
                      borderBottomColor: item.rarityColor,
                    }}
                    className={`shrink-0 rounded-lg border border-white/10 border-b-4 bg-[#121824] p-2.5 flex flex-col justify-between transition-transform ${
                      isWinnerCard ? 'ring-2 ring-amber-400 scale-[1.03]' : ''
                    }`}
                  >
                    <div
                      className="h-14 rounded-md border border-white/10 flex items-center justify-center relative overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, ${skin.primaryHex}, ${skin.secondaryHex})`,
                      }}
                    >
                      <div
                        className="w-16 h-3 rounded-sm rotate-[-12deg] border border-white/30 shadow"
                        style={{ backgroundColor: skin.accentHex }}
                      />
                    </div>
                    <div>
                      <div
                        className="text-[10px] font-bold uppercase tracking-wider truncate"
                        style={{ color: item.rarityColor }}
                      >
                        {item.rarityLabel}
                      </div>
                      <div className="font-display text-xs font-bold text-white truncate">
                        {skin.name}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Status or Result */}
        {phase === 'spinning' ? (
          <div className="mt-5 py-4 text-center">
            <div className="font-display text-sm font-semibold text-amber-400 tracking-wide">
              Sorteando acabamento tático...
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Aguarde a roleta parar no item premiado
            </p>
          </div>
        ) : (
          <div className="mt-5 rounded-xl bg-[#131924] border border-white/12 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className="w-14 h-14 rounded-xl border border-white/20 flex items-center justify-center shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${winningSkin.primaryHex}, ${winningSkin.secondaryHex})`,
                  }}
                >
                  <Sparkles className="w-6 h-6 text-white drop-shadow" />
                </div>
                <div>
                  <div
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: winningDrop.rarityColor }}
                  >
                    {winningDrop.rarityLabel}
                    {wasDuplicate ? ' · Duplicada' : ' · Nova Skin Desbloqueada'}
                  </div>
                  <h3 className="font-display text-xl font-bold text-white">
                    {winningSkin.name}
                  </h3>
                  {wasDuplicate && (
                    <p className="text-xs text-emerald-400 font-mono-tabular mt-0.5">
                      Você já possuía esta skin: +{refundCr} Cr reembolsados
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playEquip();
                    onEquipSkin(winningDrop.skinId);
                    setEquippedNow(true);
                  }}
                  className={`min-h-[42px] px-4 py-2 rounded-lg font-display text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                    equippedNow
                      ? 'bg-emerald-500 text-zinc-950'
                      : 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>{equippedNow ? 'Equipada' : 'Equipar Agora'}</span>
                </button>

                {canReopen && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      onReopenCase();
                      setRollSeed((s) => s + 1);
                    }}
                    className="min-h-[42px] px-4 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-semibold text-white cursor-pointer"
                  >
                    Abrir Outra ({caseDef.price} Cr)
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[42px] px-4 py-2 rounded-lg border border-white/10 text-xs font-medium text-zinc-300 hover:text-white cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
