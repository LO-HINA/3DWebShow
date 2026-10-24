import * as THREE from 'three';
import type { BuildingSpec } from '../types';
import { createLabelMaterial } from '../materials';
import { createSignTexture, createVerticalSignTexture } from '../textures';
import type { BuildContext, BuiltBuilding } from './buildings';

const EDGE = 0.045;

function canvas2d(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D 上下文不可用');
  return [canvas, ctx];
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function finishTexture(canvas: HTMLCanvasElement, anisotropy: number): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

/** 主塔竖版媒体画面：原创抽象信号图，不使用参考站或第三方素材。 */
function createHeroPosterTexture(anisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = canvas2d(512, 1280);
  const rand = seededRandom(1107);

  const base = ctx.createLinearGradient(0, 0, 512, 1280);
  base.addColorStop(0, '#050914');
  base.addColorStop(0.28, '#17103a');
  base.addColorStop(0.52, '#5f1d68');
  base.addColorStop(0.74, '#0d607c');
  base.addColorStop(1, '#02080f');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 1280);

  ctx.strokeStyle = 'rgba(150, 225, 255, 0.09)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 512; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1280);
    ctx.stroke();
  }
  for (let y = 0; y <= 1280; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  const glow = ctx.createRadialGradient(280, 390, 20, 280, 390, 330);
  glow.addColorStop(0, 'rgba(255, 110, 220, 0.62)');
  glow.addColorStop(0.42, 'rgba(120, 80, 255, 0.18)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 512, 1280);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(235, 250, 255, 0.62)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(270, 390, 156, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(270, 390, 104, 0.2, Math.PI * 1.55);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(270, 390, 54, 2.6, 6.0);
  ctx.stroke();

  for (let i = 0; i < 90; i += 1) {
    const x = rand() * 512;
    const y = rand() * 1280;
    const width = 2 + rand() * 18;
    const height = 2 + rand() * 5;
    ctx.fillStyle = i % 4 === 0
      ? 'rgba(255, 255, 255, 0.76)'
      : i % 3 === 0
        ? 'rgba(255, 110, 220, 0.5)'
        : 'rgba(0, 240, 255, 0.42)';
    ctx.fillRect(x, y, width, height);
  }

  for (let i = 0; i < 8; i += 1) {
    const x = 28 + i * 62;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 110, 220, 0.18)';
    ctx.fillRect(x, 720 + (i % 3) * 18, 10, 190 + (i % 4) * 34);
  }
  ctx.restore();

  // 黑色结构梁：与前景竖梃/横梁对位，让屏幕像被建筑骨架切开。
  ctx.fillStyle = '#02040a';
  ctx.fillRect(0, 264, 512, 26);
  ctx.fillRect(0, 986, 512, 26);
  ctx.fillRect(118, 0, 20, 1280);
  ctx.fillRect(374, 0, 20, 1280);
  ctx.fillRect(0, 596, 512, 14);
  ctx.fillRect(244, 640, 14, 286);

  ctx.strokeStyle = 'rgba(255, 130, 230, 0.46)';
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, 98, 240);
  ctx.strokeRect(148, 10, 216, 240);
  ctx.strokeRect(404, 10, 98, 240);

  ctx.fillStyle = 'rgba(232, 250, 255, 0.86)';
  ctx.font = '600 22px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('LOHINA // SIGNAL 01', 30, 1236);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(111, 230, 255, 0.82)';
  ctx.fillText('H-01', 482, 1236);

  return finishTexture(canvas, anisotropy);
}

/** 悬挑 HUD：青绿机能屏，含警示斜纹、状态框与数据列。 */
function createHeroHudTexture(anisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = canvas2d(1024, 512);
  ctx.fillStyle = 'rgba(3, 14, 20, 0.97)';
  ctx.fillRect(0, 0, 1024, 512);

  ctx.strokeStyle = 'rgba(0, 255, 200, 0.1)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 1024; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y <= 512; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(866, 20, 122, 78);
  ctx.rect(20, 378, 116, 102);
  ctx.clip();
  ctx.strokeStyle = '#c8ff2e';
  ctx.lineWidth = 11;
  for (let i = -560; i < 1240; i += 26) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i - 320, 512);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = '#a8ffdb';
  ctx.font = '600 21px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('オンライン / MEDIA NODE', 36, 56);
  ctx.fillStyle = '#eafff9';
  ctx.font = '900 54px "Segoe UI", sans-serif';
  ctx.shadowColor = '#00ffc8';
  ctx.shadowBlur = 18;
  ctx.fillText('LOHINA // 90', 480, 68);
  ctx.shadowBlur = 0;

  const labels = ['SYS', 'LHN', 'GPU', 'NET'];
  labels.forEach((label, index) => {
    const x = 278 + index * 132;
    ctx.strokeStyle = '#7affd4';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, 144, 96, 96);
    ctx.fillStyle = 'rgba(0, 255, 200, 0.13)';
    ctx.fillRect(x + 6, 150, 84, 84);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 27px monospace';
    ctx.fillText(label, x + 20, 202);
  });

  ctx.fillStyle = '#6ce6c2';
  ctx.font = '14px monospace';
  for (let row = 0; row < 8; row += 1) {
    ctx.fillText(`0${row} // MEM_ALLOC_${row * 128 + 64}KB`, 36, 156 + row * 23);
    ctx.fillText(`NODE_SYNC_${90 + row}% [OK]`, 792, 156 + row * 23);
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 17px monospace';
  ctx.fillText('TOTAL DISTRIBUTIONS // ONLINE', 298, 326);
  ctx.strokeStyle = '#a8ffdb';
  ctx.lineWidth = 3;
  ctx.strokeRect(278, 342, 484, 44);
  ctx.fillStyle = 'rgba(168, 255, 219, 0.28)';
  ctx.fillRect(286, 350, 356, 28);
  ctx.fillStyle = '#c8ff2e';
  ctx.fillRect(646, 350, 108, 28);

  ctx.strokeStyle = '#52ffc8';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 1012, 500);

  return finishTexture(canvas, anisotropy);
}

/** 底层透明文字矩阵墙。 */
function createHeroTypographyTexture(anisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = canvas2d(1024, 640);

  ctx.strokeStyle = 'rgba(170, 235, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, 984, 600);
  ctx.strokeStyle = 'rgba(170, 235, 255, 0.22)';
  ctx.beginPath();
  ctx.moveTo(20, 118);
  ctx.lineTo(1004, 118);
  ctx.moveTo(512, 20);
  ctx.lineTo(512, 620);
  ctx.stroke();

  ctx.fillStyle = '#e8f8ff';
  ctx.shadowColor = '#00e5ff';
  ctx.shadowBlur = 20;
  ctx.font = '900 92px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('LOHINA', 48, 152);

  ctx.font = '900 68px "Microsoft YaHei", sans-serif';
  ctx.fillStyle = '#d4f0ff';
  ctx.fillText('未来都市', 548, 174);
  ctx.font = 'bold 42px "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(180, 240, 255, 0.82)';
  ctx.fillText('GEOMETRY', 548, 238);
  ctx.shadowBlur = 0;

  ctx.strokeStyle = '#a0e0ff';
  ctx.lineWidth = 3;
  ctx.strokeRect(274, 272, 286, 116);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px monospace';
  ctx.fillText('SAVED BY', 294, 312);
  ctx.fillText('ZEROS &', 294, 344);
  ctx.fillText('ONES', 294, 376);

  ctx.fillStyle = 'rgba(160, 225, 255, 0.72)';
  ctx.font = '16px monospace';
  for (let col = 0; col < 3; col += 1) {
    for (let row = 0; row < 8; row += 1) {
      ctx.fillText(
        `SYS.KERNEL_${col}${row} // 0x${((col + 1) * (row + 7) * 93).toString(16).toUpperCase()}`,
        48 + col * 312,
        438 + row * 24,
      );
    }
  }

  ctx.fillStyle = 'rgba(111, 230, 255, 0.18)';
  ctx.font = '900 210px "Segoe UI", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('01', 992, 614);

  return finishTexture(canvas, anisotropy);
}

function createHeroDreamTexture(anisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = canvas2d(1024, 384);
  ctx.clearRect(0, 0, 1024, 384);
  ctx.strokeStyle = 'rgba(255, 205, 152, 0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(16, 16, 992, 352);

  ctx.fillStyle = '#ffcf96';
  ctx.font = '900 140px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('DREAM', 48, 176);
  ctx.fillStyle = '#f0ddc5';
  ctx.font = '600 52px "Microsoft YaHei", sans-serif';
  ctx.fillText('梦境档案', 52, 252);
  ctx.fillStyle = 'rgba(0, 240, 255, 0.8)';
  ctx.font = '500 28px monospace';
  ctx.fillText('ARCHIVE // 01', 54, 306);

  ctx.strokeStyle = 'rgba(255, 179, 102, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(52, 282);
  ctx.lineTo(960, 282);
  ctx.stroke();

  return finishTexture(canvas, anisotropy);
}

function createHeroBadgeTexture(anisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = canvas2d(128, 128);
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(64, 64, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff1e38';
  ctx.font = '900 82px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('!', 64, 70);
  return finishTexture(canvas, anisotropy);
}

function boxGeometry(
  ctx: BuildContext,
  width: number,
  height: number,
  depth: number,
): THREE.BufferGeometry {
  const key = `hero-box:${width.toFixed(3)}:${height.toFixed(3)}:${depth.toFixed(3)}`;
  let geometry = ctx.geometryCache.get(key);
  if (!geometry) {
    geometry = new THREE.BoxGeometry(width, height, depth);
    ctx.geometryCache.set(key, geometry);
  }
  return geometry;
}

function planeGeometry(
  ctx: BuildContext,
  width: number,
  height: number,
): THREE.BufferGeometry {
  const key = `hero-plane:${width.toFixed(3)}:${height.toFixed(3)}`;
  let geometry = ctx.geometryCache.get(key);
  if (!geometry) {
    geometry = new THREE.PlaneGeometry(width, height);
    ctx.geometryCache.set(key, geometry);
  }
  return geometry;
}

function addBox(
  ctx: BuildContext,
  parent: THREE.Object3D,
  material: THREE.Material,
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  options: { castShadow?: boolean; receiveShadow?: boolean; name?: string } = {},
): THREE.Mesh {
  const mesh = new THREE.Mesh(boxGeometry(ctx, width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = options.castShadow ?? false;
  mesh.receiveShadow = options.receiveShadow ?? false;
  if (options.name) mesh.name = options.name;
  parent.add(mesh);
  return mesh;
}

function addPlane(
  ctx: BuildContext,
  parent: THREE.Object3D,
  material: THREE.Material,
  width: number,
  height: number,
  x: number,
  y: number,
  z: number,
  name: string,
): THREE.Mesh {
  const mesh = new THREE.Mesh(planeGeometry(ctx, width, height), material);
  mesh.position.set(x, y, z);
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function addContactShadow(
  ctx: BuildContext,
  parent: THREE.Object3D,
  width: number,
  depth: number,
  x: number,
  z: number,
  opacity = 0.55,
  materialOverride?: THREE.Material,
): THREE.Mesh {
  const material = materialOverride ?? ctx.materials.contactShadow.clone();
  if (!materialOverride) material.opacity = opacity;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.018, z);
  mesh.renderOrder = 1;
  parent.add(mesh);
  return mesh;
}

function addWireBox(
  ctx: BuildContext,
  parent: THREE.Object3D,
  material: THREE.Material,
  width: number,
  height: number,
  depth: number,
  x: number,
  z: number,
): void {
  for (const sideX of [-1, 1]) {
    for (const sideZ of [-1, 1]) {
      addBox(
        ctx,
        parent,
        material,
        EDGE,
        height,
        EDGE,
        x + sideX * (width / 2),
        height / 2,
        z + sideZ * (depth / 2),
      );
    }
  }
  for (const y of [0, height]) {
    for (const sideZ of [-1, 1]) {
      addBox(ctx, parent, material, width + EDGE, EDGE, EDGE, x, y, z + sideZ * (depth / 2));
    }
    for (const sideX of [-1, 1]) {
      addBox(ctx, parent, material, EDGE, EDGE, depth + EDGE, x + sideX * (width / 2), y, z);
    }
  }
}

function addBar(
  ctx: BuildContext,
  parent: THREE.Object3D,
  material: THREE.Material,
  from: [number, number, number],
  to: [number, number, number],
  thickness: number,
): void {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  const length = Math.hypot(dx, dy, dz);
  if (length <= 0.0001) return;
  const mesh = addBox(
    ctx,
    parent,
    material,
    length,
    thickness,
    thickness,
    (from[0] + to[0]) / 2,
    (from[1] + to[1]) / 2,
    (from[2] + to[2]) / 2,
  );
  // 只处理 XY 平面内的桁架杆件；当前母版不需要自由 3D 杆。
  mesh.rotation.z = Math.atan2(dy, dx);
  if (Math.abs(dz) > 0.0001) mesh.rotation.z = Math.atan2(dy, dx);
}

function createScreenMaterial(
  texture: THREE.Texture,
  transparent = false,
): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map: texture,
    transparent,
    depthWrite: !transparent,
    toneMapped: false,
    side: THREE.FrontSide,
  });
}

function registerFade(material: THREE.Material, list: THREE.Material[]): THREE.Material {
  material.userData.fadeBaseTransparent = material.transparent;
  material.userData.fadeBaseDepthWrite = material.depthWrite;
  material.userData.fadeBaseOpacity = material.opacity;
  list.push(material);
  return material;
}

interface HeroMaterials {
  obsidian: THREE.MeshStandardMaterial;
  edge: THREE.MeshStandardMaterial;
  frame: THREE.MeshStandardMaterial;
  recess: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  cyan: THREE.MeshStandardMaterial;
  cyanSoft: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  red: THREE.MeshStandardMaterial;
  windowWarm: THREE.MeshStandardMaterial;
  windowCyan: THREE.MeshStandardMaterial;
}

function createHeroMaterials(): HeroMaterials {
  return {
    obsidian: new THREE.MeshStandardMaterial({
      color: 0x05070d,
      roughness: 0.3,
      metalness: 0.85,
      envMapIntensity: 1.25,
      emissive: 0x050a14,
      emissiveIntensity: 0.55,
    }),
    edge: new THREE.MeshStandardMaterial({
      color: 0x081020,
      roughness: 0.4,
      metalness: 0.5,
      emissive: 0x2f5fc8,
      emissiveIntensity: 1.15,
    }),
    frame: new THREE.MeshStandardMaterial({
      color: 0x161e2a,
      roughness: 0.36,
      metalness: 0.78,
      envMapIntensity: 1.2,
      emissive: 0x0d1828,
      emissiveIntensity: 0.5,
    }),
    recess: new THREE.MeshStandardMaterial({
      color: 0x03050a,
      roughness: 0.9,
      metalness: 0.1,
      emissive: 0x010308,
      emissiveIntensity: 0.5,
    }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x07121e,
      roughness: 0.12,
      metalness: 0.8,
      envMapIntensity: 1.8,
      emissive: 0x061018,
      emissiveIntensity: 0.35,
    }),
    cyan: new THREE.MeshStandardMaterial({
      color: 0x031418,
      roughness: 0.3,
      metalness: 0.2,
      emissive: 0x6fe6ff,
      emissiveIntensity: 2.2,
    }),
    cyanSoft: new THREE.MeshStandardMaterial({
      color: 0x061a1f,
      roughness: 0.5,
      metalness: 0.1,
      emissive: 0x6fe6ff,
      emissiveIntensity: 0.7,
    }),
    gold: new THREE.MeshStandardMaterial({
      color: 0x1a1005,
      roughness: 0.35,
      metalness: 0.3,
      emissive: 0xffb366,
      emissiveIntensity: 1.8,
    }),
    red: new THREE.MeshStandardMaterial({
      color: 0x1a0305,
      roughness: 0.3,
      metalness: 0.2,
      emissive: 0xff2a3a,
      emissiveIntensity: 2.6,
    }),
    windowWarm: new THREE.MeshStandardMaterial({
      color: 0x1a130c,
      roughness: 0.32,
      metalness: 0.08,
      emissive: 0xffc67d,
      emissiveIntensity: 0.85,
    }),
    windowCyan: new THREE.MeshStandardMaterial({
      color: 0x04141a,
      roughness: 0.3,
      metalness: 0.1,
      emissive: 0x6fe6ff,
      emissiveIntensity: 1.0,
    }),
  };
}

export function createHeroBuilding(ctx: BuildContext, spec: BuildingSpec): BuiltBuilding {
  const group = new THREE.Group();
  group.name = spec.id;

  const occluders: THREE.Mesh[] = [];
  const fadeMeshes: THREE.Mesh[] = [];
  const fadeMaterials: THREE.Material[] = [];
  const mediaSlots = new Map<string, THREE.Mesh>();
  const mats = createHeroMaterials();
  for (const material of Object.values(mats)) registerFade(material, fadeMaterials);

  const main = { w: 8.0, h: 24.0, d: 6.4, x: -1.5, z: -0.2 };
  const annex = { w: 8.0, h: 12.0, d: 5.6, x: 5.0, z: 0.8 };
  const podium = { w: 6.0, h: 5.0, d: 5.2, x: -6.5, z: 1.0 };

  const mainBody = addBox(ctx, group, mats.obsidian, main.w, main.h, main.d, main.x, main.h / 2, main.z, {
    castShadow: true,
    receiveShadow: true,
    name: `${spec.id}_Body_Main`,
  });
  const annexBody = addBox(ctx, group, mats.obsidian, annex.w, annex.h, annex.d, annex.x, annex.h / 2, annex.z, {
    castShadow: true,
    receiveShadow: true,
    name: `${spec.id}_Body_Annex`,
  });
  const podiumBody = addBox(ctx, group, mats.obsidian, podium.w, podium.h, podium.d, podium.x, podium.h / 2, podium.z, {
    castShadow: true,
    receiveShadow: true,
    name: `${spec.id}_Body_Podium`,
  });
  occluders.push(mainBody, annexBody, podiumBody);
  fadeMeshes.push(mainBody, annexBody, podiumBody);

  addWireBox(ctx, group, mats.edge, main.w, main.h, main.d, main.x, main.z);
  addWireBox(ctx, group, mats.edge, annex.w, annex.h, annex.d, annex.x, annex.z);
  addWireBox(ctx, group, mats.edge, podium.w, podium.h, podium.d, podium.x, podium.z);

  // 裙房屋顶的蓝色锯齿桁架，给低层轮廓一个可读的工业符号。
  const trussY0 = 5.08;
  const trussY1 = 5.78;
  const trussZ = 3.66;
  const trussSteps = 7;
  const trussStart = -9.2;
  const trussEnd = -3.8;
  const trussStep = (trussEnd - trussStart) / trussSteps;
  for (let i = 0; i < trussSteps; i += 1) {
    const x0 = trussStart + i * trussStep;
    const x1 = x0 + trussStep;
    const xm = x0 + trussStep / 2;
    addBar(ctx, group, mats.edge, [x0, trussY0, trussZ], [xm, trussY1, trussZ], 0.04);
    addBar(ctx, group, mats.edge, [xm, trussY1, trussZ], [x1, trussY0, trussZ], 0.04);
    addBar(ctx, group, mats.edge, [x0, trussY1, trussZ], [x1, trussY1, trussZ], 0.04);
    addBar(ctx, group, mats.edge, [x0, trussY0, trussZ], [x1, trussY0, trussZ], 0.04);
  }

  // 主塔竖版媒体墙：背板、金属框、结构竖梃、屏幕。
  const posterW = 6.24;
  const posterH = 16.44;
  const posterY = 13.4;
  const posterZ = 3.045;
  addBox(ctx, group, mats.recess, 6.4, 16.6, 0.06, main.x, posterY, 3.0);
  addBox(ctx, group, mats.frame, 0.18, 16.8, 0.34, main.x - 3.3, posterY, 3.19);
  addBox(ctx, group, mats.frame, 0.18, 16.8, 0.34, main.x + 3.3, posterY, 3.19);
  addBox(ctx, group, mats.frame, 6.6, 0.18, 0.34, main.x, posterY - 8.4, 3.19);
  addBox(ctx, group, mats.frame, 6.6, 0.18, 0.34, main.x, posterY + 8.4, 3.19);
  for (const offset of [-1.55, 1.55]) {
    addBox(ctx, group, mats.frame, 0.07, posterH, 0.12, main.x + offset, posterY, 3.1);
  }
  for (const offset of [-4.6, 0, 4.6]) {
    addBox(ctx, group, mats.frame, posterW, 0.07, 0.12, main.x, posterY + offset, 3.1);
  }

  const posterTexture = createHeroPosterTexture(ctx.anisotropy);
  const posterMaterial = registerFade(createScreenMaterial(posterTexture), fadeMaterials) as THREE.MeshBasicMaterial;
  const poster = addPlane(
    ctx,
    group,
    posterMaterial,
    posterW,
    posterH,
    main.x,
    posterY,
    posterZ,
    `${spec.id}_Media_Main`,
  );
  mediaSlots.set('media-main', poster);

  addBox(ctx, group, mats.cyanSoft, 6.3, 0.035, 0.04, main.x, posterY - 8.45, 3.22);
  addBox(ctx, group, mats.cyanSoft, 6.3, 0.035, 0.04, main.x, posterY + 8.45, 3.22);

  // 顶部品牌牌。
  addBox(ctx, group, mats.frame, 4.3, 1.0, 0.12, main.x, 22.65, 3.05);
  const roofSignTexture = createSignTexture(spec.sign, spec.subSign, {
    color: '#e9fbff',
    subColor: 'rgba(0,240,255,0.72)',
    width: 1024,
    height: 256,
  });
  const roofSignMaterial = registerFade(createLabelMaterial(roofSignTexture), fadeMaterials);
  const roofSign = addPlane(ctx, group, roofSignMaterial, 4.0, 0.8, main.x, 22.65, 3.12, `${spec.id}_RoofSign`);
  mediaSlots.set('media-roof-sign', roofSign);

  // 侧立面窗槽：只做少量竖窗，避免灯带层层堆叠。
  let windowIndex = 0;
  for (const y of [8.2, 11.4, 14.6, 17.8, 21.0]) {
    for (const z of [-1.7, -0.3, 1.1]) {
      const material = windowIndex % 5 === 0 ? mats.windowWarm : mats.windowCyan;
      addBox(ctx, group, material, 0.025, 1.8, 0.55, -5.512, y, z);
      windowIndex += 1;
    }
  }
  for (const y of [14.2, 17.4, 20.6]) {
    for (const z of [-1.2, 0.2, 1.6]) {
      const material = windowIndex % 4 === 0 ? mats.windowWarm : mats.windowCyan;
      addBox(ctx, group, material, 0.025, 1.6, 0.5, 2.512, y, z);
      windowIndex += 1;
    }
  }

  // 背立面的楼层光和检修门，保证绕行时不至于是一块死黑。
  for (const y of [7.5, 15.0, 22.5]) {
    addBox(ctx, group, mats.cyanSoft, 7.8, 0.035, 0.03, main.x, y, -3.42);
  }
  addBox(ctx, group, mats.recess, 1.4, 2.4, 0.06, -3.2, 1.2, -3.42);
  addBox(ctx, group, mats.frame, 0.08, 2.5, 0.1, -3.92, 1.25, -3.45);
  addBox(ctx, group, mats.frame, 0.08, 2.5, 0.1, -2.48, 1.25, -3.45);
  addBox(ctx, group, mats.cyanSoft, 1.0, 0.03, 0.03, -3.2, 2.52, -3.44);

  for (const y of [5.0, 9.0]) {
    addBox(ctx, group, mats.cyanSoft, 7.8, 0.035, 0.03, annex.x, y, -2.02);
  }
  addBox(ctx, group, mats.recess, 1.6, 2.2, 0.06, 7.4, 1.1, -2.02);
  addBox(ctx, group, mats.frame, 0.08, 2.3, 0.1, 6.55, 1.15, -2.05);
  addBox(ctx, group, mats.frame, 0.08, 2.3, 0.1, 8.25, 1.15, -2.05);

  addBox(ctx, group, mats.recess, 1.3, 2.0, 0.06, -7.5, 1.0, -1.62);
  addBox(ctx, group, mats.cyanSoft, 0.9, 0.03, 0.03, -7.5, 2.12, -1.64);

  // 主塔冠顶：压顶、设备、天线与航空灯。
  addBox(ctx, group, mats.obsidian, 8.2, 0.5, 6.6, main.x, 24.25, main.z, {
    receiveShadow: true,
  });
  addBox(ctx, group, mats.cyanSoft, 8.1, 0.04, 6.5, main.x, 23.92, main.z);
  addBox(ctx, group, mats.obsidian, 3.0, 1.4, 1.8, -2.8, 24.95, -0.6);
  addBox(ctx, group, mats.obsidian, 1.2, 0.8, 1.2, 0.8, 24.65, -1.3);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 3.4, 6), mats.frame);
  antenna.position.set(1.1, 27.0, -1.0);
  group.add(antenna);
  const aviation = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), mats.red);
  aviation.position.set(1.1, 28.75, -1.0);
  group.add(aviation);

  addBox(ctx, group, mats.obsidian, 8.2, 0.4, 5.8, annex.x, 12.2, annex.z, {
    receiveShadow: true,
  });
  addBox(ctx, group, mats.cyanSoft, 8.1, 0.035, 5.7, annex.x, 11.95, annex.z);
  addBox(ctx, group, mats.obsidian, 2.1, 0.9, 1.3, 6.8, 12.7, 0.4);
  addBox(ctx, group, mats.frame, 1.0, 0.5, 0.06, 6.8, 12.7, 1.08);

  addBox(ctx, group, mats.obsidian, 6.2, 0.35, 5.4, podium.x, 5.17, podium.z, {
    receiveShadow: true,
  });
  addBox(ctx, group, mats.obsidian, 1.5, 0.7, 1.0, -7.8, 5.55, 1.0);

  // 悬挑 HUD：屏幕、底板、四根支撑和底部洗墙灯。
  const hudW = 7.0;
  const hudH = 3.2;
  const hudX = 5.6;
  const hudY = 9.3;
  addBox(ctx, group, mats.frame, 7.4, 3.6, 0.16, hudX, hudY, 4.62, { castShadow: true });
  for (const x of [2.45, 8.75]) {
    for (const y of [7.85, 10.75]) {
      addBox(ctx, group, mats.frame, 0.08, 0.08, 0.94, x, y, 4.12);
    }
  }
  addBox(ctx, group, mats.cyan, 6.8, 0.035, 0.04, hudX, 7.47, 4.73);
  const hudTexture = createHeroHudTexture(ctx.anisotropy);
  const hudMaterial = registerFade(createScreenMaterial(hudTexture), fadeMaterials);
  const hud = addPlane(ctx, group, hudMaterial, hudW, hudH, hudX, hudY, 4.705, `${spec.id}_Media_HUD`);
  mediaSlots.set('media-hud', hud);

  // 底层文字矩阵墙 + 右侧入口。
  addBox(ctx, group, mats.glass, 5.4, 4.6, 0.04, 5.8, 2.7, 3.62, { receiveShadow: true });
  addBox(ctx, group, mats.frame, 0.12, 4.8, 0.14, 3.05, 2.7, 3.7);
  addBox(ctx, group, mats.frame, 0.12, 4.8, 0.14, 8.55, 2.7, 3.7);
  addBox(ctx, group, mats.frame, 5.55, 0.12, 0.14, 5.8, 0.35, 3.7);
  addBox(ctx, group, mats.frame, 5.55, 0.12, 0.14, 5.8, 5.05, 3.7);
  addBox(ctx, group, mats.cyanSoft, 5.2, 0.03, 0.035, 5.8, 0.38, 3.78);
  const typographyTexture = createHeroTypographyTexture(ctx.anisotropy);
  const typographyMaterial = registerFade(
    createScreenMaterial(typographyTexture, true),
    fadeMaterials,
  );
  const typography = addPlane(
    ctx,
    group,
    typographyMaterial,
    5.25,
    4.45,
    5.8,
    2.7,
    3.73,
    `${spec.id}_Media_Typography`,
  );
  mediaSlots.set('media-typography', typography);

  addBox(ctx, group, mats.recess, 1.9, 3.2, 0.08, 2.0, 1.6, 3.58);
  addBox(ctx, group, mats.glass, 0.84, 2.7, 0.03, 1.55, 1.55, 3.64);
  addBox(ctx, group, mats.glass, 0.84, 2.7, 0.03, 2.45, 1.55, 3.64);
  addBox(ctx, group, mats.frame, 0.08, 3.0, 0.1, 1.05, 1.55, 3.67);
  addBox(ctx, group, mats.frame, 0.08, 3.0, 0.1, 2.95, 1.55, 3.67);
  addBox(ctx, group, mats.frame, 2.0, 0.08, 0.1, 2.0, 3.05, 3.67);
  addBox(ctx, group, mats.frame, 2.0, 0.06, 0.1, 2.0, 0.05, 3.67);
  addBox(ctx, group, mats.frame, 0.04, 2.7, 0.08, 2.0, 1.55, 3.66);
  addBox(ctx, group, mats.frame, 2.6, 0.12, 0.9, 2.0, 3.32, 4.0, { castShadow: true });
  addBox(ctx, group, mats.cyan, 2.2, 0.025, 0.04, 2.0, 3.25, 4.25);
  addBox(ctx, group, mats.frame, 2.6, 0.06, 0.35, 2.0, 0.03, 4.0);

  // 裙房 DREAM 灯箱。
  addBox(ctx, group, mats.recess, 4.4, 2.0, 0.06, -6.5, 2.5, 3.62);
  addBox(ctx, group, mats.frame, 0.12, 2.2, 0.12, -8.7, 2.5, 3.68);
  addBox(ctx, group, mats.frame, 0.12, 2.2, 0.12, -4.3, 2.5, 3.68);
  addBox(ctx, group, mats.frame, 4.55, 0.12, 0.12, -6.5, 1.45, 3.68);
  addBox(ctx, group, mats.frame, 4.55, 0.12, 0.12, -6.5, 3.55, 3.68);
  addBox(ctx, group, mats.gold, 4.2, 0.03, 0.035, -6.5, 1.5, 3.77);
  const dreamTexture = createHeroDreamTexture(ctx.anisotropy);
  const dreamMaterial = registerFade(createScreenMaterial(dreamTexture, true), fadeMaterials);
  const dream = addPlane(ctx, group, dreamMaterial, 4.2, 1.8, -6.5, 2.5, 3.73, `${spec.id}_Media_Dream`);
  mediaSlots.set('media-dream', dream);

  // 两侧竖招：左侧青色 LOHINA，右侧红色电子雨。
  const leftBannerTexture = createVerticalSignTexture('LOHINA', {
    accent: '#00f0ff',
    color: '#e8ffff',
    panel: 'rgba(3, 8, 14, 0.92)',
    border: 'rgba(0, 240, 255, 0.8)',
  });
  leftBannerTexture.anisotropy = ctx.anisotropy;
  addBox(ctx, group, mats.recess, 1.05, 5.4, 0.07, -6.2, 12.4, 3.1);
  const leftBannerMaterial = registerFade(
    createScreenMaterial(leftBannerTexture, true),
    fadeMaterials,
  );
  const leftBanner = addPlane(
    ctx,
    group,
    leftBannerMaterial,
    0.95,
    5.2,
    -6.2,
    12.4,
    3.16,
    `${spec.id}_Media_BannerL`,
  );
  mediaSlots.set('media-banner-left', leftBanner);
  addBox(ctx, group, mats.frame, 0.8, 0.06, 0.06, -5.75, 15.0, 3.05);
  addBox(ctx, group, mats.frame, 0.8, 0.06, 0.06, -5.75, 9.8, 3.05);
  addBox(ctx, group, mats.cyan, 0.025, 5.2, 0.025, -6.7, 12.4, 3.18);
  addBox(ctx, group, mats.cyan, 0.025, 5.2, 0.025, -5.7, 12.4, 3.18);

  const rightBannerTexture = createVerticalSignTexture('电子雨', {
    accent: '#ff3a55',
    color: '#ffe08a',
    panel: 'rgba(12, 5, 8, 0.92)',
    border: 'rgba(255, 58, 85, 0.8)',
  });
  rightBannerTexture.anisotropy = ctx.anisotropy;
  addBox(ctx, group, mats.recess, 1.0, 5.5, 0.07, 9.95, 6.8, 3.78);
  const rightBannerMaterial = registerFade(
    createScreenMaterial(rightBannerTexture, true),
    fadeMaterials,
  );
  const rightBanner = addPlane(
    ctx,
    group,
    rightBannerMaterial,
    0.9,
    5.3,
    9.95,
    6.8,
    3.84,
    `${spec.id}_Media_BannerR`,
  );
  mediaSlots.set('media-banner-right', rightBanner);
  addBox(ctx, group, mats.frame, 0.95, 0.06, 0.06, 9.45, 9.2, 3.7);
  addBox(ctx, group, mats.frame, 0.95, 0.06, 0.06, 9.45, 4.4, 3.7);
  addBox(ctx, group, mats.red, 0.025, 5.3, 0.025, 9.52, 6.8, 3.86);
  addBox(ctx, group, mats.red, 0.025, 5.3, 0.025, 10.38, 6.8, 3.86);

  // 红色信标球、支架与无 Bloom 时的加法光晕。
  addBox(ctx, group, mats.frame, 0.55, 0.06, 0.06, -5.75, 8.2, 3.05);
  addBox(ctx, group, mats.frame, 0.04, 2.2, 0.04, -6.0, 9.3, 3.22);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 16), mats.red);
  beacon.position.set(-6.0, 8.2, 3.55);
  beacon.name = `${spec.id}_Beacon`;
  group.add(beacon);
  const beaconRing = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.022, 6, 24), mats.gold);
  beaconRing.position.copy(beacon.position);
  group.add(beaconRing);
  const glowMaterial = registerFade(ctx.materials.glow.clone(), fadeMaterials) as THREE.SpriteMaterial;
  glowMaterial.color.setHex(0xff2a3a);
  glowMaterial.opacity = 0.5;
  glowMaterial.toneMapped = false;
  const glow = new THREE.Sprite(glowMaterial);
  glow.position.copy(beacon.position);
  glow.scale.setScalar(2.0);
  group.add(glow);

  // 地面感叹号幽灵：放在主屏下方，不挡入口。
  const ghostGroup = new THREE.Group();
  ghostGroup.name = `${spec.id}_Ghost`;
  ghostGroup.position.set(-3.2, 0.95, 4.8);
  const ghostBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.55, 8, 16), mats.red);
  ghostBody.castShadow = true;
  ghostGroup.add(ghostBody);
  const badgeTexture = createHeroBadgeTexture(ctx.anisotropy);
  const badgeMaterial = registerFade(createScreenMaterial(badgeTexture, true), fadeMaterials);
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), badgeMaterial);
  badge.position.set(0, 0.12, 0.44);
  ghostGroup.add(badge);
  group.add(ghostGroup);

  const ghostRing = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.018, 6, 32), mats.red);
  ghostRing.rotation.x = -Math.PI / 2;
  ghostRing.position.set(-3.2, 0.035, 4.8);
  group.add(ghostRing);

  const shadowMaterial = addContactShadow(ctx, group, 20, 8.6, 0, 0, 0.58).material as THREE.Material;
  registerFade(shadowMaterial, fadeMaterials);
  addContactShadow(ctx, group, 1.8, 1.8, -3.2, 4.8, 0.45, shadowMaterial);

  group.position.set(spec.position[0], spec.position[1], spec.position[2]);
  group.rotation.y = spec.yawRad;

  return {
    spec,
    group,
    posterSlots: new Map(),
    mediaSlots,
    occluders,
    fadeMaterials,
    fadeMeshes,
  };
}
