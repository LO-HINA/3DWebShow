import * as THREE from 'three';
import { PALETTE } from './theme';

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

export interface VerticalSignOptions {
  /** 首字强调色；默认暖金。 */
  accent?: string;
  /** 其余字符颜色；默认暖白。 */
  color?: string;
  /** 底板颜色；默认半透明深色。 */
  panel?: string;
  /** 边框颜色；默认半透明暖金。 */
  border?: string;
}

export function createVerticalSignTexture(
  primary: string,
  options: VerticalSignOptions = {},
): THREE.CanvasTexture {
  const [canvas, ctx] = canvas2d(256, 1024);
  ctx.clearRect(0, 0, 256, 1024);
  ctx.fillStyle = options.panel ?? 'rgba(9,12,20,0.35)';
  ctx.fillRect(22, 22, 212, 980);
  ctx.strokeStyle = options.border ?? 'rgba(255,179,102,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 22, 212, 980);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '600 92px "Segoe UI", "Microsoft YaHei", sans-serif';
  const characters = [...primary];
  const step = Math.min(128, 860 / Math.max(characters.length, 1));
  const start = 512 - ((characters.length - 1) * step) / 2;
  characters.forEach((character, index) => {
    ctx.fillStyle = index === 0 ? options.accent ?? '#ffb366' : options.color ?? '#f0dfca';
    ctx.fillText(character, 128, start + index * step);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function drawSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
): void {
  const characters = [...text];
  const widths = characters.map((character) => ctx.measureText(character).width);
  const total = widths.reduce((sum, width) => sum + width, 0) + spacing * Math.max(0, characters.length - 1);
  let cursor = x;
  if (ctx.textAlign === 'center') cursor = x - total / 2;
  if (ctx.textAlign === 'right') cursor = x - total;
  const align = ctx.textAlign;
  ctx.textAlign = 'left';
  characters.forEach((character, index) => {
    ctx.fillText(character, cursor, y);
    cursor += widths[index] + spacing;
  });
  ctx.textAlign = align;
}

/**
 * E-01 主视觉：高反差暮光建筑抽象，供入口旁的主橱窗使用。
 * 与 W1–W5 演示图分开生成，避免同一画面在图片街与立面重复出现。
 */
export function createGalleryFeatureTexture(): THREE.CanvasTexture {
  const width = 1024;
  const height = 720;
  const [canvas, ctx] = canvas2d(width, height);
  const rand = seededRandom(61207);

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#080d18');
  sky.addColorStop(0.38, '#1a2742');
  sky.addColorStop(0.56, '#43547a');
  sky.addColorStop(0.62, '#2b3350');
  sky.addColorStop(1, '#090d17');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // 远景城市带先铺在地平线，随后再画日盘，避免剪影把圆形高光切成暗块。
  ctx.fillStyle = 'rgba(13,18,31,0.78)';
  let cursorX = -20;
  while (cursorX < width + 40) {
    const blockWidth = 28 + rand() * 74;
    const blockHeight = 40 + rand() * 160;
    ctx.fillRect(cursorX, height * 0.62 - blockHeight, blockWidth, blockHeight + 4);
    cursorX += blockWidth + 6 + rand() * 20;
  }

  // 暖色地平线辉光：先压暖天空，再由日盘成为唯一高光。
  const horizon = ctx.createLinearGradient(0, height * 0.44, 0, height * 0.74);
  horizon.addColorStop(0, 'rgba(255,178,116,0)');
  horizon.addColorStop(0.52, 'rgba(255,178,116,0.16)');
  horizon.addColorStop(0.78, 'rgba(255,150,92,0.06)');
  horizon.addColorStop(1, 'rgba(255,150,92,0)');
  ctx.fillStyle = horizon;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // 横向砂岩层：明亮边缘与深色夹层交替，给画面建立摄影般的层次。
  let y = height * 0.2;
  while (y < height * 0.98) {
    const thickness = 4 + rand() * 26;
    const inset = rand() * width * 0.32;
    const length = width * (0.28 + rand() * 0.72);
    const warm = rand() > 0.32;
    const gradient = ctx.createLinearGradient(inset, y, inset + length, y + thickness);
    gradient.addColorStop(0, warm ? 'rgba(218,161,112,0.08)' : 'rgba(104,136,182,0.06)');
    gradient.addColorStop(0.55, warm ? 'rgba(235,183,129,0.55)' : 'rgba(139,176,224,0.26)');
    gradient.addColorStop(1, warm ? 'rgba(164,103,64,0.05)' : 'rgba(81,108,151,0.03)');
    ctx.fillStyle = gradient;
    ctx.fillRect(inset, y, length, Math.max(1.5, thickness * (warm ? 0.3 : 0.16)));
    if (warm && rand() > 0.52) {
      ctx.fillStyle = 'rgba(255,218,167,0.62)';
      ctx.fillRect(inset + length * 0.1, y - 1, length * (0.2 + rand() * 0.5), 1.2);
    }
    y += thickness;
  }

  ctx.restore();

  // 日盘：在砂岩层与城市剪影之后绘制，保证远处也能读到完整圆形。
  const sunX = width * 0.68;
  const sunY = height * 0.42;
  const halo = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 330);
  halo.addColorStop(0, 'rgba(255,249,235,1)');
  halo.addColorStop(0.09, 'rgba(255,224,182,0.95)');
  halo.addColorStop(0.26, 'rgba(240,158,98,0.44)');
  halo.addColorStop(0.6, 'rgba(201,121,80,0.14)');
  halo.addColorStop(1, 'rgba(201,121,80,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, width, height);
  const disc = ctx.createRadialGradient(sunX - 14, sunY - 16, 4, sunX, sunY, 62);
  disc.addColorStop(0, '#fffdf5');
  disc.addColorStop(0.68, '#ffeacb');
  disc.addColorStop(1, '#ffc98b');
  ctx.beginPath();
  ctx.fillStyle = disc;
  ctx.arc(sunX, sunY, 60, 0, Math.PI * 2);
  ctx.fill();
  // 仅保留一条极淡的大气横纹，避免把圆形高光切碎。
  ctx.fillStyle = 'rgba(255,214,168,0.2)';
  ctx.fillRect(sunX - 92, sunY + 10, 190, 1.2);

  // 前景碑体给日盘留出完整缺口，保证主视觉的亮部能被读到。
  const monoliths: Array<[number, number, number, number]> = [
    [-20, 300, 250, 420],
    [208, 386, 172, 334],
    [356, 268, 118, 452],
    [474, 430, 196, 290],
    [690, 566, 150, 184],
    [860, 466, 196, 254],
  ];
  monoliths.forEach(([x, y, w, h], index) => {
    const shade = ctx.createLinearGradient(x, y, x + w, y + h);
    shade.addColorStop(0, index % 2 === 0 ? '#2a3346' : '#222b3b');
    shade.addColorStop(1, '#0a0e17');
    ctx.fillStyle = shade;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,208,158,0.72)';
    ctx.fillRect(x + w - 2, y + 8, 2, h - 12);
    ctx.fillStyle = 'rgba(0,240,255,0.22)';
    ctx.fillRect(x + 4, y + 6, Math.max(8, w * 0.18), 1.4);
  });

  // 极细青色地平线，与街区导视呼应，但面积克制。
  ctx.fillStyle = 'rgba(0,240,255,0.46)';
  ctx.fillRect(0, height * 0.618, width, 1);

  // 颗粒与暗角，让画面接近印刷摄影而不是矢量插画。
  for (let i = 0; i < 9000; i += 1) {
    const alpha = 0.015 + rand() * 0.04;
    ctx.fillStyle = rand() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
    ctx.fillRect(rand() * width, rand() * height, 1 + rand() * 1.6, 1 + rand() * 1.6);
  }
  const vignette = ctx.createRadialGradient(
    width * 0.52,
    height * 0.5,
    height * 0.18,
    width * 0.52,
    height * 0.5,
    width * 0.7,
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.24)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  // 轻微抬高中低调，保证展馆橱窗里的画面在夜间照明下仍能读清。
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(255,216,176,0.055)';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  ctx.strokeStyle = 'rgba(255,226,192,0.24)';
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 22, width - 44, height - 44);

  ctx.fillStyle = 'rgba(255,240,220,0.52)';
  ctx.font = '500 15px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.textBaseline = 'bottom';
  ctx.fillText('LOHINA · 主视觉演示', 40, height - 38);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.36)';
  ctx.fillText('TWILIGHT STRUCTURE / 01', width - 40, height - 38);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/**
 * E-01 次视觉：窄幅展览海报，用于入口北侧的竖向灯箱。
 */
export function createGalleryPosterTexture(): THREE.CanvasTexture {
  const width = 512;
  const height = 1024;
  const [canvas, ctx] = canvas2d(width, height);
  const rand = seededRandom(44119);

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#0b1019');
  bg.addColorStop(0.55, '#171a26');
  bg.addColorStop(1, '#080b12');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // 竖向光带，模拟被灯箱压亮的纤维纸。
  for (let i = 0; i < 40; i += 1) {
    const x = rand() * width;
    const h = 120 + rand() * height * 0.62;
    ctx.fillStyle = i % 7 === 0 ? 'rgba(0,240,255,0.16)' : 'rgba(255,179,102,0.1)';
    ctx.fillRect(x, height * 0.62 - h / 2, 1 + rand() * 3, h);
  }

  ctx.fillStyle = 'rgba(255,179,102,0.92)';
  ctx.font = '300 220px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('01', 44, 330);

  ctx.strokeStyle = 'rgba(255,218,176,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(46, 366);
  ctx.lineTo(width - 46, 366);
  ctx.stroke();

  ctx.fillStyle = '#f0ddc5';
  ctx.font = '600 46px "Microsoft YaHei", "Segoe UI", sans-serif';
  ctx.fillText('暮光构造', 46, 456);
  ctx.fillStyle = 'rgba(0,240,255,0.66)';
  ctx.font = '500 20px "Segoe UI", sans-serif';
  drawSpacedText(ctx, 'TWILIGHT STRUCTURE', 46, 496, 4);

  ctx.fillStyle = 'rgba(233,216,194,0.62)';
  ctx.font = '400 20px "Microsoft YaHei", "Segoe UI", sans-serif';
  ctx.fillText('视觉与摄影 · 主视觉展', 46, 560);
  ctx.fillText('E-01 / GALLERY', 46, 594);

  // 底部横向色层，与主视觉的砂岩层形成系列感。
  for (let i = 0; i < 12; i += 1) {
    const y = 680 + i * 24;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255,179,102,0.4)' : 'rgba(150,119,96,0.16)';
    ctx.fillRect(46 + rand() * 120, y, width - 92 - rand() * 160, 1.4);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.34)';
  ctx.font = '400 16px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.fillText('2026 · LOHINA WORLD', 46, height - 54);

  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.strokeRect(18.5, 18.5, width - 37, height - 37);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/**
 * E-01 门头牌：深色底板上的双语字标，亮度低于纯白，避免近景过曝。
 */
export function createGallerySignTexture(): THREE.CanvasTexture {
  const width = 1024;
  const height = 256;
  const [canvas, ctx] = canvas2d(width, height);
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255,179,102,0.9)';
  ctx.fillRect(48, 54, 3, 130);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e4cfb2';
  ctx.font = '500 78px "Segoe UI", "Microsoft YaHei", sans-serif';
  drawSpacedText(ctx, 'GALLERY', 76, 104, 13);

  ctx.fillStyle = 'rgba(205,166,120,0.9)';
  ctx.font = '400 25px "Microsoft YaHei", "Segoe UI", sans-serif';
  drawSpacedText(ctx, '视觉与摄影 · VISUAL & PHOTOGRAPHY', 78, 168, 2);

  ctx.strokeStyle = 'rgba(255,205,152,0.32)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(78, 198);
  ctx.lineTo(width - 88, 198);
  ctx.stroke();

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(150,224,233,0.78)';
  ctx.font = '500 26px "Segoe UI", sans-serif';
  drawSpacedText(ctx, 'E-01', width - 64, 104, 4);
  ctx.fillStyle = 'rgba(233,216,194,0.5)';
  ctx.font = '400 18px "Microsoft YaHei", "Segoe UI", sans-serif';
  ctx.fillText('展馆入口', width - 64, 168);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
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
