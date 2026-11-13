import React, { useState } from 'react';
import {
  Check,
  Copy,
  Edit3,
  LogOut,
  ShieldCheck,
  Smartphone,
  UserCheck,
  X,
} from 'lucide-react';
import {
  BannerId,
  PROFILE_BANNERS,
  PlayerProfile,
} from '@/src/types/game';
import { soundEngine } from '@/src/game/sound';

interface ProfileModalProps {
  profile: PlayerProfile;
  authBusy: boolean;
  authNotice: string | null;
  onUpdateName: (name: string) => void;
  onSelectBanner: (bannerId: BannerId) => void;
  onLinkGoogle: () => void;
  onLinkApple: () => void;
  onUseGuest: () => void;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  profile,
  authBusy,
  authNotice,
  onUpdateName,
  onSelectBanner,
  onLinkGoogle,
  onLinkApple,
  onUseGuest,
  onClose,
}) => {
  const [nameInput, setNameInput] = useState(profile.displayName);
  const [copiedId, setCopiedId] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  const activeBanner =
    PROFILE_BANNERS.find((b) => b.id === profile.bannerId) ?? PROFILE_BANNERS[0];

  const kdRatio =
    profile.deaths > 0
      ? (profile.kills / profile.deaths).toFixed(2)
      : profile.kills.toFixed(2);

  const handleCopyId = () => {
    soundEngine.playUiClick();
    void navigator.clipboard?.writeText(profile.shortId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1600);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nameInput.trim().slice(0, 16);
    if (trimmed.length < 2) return;
    soundEngine.playEquip();
    onUpdateName(trimmed);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 1500);
  };

  const providerLabel =
    profile.authProvider === 'google'
      ? 'Conta Google Vinculada'
      : profile.authProvider === 'apple'
        ? 'Conta Apple / iOS Vinculada'
        : 'Modo Convidado';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[88dvh] rounded-2xl bg-[#0e131b] border border-white/15 shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Compact Header */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-400" />
            <h2 className="font-display text-base font-bold text-white">
              Perfil do Operador
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar perfil"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Player Banner Card */}
          <div
            className="rounded-xl border border-white/15 p-3.5 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${activeBanner.gradientFrom}, ${activeBanner.gradientTo})`,
            }}
          >
            <div
              className="absolute inset-y-0 left-0 w-1.5"
              style={{ backgroundColor: activeBanner.accentHex }}
            />
            <div className="pl-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/75">
                  {activeBanner.name}
                </span>
                <h3 className="font-display text-lg font-bold text-white truncate">
                  {profile.displayName}
                </h3>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/45 border border-white/20 font-mono-tabular text-[11px] font-bold text-amber-300 cursor-pointer hover:border-amber-400"
                  >
                    <span>ID: {profile.shortId}</span>
                    {copiedId ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-black/40 text-zinc-200">
                    {providerLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Compact Stats Row */}
            <div className="mt-3 pt-2.5 pl-2 border-t border-white/15 grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-[10px] text-white/65">Abates</div>
                <div className="font-mono-tabular text-xs font-bold text-white">
                  {profile.kills}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/65">K/D</div>
                <div className="font-mono-tabular text-xs font-bold text-emerald-300">
                  {kdRatio}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/65">Vitórias</div>
                <div className="font-mono-tabular text-xs font-bold text-amber-300">
                  {profile.wins}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-white/65">Pontos</div>
                <div className="font-mono-tabular text-xs font-bold text-sky-300">
                  {profile.score}
                </div>
              </div>
            </div>
          </div>

          {/* Change Name */}
          <form onSubmit={handleSaveName} className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Alterar Nome de Jogador</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                minLength={2}
                maxLength={16}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Seu nick (2 a 16 letras)"
                className="flex-1 min-h-[38px] px-3 rounded-lg bg-black/45 border border-white/12 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="min-h-[38px] px-3.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-display text-xs font-bold cursor-pointer shrink-0"
              >
                {nameSaved ? 'Salvo!' : 'Salvar'}
              </button>
            </div>
          </form>

          {/* Select Banner */}
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-zinc-300">
              Banner de Perfil
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PROFILE_BANNERS.map((b) => {
                const active = b.id === profile.bannerId;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      onSelectBanner(b.id);
                    }}
                    style={{
                      background: `linear-gradient(135deg, ${b.gradientFrom}, ${b.gradientTo})`,
                    }}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      active
                        ? 'border-amber-400 ring-1 ring-amber-400'
                        : 'border-white/12 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div
                      className="w-6 h-1 rounded-full mb-1"
                      style={{ backgroundColor: b.accentHex }}
                    />
                    <div className="font-display text-[11px] font-bold text-white truncate">
                      {b.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Linking (Guest / Google / Apple iOS) */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <div className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Conta & Vinculação</span>
            </div>

            {authNotice && (
              <div className="px-3 py-2 rounded-lg bg-amber-500/12 border border-amber-500/35 text-[11px] text-amber-200">
                {authNotice}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                disabled={authBusy || profile.authProvider === 'google'}
                onClick={onLinkGoogle}
                className={`min-h-[40px] px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer ${
                  profile.authProvider === 'google'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                    : 'bg-white text-zinc-950 hover:bg-zinc-200 border-white disabled:opacity-50'
                }`}
              >
                <span>
                  {profile.authProvider === 'google'
                    ? 'Google Conectado'
                    : 'Entrar / Vincular Google'}
                </span>
              </button>

              <button
                type="button"
                disabled={authBusy || profile.authProvider === 'apple'}
                onClick={onLinkApple}
                className={`min-h-[40px] px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                  profile.authProvider === 'apple'
                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                    : 'bg-zinc-900 hover:bg-zinc-800 border-white/25 text-white disabled:opacity-50'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>
                  {profile.authProvider === 'apple'
                    ? 'Apple iOS Conectada'
                    : 'Vincular Conta Apple (iOS)'}
                </span>
              </button>
            </div>

            {profile.authProvider !== 'guest' && (
              <button
                type="button"
                disabled={authBusy}
                onClick={onUseGuest}
                className="w-full min-h-[36px] px-3 rounded-lg border border-white/10 text-[11px] font-medium text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair e jogar como Convidado</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
