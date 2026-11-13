import React, { useState } from 'react';
import {
  Check,
  Coins,
  Flame,
  PackageOpen,
  Palette,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  CASE_CATALOG,
  CaseDefinition,
  HIT_EFFECTS,
  HitEffectId,
  KILL_EFFECTS,
  KillEffectId,
  PlayerProfile,
  SkinId,
  WEAPON_SKINS,
} from '@/src/types/game';
import { soundEngine } from '@/src/game/sound';

type StoreTab = 'cases' | 'hit-fx' | 'kill-fx' | 'skins';

interface StoreScreenProps {
  profile: PlayerProfile;
  onOpenCase: (caseDef: CaseDefinition) => void;
  onBuySkin: (skinId: SkinId, price: number) => void;
  onEquipSkin: (skinId: SkinId) => void;
  onBuyHitFx: (id: HitEffectId, price: number) => void;
  onEquipHitFx: (id: HitEffectId) => void;
  onBuyKillFx: (id: KillEffectId, price: number) => void;
  onEquipKillFx: (id: KillEffectId) => void;
}

export const StoreScreen: React.FC<StoreScreenProps> = ({
  profile,
  onOpenCase,
  onBuySkin,
  onEquipSkin,
  onBuyHitFx,
  onEquipHitFx,
  onBuyKillFx,
  onEquipKillFx,
}) => {
  const [tab, setTab] = useState<StoreTab>('cases');

  const tabs: { id: StoreTab; label: string; icon: React.ReactNode }[] = [
    { id: 'cases', label: 'Caixas', icon: <PackageOpen className="w-3.5 h-3.5" /> },
    { id: 'hit-fx', label: 'Efeitos de Acerto', icon: <Zap className="w-3.5 h-3.5" /> },
    { id: 'kill-fx', label: 'Efeitos de Kill', icon: <Flame className="w-3.5 h-3.5" /> },
    { id: 'skins', label: 'Skins Diretas', icon: <Palette className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-x-0 top-16 bottom-4 z-15 flex justify-center px-3 sm:px-6 pt-3 pb-2 pointer-events-none">
      <div className="w-full max-w-5xl h-full rounded-2xl bg-[#0c1017]/95 border border-white/12 shadow-2xl flex flex-col overflow-hidden pointer-events-auto">
        {/* Store Header + Sub-tabs */}
        <div className="px-4 sm:px-6 py-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h1 className="font-display text-lg sm:text-xl font-bold text-white">
                Loja & Arsenal de Efeitos
              </h1>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Ganhe créditos eliminando inimigos nas partidas para abrir caixas e equipar efeitos 3D
            </p>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/45 border border-amber-500/30 self-start sm:self-auto">
            <Coins className="w-4 h-4 text-amber-400" />
            <span className="font-mono-tabular text-sm font-bold text-white">
              {profile.credits}
            </span>
            <span className="text-[11px] font-semibold text-amber-400">CR</span>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-4 sm:px-6 py-2.5 border-b border-white/8 flex items-center gap-2 overflow-x-auto shrink-0 bg-black/25">
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
                    : 'bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Store Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {tab === 'cases' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CASE_CATALOG.map((c) => {
                const canAfford = profile.credits >= c.price;
                return (
                  <div
                    key={c.id}
                    className="rounded-xl bg-[#121824] border border-white/12 p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div
                        className="h-28 rounded-lg border border-white/10 flex flex-col items-center justify-center relative overflow-hidden"
                        style={{
                          background: `radial-gradient(circle at center, ${c.accentHex}30, #090d14)`,
                        }}
                      >
                        <PackageOpen
                          className="w-10 h-10 mb-1"
                          style={{ color: c.accentHex }}
                        />
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-300">
                          Caixa Tática
                        </span>
                      </div>

                      <h2 className="font-display text-base font-bold text-white mt-3">
                        {c.name}
                      </h2>
                      <p className="text-xs text-zinc-400 mt-1">{c.subtitle}</p>

                      {/* Drop Odds Preview */}
                      <div className="mt-3 pt-3 border-t border-white/8 space-y-1">
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">
                          Conteúdo possível
                        </div>
                        {c.drops.map((drop) => {
                          const skin = WEAPON_SKINS.find((s) => s.id === drop.skinId);
                          return (
                            <div
                              key={drop.skinId}
                              className="flex items-center justify-between text-xs"
                            >
                              <span style={{ color: drop.rarityColor }} className="font-medium">
                                {skin?.name}
                              </span>
                              <span className="font-mono-tabular text-zinc-400">
                                {drop.weight}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => {
                        soundEngine.playEquip();
                        onOpenCase(c);
                      }}
                      className={`mt-4 w-full min-h-[44px] rounded-lg font-display text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                        canAfford
                          ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                          : 'bg-white/5 text-zinc-500 border border-white/8 cursor-not-allowed'
                      }`}
                    >
                      <PackageOpen className="w-4 h-4" />
                      <span>
                        {canAfford
                          ? `Abrir Caixa · ${c.price} Cr`
                          : `Faltam ${c.price - profile.credits} Cr`}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'hit-fx' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {HIT_EFFECTS.map((fx) => {
                const owned = profile.unlockedHitFx.includes(fx.id);
                const equipped = profile.equippedHitFx === fx.id;
                const canAfford = profile.credits >= fx.price;
                return (
                  <div
                    key={fx.id}
                    className={`rounded-xl border p-4 flex flex-col justify-between ${
                      equipped
                        ? 'bg-[#141c29] border-amber-500/70'
                        : 'bg-[#121824] border-white/12'
                    }`}
                  >
                    <div>
                      <div
                        className="h-20 rounded-lg border border-white/10 flex items-center justify-center relative overflow-hidden"
                        style={{
                          background: `radial-gradient(circle at center, ${fx.colorHex}33, #090c12)`,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-full"
                            style={{
                              backgroundColor: fx.colorHex,
                              boxShadow: `0 0 16px ${fx.colorHex}`,
                            }}
                          />
                          <Zap className="w-6 h-6" style={{ color: fx.secondaryHex }} />
                        </div>
                      </div>
                      <h2 className="font-display text-base font-bold text-white mt-3">
                        {fx.name}
                      </h2>
                      <p className="text-xs text-zinc-400 mt-1">{fx.description}</p>
                    </div>

                    <div className="mt-4">
                      {owned ? (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playEquip();
                            onEquipHitFx(fx.id);
                          }}
                          className={`w-full min-h-[42px] rounded-lg font-display text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                            equipped
                              ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                          }`}
                        >
                          {equipped && <Check className="w-3.5 h-3.5" />}
                          <span>{equipped ? 'Equipado' : 'Equipar Efeito'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => {
                            soundEngine.playCaseUnlock(true);
                            onBuyHitFx(fx.id, fx.price);
                          }}
                          className={`w-full min-h-[42px] rounded-lg font-display text-xs font-bold cursor-pointer ${
                            canAfford
                              ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                              : 'bg-white/5 text-zinc-500 border border-white/8 cursor-not-allowed'
                          }`}
                        >
                          {canAfford ? `Comprar · ${fx.price} Cr` : `${fx.price} Cr (Insuficiente)`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'kill-fx' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {KILL_EFFECTS.map((fx) => {
                const owned = profile.unlockedKillFx.includes(fx.id);
                const equipped = profile.equippedKillFx === fx.id;
                const canAfford = profile.credits >= fx.price;
                return (
                  <div
                    key={fx.id}
                    className={`rounded-xl border p-4 flex flex-col justify-between ${
                      equipped
                        ? 'bg-[#141c29] border-amber-500/70'
                        : 'bg-[#121824] border-white/12'
                    }`}
                  >
                    <div>
                      <div
                        className="h-20 rounded-lg border border-white/10 flex items-center justify-center relative overflow-hidden"
                        style={{
                          background: `linear-gradient(180deg, ${fx.colorHex}28, #090c12)`,
                        }}
                      >
                        <Flame className="w-7 h-7" style={{ color: fx.colorHex }} />
                      </div>
                      <h2 className="font-display text-base font-bold text-white mt-3">
                        {fx.name}
                      </h2>
                      <p className="text-xs text-zinc-400 mt-1">{fx.description}</p>
                    </div>

                    <div className="mt-4">
                      {owned ? (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playEquip();
                            onEquipKillFx(fx.id);
                          }}
                          className={`w-full min-h-[42px] rounded-lg font-display text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                            equipped
                              ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                          }`}
                        >
                          {equipped && <Check className="w-3.5 h-3.5" />}
                          <span>{equipped ? 'Equipado' : 'Equipar Efeito'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => {
                            soundEngine.playCaseUnlock(true);
                            onBuyKillFx(fx.id, fx.price);
                          }}
                          className={`w-full min-h-[42px] rounded-lg font-display text-xs font-bold cursor-pointer ${
                            canAfford
                              ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                              : 'bg-white/5 text-zinc-500 border border-white/8 cursor-not-allowed'
                          }`}
                        >
                          {canAfford ? `Comprar · ${fx.price} Cr` : `${fx.price} Cr (Insuficiente)`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'skins' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {WEAPON_SKINS.map((sk) => {
                const owned = profile.unlockedSkins.includes(sk.id);
                const equipped = profile.equippedSkin === sk.id;
                const canAfford = profile.credits >= sk.directPrice;
                return (
                  <div
                    key={sk.id}
                    className={`rounded-xl border p-4 flex flex-col justify-between ${
                      equipped
                        ? 'bg-[#141c29] border-amber-500/70'
                        : 'bg-[#121824] border-white/12'
                    }`}
                  >
                    <div>
                      <div
                        className="h-22 rounded-lg border border-white/10 flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${sk.primaryHex}, ${sk.secondaryHex})`,
                        }}
                      >
                        <div
                          className="w-24 h-4 rounded-sm rotate-[-8deg] border border-white/30 shadow-lg"
                          style={{ backgroundColor: sk.accentHex }}
                        />
                      </div>
                      <div
                        className="text-[10px] font-bold uppercase tracking-wider mt-3"
                        style={{ color: sk.rarityColor }}
                      >
                        {sk.rarity}
                      </div>
                      <h2 className="font-display text-base font-bold text-white">
                        {sk.name}
                      </h2>
                    </div>

                    <div className="mt-4">
                      {owned ? (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playEquip();
                            onEquipSkin(sk.id);
                          }}
                          className={`w-full min-h-[42px] rounded-lg font-display text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                            equipped
                              ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                          }`}
                        >
                          {equipped && <Check className="w-3.5 h-3.5" />}
                          <span>{equipped ? 'Equipada' : 'Equipar Skin'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => {
                            soundEngine.playCaseUnlock(true);
                            onBuySkin(sk.id, sk.directPrice);
                          }}
                          className={`w-full min-h-[42px] rounded-lg font-display text-xs font-bold cursor-pointer ${
                            canAfford
                              ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                              : 'bg-white/5 text-zinc-500 border border-white/8 cursor-not-allowed'
                          }`}
                        >
                          {canAfford
                            ? `Comprar Direto · ${sk.directPrice} Cr`
                            : `${sk.directPrice} Cr (Insuficiente)`}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
