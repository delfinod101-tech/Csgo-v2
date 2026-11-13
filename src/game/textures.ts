import * as THREE from 'three';
import { SkinId } from '@/src/types/game';

export interface GameTextures {
  sandGround: THREE.CanvasTexture;
  sandWall: THREE.CanvasTexture;
  woodCrate: THREE.CanvasTexture;
  steelContainer: THREE.CanvasTexture;
  concreteFloor: THREE.CanvasTexture;
  hazardTrim: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  skinMaps: Record<SkinId, THREE.CanvasTexture | null>;
  dispose: () => void;
}

function createSkinTexture(skinId: SkinId, anisotropy: number): THREE.CanvasTexture | null {
  if (skinId === 'default') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  if (skinId === 'asiimov') {
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, 256, 256);
    // Crisp geometric Asiimov angular stripes
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(0, 40);
    ctx.lineTo(180, 0);
    ctx.lineTo(230, 0);
    ctx.lineTo(0, 110);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.moveTo(40, 256);
    ctx.lineTo(256, 80);
    ctx.lineTo(256, 130);
    ctx.lineTo(95, 256);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f97316';
    ctx.fillRect(140, 180, 90, 24);
  } else if (skinId === 'hyper') {
    const grad = ctx.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#0369a1');
    grad.addColorStop(1, '#38bdf8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    // Tech circuit slashes
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.55)';
    ctx.lineWidth = 6;
    for (let i = -64; i < 320; i += 48) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 90, 256);
      ctx.stroke();
    }
  } else if (skinId === 'carbon') {
    ctx.fillStyle = '#181b20';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 16) {
      for (let x = 0; x < 256; x += 16) {
        ctx.fillStyle = ((x + y) / 16) % 2 === 0 ? '#232830' : '#13161b';
        ctx.fillRect(x, y, 15, 15);
      }
    }
    // Printstream pearlescent white accent band
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(0, 112, 256, 28);
  } else if (skinId === 'gold') {
    const grad = ctx.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, '#b45309');
    grad.addColorStop(0.45, '#fbbf24');
    grad.addColorStop(1, '#92400e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    // Engraved dragon-scale filigree arcs
    ctx.strokeStyle = 'rgba(24, 24, 27, 0.42)';
    ctx.lineWidth = 4;
    for (let y = 0; y < 280; y += 32) {
      for (let x = 0; x < 280; x += 32) {
        ctx.beginPath();
        ctx.arc(x + ((y / 32) % 2) * 16, y, 18, 0, Math.PI);
        ctx.stroke();
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createGameTextures(maxAnisotropy: number): GameTextures {
  const anisotropy = Math.min(Math.max(1, maxAnisotropy), 8);

  // 1. Desert Sandstone Ground
  const sgCanvas = document.createElement('canvas');
  sgCanvas.width = 512;
  sgCanvas.height = 512;
  const sg = sgCanvas.getContext('2d')!;
  sg.fillStyle = '#c5ad86';
  sg.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 12000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const shade = 165 + Math.floor(Math.random() * 45);
    sg.fillStyle = `rgb(${shade}, ${shade - 18}, ${shade - 48})`;
    sg.fillRect(x, y, 2, 2);
  }
  sg.strokeStyle = 'rgba(95, 76, 52, 0.22)';
  sg.lineWidth = 2;
  for (let i = 0; i <= 512; i += 128) {
    sg.beginPath();
    sg.moveTo(i, 0);
    sg.lineTo(i, 512);
    sg.moveTo(0, i);
    sg.lineTo(512, i);
    sg.stroke();
  }
  const sandGround = new THREE.CanvasTexture(sgCanvas);
  sandGround.wrapS = THREE.RepeatWrapping;
  sandGround.wrapT = THREE.RepeatWrapping;
  sandGround.repeat.set(14, 14);
  sandGround.colorSpace = THREE.SRGBColorSpace;
  sandGround.anisotropy = anisotropy;

  // 2. Sandstone Plaster & Brick Wall
  const swCanvas = document.createElement('canvas');
  swCanvas.width = 512;
  swCanvas.height = 512;
  const sw = swCanvas.getContext('2d')!;
  sw.fillStyle = '#d4be98';
  sw.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 16; row++) {
    const y = row * 32;
    const offset = (row % 2) * 32;
    for (let col = -1; col < 9; col++) {
      const x = col * 64 + offset;
      const v = 195 + Math.floor(Math.random() * 24);
      sw.fillStyle = `rgb(${v}, ${v - 20}, ${v - 52})`;
      sw.fillRect(x + 2, y + 2, 60, 28);
    }
  }
  const sandWall = new THREE.CanvasTexture(swCanvas);
  sandWall.wrapS = THREE.RepeatWrapping;
  sandWall.wrapT = THREE.RepeatWrapping;
  sandWall.repeat.set(3, 2);
  sandWall.colorSpace = THREE.SRGBColorSpace;
  sandWall.anisotropy = anisotropy;

  // 3. Tactical Wooden Shipping Crate
  const wcCanvas = document.createElement('canvas');
  wcCanvas.width = 256;
  wcCanvas.height = 256;
  const wc = wcCanvas.getContext('2d')!;
  wc.fillStyle = '#8b633c';
  wc.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 8; i++) {
    wc.fillStyle = i % 2 === 0 ? '#7d5632' : '#956c44';
    wc.fillRect(0, i * 32, 256, 30);
  }
  wc.strokeStyle = '#5c3c20';
  wc.lineWidth = 18;
  wc.strokeRect(9, 9, 238, 238);
  wc.beginPath();
  wc.moveTo(14, 14);
  wc.lineTo(242, 242);
  wc.stroke();
  const woodCrate = new THREE.CanvasTexture(wcCanvas);
  woodCrate.colorSpace = THREE.SRGBColorSpace;
  woodCrate.anisotropy = anisotropy;

  // 4. Corrugated Industrial Steel Container
  const scCanvas = document.createElement('canvas');
  scCanvas.width = 256;
  scCanvas.height = 256;
  const sc = scCanvas.getContext('2d')!;
  sc.fillStyle = '#2b4056';
  sc.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 16) {
    sc.fillStyle = '#223346';
    sc.fillRect(x, 0, 6, 256);
    sc.fillStyle = '#36506b';
    sc.fillRect(x + 6, 0, 4, 256);
  }
  sc.strokeStyle = '#182433';
  sc.lineWidth = 10;
  sc.strokeRect(5, 5, 246, 246);
  const steelContainer = new THREE.CanvasTexture(scCanvas);
  steelContainer.colorSpace = THREE.SRGBColorSpace;
  steelContainer.anisotropy = anisotropy;

  // 5. Industrial Concrete Floor
  const cfCanvas = document.createElement('canvas');
  cfCanvas.width = 512;
  cfCanvas.height = 512;
  const cf = cfCanvas.getContext('2d')!;
  cf.fillStyle = '#39404a';
  cf.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 12000; i++) {
    const v = 45 + Math.floor(Math.random() * 28);
    cf.fillStyle = `rgb(${v}, ${v + 4}, ${v + 9})`;
    cf.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  cf.strokeStyle = 'rgba(15, 23, 42, 0.35)';
  cf.lineWidth = 2;
  for (let i = 0; i <= 512; i += 128) {
    cf.beginPath();
    cf.moveTo(i, 0);
    cf.lineTo(i, 512);
    cf.moveTo(0, i);
    cf.lineTo(512, i);
    cf.stroke();
  }
  const concreteFloor = new THREE.CanvasTexture(cfCanvas);
  concreteFloor.wrapS = THREE.RepeatWrapping;
  concreteFloor.wrapT = THREE.RepeatWrapping;
  concreteFloor.repeat.set(12, 12);
  concreteFloor.colorSpace = THREE.SRGBColorSpace;
  concreteFloor.anisotropy = anisotropy;

  // 6. Hazard Yellow-Black Trim
  const hzCanvas = document.createElement('canvas');
  hzCanvas.width = 128;
  hzCanvas.height = 128;
  const hz = hzCanvas.getContext('2d')!;
  hz.fillStyle = '#eab308';
  hz.fillRect(0, 0, 128, 128);
  hz.fillStyle = '#18181b';
  for (let i = -128; i < 256; i += 32) {
    hz.beginPath();
    hz.moveTo(i, 0);
    hz.lineTo(i + 16, 0);
    hz.lineTo(i - 48, 128);
    hz.lineTo(i - 64, 128);
    hz.closePath();
    hz.fill();
  }
  const hazardTrim = new THREE.CanvasTexture(hzCanvas);
  hazardTrim.wrapS = THREE.RepeatWrapping;
  hazardTrim.wrapT = THREE.RepeatWrapping;
  hazardTrim.repeat.set(4, 1);
  hazardTrim.colorSpace = THREE.SRGBColorSpace;
  hazardTrim.anisotropy = anisotropy;

  // 7. Radial Contact Shadow
  const csCanvas = document.createElement('canvas');
  csCanvas.width = 256;
  csCanvas.height = 256;
  const cs = csCanvas.getContext('2d')!;
  const grad = cs.createRadialGradient(128, 128, 16, 128, 128, 124);
  grad.addColorStop(0, 'rgba(0,0,0,0.75)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.32)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  cs.fillStyle = grad;
  cs.fillRect(0, 0, 256, 256);
  const contactShadow = new THREE.CanvasTexture(csCanvas);

  // 8. Procedural Weapon Skin Albedo Maps
  const skinMaps: Record<SkinId, THREE.CanvasTexture | null> = {
    default: null,
    asiimov: createSkinTexture('asiimov', anisotropy),
    hyper: createSkinTexture('hyper', anisotropy),
    carbon: createSkinTexture('carbon', anisotropy),
    gold: createSkinTexture('gold', anisotropy),
  };

  return {
    sandGround,
    sandWall,
    woodCrate,
    steelContainer,
    concreteFloor,
    hazardTrim,
    contactShadow,
    skinMaps,
    dispose: () => {
      sandGround.dispose();
      sandWall.dispose();
      woodCrate.dispose();
      steelContainer.dispose();
      concreteFloor.dispose();
      hazardTrim.dispose();
      contactShadow.dispose();
      Object.values(skinMaps).forEach((t) => t?.dispose());
    },
  };
}
