import { GameSettings, HudLayout, PlayerProfile } from '@/src/types/game';

const PROFILE_KEY = 'strike2_profile_v1';
const SETTINGS_KEY = 'strike2_settings_v1';
const HUD_LAYOUT_KEY = 'strike2_hud_layout_v1';

export const DEFAULT_PROFILE: PlayerProfile = {
  credits: 1200,
  unlockedSkins: ['default', 'asiimov'],
  unlockedHitFx: ['none'],
  unlockedKillFx: ['none'],
  equippedSkin: 'asiimov',
  equippedHitFx: 'none',
  equippedKillFx: 'none',
  casesOpened: 0,
};

export const DEFAULT_SETTINGS: GameSettings = {
  touchSensitivity: 1.0,
  mouseSensitivity: 1.0,
  adsSensitivityMult: 0.55,
  invertY: false,
  graphicsPreset: 'balanced',
  resolutionScale: 0.85,
  shadowsEnabled: true,
  particlesEnabled: true,
  showFps: false,
  crosshairColor: '#34d399',
  crosshairSize: 9,
  masterVolume: 0.85,
  muted: false,
};

export const DEFAULT_HUD_LAYOUT: HudLayout = {
  opacity: 0.9,
  controls: {
    joystick: { xPct: 12, yPct: 75, scale: 1.0 },
    fire: { xPct: 89, yPct: 75, scale: 1.05 },
    aim: { xPct: 76, yPct: 79, scale: 1.0 },
    reload: { xPct: 74, yPct: 63, scale: 0.95 },
    jump: { xPct: 89, yPct: 55, scale: 0.95 },
    crouch: { xPct: 81, yPct: 58, scale: 0.95 },
    inspect: { xPct: 66, yPct: 68, scale: 0.9 },
  },
};

function safeParse<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

export function loadProfile(): PlayerProfile {
  return safeParse(PROFILE_KEY, DEFAULT_PROFILE);
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore storage quota errors
  }
}

export function loadSettings(): GameSettings {
  return safeParse(SETTINGS_KEY, DEFAULT_SETTINGS);
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function loadHudLayout(): HudLayout {
  try {
    const raw = localStorage.getItem(HUD_LAYOUT_KEY);
    if (!raw) return DEFAULT_HUD_LAYOUT;
    const parsed = JSON.parse(raw) as Partial<HudLayout>;
    return {
      opacity: parsed.opacity ?? DEFAULT_HUD_LAYOUT.opacity,
      controls: {
        ...DEFAULT_HUD_LAYOUT.controls,
        ...(parsed.controls ?? {}),
      },
    };
  } catch {
    return DEFAULT_HUD_LAYOUT;
  }
}

export function saveHudLayout(layout: HudLayout): void {
  try {
    localStorage.setItem(HUD_LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    // ignore
  }
}
