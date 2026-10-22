import * as THREE from 'three';
import { PALETTE } from '../config/world';

function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas2d(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D 上下文不可用');
  return [canvas, ctx];
}

export function createNoiseTexture(size = 256, seed = 1337): THREE.CanvasTexture {
  const [canvas, ctx] = canvas2d(size, size);
  const rand = seededRandom(seed);
  const image = ctx.createImageData(size, size);
  for (let i = 0; i < image.data.length; i += 4) {
    const value = 118 + Math.floor(rand() * 52);
    image.data[i] = value;
    image.data[i + 1] = value;
    image.data[i + 2] = value;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  // 低频斑块让灰度噪声更像粗糙混凝土，而不是电视雪花。
  for (let i = 0; i < 90; i += 1) {
    const alpha = 0.025 + rand() * 0.05;
    ctx.fillStyle = rand() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    const radius = 4 + rand() * 34;
    ctx.beginPath();
    ctx.arc(rand() * size, rand() * size, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 10);
  texture.anisotropy = 4;
  return texture;
}

export function createGroundTexture(): THREE.CanvasTexture {
  const size = 512;
  const [canvas, ctx] = canvas2d(size, size);
  const rand = seededRandom(90210);
  ctx.fillStyle = '#1b1f2d';
  ctx.fillRect(0, 0, size, size);

  const cells = 8;
  const cell = size / cells;
  for (let y = 0; y < cells; y += 1) {
    for (let x = 0; x < cells; x += 1) {
      const shade = 28 + Math.floor(rand() * 10);
      ctx.fillStyle = `rgb(${shade},${shade + 4},${shade + 12})`;
      ctx.fillRect(x * cell + 2, y * cell + 2, cell - 4, cell - 4);
      if (rand() > 0.6) {
        ctx.fillStyle = 'rgba(255,255,255,0.025)';
        ctx.fillRect(x * cell + 4, y * cell + 4, cell - 8, 2);
      }
    }
  }

  for (let i = 0; i < 4200; i += 1) {
    const alpha = 0.02 + rand() * 0.05;
    ctx.fillStyle = rand() > 0.55 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2.4, 1 + rand() * 2.4);
  }

  // 轻微湿痕，仅在材质粗糙度上形成变化，不代表真实反射。
  for (let i = 0; i < 7; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 40 + rand() * 90);
    gradient.addColorStop(0, 'rgba(80,110,160,0.05)');
    gradient.addColorStop(1, 'rgba(80,110,160,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  texture.anisotropy = 8;
  return texture;
}

export function createSkyTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = canvas2d(8, 1024);
  const gradient = ctx.createLinearGradient(0, 0, 0, 1024);
  gradient.addColorStop(0, '#111424');
  gradient.addColorStop(0.34, '#141829');
  gradient.addColorStop(0.58, '#222b4c');
  gradient.addColorStop(0.73, '#2a3560');
  gradient.addColorStop(0.88, '#20274a');
  gradient.addColorStop(1, '#151a2c');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 8, 1024);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

export function createGlowTexture(): THREE.CanvasTexture {
  const size = 256;
  const [canvas, ctx] = canvas2d(size, size);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.18, 'rgba(255,255,255,0.72)');
  gradient.addColorStop(0.48, 'rgba(255,255,255,0.18)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const [canvas, ctx] = canvas2d(size, size);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(0,0,0,0.55)');
  gradient.addColorStop(0.55, 'rgba(0,0,0,0.25)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createStarTexture(): THREE.CanvasTexture {
  const size = 64;
  const [canvas, ctx] = canvas2d(size, size);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.5)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export interface SignTextureOptions {
  width?: number;
  height?: number;
  color?: string;
  subColor?: string;
  background?: string;
  border?: string;
  align?: 'left' | 'center';
}

export function createSignTexture(
  primary: string,
  secondary?: string,
  options: SignTextureOptions = {},
): THREE.CanvasTexture {
  const width = options.width ?? 1024;
  const height = options.height ?? 256;
  const [canvas, ctx] = canvas2d(width, height);
  const background = options.background ?? 'rgba(10,13,22,0)';
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  if (options.border) {
    ctx.strokeStyle = options.border;
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, width - 12, height - 12);
  }

  const left = options.align === 'left' ? 54 : width / 2;
  ctx.textAlign = options.align === 'left' ? 'left' : 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = options.color ?? '#f5e8d8';
  ctx.font = `600 ${Math.round(height * 0.34)}px "Segoe UI", "Microsoft YaHei", sans-serif`;
  ctx.fillText(primary, left, height * (secondary ? 0.42 : 0.5));

  if (secondary) {
    ctx.fillStyle = options.subColor ?? 'rgba(255,214,168,0.72)';
    ctx.font = `400 ${Math.round(height * 0.155)}px "Microsoft YaHei", "Segoe UI", sans-serif`;
    ctx.fillText(secondary, left, height * 0.7);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function createVerticalSignTexture(primary: string): THREE.CanvasTexture {
  const [canvas, ctx] = canvas2d(256, 1024);
  ctx.clearRect(0, 0, 256, 1024);
  ctx.fillStyle = 'rgba(9,12,20,0.35)';
  ctx.fillRect(22, 22, 212, 980);
  ctx.strokeStyle = 'rgba(255,179,102,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 22, 212, 980);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 92px "Segoe UI", "Microsoft YaHei", sans-serif';
  const characters = [...primary];
  const step = Math.min(128, 860 / Math.max(characters.length, 1));
  const start = 512 - ((characters.length - 1) * step) / 2;
  characters.forEach((character, index) => {
    ctx.fillStyle = index === 0 ? '#ffb366' : '#f0dfca';
    ctx.fillText(character, 128, start + index * step);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function createScreenTexture(): THREE.CanvasTexture {
  const width = 768;
  const height = 480;
  const [canvas, ctx] = canvas2d(width, height);
  const rand = seededRandom(3180);
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#071019');
  bg.addColorStop(1, '#0c1a27');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(0,240,255,0.11)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  for (let row = 0; row < 7; row += 1) {
    for (let col = 0; col < 11; col += 1) {
      const alpha = 0.05 + rand() * 0.4;
      const size = 25;
      const x = 34 + col * 66;
      const y = 118 + row * 46;
      ctx.fillStyle = col % 4 === 0 ? `rgba(255,179,102,${alpha})` : `rgba(0,240,255,${alpha})`;
      ctx.fillRect(x, y, size, size);
    }
  }

  ctx.fillStyle = '#ffb366';
  ctx.font = '600 42px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.fillText('AI LAB', 34, 66);
  ctx.fillStyle = 'rgba(210,238,255,0.62)';
  ctx.font = '400 20px "Microsoft YaHei", "Segoe UI", sans-serif';
  ctx.fillText('ATTENTION MATRIX · 教学模拟', 36, 96);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(0,240,255,0.7)';
  ctx.font = '500 18px "Segoe UI", monospace';
  ctx.fillText('ROUND 01 / STANDBY', width - 32, height - 28);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  // 让青色导视与世界整体色温保持一致。
  texture.userData.tint = PALETTE.emissiveCyan;
  return texture;
}

export function createHoardingTexture(): THREE.CanvasTexture {
  const width = 1024;
  const height = 256;
  const [canvas, ctx] = canvas2d(width, height);
  ctx.fillStyle = '#232635';
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.rotate(-0.18);
  for (let x = -200; x < width + 200; x += 120) {
    ctx.fillStyle = 'rgba(255,179,102,0.16)';
    ctx.fillRect(x, -100, 34, height + 220);
    ctx.fillStyle = 'rgba(0,240,255,0.1)';
    ctx.fillRect(x + 62, -100, 12, height + 220);
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(15,18,28,0.82)';
  ctx.fillRect(24, 48, width - 48, 160);
  ctx.strokeStyle = 'rgba(255,179,102,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 48, width - 48, 160);
  ctx.fillStyle = '#f2e4d3';
  ctx.font = '600 56px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.fillText('EXT-01 / 扩建预留', 68, 128);
  ctx.fillStyle = 'rgba(255,214,168,0.65)';
  ctx.font = '400 26px "Microsoft YaHei", "Segoe UI", sans-serif';
  ctx.fillText('本轮不开放 · 围挡保留街区北侧轮廓', 72, 176);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
