import { FriendRecord, GameSettings, HudLayout, PlayerProfile } from '@/src/types/game';

const PROFILE_KEY = 'strike2_profile_v2';
const SETTINGS_KEY = 'strike2_settings_v1';
const HUD_LAYOUT_KEY = 'strike2_hud_layout_v1';
const FRIENDS_KEY = 'strike2_friends_v1';

export function generateUniqueShortId(): string {
  const num = 100000 + Math.floor(Math.random() * 900000);
  return `STK-${num}`;
}

export function generateGuestUid(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `guest-${Date.now().toString(36)}-${rand}`;
}

export function createDefaultProfile(): PlayerProfile {
  const shortId = generateUniqueShortId();
  const suffix = shortId.slice(-4);
  return {
    uid: generateGuestUid(),
    shortId,
    displayName: `Operador${suffix}`,
    bannerId: 'mirage-gold',
    authProvider: 'guest',
    credits: 1200,
    unlockedSkins: ['default', 'asiimov'],
    unlockedHitFx: ['none'],
    unlockedKillFx: ['none'],
    equippedSkin: 'asiimov',
    equippedHitFx: 'none',
    equippedKillFx: 'none',
    casesOpened: 0,
    kills: 0,
    deaths: 0,
    wins: 0,
    matchesPlayed: 0,
    score: 0,
  };
}

export const DEFAULT_PROFILE: PlayerProfile = createDefaultProfile();

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
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
      const base = createDefaultProfile();
      return {
        ...base,
        ...parsed,
        shortId:
          parsed.shortId && /^STK-[0-9]{6}$/.test(parsed.shortId)
            ? parsed.shortId
            : base.shortId,
        uid: parsed.uid || base.uid,
      };
    }
    // Migrate v1 wallet if present
    const v1 = localStorage.getItem('strike2_profile_v1');
    const base = createDefaultProfile();
    if (v1) {
      const merged = { ...base, ...JSON.parse(v1) };
      saveProfile(merged);
      return merged;
    }
    saveProfile(base);
    return base;
  } catch {
    return createDefaultProfile();
  }
}

export function saveProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // ignore storage quota errors
  }
}

export function loadFriends(): FriendRecord[] {
  try {
    const raw = localStorage.getItem(FRIENDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFriends(friends: FriendRecord[]): void {
  try {
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends));
  } catch {
    // ignore
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
