export type TeamSide = 'ct' | 't';

export type MapId = 'mirage' | 'nuke';

export type GameModeId = 'deathmatch' | 'tactical';

export type WeaponId = 'ak47' | 'm4a1s' | 'awp' | 'deagle' | 'knife';

export type SkinId = 'default' | 'asiimov' | 'hyper' | 'gold' | 'carbon';

export type HitEffectId = 'none' | 'gold-spark' | 'cyan-pulse' | 'crimson-burst' | 'prism-shard';

export type KillEffectId = 'none' | 'gold-pillar' | 'cyan-vortex' | 'infernal-flame' | 'plasma-nova';

export type ScreenView = 'lobby' | 'inventory' | 'store' | 'playing';

export type GraphicsPreset = 'light' | 'balanced' | 'high';

export type CrosshairColor = '#34d399' | '#38bdf8' | '#facc15' | '#ffffff' | '#ef4444';

export type HudElementId =
  | 'joystick'
  | 'fire'
  | 'aim'
  | 'reload'
  | 'jump'
  | 'crouch'
  | 'inspect';

export interface HudControlPlacement {
  xPct: number; // 0..100 viewport width
  yPct: number; // 0..100 viewport height
  scale: number; // 0.7..1.45
}

export interface HudLayout {
  opacity: number; // 0.4..1.0
  controls: Record<HudElementId, HudControlPlacement>;
}

export interface GameSettings {
  touchSensitivity: number; // 0.3..2.5
  mouseSensitivity: number; // 0.3..2.5
  adsSensitivityMult: number; // 0.25..1.5
  invertY: boolean;
  graphicsPreset: GraphicsPreset;
  resolutionScale: number; // 0.65 | 0.85 | 1.0
  shadowsEnabled: boolean;
  particlesEnabled: boolean;
  showFps: boolean;
  crosshairColor: CrosshairColor;
  crosshairSize: number; // 6..14
  masterVolume: number; // 0..1
  muted: boolean;
}

export interface PlayerProfile {
  credits: number;
  unlockedSkins: SkinId[];
  unlockedHitFx: HitEffectId[];
  unlockedKillFx: KillEffectId[];
  equippedSkin: SkinId;
  equippedHitFx: HitEffectId;
  equippedKillFx: KillEffectId;
  casesOpened: number;
}

export interface HitEffectSpec {
  id: HitEffectId;
  name: string;
  description: string;
  price: number;
  colorHex: string;
  secondaryHex: string;
}

export interface KillEffectSpec {
  id: KillEffectId;
  name: string;
  description: string;
  price: number;
  colorHex: string;
  secondaryHex: string;
}

export interface CaseItemDrop {
  skinId: SkinId;
  weight: number;
  rarityLabel: string;
  rarityColor: string;
}

export interface CaseDefinition {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  accentHex: string;
  drops: CaseItemDrop[];
}

export interface WeaponSpec {
  id: WeaponId;
  name: string;
  slot: 1 | 2 | 3;
  category: 'Rifle' | 'Sniper' | 'Pistola' | 'Faca';
  damage: number;
  headshotMult: number;
  fireRateMs: number;
  magSize: number;
  reserveMax: number;
  reloadTimeMs: number;
  automatic: boolean;
  recoilKick: number;
  baseSpread: number;
  moveSpeedMult: number;
  cost: number;
  hasScope: boolean;
  suppressed?: boolean;
}

export interface WeaponSkin {
  id: SkinId;
  name: string;
  rarity: string;
  rarityColor: string;
  directPrice: number;
  accentHex: string;
  primaryHex: string;
  secondaryHex: string;
  metalness: number;
  roughness: number;
}

export interface KillFeedEntry {
  id: string;
  killer: string;
  killerTeam: TeamSide;
  victim: string;
  victimTeam: TeamSide;
  weaponId: WeaponId;
  headshot: boolean;
  timestamp: number;
}

export interface MatchHudState {
  hp: number;
  armor: number;
  money: number;
  fps: number;
  activeWeapon: WeaponId;
  slot1Weapon: WeaponId;
  ammo: Record<WeaponId, { mag: number; reserve: number }>;
  reloading: boolean;
  scoped: boolean;
  crouching: boolean;
  ctScore: number;
  tScore: number;
  roundNumber: number;
  roundTimeSec: number;
  kills: number;
  deaths: number;
  creditsEarnedMatch: number;
  hitmarkerKind: 'none' | 'body' | 'head';
  crosshairSpread: number;
  matchEnded: boolean;
  winnerTeam: TeamSide | null;
  killFeed: KillFeedEntry[];
  pointerLocked: boolean;
}

export const WEAPON_SPECS: Record<WeaponId, WeaponSpec> = {
  ak47: {
    id: 'ak47',
    name: 'AK-47',
    slot: 1,
    category: 'Rifle',
    damage: 36,
    headshotMult: 3.1,
    fireRateMs: 105,
    magSize: 30,
    reserveMax: 90,
    reloadTimeMs: 2100,
    automatic: true,
    recoilKick: 0.036,
    baseSpread: 0.008,
    moveSpeedMult: 0.92,
    cost: 2700,
    hasScope: false,
  },
  m4a1s: {
    id: 'm4a1s',
    name: 'M4A1-S',
    slot: 1,
    category: 'Rifle',
    damage: 33,
    headshotMult: 2.8,
    fireRateMs: 95,
    magSize: 25,
    reserveMax: 75,
    reloadTimeMs: 1950,
    automatic: true,
    recoilKick: 0.023,
    baseSpread: 0.0045,
    moveSpeedMult: 0.94,
    cost: 2900,
    hasScope: false,
    suppressed: true,
  },
  awp: {
    id: 'awp',
    name: 'AWP',
    slot: 1,
    category: 'Sniper',
    damage: 115,
    headshotMult: 4.0,
    fireRateMs: 1250,
    magSize: 5,
    reserveMax: 25,
    reloadTimeMs: 2600,
    automatic: false,
    recoilKick: 0.095,
    baseSpread: 0.001,
    moveSpeedMult: 0.84,
    cost: 4750,
    hasScope: true,
  },
  deagle: {
    id: 'deagle',
    name: 'Desert Eagle',
    slot: 2,
    category: 'Pistola',
    damage: 54,
    headshotMult: 2.8,
    fireRateMs: 280,
    magSize: 7,
    reserveMax: 35,
    reloadTimeMs: 1600,
    automatic: false,
    recoilKick: 0.058,
    baseSpread: 0.006,
    moveSpeedMult: 0.98,
    cost: 700,
    hasScope: false,
  },
  knife: {
    id: 'knife',
    name: 'Karambit',
    slot: 3,
    category: 'Faca',
    damage: 65,
    headshotMult: 1.5,
    fireRateMs: 420,
    magSize: 1,
    reserveMax: 0,
    reloadTimeMs: 0,
    automatic: false,
    recoilKick: 0.015,
    baseSpread: 0,
    moveSpeedMult: 1.12,
    cost: 0,
    hasScope: false,
  },
};

export const WEAPON_SKINS: WeaponSkin[] = [
  {
    id: 'default',
    name: 'Padrão Tático',
    rarity: 'Padrão',
    rarityColor: '#94a3b8',
    directPrice: 0,
    accentHex: '#94a3b8',
    primaryHex: '#252a33',
    secondaryHex: '#15181e',
    metalness: 0.72,
    roughness: 0.34,
  },
  {
    id: 'asiimov',
    name: 'Vetor Asiimov',
    rarity: 'Secreto',
    rarityColor: '#ef4444',
    directPrice: 750,
    accentHex: '#f97316',
    primaryHex: '#f1f5f9',
    secondaryHex: '#ea580c',
    metalness: 0.25,
    roughness: 0.22,
  },
  {
    id: 'hyper',
    name: 'Cobalto Elétrico',
    rarity: 'Confidencial',
    rarityColor: '#a855f7',
    directPrice: 550,
    accentHex: '#38bdf8',
    primaryHex: '#0f172a',
    secondaryHex: '#0284c7',
    metalness: 0.65,
    roughness: 0.20,
  },
  {
    id: 'carbon',
    name: 'Obsidiana Printstream',
    rarity: 'Secreto',
    rarityColor: '#ef4444',
    directPrice: 850,
    accentHex: '#e2e8f0',
    primaryHex: '#181b20',
    secondaryHex: '#e2e8f0',
    metalness: 0.85,
    roughness: 0.24,
  },
  {
    id: 'gold',
    name: 'Dragão Dourado',
    rarity: 'Contrabando',
    rarityColor: '#f59e0b',
    directPrice: 1400,
    accentHex: '#fbbf24',
    primaryHex: '#d97706',
    secondaryHex: '#18181b',
    metalness: 0.94,
    roughness: 0.18,
  },
];

export const HIT_EFFECTS: HitEffectSpec[] = [
  {
    id: 'none',
    name: 'Impacto Padrão',
    description: 'Confirmação limpa sem partículas extras.',
    price: 0,
    colorHex: '#e2e8f0',
    secondaryHex: '#94a3b8',
  },
  {
    id: 'gold-spark',
    name: 'Faísca Dourada',
    description: 'Explosão de centelhas metálicas douradas ao acertar.',
    price: 350,
    colorHex: '#fbbf24',
    secondaryHex: '#f59e0b',
  },
  {
    id: 'cyan-pulse',
    name: 'Pulso Ciano',
    description: 'Estilhaços de energia azul elétrica no ponto de impacto.',
    price: 450,
    colorHex: '#38bdf8',
    secondaryHex: '#0ea5e9',
  },
  {
    id: 'crimson-burst',
    name: 'Impacto Carmesim',
    description: 'Nuvem de faíscas rubi intensas em cada disparo certeiro.',
    price: 550,
    colorHex: '#ef4444',
    secondaryHex: '#f97316',
  },
  {
    id: 'prism-shard',
    name: 'Estilhaço Prisma',
    description: 'Cristais violeta e ciano com brilho de alta energia.',
    price: 750,
    colorHex: '#c084fc',
    secondaryHex: '#22d3ee',
  },
];

export const KILL_EFFECTS: KillEffectSpec[] = [
  {
    id: 'none',
    name: 'Eliminação Padrão',
    description: 'Animação tática de queda limpa.',
    price: 0,
    colorHex: '#94a3b8',
    secondaryHex: '#64748b',
  },
  {
    id: 'gold-pillar',
    name: 'Pilar Dourado',
    description: 'Feixe de luz vertical dourado com partículas ascendentes ao abater.',
    price: 600,
    colorHex: '#fbbf24',
    secondaryHex: '#fef08a',
  },
  {
    id: 'cyan-vortex',
    name: 'Vórtice Ciano',
    description: 'Anel de choque e espiral elétrica ciano sobre o alvo eliminado.',
    price: 750,
    colorHex: '#38bdf8',
    secondaryHex: '#a5f3fc',
  },
  {
    id: 'infernal-flame',
    name: 'Chama Infernal',
    description: 'Coluna de brasas e partículas rubi ao finalizar o inimigo.',
    price: 900,
    colorHex: '#f97316',
    secondaryHex: '#ef4444',
  },
  {
    id: 'plasma-nova',
    name: 'Supernova Plasma',
    description: 'Explosão de anel expansivo violeta-ciano de alto contraste.',
    price: 1200,
    colorHex: '#c084fc',
    secondaryHex: '#38bdf8',
  },
];

export const CASE_CATALOG: CaseDefinition[] = [
  {
    id: 'mirage-case',
    name: 'Caixa Operação Mirage',
    subtitle: 'Coleção tática clássica · Alta chance de Cobalto & Asiimov',
    price: 250,
    accentHex: '#38bdf8',
    drops: [
      { skinId: 'default', weight: 28, rarityLabel: 'Padrão', rarityColor: '#94a3b8' },
      { skinId: 'hyper', weight: 38, rarityLabel: 'Confidencial', rarityColor: '#a855f7' },
      { skinId: 'asiimov', weight: 22, rarityLabel: 'Secreto', rarityColor: '#ef4444' },
      { skinId: 'carbon', weight: 9, rarityLabel: 'Secreto', rarityColor: '#ef4444' },
      { skinId: 'gold', weight: 3, rarityLabel: 'Contrabando', rarityColor: '#f59e0b' },
    ],
  },
  {
    id: 'elite-case',
    name: 'Caixa Arsenal Elite',
    subtitle: 'Foco em acabamentos Secretos · Sem skins padrão',
    price: 450,
    accentHex: '#ef4444',
    drops: [
      { skinId: 'hyper', weight: 35, rarityLabel: 'Confidencial', rarityColor: '#a855f7' },
      { skinId: 'asiimov', weight: 30, rarityLabel: 'Secreto', rarityColor: '#ef4444' },
      { skinId: 'carbon', weight: 25, rarityLabel: 'Secreto', rarityColor: '#ef4444' },
      { skinId: 'gold', weight: 10, rarityLabel: 'Contrabando', rarityColor: '#f59e0b' },
    ],
  },
  {
    id: 'dragon-case',
    name: 'Caixa Contrabando Dourada',
    subtitle: 'Edição rara · Chance elevada de Dragão Dourado',
    price: 750,
    accentHex: '#f59e0b',
    drops: [
      { skinId: 'asiimov', weight: 28, rarityLabel: 'Secreto', rarityColor: '#ef4444' },
      { skinId: 'carbon', weight: 34, rarityLabel: 'Secreto', rarityColor: '#ef4444' },
      { skinId: 'gold', weight: 38, rarityLabel: 'Contrabando', rarityColor: '#f59e0b' },
    ],
  },
];

export const MAP_LIST: { id: MapId; name: string; subtitle: string }[] = [
  { id: 'mirage', name: 'Mirage Pátio', subtitle: 'Arenito clássico · Pátio central & arcos' },
  { id: 'nuke', name: 'Nuke Hangar', subtitle: 'Complexo industrial · Contêineres & passarelas' },
];
