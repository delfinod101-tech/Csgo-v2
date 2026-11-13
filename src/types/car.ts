export type AppMode = 'studio' | 'drive';

export type CameraPresetId = 'hero' | 'side' | 'front' | 'rear' | 'top';

export type LightingPresetId = 'obsidian' | 'pavilion' | 'horizon';

export type WheelFinishId = 'forged-black' | 'brushed-alloy' | 'satin-bronze';

export interface PaintFinish {
  id: string;
  name: string;
  hex: string;
  metalness: number;
  roughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
}

export interface CaliperFinish {
  id: string;
  name: string;
  hex: string;
}

export interface WheelFinish {
  id: WheelFinishId;
  name: string;
  hex: string;
  metalness: number;
  roughness: number;
}

export interface InspectedPart {
  id: string;
  title: string;
  category: string;
  spec: string;
  description: string;
}

export interface DriveTelemetry {
  speedKmh: number;
  gear: 'P' | 'D' | 'R';
  steeringDeg: number;
  throttle: number;
  braking: boolean;
}

export interface CarConfig {
  paintId: string;
  wheelFinishId: WheelFinishId;
  caliperId: string;
  lightingId: LightingPresetId;
  cameraPreset: CameraPresetId;
  exploded: number; // 0..1
  headlightsOn: boolean;
  spoilerDeployed: boolean;
  turntableSpin: boolean;
  audioEnabled: boolean;
}

export const PAINT_FINISHES: PaintFinish[] = [
  {
    id: 'rosso-corsa',
    name: 'Rosso Corsa',
    hex: '#b91c1c',
    metalness: 0.62,
    roughness: 0.22,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  },
  {
    id: 'obsidian-graphite',
    name: 'Obsidian Graphite',
    hex: '#1c2026',
    metalness: 0.82,
    roughness: 0.24,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
  },
  {
    id: 'bianco-ghiaccio',
    name: 'Bianco Ghiaccio',
    hex: '#e7e9ec',
    metalness: 0.25,
    roughness: 0.18,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  },
  {
    id: 'verde-monza',
    name: 'Verde Monza',
    hex: '#144534',
    metalness: 0.72,
    roughness: 0.22,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  },
  {
    id: 'blu-mediterraneo',
    name: 'Blu Mediterraneo',
    hex: '#133a6b',
    metalness: 0.78,
    roughness: 0.20,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
  },
  {
    id: 'champagne-satin',
    name: 'Champagne Satin',
    hex: '#8f7d64',
    metalness: 0.68,
    roughness: 0.44,
    clearcoat: 0.28,
    clearcoatRoughness: 0.34,
  },
];

export const WHEEL_FINISHES: WheelFinish[] = [
  {
    id: 'forged-black',
    name: 'Forged Satin Black',
    hex: '#1a1d22',
    metalness: 0.85,
    roughness: 0.32,
  },
  {
    id: 'brushed-alloy',
    name: 'Brushed Titanium',
    hex: '#b8bec7',
    metalness: 0.94,
    roughness: 0.18,
  },
  {
    id: 'satin-bronze',
    name: 'Satin Bronze',
    hex: '#8c6d46',
    metalness: 0.90,
    roughness: 0.26,
  },
];

export const CALIPER_FINISHES: CaliperFinish[] = [
  { id: 'amber', name: 'Solar Amber', hex: '#f59e0b' },
  { id: 'crimson', name: 'Racing Red', hex: '#dc2626' },
  { id: 'silver', name: 'Anodized Silver', hex: '#cbd5e1' },
  { id: 'lime', name: 'Acid Lime', hex: '#84cc16' },
];

export const CAMERA_PRESETS: { id: CameraPresetId; label: string }[] = [
  { id: 'hero', label: 'Hero 3/4' },
  { id: 'side', label: 'Profile' },
  { id: 'front', label: 'Front Aero' },
  { id: 'rear', label: 'Rear Lightbar' },
  { id: 'top', label: 'Overhead' },
];

export const LIGHTING_PRESETS: { id: LightingPresetId; label: string }[] = [
  { id: 'obsidian', label: 'Dark Studio' },
  { id: 'pavilion', label: 'Daylight Pavilion' },
  { id: 'horizon', label: 'Golden Dusk' },
];

export const CAR_SPECS = {
  model: 'Carro GT-01 Stradale',
  powertrain: 'Dual-Motor AWD · 680 kW (912 hp)',
  acceleration: '0–100 km/h in 2.3 s',
  topSpeed: '335 km/h',
  weight: '1,580 kg Carbon Monocoque',
  drag: 'Cd 0.21 Active Aero',
};
