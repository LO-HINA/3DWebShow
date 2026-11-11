import * as THREE from 'three';
import type { BuildingSpec } from '../types';
import { curveFront } from './junctionGeometry';

/**
 * NW(0) 巨幕虚拟屏：沿凹/凸曲面分段贴合，单几何单材质，内容为程序化 Canvas。
 * 屏幕朝向由建筑 yawRad 决定；当前布局让弧面正对中心 LM-01。
 */
export const NW_MEDIA_SCREEN = {
  width: 17,
  height: 20,
  bottom: 5.4,
  surfaceOffset: 0.82,
  segments: 20,
  canvasWidth: 1536,
  canvasHeight: 1808,
  columns: [-6.8, -3.4, 0, 3.4, 6.8],
} as const;

const TAU = Math.PI * 2;
const hash = (n: number): number => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function paintScreen(ctx: CanvasRenderingContext2D, w: number, h: number, time: number): void {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#02040b');
  bg.addColorStop(0.42, '#061127');
  bg.addColorStop(0.72, '#0a1d36');
  bg.addColorStop(1, '#03060d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const glow = (cx: number, cy: number, radius: number, inner: string, outer: string): void => {
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, inner);
    gradient.addColorStop(1, outer);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  };
  glow(w * 0.5, h * 0.4, w * 0.66, 'rgba(40,140,220,0.30)', 'rgba(0,0,0,0)');
  glow(w * 0.16, h * 0.72, w * 0.52, 'rgba(150,60,220,0.12)', 'rgba(0,0,0,0)');

  for (let i = 0; i < 110; i += 1) {
    const x = hash(i) * w;
    const y = hash(i + 200) * h * 0.56;
    const twinkle = 0.22 + 0.55 * (0.5 + 0.5 * Math.sin(time * 1.3 + i));
    ctx.fillStyle = `rgba(190,238,255,${twinkle.toFixed(3)})`;
    const size = 1 + hash(i + 400) * 2;
    ctx.fillRect(x, y, size, size);
  }

  const horizon = h * 0.6;
  ctx.save();
  ctx.strokeStyle = 'rgba(86,226,255,0.32)';
  ctx.lineWidth = 2;
  for (let i = 1; i <= 11; i += 1) {
    const p = i / 11;
    const y = horizon + (h - horizon) * p ** 1.9;
    ctx.globalAlpha = 0.12 + 0.34 * (1 - p);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  for (let i = -9; i <= 9; i += 1) {
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.moveTo(w * 0.5 + i * w * 0.012, horizon);
    ctx.lineTo(w * 0.5 + i * w * 0.11, h);
    ctx.stroke();
  }
  ctx.restore();

  for (let i = 0; i < 14; i += 1) {
    const bw = w * (0.03 + hash(i + 9) * 0.055);
    const bh = h * (0.06 + hash(i + 30) * 0.16);
    const x = hash(i + 50) * (w - bw);
    const y = horizon - bh;
    ctx.fillStyle = 'rgba(4,10,22,0.9)';
    ctx.fillRect(x, y, bw, bh);
    ctx.strokeStyle = i % 3 === 0 ? 'rgba(198,123,255,0.38)' : 'rgba(111,233,255,0.32)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);
    for (let j = 0; j < 5; j += 1) {
      if (hash(i * 31 + j) > 0.45) continue;
      ctx.fillStyle = 'rgba(120,230,255,0.24)';
      ctx.fillRect(x + bw * (0.15 + hash(i + j) * 0.6), y + bh * (0.1 + hash(i * 7 + j) * 0.75), 3, 3);
    }
  }

  const cx = w * 0.5;
  const cy = h * 0.42;
  const radius = w * 0.185;
  const pulse = 0.92 + 0.08 * Math.sin(time * 1.6);
  const orb = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius * 1.25 * pulse);
  orb.addColorStop(0, 'rgba(240,252,255,0.98)');
  orb.addColorStop(0.32, 'rgba(128,236,255,0.92)');
  orb.addColorStop(0.62, 'rgba(50,150,255,0.45)');
  orb.addColorStop(1, 'rgba(20,60,140,0)');
  ctx.fillStyle = orb;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.25 * pulse, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(208,248,255,0.9)';
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.72, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.translate(cx, cy);
  for (let k = 0; k < 3; k += 1) {
    const ringRadius = radius * (1.18 + k * 0.16);
    const rotation = time * (k % 2 === 0 ? 0.12 : -0.18) + k * 1.1;
    ctx.save();
    ctx.rotate(rotation);
    ctx.strokeStyle = k === 1 ? `rgba(198,123,255,${0.55 - k * 0.12})` : `rgba(111,233,255,${0.55 - k * 0.12})`;
    ctx.lineWidth = 3 + (2 - k);
    ctx.beginPath();
    ctx.ellipse(0, 0, ringRadius, ringRadius * 0.34, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  for (let k = 0; k < 4; k += 1) {
    const angle = time * (0.5 + k * 0.17) + k * 1.7;
    const orbit = radius * (1.7 + k * 0.18);
    ctx.fillStyle = k % 2 === 0 ? '#9ff4ff' : '#c77bff';
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * orbit, Math.sin(angle) * orbit * 0.34, 4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(235,250,255,0.96)';
  ctx.font = `900 ${Math.round(w * 0.135)}px "Microsoft YaHei","PingFang SC",Arial,sans-serif`;
  ctx.fillText('LOHINA', w * 0.5, h * 0.145);
  ctx.fillStyle = 'rgba(150,225,255,0.9)';
  ctx.font = `600 ${Math.round(w * 0.028)}px "Microsoft YaHei","PingFang SC",Arial,sans-serif`;
  ctx.fillText('N I G H T   A T E L I E R   ·   N W ( 0 )', w * 0.5, h * 0.188);

  ctx.fillStyle = 'rgba(240,250,255,0.95)';
  ctx.font = `800 ${Math.round(w * 0.085)}px "Microsoft YaHei","PingFang SC",Arial,sans-serif`;
  ctx.fillText('虚拟艺廊', w * 0.5, h * 0.79);
  ctx.fillStyle = 'rgba(130,220,255,0.85)';
  ctx.font = `500 ${Math.round(w * 0.026)}px "Microsoft YaHei","PingFang SC",Arial,sans-serif`;
  ctx.fillText('VIRTUAL GALLERY  /  SIGNAL FEED 07', w * 0.5, h * 0.828);

  ctx.save();
  ctx.translate(w * 0.058, h * 0.5);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'left';
  ctx.font = `500 ${Math.round(w * 0.02)}px "Microsoft YaHei",Arial,sans-serif`;
  ctx.fillStyle = 'rgba(120,225,255,0.7)';
  ctx.fillText('NW-00  //  CURVED MEDIA FACADE', 0, 0);
  ctx.restore();
  ctx.save();
  ctx.translate(w * 0.942, h * 0.5);
  ctx.rotate(Math.PI / 2);
  ctx.textAlign = 'right';
  ctx.font = `500 ${Math.round(w * 0.02)}px "Microsoft YaHei",Arial,sans-serif`;
  ctx.fillStyle = 'rgba(198,140,255,0.68)';
  ctx.fillText('LOHINA WORLD  ·  VIRTUAL DISTRICT', 0, 0);
  ctx.restore();

  const tickerY = h * 0.925;
  ctx.fillStyle = 'rgba(4,10,20,0.85)';
  ctx.fillRect(0, tickerY, w, h - tickerY);
  ctx.strokeStyle = 'rgba(111,233,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, tickerY);
  ctx.lineTo(w, tickerY);
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.font = `600 ${Math.round(w * 0.022)}px Consolas,"Microsoft YaHei",monospace`;
  ctx.fillStyle = 'rgba(160,240,255,0.92)';
  const ticker = 'SIGNAL 07  ·  虚拟城区  ·  LIVE RENDER  ·  LOHINA WORLD  ·  NW(0)  ·  ';
  const shift = (time * 46) % (w * 1.4);
  ctx.fillText(ticker.repeat(3), -shift, tickerY + h * 0.046);

  const sweepY = ((time * 0.09) % 1) * h;
  const sweep = ctx.createLinearGradient(0, sweepY - h * 0.06, 0, sweepY + h * 0.06);
  sweep.addColorStop(0, 'rgba(120,230,255,0)');
  sweep.addColorStop(0.5, 'rgba(150,240,255,0.10)');
  sweep.addColorStop(1, 'rgba(120,230,255,0)');
  ctx.fillStyle = sweep;
  ctx.fillRect(0, sweepY - h * 0.06, w, h * 0.12);

  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  for (let y = 0; y < h; y += 6) ctx.fillRect(0, y, w, 2);

  const vignette = ctx.createRadialGradient(w * 0.5, h * 0.5, h * 0.25, w * 0.5, h * 0.5, h * 0.75);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** 曲面屏幕条带：单个 BufferGeometry，UV 按 x 方向铺满整幅画面。 */
function curvedStrip(
  spec: BuildingSpec, x0: number, x1: number, y0: number, y1: number, offset: number, segments: number,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const x = x0 + (x1 - x0) * t;
    const z = curveFront(spec, x) + offset;
    positions.push(x, y0, z, x, y1, z);
    uvs.push(t, 0, t, 1);
  }
  for (let i = 0; i < segments; i += 1) {
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export interface NwMediaScreenHandle {
  group: THREE.Group;
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  texture: THREE.CanvasTexture;
}

export function createNwMediaScreen(spec: BuildingSpec, anisotropy: number): NwMediaScreenHandle {
  const group = new THREE.Group();
  group.name = 'NW(0)_GiantScreen';
  const { width, height, bottom, surfaceOffset, segments, canvasWidth, canvasHeight } = NW_MEDIA_SCREEN;
  const half = width / 2;
  const top = bottom + height;

  const housing = new THREE.MeshStandardMaterial({ color: 0x0a0f18, roughness: 0.62, metalness: 0.48 });
  const frame = new THREE.MeshStandardMaterial({ color: 0x314257, roughness: 0.34, metalness: 0.78 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x05080f, roughness: 0.82, metalness: 0.2 });

  const backing = new THREE.Mesh(
    curvedStrip(spec, -half - 0.42, half + 0.42, bottom - 0.42, top + 0.42, surfaceOffset - 0.5, segments),
    housing,
  );
  backing.name = 'NW(0)_ScreenHousing';
  backing.receiveShadow = true;
  group.add(backing);

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('NW(0) media screen requires a 2D canvas context');
  paintScreen(context, canvasWidth, canvasHeight, performance.now() * 0.001);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;

  const material = new THREE.MeshBasicMaterial({ map: texture, color: 0xffffff, toneMapped: false, fog: true });
  material.userData.bloom = true;
  const mesh = new THREE.Mesh(
    curvedStrip(spec, -half, half, bottom, top, surfaceOffset, segments),
    material,
  );
  mesh.name = 'NW(0)_GiantScreen_Panel';
  mesh.userData.noMerge = true;
  mesh.userData.mediaSlot = 'nw-giant-screen';
  group.add(mesh);

  let lastPaint = 0;
  mesh.onBeforeRender = () => {
    const now = performance.now();
    if (now - lastPaint < 220) return;
    lastPaint = now;
    paintScreen(context, canvasWidth, canvasHeight, now * 0.001);
    texture.needsUpdate = true;
  };

  const railPoints = (y: number): THREE.Vector3[] => {
    const points: THREE.Vector3[] = [];
    const count = 40;
    for (let i = 0; i <= count; i += 1) {
      const x = -half - 0.45 + (width + 0.9) * (i / count);
      points.push(new THREE.Vector3(x, y, curveFront(spec, x) + surfaceOffset + 0.02));
    }
    return points;
  };
  for (const y of [bottom - 0.28, top + 0.28]) {
    const rail = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(railPoints(y)), 40, 0.16, 6, false),
      frame,
    );
    rail.name = 'NW(0)_ScreenRail';
    rail.castShadow = true;
    rail.receiveShadow = true;
    group.add(rail);
  }

  for (const side of [-1, 1]) {
    const x = side * (half + 0.26);
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.52, height + 0.56, 0.9), frame);
    pillar.name = 'NW(0)_ScreenPillar';
    pillar.position.set(x, bottom + height / 2, curveFront(spec, x) + surfaceOffset - 0.12);
    pillar.rotation.y = -Math.atan2(curveFront(spec, x + 0.01) - curveFront(spec, x - 0.01), 0.02);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    group.add(pillar);
  }

  // 结构竖梃从屏前跨过，保留“屏幕嵌在建筑里”的构造关系。
  for (const x of NW_MEDIA_SCREEN.columns) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.14, height, 0.16), dark);
    bar.name = 'NW(0)_ScreenMullion';
    bar.position.set(x, bottom + height / 2, curveFront(spec, x) + surfaceOffset + 0.1);
    bar.rotation.y = -Math.atan2(curveFront(spec, x + 0.01) - curveFront(spec, x - 0.01), 0.02);
    bar.castShadow = true;
    group.add(bar);
  }

  // 底部检修马道与两侧支架，避免屏幕悬空。
  const walkway = new THREE.Mesh(new THREE.BoxGeometry(width + 0.9, 0.16, 0.9), frame);
  walkway.name = 'NW(0)_ScreenWalkway';
  walkway.position.set(0, bottom - 0.52, curveFront(spec, 0) + surfaceOffset - 0.34);
  walkway.castShadow = true;
  walkway.receiveShadow = true;
  group.add(walkway);
  for (const x of [-half + 1.2, half - 1.2]) {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.6, 0.62), housing);
    bracket.name = 'NW(0)_ScreenBracket';
    bracket.position.set(x, bottom - 0.9, curveFront(spec, x) + surfaceOffset - 0.5);
    bracket.rotation.y = -Math.atan2(curveFront(spec, x + 0.01) - curveFront(spec, x - 0.01), 0.02);
    group.add(bracket);
  }

  group.traverse(object => {
    if (object instanceof THREE.Mesh) object.userData.noMerge = true;
  });
  return { group, mesh, material, texture };
}
