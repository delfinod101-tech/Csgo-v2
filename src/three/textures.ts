import * as THREE from 'three';

export interface ProceduralTextures {
  carbonAlbedo: THREE.CanvasTexture;
  carbonRoughness: THREE.CanvasTexture;
  turntableMap: THREE.CanvasTexture;
  asphaltMap: THREE.CanvasTexture;
  asphaltRoughness: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  tireTread: THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextures {
  const anisotropy = Math.min(Math.max(1, maxAnisotropy), 8);

  // 1. Carbon fiber weave (albedo + roughness)
  const carbonCanvas = document.createElement('canvas');
  carbonCanvas.width = 128;
  carbonCanvas.height = 128;
  const cctx = carbonCanvas.getContext('2d')!;
  cctx.fillStyle = '#14171c';
  cctx.fillRect(0, 0, 128, 128);
  const cell = 16;
  for (let y = 0; y < 128; y += cell) {
    for (let x = 0; x < 128; x += cell) {
      const diag = ((x + y) / cell) % 2 === 0;
      cctx.fillStyle = diag ? '#222730' : '#181c22';
      cctx.fillRect(x, y, cell - 1, cell - 1);
      cctx.fillStyle = diag ? '#2b313c' : '#1b1f26';
      cctx.fillRect(x + 2, y + 2, cell - 5, 4);
    }
  }
  const carbonAlbedo = new THREE.CanvasTexture(carbonCanvas);
  carbonAlbedo.wrapS = THREE.RepeatWrapping;
  carbonAlbedo.wrapT = THREE.RepeatWrapping;
  carbonAlbedo.repeat.set(10, 10);
  carbonAlbedo.colorSpace = THREE.SRGBColorSpace;
  carbonAlbedo.anisotropy = anisotropy;

  const carbonRoughCanvas = document.createElement('canvas');
  carbonRoughCanvas.width = 128;
  carbonRoughCanvas.height = 128;
  const crctx = carbonRoughCanvas.getContext('2d')!;
  crctx.fillStyle = '#606060';
  crctx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += cell) {
    for (let x = 0; x < 128; x += cell) {
      const diag = ((x + y) / cell) % 2 === 0;
      crctx.fillStyle = diag ? '#383838' : '#707070';
      crctx.fillRect(x, y, cell - 1, cell - 1);
    }
  }
  const carbonRoughness = new THREE.CanvasTexture(carbonRoughCanvas);
  carbonRoughness.wrapS = THREE.RepeatWrapping;
  carbonRoughness.wrapT = THREE.RepeatWrapping;
  carbonRoughness.repeat.set(10, 10);
  carbonRoughness.anisotropy = anisotropy;

  // 2. Studio turntable brushed radial surface with subtle calibration ticks
  const ttCanvas = document.createElement('canvas');
  ttCanvas.width = 1024;
  ttCanvas.height = 1024;
  const tt = ttCanvas.getContext('2d')!;
  const cx = 512;
  const cy = 512;
  const grad = tt.createRadialGradient(cx, cy, 40, cx, cy, 500);
  grad.addColorStop(0, '#1e2229');
  grad.addColorStop(0.7, '#16191f');
  grad.addColorStop(0.95, '#111318');
  grad.addColorStop(1, '#0d0f13');
  tt.fillStyle = grad;
  tt.fillRect(0, 0, 1024, 1024);

  // Subtle brushed concentric rings
  tt.strokeStyle = 'rgba(255,255,255,0.03)';
  tt.lineWidth = 1;
  for (let r = 80; r < 490; r += 18) {
    tt.beginPath();
    tt.arc(cx, cy, r, 0, Math.PI * 2);
    tt.stroke();
  }

  // Outer perimeter calibration ticks
  tt.save();
  tt.translate(cx, cy);
  for (let deg = 0; deg < 360; deg += 5) {
    const rad = (deg * Math.PI) / 180;
    const isMajor = deg % 30 === 0;
    const r0 = isMajor ? 458 : 472;
    const r1 = 486;
    tt.strokeStyle = isMajor ? 'rgba(245, 158, 11, 0.42)' : 'rgba(255, 255, 255, 0.10)';
    tt.lineWidth = isMajor ? 2 : 1;
    tt.beginPath();
    tt.moveTo(Math.cos(rad) * r0, Math.sin(rad) * r0);
    tt.lineTo(Math.cos(rad) * r1, Math.sin(rad) * r1);
    tt.stroke();
  }
  tt.restore();

  const turntableMap = new THREE.CanvasTexture(ttCanvas);
  turntableMap.colorSpace = THREE.SRGBColorSpace;
  turntableMap.anisotropy = anisotropy;

  // 3. Proving-ground asphalt texture
  const aspCanvas = document.createElement('canvas');
  aspCanvas.width = 512;
  aspCanvas.height = 512;
  const actx = aspCanvas.getContext('2d')!;
  actx.fillStyle = '#1b1d21';
  actx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 14000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = 20 + Math.floor(Math.random() * 28);
    actx.fillStyle = `rgb(${v}, ${v + 1}, ${v + 3})`;
    actx.fillRect(x, y, 2, 2);
  }
  const asphaltMap = new THREE.CanvasTexture(aspCanvas);
  asphaltMap.wrapS = THREE.RepeatWrapping;
  asphaltMap.wrapT = THREE.RepeatWrapping;
  asphaltMap.repeat.set(80, 80);
  asphaltMap.colorSpace = THREE.SRGBColorSpace;
  asphaltMap.anisotropy = anisotropy;

  const aspRoughCanvas = document.createElement('canvas');
  aspRoughCanvas.width = 256;
  aspRoughCanvas.height = 256;
  const arctx = aspRoughCanvas.getContext('2d')!;
  arctx.fillStyle = '#c8c8c8';
  arctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const v = 160 + Math.floor(Math.random() * 80);
    arctx.fillStyle = `rgb(${v},${v},${v})`;
    arctx.fillRect(x, y, 2, 2);
  }
  const asphaltRoughness = new THREE.CanvasTexture(aspRoughCanvas);
  asphaltRoughness.wrapS = THREE.RepeatWrapping;
  asphaltRoughness.wrapT = THREE.RepeatWrapping;
  asphaltRoughness.repeat.set(80, 80);
  asphaltRoughness.anisotropy = anisotropy;

  // 4. Soft radial contact shadow under chassis
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 512;
  shadowCanvas.height = 512;
  const sctx = shadowCanvas.getContext('2d')!;
  sctx.clearRect(0, 0, 512, 512);
  const sgrad = sctx.createRadialGradient(256, 256, 40, 256, 256, 250);
  sgrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
  sgrad.addColorStop(0.55, 'rgba(0, 0, 0, 0.45)');
  sgrad.addColorStop(0.85, 'rgba(0, 0, 0, 0.10)');
  sgrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sctx.fillStyle = sgrad;
  sctx.fillRect(0, 0, 512, 512);
  const contactShadow = new THREE.CanvasTexture(shadowCanvas);

  // 5. Tire tread pattern
  const treadCanvas = document.createElement('canvas');
  treadCanvas.width = 256;
  treadCanvas.height = 256;
  const trctx = treadCanvas.getContext('2d')!;
  trctx.fillStyle = '#18191c';
  trctx.fillRect(0, 0, 256, 256);
  trctx.strokeStyle = '#0d0e10';
  trctx.lineWidth = 6;
  for (let y = 0; y < 256; y += 32) {
    trctx.beginPath();
    trctx.moveTo(0, y);
    trctx.lineTo(128, y + 18);
    trctx.lineTo(256, y);
    trctx.stroke();
  }
  // Longitudinal water grooves
  trctx.fillStyle = '#090a0c';
  trctx.fillRect(72, 0, 10, 256);
  trctx.fillRect(123, 0, 10, 256);
  trctx.fillRect(174, 0, 10, 256);
  const tireTread = new THREE.CanvasTexture(treadCanvas);
  tireTread.wrapS = THREE.RepeatWrapping;
  tireTread.wrapT = THREE.RepeatWrapping;
  tireTread.repeat.set(1, 8);
  tireTread.colorSpace = THREE.SRGBColorSpace;
  tireTread.anisotropy = anisotropy;

  return {
    carbonAlbedo,
    carbonRoughness,
    turntableMap,
    asphaltMap,
    asphaltRoughness,
    contactShadow,
    tireTread,
    dispose: () => {
      carbonAlbedo.dispose();
      carbonRoughness.dispose();
      turntableMap.dispose();
      asphaltMap.dispose();
      asphaltRoughness.dispose();
      contactShadow.dispose();
      tireTread.dispose();
    },
  };
}
