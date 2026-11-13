import React, { useState } from 'react';
import {
  Coins,
  Eye,
  Flame,
  Lock,
  Play,
  Shield,
  SlidersHorizontal,
  Smartphone,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import {
  GameModeId,
  HIT_EFFECTS,
  HitEffectId,
  KILL_EFFECTS,
  KillEffectId,
  MAP_LIST,
  MapId,
  PlayerProfile,
  ScreenView,
  SkinId,
  TeamSide,
  WEAPON_SKINS,
  WEAPON_SPECS,
  WeaponId,
} from '@/src/types/game';
import { soundEngine } from '@/src/game/sound';

type InventoryTab = 'skins' | 'hit-fx' | 'kill-fx';

interface LobbyScreenProps {
  view: Extract<ScreenView, 'lobby' | 'inventory' | 'store'>;
  team: TeamSide;
  mapId: MapId;
  gameMode: GameModeId;
  weaponId: WeaponId;
  profile: PlayerProfile;
  muted: boolean;
  onChangeView: (v: Extract<ScreenView, 'lobby' | 'inventory' | 'store'>) => void;
  onChangeTeam: (t: TeamSide) => void;
  onChangeMap: (m: MapId) => void;
  onChangeGameMode: (gm: GameModeId) => void;
  onChangeWeapon: (w: WeaponId) => void;
  onEquipSkin: (s: SkinId) => void;
  onEquipHitFx: (id: HitEffectId) => void;
  onEquipKillFx: (id: KillEffectId) => void;
  onTriggerInspect: () => void;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onOpenHudEditor: () => void;
  onStartMatch: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  view,
  team,
  mapId,
  gameMode,
  weaponId,
  profile,
  muted,
  onChangeView,
  onChangeTeam,
  onChangeMap,
  onChangeGameMode,
  onChangeWeapon,
  onEquipSkin,
  onEquipHitFx,
  onEquipKillFx,
  onTriggerInspect,
  onToggleMute,
  onOpenSettings,
  onOpenHudEditor,
  onStartMatch,
}) => {
  const [controlsModalOpen, setControlsModalOpen] = useState(false);
  const [invTab, setInvTab] = useState<InventoryTab>('skins');

  const selectedWeapon = WEAPON_SPECS[weaponId];
  const selectedSkin =
    WEAPON_SKINS.find((s) => s.id === profile.equippedSkin) ?? WEAPON_SKINS[0];
  const equippedHitFx =
    HIT_EFFECTS.find((h) => h.id === profile.equippedHitFx) ?? HIT_EFFECTS[0];
  const equippedKillFx =
    KILL_EFFECTS.find((k) => k.id === profile.equippedKillFx) ?? KILL_EFFECTS[0];
  const weaponIds: WeaponId[] = ['ak47', 'm4a1s', 'awp', 'deagle', 'knife'];

  return (
    <>
      {/* Top Bar — 3-Zone Contract, solid surface (no backdrop-blur over WebGL) */}
      <header className="fixed top-0 inset-x-0 z-20 safe-top bg-[#0b0e14]/94 border-b border-white/10">
        <div className="flex items-center justify-between gap-3 sm:gap-6 px-3 sm:px-6 py-2.5">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onChangeView('lobby');
            }}
            className="font-display text-base sm:text-xl font-bold tracking-wider text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            STRIKE 2
          </button>

          {/* Zone 2: Single-Line Nav Links */}
          <nav className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm font-medium overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onChangeView('lobby');
              }}
              className={`relative py-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                view === 'lobby' ? 'text-white font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Lobby
              {view === 'lobby' && (
                <span className="absolute left-0 right-0 -bottom-0.5 h-[2px] bg-amber-500 rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onChangeView('inventory');
              }}
              className={`relative py-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                view === 'inventory' ? 'text-white font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Inventário
              {view === 'inventory' && (
                <span className="absolute left-0 right-0 -bottom-0.5 h-[2px] bg-amber-500 rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onChangeView('store');
              }}
              className={`relative py-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                view === 'store' ? 'text-white font-semibold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Loja
              {view === 'store' && (
                <span className="absolute left-0 right-0 -bottom-0.5 h-[2px] bg-amber-500 rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setControlsModalOpen(true);
              }}
              className="py-1.5 text-zinc-400 hover:text-white whitespace-nowrap shrink-0 cursor-pointer transition-colors hidden md:inline-block"
            >
              Controles
            </button>
          </nav>

          {/* Zone 3: Credits + Settings + Primary Play Action */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onChangeView('store');
              }}
              title="Créditos disponíveis (clique para abrir a Loja)"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/40 border border-amber-500/25 text-xs font-mono-tabular font-bold text-amber-300 cursor-pointer hover:border-amber-400"
            >
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>{profile.credits}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onOpenSettings();
              }}
              aria-label="Configurações"
              title="Configurações de sensibilidade, gráficos e mira"
              className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-white/12 bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playEquip();
                onStartMatch();
              }}
              className="inline-flex items-center gap-2 px-3.5 sm:px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display text-xs sm:text-sm font-bold tracking-wide whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
              <span>JOGAR</span>
            </button>
          </div>
        </div>
      </header>

      {/* Quiet Left-Top Operative / Weapon Context Header */}
      {view !== 'store' && (
        <div className="fixed top-20 left-4 sm:left-6 z-10 pointer-events-none">
          {view === 'lobby' ? (
            <div>
              <div className="text-xs font-medium text-amber-400">
                {team === 'ct' ? 'Contraterroristas' : 'Terroristas'}
                <span aria-hidden="true" className="mx-1.5">·</span>
                <span className="text-zinc-400">
                  {MAP_LIST.find((m) => m.id === mapId)?.name}
                </span>
              </div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-wide mt-0.5">
                {selectedWeapon.name} · {selectedSkin.name}
              </h1>
              <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>Acerto: {equippedHitFx.name}</span>
                <span>·</span>
                <span>Kill: {equippedKillFx.name}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1 hidden sm:block">
                Arraste o operador para girar 360°
              </p>
            </div>
          ) : (
            <div>
              <div className="text-xs font-medium text-amber-400">
                {selectedWeapon.category}
                <span aria-hidden="true" className="mx-1.5">·</span>
                <span style={{ color: selectedSkin.rarityColor }}>{selectedSkin.rarity}</span>
              </div>
              <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-wide mt-0.5">
                {selectedWeapon.name} | {selectedSkin.name}
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Dano {selectedWeapon.damage} · Carregador {selectedWeapon.magSize} ·{' '}
                {profile.credits} Cr
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bottom Configuration Dock (Lobby Match Setup OR Inventory Loadout Studio) */}
      {view !== 'store' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 w-[min(940px,95vw)] safe-bottom">
          <div className="rounded-xl bg-[#0e1219]/94 border border-white/12 p-3.5 sm:p-4 shadow-2xl">
            {view === 'lobby' ? (
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Team Selector */}
                <div className="flex items-center justify-between sm:justify-start gap-2">
                  <span className="text-xs text-zinc-400 mr-1">Equipe</span>
                  <div className="flex items-center gap-1 bg-black/35 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        onChangeTeam('ct');
                      }}
                      className={`min-h-[40px] px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                        team === 'ct'
                          ? 'bg-sky-600 text-white'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      CT Force
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        onChangeTeam('t');
                      }}
                      className={`min-h-[40px] px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                        team === 't'
                          ? 'bg-amber-600 text-white'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Terroristas
                    </button>
                  </div>
                </div>

                {/* Map, Mode & Mobile Utilities */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 bg-black/35 p-1 rounded-lg">
                    {MAP_LIST.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          onChangeMap(m.id);
                        }}
                        className={`min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                          mapId === m.id
                            ? 'bg-zinc-800 text-white border border-amber-500/60'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 bg-black/35 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        onChangeGameMode('deathmatch');
                      }}
                      className={`min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                        gameMode === 'deathmatch'
                          ? 'bg-zinc-800 text-amber-400'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Mata-Mata
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        onChangeGameMode('tactical');
                      }}
                      className={`min-h-[40px] px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                        gameMode === 'tactical'
                          ? 'bg-zinc-800 text-amber-400'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Duelo Tático
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      onOpenHudEditor();
                    }}
                    className="min-h-[40px] px-3 flex items-center gap-1.5 rounded-lg border border-white/12 bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-200 cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                    <span>HUD Mobile</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleMute}
                    aria-label={muted ? 'Ativar áudio' : 'Silenciar áudio'}
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg border border-white/10 text-zinc-300 hover:text-white cursor-pointer"
                  >
                    {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Weapon Selector + Inspect Row */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                    {weaponIds.map((id) => {
                      const spec = WEAPON_SPECS[id];
                      const active = weaponId === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            soundEngine.playEquip();
                            onChangeWeapon(id);
                          }}
                          className={`min-h-[40px] px-3.5 py-1.5 text-xs font-semibold rounded-lg border whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                            active
                              ? 'bg-amber-500 border-amber-400 text-zinc-950'
                              : 'bg-black/30 border-white/10 text-zinc-300 hover:text-white'
                          }`}
                        >
                          {spec.name}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playEquip();
                      onTriggerInspect();
                    }}
                    className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-white/15 bg-zinc-800 text-white hover:bg-zinc-700 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Inspecionar</span>
                  </button>
                </div>

                {/* Inventory Category Toggle + Items */}
                <div className="pt-2 border-t border-white/8 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setInvTab('skins')}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                          invTab === 'skins'
                            ? 'bg-zinc-800 text-amber-400'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        Skins de Armas
                      </button>
                      <button
                        type="button"
                        onClick={() => setInvTab('hit-fx')}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ${
                          invTab === 'hit-fx'
                            ? 'bg-zinc-800 text-amber-400'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Zap className="w-3 h-3" />
                        <span>Efeito de Acerto</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setInvTab('kill-fx')}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ${
                          invTab === 'kill-fx'
                            ? 'bg-zinc-800 text-amber-400'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Flame className="w-3 h-3" />
                        <span>Efeito de Kill</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        onChangeView('store');
                      }}
                      className="text-xs font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
                    >
                      Abrir Caixas / Comprar na Loja →
                    </button>
                  </div>

                  {invTab === 'skins' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {WEAPON_SKINS.map((sk) => {
                        const owned = profile.unlockedSkins.includes(sk.id);
                        const active = sk.id === profile.equippedSkin;
                        return (
                          <button
                            key={sk.id}
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick();
                              if (owned) {
                                onEquipSkin(sk.id);
                              } else {
                                onChangeView('store');
                              }
                            }}
                            className={`inline-flex items-center gap-2 min-h-[36px] px-3 py-1 text-xs font-medium rounded-lg border whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                              active
                                ? 'bg-zinc-800 border-amber-500 text-white'
                                : owned
                                  ? 'bg-black/25 border-white/10 text-zinc-300 hover:text-white'
                                  : 'bg-black/20 border-white/5 text-zinc-500 hover:border-amber-500/40'
                            }`}
                          >
                            <span
                              className="w-3 h-3 rounded-full border border-white/25 shrink-0"
                              style={{ backgroundColor: sk.accentHex }}
                            />
                            <span>{sk.name}</span>
                            {!owned && <Lock className="w-3 h-3 text-zinc-500" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {invTab === 'hit-fx' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {HIT_EFFECTS.map((fx) => {
                        const owned = profile.unlockedHitFx.includes(fx.id);
                        const active = fx.id === profile.equippedHitFx;
                        return (
                          <button
                            key={fx.id}
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick();
                              if (owned) {
                                onEquipHitFx(fx.id);
                              } else {
                                onChangeView('store');
                              }
                            }}
                            className={`inline-flex items-center gap-2 min-h-[36px] px-3 py-1 text-xs font-medium rounded-lg border whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                              active
                                ? 'bg-zinc-800 border-amber-500 text-white'
                                : owned
                                  ? 'bg-black/25 border-white/10 text-zinc-300 hover:text-white'
                                  : 'bg-black/20 border-white/5 text-zinc-500 hover:border-amber-500/40'
                            }`}
                          >
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: fx.colorHex }}
                            />
                            <span>{fx.name}</span>
                            {!owned && <Lock className="w-3 h-3 text-zinc-500" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {invTab === 'kill-fx' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {KILL_EFFECTS.map((fx) => {
                        const owned = profile.unlockedKillFx.includes(fx.id);
                        const active = fx.id === profile.equippedKillFx;
                        return (
                          <button
                            key={fx.id}
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick();
                              if (owned) {
                                onEquipKillFx(fx.id);
                              } else {
                                onChangeView('store');
                              }
                            }}
                            className={`inline-flex items-center gap-2 min-h-[36px] px-3 py-1 text-xs font-medium rounded-lg border whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                              active
                                ? 'bg-zinc-800 border-amber-500 text-white'
                                : owned
                                  ? 'bg-black/25 border-white/10 text-zinc-300 hover:text-white'
                                  : 'bg-black/20 border-white/5 text-zinc-500 hover:border-amber-500/40'
                            }`}
                          >
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: fx.colorHex }}
                            />
                            <span>{fx.name}</span>
                            {!owned && <Lock className="w-3 h-3 text-zinc-500" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Controls Guide Modal (iOS / Android & PC) */}
      {controlsModalOpen && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setControlsModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-[#10141c] border border-white/12 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-amber-400" aria-hidden="true" />
                <h2 className="font-display text-lg font-bold text-white">
                  Controles — iOS, Android & PC
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setControlsModalOpen(false)}
                aria-label="Fechar controles"
                className="p-2 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div>
                <h3 className="font-display text-xs font-bold text-amber-400 uppercase tracking-wider">
                  iOS & Android (Touch Personalizável)
                </h3>
                <ul className="mt-2 space-y-1.5 text-xs text-zinc-300">
                  <li>Analógico esquerdo: movimentar o operador</li>
                  <li>Arrastar lado direito da tela: mirar câmera 360°</li>
                  <li>Botão ATIRAR: dispara e permite arrastar o dedo para rastrear alvos</li>
                  <li>Botão HUD Mobile: arraste e redimensione cada botão como preferir</li>
                </ul>
              </div>

              <div className="pt-3 border-t border-white/8">
                <h3 className="font-display text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                  PC (Mouse & Teclado)
                </h3>
                <ul className="mt-2 space-y-1.5 text-xs text-zinc-300">
                  <li>WASD: mover · Espaço: pular · C / Ctrl: agachar</li>
                  <li>Clique esquerdo: atirar · Clique direito: mirar / scope AWP</li>
                  <li>R: recarregar · F: inspecionar arma · B: loja · 1 / 2 / 3: trocar arma</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
