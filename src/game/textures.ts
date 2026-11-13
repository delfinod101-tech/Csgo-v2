import * as THREE from 'three';
import { SkinId } from '@/src/types/game';

export interface GameTextures {
  sandGround: THREE.CanvasTexture;
  sandWall: THREE.CanvasTexture;
  woodCrate: THREE.CanvasTexture;
  steelContainer: THREE.CanvasTexture;
  concreteFloor: THREE.CanvasTexture;
  hazardTrim: THREE.CanvasTexture;
  hangarFloor: THREE.CanvasTexture;
  hangarWall: THREE.CanvasTexture;
  hangarWainscot: THREE.CanvasTexture;
  woodCrateWarm: THREE.CanvasTexture;
  corrugatedGray: THREE.CanvasTexture;
  corrugatedBlue: THREE.CanvasTexture;
  corrugatedYellow: THREE.CanvasTexture;
  siloTank: THREE.CanvasTexture;
  chainLinkFence: THREE.CanvasTexture;
  signA: THREE.CanvasTexture;
  signB: THREE.CanvasTexture;
  stencilLeftA: THREE.CanvasTexture;
  stencilRightB: THREE.CanvasTexture;
  floorCircleA: THREE.CanvasTexture;
  miragePaver: THREE.CanvasTexture;
  miragePaverBump: THREE.CanvasTexture;
  mirageSandstone: THREE.CanvasTexture;
  mirageWallBump: THREE.CanvasTexture;
  mirageLattice: THREE.CanvasTexture;
  hazardWoodCrate: THREE.CanvasTexture;
  redCarpet: THREE.CanvasTexture;
  sprayA: THREE.CanvasTexture;
  sprayB: THREE.CanvasTexture;
  sprayLeftA: THREE.CanvasTexture;
  sprayRightB: THREE.CanvasTexture;
  moorishCarving: THREE.CanvasTexture;
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

  // 7. Nuke Hangar Light-Gray Tiled Concrete Floor
  const hfCanvas = document.createElement('canvas');
  hfCanvas.width = 512;
  hfCanvas.height = 512;
  const hf = hfCanvas.getContext('2d')!;
  hf.fillStyle = '#9aa1aa';
  hf.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const v = 138 + Math.floor(Math.random() * 26);
    hf.fillStyle = `rgba(${v}, ${v + 4}, ${v + 8}, 0.45)`;
    hf.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  hf.strokeStyle = 'rgba(72, 80, 92, 0.42)';
  hf.lineWidth = 3;
  for (let i = 0; i <= 512; i += 128) {
    hf.beginPath();
    hf.moveTo(i, 0);
    hf.lineTo(i, 512);
    hf.moveTo(0, i);
    hf.lineTo(512, i);
    hf.stroke();
  }
  const hangarFloor = new THREE.CanvasTexture(hfCanvas);
  hangarFloor.wrapS = THREE.RepeatWrapping;
  hangarFloor.wrapT = THREE.RepeatWrapping;
  hangarFloor.repeat.set(16, 16);
  hangarFloor.colorSpace = THREE.SRGBColorSpace;
  hangarFloor.anisotropy = anisotropy;

  // 8. Nuke Hangar Upper Light Concrete Panel Wall
  const hwCanvas = document.createElement('canvas');
  hwCanvas.width = 512;
  hwCanvas.height = 512;
  const hw = hwCanvas.getContext('2d')!;
  hw.fillStyle = '#c6ccd4';
  hw.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const shade = 192 + ((row * 3 + col) % 3) * 4;
      hw.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 9})`;
      hw.fillRect(col * 128 + 3, row * 128 + 3, 122, 122);
    }
  }
  hw.strokeStyle = 'rgba(92, 100, 112, 0.35)';
  hw.lineWidth = 3;
  for (let i = 0; i <= 512; i += 128) {
    hw.beginPath();
    hw.moveTo(i, 0);
    hw.lineTo(i, 512);
    hw.moveTo(0, i);
    hw.lineTo(512, i);
    hw.stroke();
  }
  const hangarWall = new THREE.CanvasTexture(hwCanvas);
  hangarWall.wrapS = THREE.RepeatWrapping;
  hangarWall.wrapT = THREE.RepeatWrapping;
  hangarWall.repeat.set(3, 1.5);
  hangarWall.colorSpace = THREE.SRGBColorSpace;
  hangarWall.anisotropy = anisotropy;

  // 9. Nuke Hangar Lower Slate Wainscot Panel
  const wnCanvas = document.createElement('canvas');
  wnCanvas.width = 256;
  wnCanvas.height = 256;
  const wn = wnCanvas.getContext('2d')!;
  wn.fillStyle = '#6a727d';
  wn.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const v = 100 + ((row + col) % 2) * 8;
      wn.fillStyle = `rgb(${v}, ${v + 6}, ${v + 14})`;
      wn.fillRect(col * 64 + 2, row * 128 + 2, 60, 124);
    }
  }
  const hangarWainscot = new THREE.CanvasTexture(wnCanvas);
  hangarWainscot.wrapS = THREE.RepeatWrapping;
  hangarWainscot.wrapT = THREE.RepeatWrapping;
  hangarWainscot.repeat.set(4, 1);
  hangarWainscot.colorSpace = THREE.SRGBColorSpace;
  hangarWainscot.anisotropy = anisotropy;

  // 10. Warm X-Braced Wooden Crate (Grain, Beveled Planks & Iron Nails)
  const wkCanvas = document.createElement('canvas');
  wkCanvas.width = 256;
  wkCanvas.height = 256;
  const wk = wkCanvas.getContext('2d')!;
  wk.fillStyle = '#b47435';
  wk.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 8; i++) {
    const py = i * 32;
    wk.fillStyle = i % 2 === 0 ? '#a96b2e' : '#bf7e3c';
    wk.fillRect(0, py, 256, 30);
    // Subtle wood grain fibers
    wk.fillStyle = 'rgba(72, 38, 12, 0.14)';
    for (let g = 0; g < 5; g++) {
      wk.fillRect(0, py + 4 + g * 5, 256, 1.5);
    }
    wk.fillStyle = 'rgba(255, 224, 180, 0.08)';
    wk.fillRect(0, py + 1, 256, 2);
  }
  wk.strokeStyle = '#8b531f';
  wk.lineWidth = 22;
  wk.strokeRect(11, 11, 234, 234);
  wk.lineWidth = 18;
  wk.beginPath();
  wk.moveTo(18, 18);
  wk.lineTo(238, 238);
  wk.moveTo(238, 18);
  wk.lineTo(18, 238);
  wk.stroke();
  wk.strokeStyle = '#6f4015';
  wk.lineWidth = 3;
  wk.strokeRect(22, 22, 212, 212);
  // Corner iron nail heads
  wk.fillStyle = '#3b2818';
  for (const [nx, ny] of [
    [14, 14], [242, 14], [14, 242], [242, 242],
    [128, 14], [128, 242], [14, 128], [242, 128],
  ]) {
    wk.beginPath();
    wk.arc(nx, ny, 3.2, 0, Math.PI * 2);
    wk.fill();
  }
  const woodCrateWarm = new THREE.CanvasTexture(wkCanvas);
  woodCrateWarm.colorSpace = THREE.SRGBColorSpace;
  woodCrateWarm.anisotropy = anisotropy;

  // Helper for corrugated shipping containers
  const makeCorrugated = (base: string, dark: string, light: string) => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const g = c.getContext('2d')!;
    g.fillStyle = base;
    g.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 16) {
      g.fillStyle = dark;
      g.fillRect(x, 0, 6, 256);
      g.fillStyle = light;
      g.fillRect(x + 6, 0, 4, 256);
    }
    g.strokeStyle = dark;
    g.lineWidth = 14;
    g.strokeRect(7, 7, 242, 242);
    g.fillStyle = dark;
    g.fillRect(0, 122, 256, 6);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = anisotropy;
    return tex;
  };
  const corrugatedGray = makeCorrugated('#5d6570', '#454c55', '#737c88');
  const corrugatedBlue = makeCorrugated('#245ba3', '#194178', '#3372c4');
  const corrugatedYellow = makeCorrugated('#cfa024', '#9f7814', '#e3b83c');

  // 11. Twin Reactor Silo White Cladding + Double Red Hazard Stripes
  const slCanvas = document.createElement('canvas');
  slCanvas.width = 512;
  slCanvas.height = 512;
  const sl = slCanvas.getContext('2d')!;
  sl.fillStyle = '#e5e9ef';
  sl.fillRect(0, 0, 512, 512);
  sl.strokeStyle = 'rgba(130, 140, 152, 0.35)';
  sl.lineWidth = 3;
  for (let x = 0; x <= 512; x += 64) {
    sl.beginPath();
    sl.moveTo(x, 0);
    sl.lineTo(x, 512);
    sl.stroke();
  }
  for (let y = 0; y <= 512; y += 64) {
    sl.beginPath();
    sl.moveTo(0, y);
    sl.lineTo(512, y);
    sl.stroke();
  }
  // Upper and lower red bands
  sl.fillStyle = '#be2926';
  sl.fillRect(0, 72, 512, 56);
  sl.fillRect(0, 384, 512, 56);
  // Dark bevel base band
  sl.fillStyle = '#535b66';
  sl.fillRect(0, 488, 512, 24);
  const siloTank = new THREE.CanvasTexture(slCanvas);
  siloTank.colorSpace = THREE.SRGBColorSpace;
  siloTank.anisotropy = anisotropy;

  // 12. Chain-Link Yard Fence (Alpha Cutout)
  const fnCanvas = document.createElement('canvas');
  fnCanvas.width = 256;
  fnCanvas.height = 256;
  const fn = fnCanvas.getContext('2d')!;
  fn.clearRect(0, 0, 256, 256);
  fn.strokeStyle = '#94a3b8';
  fn.lineWidth = 4;
  for (let i = -256; i <= 512; i += 32) {
    fn.beginPath();
    fn.moveTo(i, 0);
    fn.lineTo(i + 256, 256);
    fn.moveTo(i + 256, 0);
    fn.lineTo(i, 256);
    fn.stroke();
  }
  const chainLinkFence = new THREE.CanvasTexture(fnCanvas);
  chainLinkFence.wrapS = THREE.RepeatWrapping;
  chainLinkFence.wrapT = THREE.RepeatWrapping;
  chainLinkFence.repeat.set(8, 3);
  chainLinkFence.colorSpace = THREE.SRGBColorSpace;
  chainLinkFence.anisotropy = anisotropy;

  // 13. Red Site Plaques (A / B) & Directional Stencils & Floor Decal
  const makePlaque = (letter: string) => {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const g = c.getContext('2d')!;
    g.fillStyle = '#b92b27';
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#7f1d1d';
    g.lineWidth = 10;
    g.strokeRect(5, 5, 246, 246);
    g.fillStyle = '#f8fafc';
    g.font = 'bold 170px Inter, Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(letter, 128, 136);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = anisotropy;
    return tex;
  };
  const signA = makePlaque('A');
  const signB = makePlaque('B');

  const makeStencil = (text: string) => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, 512, 256);
    g.fillStyle = '#b42825';
    g.font = 'bold 148px Inter, Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 256, 134);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = anisotropy;
    return tex;
  };
  const stencilLeftA = makeStencil('← A');
  const stencilRightB = makeStencil('B →');

  const fcCanvas = document.createElement('canvas');
  fcCanvas.width = 256;
  fcCanvas.height = 256;
  const fc = fcCanvas.getContext('2d')!;
  fc.clearRect(0, 0, 256, 256);
  fc.strokeStyle = '#b42825';
  fc.lineWidth = 18;
  fc.beginPath();
  fc.arc(128, 128, 96, 0, Math.PI * 2);
  fc.stroke();
  fc.fillStyle = '#b42825';
  fc.font = 'bold 138px Inter, Arial, sans-serif';
  fc.textAlign = 'center';
  fc.textBaseline = 'middle';
  fc.fillText('A', 128, 136);
  const floorCircleA = new THREE.CanvasTexture(fcCanvas);
  floorCircleA.colorSpace = THREE.SRGBColorSpace;
  floorCircleA.anisotropy = anisotropy;

  // 14. Mirage Pátio Warm Sandstone Courtyard Pavers + Matching Linear Bump Map
  const mpCanvas = document.createElement('canvas');
  mpCanvas.width = 512;
  mpCanvas.height = 512;
  const mp = mpCanvas.getContext('2d')!;
  const mpbCanvas = document.createElement('canvas');
  mpbCanvas.width = 512;
  mpbCanvas.height = 512;
  const mpb = mpbCanvas.getContext('2d')!;

  mp.fillStyle = '#b99f77';
  mp.fillRect(0, 0, 512, 512);
  mpb.fillStyle = '#4a4a4a'; // Recessed mortar joint height
  mpb.fillRect(0, 0, 512, 512);

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const tx = col * 128;
      const ty = row * 128;
      const shade = 203 + ((row * 3 + col * 2) % 4) * 5;
      mp.fillStyle = `rgb(${shade + 14}, ${shade - 6}, ${shade - 44})`;
      mp.fillRect(tx + 3, ty + 3, 122, 122);

      // Sunlit bevel highlight + shadow edge on each tile
      mp.fillStyle = 'rgba(255, 244, 222, 0.22)';
      mp.fillRect(tx + 3, ty + 3, 122, 3);
      mp.fillRect(tx + 3, ty + 3, 3, 122);
      mp.fillStyle = 'rgba(110, 84, 52, 0.18)';
      mp.fillRect(tx + 3, ty + 122, 122, 3);
      mp.fillRect(tx + 122, ty + 3, 3, 122);

      // Raised slab height in bump map
      const bVal = 192 + ((row + col * 2) % 3) * 10;
      mpb.fillStyle = `rgb(${bVal}, ${bVal}, ${bVal})`;
      mpb.fillRect(tx + 4, ty + 4, 120, 120);
    }
  }
  // Fine limestone grain + subtle stone pitting
  for (let i = 0; i < 9500; i++) {
    const gx = Math.random() * 512;
    const gy = Math.random() * 512;
    const v = 182 + Math.floor(Math.random() * 38);
    mp.fillStyle = `rgba(${v}, ${v - 20}, ${v - 52}, 0.32)`;
    mp.fillRect(gx, gy, 2, 2);
    const bv = 150 + Math.floor(Math.random() * 75);
    mpb.fillStyle = `rgba(${bv}, ${bv}, ${bv}, 0.25)`;
    mpb.fillRect(gx, gy, 2, 2);
  }
  // Subtle hairline sandstone cracks on select pavers
  mp.strokeStyle = 'rgba(116, 90, 58, 0.28)';
  mp.lineWidth = 1.5;
  mpb.strokeStyle = 'rgba(70, 70, 70, 0.5)';
  mpb.lineWidth = 1.5;
  for (const [x1, y1, x2, y2, x3, y3] of [
    [28, 32, 62, 54, 88, 49],
    [296, 178, 334, 212, 355, 240],
    [164, 412, 206, 434, 232, 466],
  ]) {
    mp.beginPath();
    mp.moveTo(x1, y1);
    mp.lineTo(x2, y2);
    mp.lineTo(x3, y3);
    mp.stroke();
    mpb.beginPath();
    mpb.moveTo(x1, y1);
    mpb.lineTo(x2, y2);
    mpb.lineTo(x3, y3);
    mpb.stroke();
  }
  // Crisp mortar grid
  mp.strokeStyle = 'rgba(124, 96, 62, 0.42)';
  mp.lineWidth = 3;
  for (let i = 0; i <= 512; i += 128) {
    mp.beginPath();
    mp.moveTo(i, 0);
    mp.lineTo(i, 512);
    mp.moveTo(0, i);
    mp.lineTo(512, i);
    mp.stroke();
  }
  const miragePaver = new THREE.CanvasTexture(mpCanvas);
  miragePaver.wrapS = THREE.RepeatWrapping;
  miragePaver.wrapT = THREE.RepeatWrapping;
  miragePaver.repeat.set(16, 16);
  miragePaver.colorSpace = THREE.SRGBColorSpace;
  miragePaver.anisotropy = anisotropy;

  const miragePaverBump = new THREE.CanvasTexture(mpbCanvas);
  miragePaverBump.wrapS = THREE.RepeatWrapping;
  miragePaverBump.wrapT = THREE.RepeatWrapping;
  miragePaverBump.repeat.set(16, 16);
  miragePaverBump.anisotropy = anisotropy;

  // 15. Mirage Pátio Sunlit Sandstone Ashlar Masonry Wall + Matching Linear Bump Map
  const msCanvas = document.createElement('canvas');
  msCanvas.width = 512;
  msCanvas.height = 512;
  const ms = msCanvas.getContext('2d')!;
  const msbCanvas = document.createElement('canvas');
  msbCanvas.width = 512;
  msbCanvas.height = 512;
  const msb = msbCanvas.getContext('2d')!;

  ms.fillStyle = '#c9b18a';
  ms.fillRect(0, 0, 512, 512);
  msb.fillStyle = '#404040';
  msb.fillRect(0, 0, 512, 512);

  for (let row = 0; row < 12; row++) {
    const y = row * 42;
    const offset = (row % 2) * 42;
    const isDado = row >= 8;
    for (let col = -1; col < 7; col++) {
      const x = col * 85 + offset;
      const v = (isDado ? 194 : 210) + ((row * 2 + col) % 3) * 5;
      ms.fillStyle = `rgb(${v + 12}, ${v - 7}, ${v - 42})`;
      ms.fillRect(x + 2, y + 2, 81, 38);
      // Top highlight on each carved ashlar stone
      ms.fillStyle = 'rgba(255, 245, 224, 0.16)';
      ms.fillRect(x + 2, y + 2, 81, 2);

      const bv = (isDado ? 175 : 205) + ((row + col) % 3) * 12;
      msb.fillStyle = `rgb(${bv}, ${bv}, ${bv})`;
      msb.fillRect(x + 3, y + 3, 79, 36);
    }
  }
  // Fine plaster & sandstone speckles
  for (let i = 0; i < 6500; i++) {
    const sx = Math.random() * 512;
    const sy = Math.random() * 512;
    const v = 180 + Math.floor(Math.random() * 40);
    ms.fillStyle = `rgba(${v}, ${v - 18}, ${v - 50}, 0.22)`;
    ms.fillRect(sx, sy, 2, 2);
    const bv = 140 + Math.floor(Math.random() * 80);
    msb.fillStyle = `rgba(${bv}, ${bv}, ${bv}, 0.2)`;
    msb.fillRect(sx, sy, 2, 2);
  }
  // Architectural dado stringcourse ledge
  ms.fillStyle = 'rgba(136, 108, 72, 0.34)';
  ms.fillRect(0, 332, 512, 6);
  msb.fillStyle = '#efefef';
  msb.fillRect(0, 332, 512, 5);

  const mirageSandstone = new THREE.CanvasTexture(msCanvas);
  mirageSandstone.wrapS = THREE.RepeatWrapping;
  mirageSandstone.wrapT = THREE.RepeatWrapping;
  mirageSandstone.repeat.set(2.5, 1.5);
  mirageSandstone.colorSpace = THREE.SRGBColorSpace;
  mirageSandstone.anisotropy = anisotropy;

  const mirageWallBump = new THREE.CanvasTexture(msbCanvas);
  mirageWallBump.wrapS = THREE.RepeatWrapping;
  mirageWallBump.wrapT = THREE.RepeatWrapping;
  mirageWallBump.repeat.set(2.5, 1.5);
  mirageWallBump.anisotropy = anisotropy;

  // 15b. Carved Moroccan Cedar Door & Mashrabiya Window Lattice
  const mlCanvas = document.createElement('canvas');
  mlCanvas.width = 256;
  mlCanvas.height = 256;
  const ml = mlCanvas.getContext('2d')!;
  ml.fillStyle = '#472d19';
  ml.fillRect(0, 0, 256, 256);
  // Outer carved cedar frame
  ml.strokeStyle = '#684326';
  ml.lineWidth = 14;
  ml.strokeRect(7, 7, 242, 242);
  // Mashrabiya diagonal diamond latticework
  ml.strokeStyle = '#7f5432';
  ml.lineWidth = 4;
  for (let i = -256; i <= 512; i += 28) {
    ml.beginPath();
    ml.moveTo(i, 0);
    ml.lineTo(i + 256, 256);
    ml.moveTo(i + 256, 0);
    ml.lineTo(i, 256);
    ml.stroke();
  }
  // Center vertical door split + brass knockers
  ml.fillStyle = '#2d1b0e';
  ml.fillRect(125, 0, 6, 256);
  ml.fillStyle = '#d49b3b';
  ml.beginPath();
  ml.arc(108, 148, 6, 0, Math.PI * 2);
  ml.arc(148, 148, 6, 0, Math.PI * 2);
  ml.fill();
  const mirageLattice = new THREE.CanvasTexture(mlCanvas);
  mirageLattice.colorSpace = THREE.SRGBColorSpace;
  mirageLattice.anisotropy = anisotropy;

  // 16. Mirage Dark Timber Crate with Orange-Black Hazard Stripe Band
  const hcCanvas = document.createElement('canvas');
  hcCanvas.width = 256;
  hcCanvas.height = 256;
  const hc = hcCanvas.getContext('2d')!;
  hc.fillStyle = '#6f4e32';
  hc.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 32) {
    hc.fillStyle = x % 64 === 0 ? '#65452b' : '#7b5839';
    hc.fillRect(x, 0, 30, 256);
    hc.fillStyle = 'rgba(38, 22, 10, 0.16)';
    for (let g = 0; g < 4; g++) {
      hc.fillRect(x + 5 + g * 6, 0, 1.5, 256);
    }
  }
  hc.strokeStyle = '#4c321d';
  hc.lineWidth = 14;
  hc.strokeRect(7, 7, 242, 242);
  // Corner iron nails
  hc.fillStyle = '#261a10';
  for (const [nx, ny] of [[16, 56], [240, 56], [16, 240], [240, 240]]) {
    hc.beginPath();
    hc.arc(nx, ny, 3.5, 0, Math.PI * 2);
    hc.fill();
  }
  // Top hazard band (orange + dark charcoal diagonal stripes)
  hc.fillStyle = '#ea580c';
  hc.fillRect(0, 0, 256, 44);
  hc.fillStyle = '#18181b';
  for (let i = -48; i < 300; i += 32) {
    hc.beginPath();
    hc.moveTo(i, 0);
    hc.lineTo(i + 16, 0);
    hc.lineTo(i - 10, 44);
    hc.lineTo(i - 26, 44);
    hc.closePath();
    hc.fill();
  }
  const hazardWoodCrate = new THREE.CanvasTexture(hcCanvas);
  hazardWoodCrate.colorSpace = THREE.SRGBColorSpace;
  hazardWoodCrate.anisotropy = anisotropy;

  // 17. Ornate Crimson Moroccan Carpet / Tapestry
  const rcCanvas = document.createElement('canvas');
  rcCanvas.width = 256;
  rcCanvas.height = 256;
  const rc = rcCanvas.getContext('2d')!;
  rc.fillStyle = '#9e2320';
  rc.fillRect(0, 0, 256, 256);
  // Subtle woven weft texture
  rc.fillStyle = 'rgba(255, 210, 160, 0.06)';
  for (let wy = 0; wy < 256; wy += 4) {
    rc.fillRect(0, wy, 256, 1);
  }
  // Top & bottom cream fringe tassels
  rc.fillStyle = '#e7d5b2';
  for (let fx = 6; fx < 256; fx += 8) {
    rc.fillRect(fx, 0, 3, 10);
    rc.fillRect(fx, 246, 3, 10);
  }
  rc.strokeStyle = '#d49a3a';
  rc.lineWidth = 10;
  rc.strokeRect(18, 18, 220, 220);
  rc.strokeStyle = '#691311';
  rc.lineWidth = 6;
  rc.strokeRect(32, 32, 192, 192);
  // Geometric diamond medallions + inner star accents
  rc.fillStyle = '#b9362f';
  rc.strokeStyle = '#d49a3a';
  rc.lineWidth = 4;
  for (const cy of [84, 172]) {
    rc.beginPath();
    rc.moveTo(128, cy - 34);
    rc.lineTo(176, cy);
    rc.lineTo(128, cy + 34);
    rc.lineTo(80, cy);
    rc.closePath();
    rc.fill();
    rc.stroke();
    rc.fillStyle = '#e5b864';
    rc.fillRect(123, cy - 5, 10, 10);
    rc.fillStyle = '#b9362f';
  }
  const redCarpet = new THREE.CanvasTexture(rcCanvas);
  redCarpet.colorSpace = THREE.SRGBColorSpace;
  redCarpet.anisotropy = anisotropy;

  // 18. Red Hand-Sprayed Stencils with Paint Drips
  const makeSpray = (label: string, drips: boolean) => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, 512, 256);
    g.fillStyle = '#ae2622';
    g.font = 'bold 165px Inter, Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(label, 256, 122);
    if (drips) {
      g.fillRect(210, 178, 6, 48);
      g.fillRect(298, 176, 5, 34);
      g.beginPath();
      g.arc(213, 228, 4, 0, Math.PI * 2);
      g.arc(300.5, 212, 3.5, 0, Math.PI * 2);
      g.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = anisotropy;
    return tex;
  };
  const sprayA = makeSpray('A', true);
  const sprayB = makeSpray('B', true);
  const sprayLeftA = makeSpray('← A', true);
  const sprayRightB = makeSpray('B →', true);

  // 19. Carved Sandstone Moorish Arch Frame with Arabesque Spandrels & Brass Studs
  const maCanvas = document.createElement('canvas');
  maCanvas.width = 256;
  maCanvas.height = 256;
  const ma = maCanvas.getContext('2d')!;
  ma.fillStyle = '#d9c29b';
  ma.fillRect(0, 0, 256, 256);
  ma.strokeStyle = '#b49464';
  ma.lineWidth = 8;
  ma.strokeRect(12, 12, 232, 232);
  ma.strokeRect(28, 28, 200, 200);
  // Subtle arabesque filigree rosettes in upper spandrels
  ma.strokeStyle = 'rgba(138, 106, 62, 0.55)';
  ma.lineWidth = 2.5;
  for (const [rx, ry] of [[52, 54], [204, 54]]) {
    ma.beginPath();
    ma.arc(rx, ry, 14, 0, Math.PI * 2);
    ma.arc(rx, ry, 7, 0, Math.PI * 2);
    ma.stroke();
  }
  // Carved cedar double-doors inside arch
  ma.fillStyle = '#5c3c22';
  ma.beginPath();
  ma.arc(128, 138, 64, Math.PI, 0);
  ma.lineTo(192, 256);
  ma.lineTo(64, 256);
  ma.closePath();
  ma.fill();
  ma.strokeStyle = '#b49464';
  ma.lineWidth = 6;
  ma.beginPath();
  ma.arc(128, 138, 67, Math.PI, 0);
  ma.stroke();
  ma.strokeStyle = '#3f2714';
  ma.lineWidth = 5;
  ma.beginPath();
  ma.moveTo(128, 74);
  ma.lineTo(128, 256);
  ma.stroke();
  // Brass studs & door rings
  ma.fillStyle = '#d69e36';
  for (const sx of [84, 108, 148, 172]) {
    for (const sy of [154, 198, 234]) {
      ma.beginPath();
      ma.arc(sx, sy, 2.5, 0, Math.PI * 2);
      ma.fill();
    }
  }
  const moorishCarving = new THREE.CanvasTexture(maCanvas);
  moorishCarving.colorSpace = THREE.SRGBColorSpace;
  moorishCarving.anisotropy = anisotropy;

  // 20. Radial Contact Shadow
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

  // 21. Procedural Weapon Skin Albedo Maps
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
    hangarFloor,
    hangarWall,
    hangarWainscot,
    woodCrateWarm,
    corrugatedGray,
    corrugatedBlue,
    corrugatedYellow,
    siloTank,
    chainLinkFence,
    signA,
    signB,
    stencilLeftA,
    stencilRightB,
    floorCircleA,
    miragePaver,
    miragePaverBump,
    mirageSandstone,
    mirageWallBump,
    mirageLattice,
    hazardWoodCrate,
    redCarpet,
    sprayA,
    sprayB,
    sprayLeftA,
    sprayRightB,
    moorishCarving,
    contactShadow,
    skinMaps,
    dispose: () => {
      sandGround.dispose();
      sandWall.dispose();
      woodCrate.dispose();
      steelContainer.dispose();
      concreteFloor.dispose();
      hazardTrim.dispose();
      hangarFloor.dispose();
      hangarWall.dispose();
      hangarWainscot.dispose();
      woodCrateWarm.dispose();
      corrugatedGray.dispose();
      corrugatedBlue.dispose();
      corrugatedYellow.dispose();
      siloTank.dispose();
      chainLinkFence.dispose();
      signA.dispose();
      signB.dispose();
      stencilLeftA.dispose();
      stencilRightB.dispose();
      floorCircleA.dispose();
      miragePaver.dispose();
      miragePaverBump.dispose();
      mirageSandstone.dispose();
      mirageWallBump.dispose();
      mirageLattice.dispose();
      hazardWoodCrate.dispose();
      redCarpet.dispose();
      sprayA.dispose();
      sprayB.dispose();
      sprayLeftA.dispose();
      sprayRightB.dispose();
      moorishCarving.dispose();
      contactShadow.dispose();
      Object.values(skinMaps).forEach((t) => t?.dispose());
    },
  };
}
