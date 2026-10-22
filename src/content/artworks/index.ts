/**
 * 首发展示图全部由 Canvas 程序化生成，并在画面一角明确标注“演示图”。
 * 正式作品接入时，只需替换 previewUrl / width / height，展位与灯箱接口不变。
 */

export interface ArtworkSpec {
  id: string;
  title: string;
  description: string;
  alt: string;
  width: number;
  height: number;
  attribution: string;
  canvas: HTMLCanvasElement;
  previewUrl: string;
}

interface ArtworkRecipe {
  id: string;
  title: string;
  description: string;
  variant: 'arcs' | 'strata' | 'grid' | 'orbit' | 'signal' | 'monolith' | 'rain' | 'bloom' | 'horizon';
  orientation: 'wide' | 'tall';
  seed: number;
  accent: string;
  secondary: string;
  ink: string;
}

const DEMO_ATTRIBUTION = '演示图 · 由 LOHINA WORLD 程序化生成，非真实作品';

const recipes: ArtworkRecipe[] = [
  {
    id: 'W1',
    title: '暮光折线',
    description: '用弧线与暖色光带拆解黄昏的层次，是西侧图片街的第一幅近景演示。',
    variant: 'arcs',
    orientation: 'wide',
    seed: 1127,
    accent: '#FFB366',
    secondary: '#00F0FF',
    ink: '#171A28',
  },
  {
    id: 'W2',
    title: '砂岩回声',
    description: '把建筑的粗粝表面压成横向色层，让暖砂岩与冷夜形成缓慢的回声。',
    variant: 'strata',
    orientation: 'wide',
    seed: 2281,
    accent: '#D59B6A',
    secondary: '#7FA9FF',
    ink: '#141829',
  },
  {
    id: 'W3',
    title: '青色导视',
    description: '以网格和微光节点模拟街区导视，讨论方向感如何被一条细线建立。',
    variant: 'grid',
    orientation: 'wide',
    seed: 3389,
    accent: '#00F0FF',
    secondary: '#FFB366',
    ink: '#101522',
  },
  {
    id: 'W4',
    title: '夜行剖面',
    description: '环绕的椭圆像被切开的轨道，记录夜色里不断校准的行走路径。',
    variant: 'orbit',
    orientation: 'wide',
    seed: 4477,
    accent: '#9EC5FF',
    secondary: '#FFC98A',
    ink: '#121726',
  },
  {
    id: 'W5',
    title: '环路之光',
    description: '小院所藏的第二组光：垂直脉冲与水平地平线交汇，作为探索环路的收束。',
    variant: 'signal',
    orientation: 'wide',
    seed: 5591,
    accent: '#FFB366',
    secondary: '#00F0FF',
    ink: '#151A29',
  },
  {
    id: 'P1',
    title: '双塔之间',
    description: '高楼海报位的竖向演示，验证 9:16 比例下的远景观赏与构图重心。',
    variant: 'monolith',
    orientation: 'tall',
    seed: 6619,
    accent: '#FFB366',
    secondary: '#7896D8',
    ink: '#121726',
  },
  {
    id: 'P2',
    title: '暖槽',
    description: '一束沿墙爬升的暖光，测试竖向画面在暮光环境中的可读性。',
    variant: 'rain',
    orientation: 'tall',
    seed: 7723,
    accent: '#E8A26C',
    secondary: '#00F0FF',
    ink: '#141829',
  },
  {
    id: 'P3',
    title: '广场引力',
    description: '同心轨道向画面中心收拢，作为从广场仰望东北塔时的视觉锚点。',
    variant: 'bloom',
    orientation: 'tall',
    seed: 8831,
    accent: '#9EC5FF',
    secondary: '#FFB366',
    ink: '#101522',
  },
  {
    id: 'P4',
    title: '低空星群',
    description: '细碎光点组成低空星群，用于检验高楼海报在夜色中的噪点与清晰边界。',
    variant: 'horizon',
    orientation: 'tall',
    seed: 9949,
    accent: '#FFD7A3',
    secondary: '#00F0FF',
    ink: '#131828',
  },
];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paint(recipe: ArtworkRecipe): HTMLCanvasElement {
  const width = recipe.orientation === 'wide' ? 960 : 540;
  const height = recipe.orientation === 'wide' ? 600 : 960;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const rand = mulberry32(recipe.seed);
  const bg = ctx.createLinearGradient(0, 0, width * 0.35, height);
  bg.addColorStop(0, recipe.ink);
  bg.addColorStop(0.55, '#1B2236');
  bg.addColorStop(1, recipe.ink);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // 统一的细颗粒，让画面更像印刷品而不是纯矢量。
  ctx.save();
  for (let i = 0; i < 5200; i += 1) {
    const x = rand() * width;
    const y = rand() * height;
    const size = rand() * 1.6 + 0.3;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)';
    ctx.fillRect(x, y, size, size);
  }
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  if (recipe.variant === 'arcs') {
    const cx = width * 0.68;
    const cy = height * 0.42;
    for (let i = 0; i < 15; i += 1) {
      const radius = width * (0.05 + i * 0.047);
      ctx.beginPath();
      ctx.strokeStyle = i % 3 === 0 ? recipe.secondary : recipe.accent;
      ctx.globalAlpha = 0.08 + rand() * 0.16;
      ctx.lineWidth = 1 + rand() * 7;
      ctx.arc(cx, cy, radius, -2.4 + i * 0.05, 1.15 + i * 0.03);
      ctx.stroke();
    }
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, width * 0.32);
    glow.addColorStop(0, 'rgba(255,179,102,0.24)');
    glow.addColorStop(1, 'rgba(255,179,102,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = recipe.ink;
    ctx.beginPath();
    ctx.arc(cx, cy, width * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }

  if (recipe.variant === 'strata') {
    let y = 0;
    while (y < height) {
      const h = 12 + rand() * 54;
      const warm = rand() > 0.62;
      ctx.globalAlpha = 0.1 + rand() * 0.26;
      ctx.fillStyle = warm ? recipe.accent : recipe.secondary;
      ctx.fillRect(0, y, width, Math.max(1, h * 0.12));
      if (warm && rand() > 0.6) {
        ctx.globalAlpha = 0.18 + rand() * 0.3;
        ctx.fillRect(rand() * width * 0.7, y, width * (0.08 + rand() * 0.25), 1.5);
      }
      y += h;
    }
    const beam = ctx.createLinearGradient(0, height, width, 0);
    beam.addColorStop(0, 'rgba(255,179,102,0)');
    beam.addColorStop(0.5, 'rgba(255,179,102,0.18)');
    beam.addColorStop(1, 'rgba(255,179,102,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = beam;
    ctx.fillRect(0, 0, width, height);
  }

  if (recipe.variant === 'grid') {
    const horizon = height * 0.56;
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = recipe.accent;
    ctx.lineWidth = 1;
    for (let i = -14; i <= 14; i += 1) {
      ctx.beginPath();
      ctx.moveTo(width / 2 + i * 8, horizon);
      ctx.lineTo(width / 2 + i * 76, height);
      ctx.stroke();
    }
    for (let i = 1; i < 16; i += 1) {
      const t = i / 16;
      const y = horizon + Math.pow(t, 1.8) * (height - horizon);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    for (let i = 0; i < 26; i += 1) {
      const gx = rand() * width;
      const gy = horizon + rand() * (height - horizon);
      const r = 1 + rand() * 3;
      ctx.globalAlpha = 0.4 + rand() * 0.5;
      ctx.fillStyle = i % 4 === 0 ? recipe.secondary : recipe.accent;
      ctx.beginPath();
      ctx.arc(gx, gy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, 'rgba(20,24,41,0)');
    sky.addColorStop(1, 'rgba(42,53,96,0.45)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, horizon);
  }

  if (recipe.variant === 'orbit') {
    const cx = width * 0.5;
    const cy = height * 0.48;
    for (let i = 0; i < 9; i += 1) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.7 + i * 0.19);
      ctx.beginPath();
      ctx.strokeStyle = i % 2 === 0 ? recipe.accent : recipe.secondary;
      ctx.globalAlpha = 0.1 + rand() * 0.2;
      ctx.lineWidth = 0.8 + rand() * 2.4;
      ctx.ellipse(0, 0, width * (0.16 + i * 0.035), height * (0.06 + i * 0.022), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, width * 0.18);
    core.addColorStop(0, 'rgba(255,214,168,0.7)');
    core.addColorStop(0.35, 'rgba(255,179,102,0.18)');
    core.addColorStop(1, 'rgba(255,179,102,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, width, height);
  }

  if (recipe.variant === 'signal') {
    for (let i = 0; i < 34; i += 1) {
      const x = (i / 34) * width + rand() * 8;
      const h = 20 + Math.pow(rand(), 1.6) * height * 0.62;
      ctx.globalAlpha = 0.06 + rand() * 0.16;
      ctx.fillStyle = i % 5 === 0 ? recipe.secondary : recipe.accent;
      ctx.fillRect(x, height * 0.58 - h / 2, 2 + rand() * 5, h);
    }
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = recipe.secondary;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 6) {
      const y =
        height * 0.58 +
        Math.sin(x * 0.018 + recipe.seed) * 26 +
        Math.sin(x * 0.057) * 9;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.58);
    ctx.lineTo(width, height * 0.58);
    ctx.stroke();
  }

  if (recipe.variant === 'monolith') {
    const baseY = height * 0.8;
    for (let i = 0; i < 7; i += 1) {
      const w = width * (0.06 + rand() * 0.15);
      const h = height * (0.16 + rand() * 0.6);
      const x = width * 0.12 + i * width * 0.115;
      ctx.globalAlpha = 0.1 + rand() * 0.18;
      ctx.fillStyle = i % 2 === 0 ? recipe.accent : recipe.secondary;
      ctx.fillRect(x, baseY - h, w, h);
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x + w - 2, baseY - h, 2, h);
    }
    const horizon = ctx.createLinearGradient(0, height * 0.3, 0, height);
    horizon.addColorStop(0, 'rgba(255,179,102,0)');
    horizon.addColorStop(1, 'rgba(255,179,102,0.2)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = horizon;
    ctx.fillRect(0, height * 0.3, width, height * 0.7);
  }

  if (recipe.variant === 'rain') {
    for (let i = 0; i < 120; i += 1) {
      const x = rand() * width;
      const y = rand() * height;
      const len = 20 + rand() * height * 0.4;
      ctx.globalAlpha = 0.04 + rand() * 0.16;
      ctx.strokeStyle = i % 6 === 0 ? recipe.secondary : recipe.accent;
      ctx.lineWidth = 0.6 + rand() * 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - len * 0.35, y + len);
      ctx.stroke();
    }
    const band = ctx.createLinearGradient(0, 0, width, 0);
    band.addColorStop(0, 'rgba(255,179,102,0)');
    band.addColorStop(0.5, 'rgba(255,179,102,0.16)');
    band.addColorStop(1, 'rgba(255,179,102,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = band;
    ctx.fillRect(0, height * 0.22, width, 3);
  }

  if (recipe.variant === 'bloom') {
    const cx = width * 0.5;
    const cy = height * 0.44;
    for (let i = 0; i < 24; i += 1) {
      const radius = 8 + i * 13;
      ctx.beginPath();
      ctx.strokeStyle = i % 3 === 0 ? recipe.secondary : recipe.accent;
      ctx.globalAlpha = 0.05 + (24 - i) * 0.007;
      ctx.lineWidth = 0.8 + rand() * 2;
      ctx.arc(cx, cy, radius, rand() * Math.PI * 2, rand() * Math.PI * 2 + 2);
      ctx.stroke();
    }
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 150);
    core.addColorStop(0, 'rgba(255,240,220,0.55)');
    core.addColorStop(0.18, 'rgba(255,179,102,0.22)');
    core.addColorStop(1, 'rgba(255,179,102,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, width, height);
  }

  if (recipe.variant === 'horizon') {
    const horizon = height * 0.62;
    const glow = ctx.createLinearGradient(0, horizon - 120, 0, horizon + 120);
    glow.addColorStop(0, 'rgba(255,215,163,0)');
    glow.addColorStop(0.5, 'rgba(255,215,163,0.24)');
    glow.addColorStop(1, 'rgba(255,215,163,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = glow;
    ctx.fillRect(0, horizon - 120, width, 240);
    for (let i = 0; i < 170; i += 1) {
      const x = rand() * width;
      const y = rand() * horizon * 0.92;
      const r = rand() * 1.8 + 0.4;
      ctx.globalAlpha = 0.15 + rand() * 0.6;
      ctx.fillStyle = i % 9 === 0 ? recipe.secondary : recipe.accent;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = recipe.accent;
    ctx.fillRect(0, horizon, width, 1);
  }

  ctx.restore();

  // 暗角与细边框，让展示图在深色界面里有明确的边界。
  const vignette = ctx.createRadialGradient(
    width * 0.5,
    height * 0.45,
    width * 0.1,
    width * 0.5,
    height * 0.5,
    width * 0.78,
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.strokeRect(18.5, 18.5, width - 37, height - 37);

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '500 13px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`LOHINA · 演示图 ${recipe.id}`, 34, height - 34);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.fillText('PROGRAMMATIC STUDY', width - 34, height - 34);

  return canvas;
}

function buildArtwork(recipe: ArtworkRecipe): ArtworkSpec {
  const canvas = paint(recipe);
  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    alt: `程序化演示图《${recipe.title}》：${recipe.description}`,
    width: canvas.width,
    height: canvas.height,
    attribution: DEMO_ATTRIBUTION,
    canvas,
    previewUrl: canvas.toDataURL('image/jpeg', 0.88),
  };
}

const artworkMap = new Map<string, ArtworkSpec>(recipes.map((r) => [r.id, buildArtwork(r)]));

export const allArtworks: ArtworkSpec[] = [...artworkMap.values()];

export function getArtwork(id: string): ArtworkSpec {
  const artwork = artworkMap.get(id);
  if (!artwork) throw new Error(`未知演示图：${id}`);
  return artwork;
}

export { DEMO_ATTRIBUTION };
