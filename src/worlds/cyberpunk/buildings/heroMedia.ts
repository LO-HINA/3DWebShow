import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import type { Vec3 } from '../../../engine/contracts/types';
import { createLabelMaterial, type WorldMaterials } from '../materials';
import { mediaAssetUrl } from '../media';
import { createSignTexture } from '../textures';
import type { BuildingSpec } from '../types';
import {
  B01_COMIC_PANELS,
  B01_LIGHT_CURTAINS,
  type B01ComicPanelConfig,
  type B01FacadeKey,
} from './b01MediaConfig';
import type { BuildContext, BuiltBuilding } from './buildings';

const CYAN = '#36f4ff';
const AMBER = '#ffc46b';

function boxGeometry(ctx: BuildContext, width: number, height: number, depth: number): THREE.BufferGeometry {
  const key = `box:${width.toFixed(3)}:${height.toFixed(3)}:${depth.toFixed(3)}`;
  let geometry = ctx.geometryCache.get(key);
  if (!geometry) {
    geometry = new THREE.BoxGeometry(width, height, depth);
    ctx.geometryCache.set(key, geometry);
  }
  return geometry;
}

function addMesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: Vec3,
  options: { castShadow?: boolean; receiveShadow?: boolean; name?: string } = {},
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = options.castShadow ?? false;
  mesh.receiveShadow = options.receiveShadow ?? false;
  if (options.name) mesh.name = options.name;
  parent.add(mesh);
  return mesh;
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
  return addMesh(parent, boxGeometry(ctx, width, height, depth), material, [x, y, z], options);
}

function addPlane(
  parent: THREE.Object3D,
  material: THREE.Material,
  width: number,
  height: number,
  x: number,
  y: number,
  z: number,
  rotationY = 0,
  name?: string,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotationY;
  if (name) mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function canvas2d(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable for hero media facade');
  return [canvas, ctx];
}

function makeTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  filter: 'linear' | 'nearest' = 'linear',
): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = filter === 'nearest' ? THREE.NearestMipmapLinearFilter : THREE.LinearMipmapLinearFilter;
  texture.magFilter = filter === 'nearest' ? THREE.NearestFilter : THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function seeded01(a: number, b: number, c = 0): number {
  const value = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return value - Math.floor(value);
}


function createGroundSpillTexture(anisotropy: number): THREE.CanvasTexture {
  const width = 512;
  const height = 1024;
  const [canvas, ctx] = canvas2d(width, height);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // 竖向拖影：平面上方对应建筑一侧，亮部集中在近墙处，向街道方向衰减。
  // 先画多道软边光柱，再用模糊扩散，避免出现平涂三角形。
  ctx.save();
  ctx.filter = 'blur(14px)';
  const columns: Array<[number, number, string, number]> = [
    [0.2, 0.2, '54,244,255', 0.26],
    [0.32, 0.1, '54,244,255', 0.18],
    [0.44, 0.12, '232,253,255', 0.12],
    [0.56, 0.1, '232,253,255', 0.1],
    [0.67, 0.16, '255,196,107', 0.24],
    [0.82, 0.14, '255,196,107', 0.16],
  ];
  for (const [center, span, color, alpha] of columns) {
    const streak = ctx.createLinearGradient(0, 0, 0, height * 0.86);
    streak.addColorStop(0, `rgba(${color},${alpha})`);
    streak.addColorStop(0.3, `rgba(${color},${alpha * 0.52})`);
    streak.addColorStop(0.7, `rgba(${color},${alpha * 0.16})`);
    streak.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = streak;
    ctx.fillRect((center - span / 2) * width, 0, span * width, height * 0.86);
  }
  ctx.restore();

  // 屏幕倒影的残像：B-01、孔径环与底部活动条，只保留被拉长的轮廓。
  ctx.save();
  ctx.filter = 'blur(9px)';
  ctx.fillStyle = 'rgba(232,253,255,0.22)';
  ctx.font = '800 148px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('B-01', width / 2, 244);
  ctx.strokeStyle = 'rgba(54,244,255,0.26)';
  ctx.lineWidth = 7;
  for (const radius of [128, 92, 58]) {
    ctx.beginPath();
    ctx.arc(width / 2, 196, radius, Math.PI * 0.08, Math.PI * 0.92);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,196,107,0.18)';
  ctx.fillRect(width * 0.2, 330, width * 0.6, 40);
  ctx.restore();

  // 竖向雨痕 / 灯带拖影，打断规整的矩形，读起来像湿地面。
  for (let index = 0; index < 48; index += 1) {
    const x = seeded01(index, 21, 3) * width;
    const start = seeded01(index, 22, 5) * 260;
    const length = 160 + seeded01(index, 23, 7) * 600;
    const pick = seeded01(index, 24, 9);
    const color = pick > 0.62 ? '255,196,107' : pick > 0.18 ? '54,244,255' : '232,253,255';
    const alpha = 0.02 + seeded01(index, 25) * 0.06;
    const streak = ctx.createLinearGradient(0, start, 0, start + length);
    streak.addColorStop(0, `rgba(${color},${alpha})`);
    streak.addColorStop(0.55, `rgba(${color},${alpha * 0.5})`);
    streak.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = streak;
    ctx.fillRect(x, start, 1 + Math.floor(seeded01(index, 26) * 4), length);
  }

  // 横向涟漪暗缝：加法混合里黑色即为“断开”，形成湿地面的碎光。
  for (let y = 26; y < height; y += 26 + Math.floor(seeded01(y, 31) * 26)) {
    ctx.fillStyle = `rgba(0,0,0,${0.12 + seeded01(y, 32) * 0.18})`;
    ctx.fillRect(0, y, width, 1 + Math.floor(seeded01(y, 33) * 2));
  }

  // 边缘透明衰减：径向 + 横向双重软掩遮，避免地面出现规整的发光矩形。
  ctx.globalCompositeOperation = 'destination-in';
  const radialMask = ctx.createRadialGradient(width / 2, 40, 24, width / 2, 40, height * 0.96);
  radialMask.addColorStop(0, 'rgba(0,0,0,0.96)');
  radialMask.addColorStop(0.5, 'rgba(0,0,0,0.72)');
  radialMask.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = radialMask;
  ctx.fillRect(0, 0, width, height);
  const horizontalMask = ctx.createLinearGradient(0, 0, width, 0);
  horizontalMask.addColorStop(0, 'rgba(0,0,0,0)');
  horizontalMask.addColorStop(0.26, 'rgba(0,0,0,1)');
  horizontalMask.addColorStop(0.74, 'rgba(0,0,0,1)');
  horizontalMask.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = horizontalMask;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'source-over';

  return makeTexture(canvas, anisotropy);
}

function createMaterials(
  materials: WorldMaterials,
  structureOnly = false,
): {
  shell: THREE.MeshStandardMaterial;
  shellMid: THREE.MeshStandardMaterial;
  shellLight: THREE.MeshStandardMaterial;
  frame: THREE.MeshStandardMaterial;
  bronze: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  recess: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  cyan: THREE.MeshStandardMaterial;
  amber: THREE.MeshStandardMaterial;
  warm: THREE.MeshStandardMaterial;
  fade: THREE.MeshStandardMaterial[];
} {
  const shell = materials.concreteDark.clone();
  shell.name = 'B01_ObsidianShell';
  shell.color.setHex(0x141922);
  shell.roughness = 0.78;
  shell.metalness = 0.24;
  shell.envMapIntensity = 0.75;
  shell.emissive.setHex(0x02040a);
  shell.emissiveIntensity = 0.22;

  const shellMid = materials.concreteDark.clone();
  shellMid.name = 'B01_ShellMid';
  shellMid.color.setHex(0x1d2330);
  shellMid.roughness = 0.68;
  shellMid.metalness = 0.28;
  shellMid.envMapIntensity = 0.85;
  shellMid.emissive.setHex(0x03050b);
  shellMid.emissiveIntensity = 0.18;

  const shellLight = materials.concreteDark.clone();
  shellLight.name = 'B01_ShellEdge';
  shellLight.color.setHex(0x2e3642);
  shellLight.roughness = 0.58;
  shellLight.metalness = 0.22;
  shellLight.envMapIntensity = 1.0;
  shellLight.emissive.setHex(0x04070d);
  shellLight.emissiveIntensity = 0.14;

  const frame = materials.frame.clone();
  frame.name = 'B01_ScreenFrame';
  frame.color.setHex(0x232b36);
  frame.roughness = 0.4;
  frame.metalness = 0.78;
  frame.envMapIntensity = 1.15;

  const bronze = materials.frame.clone();
  bronze.name = 'B01_Bronze';
  bronze.color.setHex(0x3a3128);
  bronze.roughness = 0.34;
  bronze.metalness = 0.82;
  bronze.envMapIntensity = 1.2;

  const metal = materials.metal.clone();
  metal.name = 'B01_Metal';
  metal.color.setHex(0x1b222c);
  metal.roughness = 0.46;
  metal.metalness = 0.7;
  metal.envMapIntensity = 1.05;

  const recess = materials.frameBack.clone();
  recess.name = 'B01_Recess';
  recess.color.setHex(0x04060a);
  recess.roughness = 0.98;
  recess.metalness = 0.06;

  const glass = materials.glass.clone();
  glass.name = 'B01_Glass';
  glass.color.setHex(0x08131c);
  glass.roughness = 0.13;
  glass.metalness = 0.58;
  glass.envMapIntensity = 1.5;

  const cyan = materials.emissiveCyan.clone();
  cyan.name = 'B01_NeonCyan';
  cyan.color.setHex(0x041a1f);
  cyan.emissive.setHex(0x2df4ff);
  cyan.emissiveIntensity = 3.2;
  cyan.roughness = 0.28;
  cyan.metalness = 0.2;

  const amber = materials.emissiveCyan.clone();
  amber.name = 'B01_NeonAmber';
  amber.color.setHex(0x1a1004);
  amber.emissive.setHex(0xffb45e);
  amber.emissiveIntensity = 2.4;
  amber.roughness = 0.3;
  amber.metalness = 0.16;

  const warm = materials.warmWindow.clone();
  warm.name = 'B01_LobbyWarm';
  warm.emissiveIntensity = 0.72;
  // 结构审阅时关闭“发光”，由中性审阅灯照亮室内，避免暖色内芯盖住侧壁与顶板。
  if (structureOnly) {
    warm.emissiveIntensity = 0.08;
  }

  return {
    shell,
    shellMid,
    shellLight,
    frame,
    bronze,
    metal,
    recess,
    glass,
    cyan,
    amber,
    warm,
    fade: [shell, shellMid, shellLight],
  };
}

function createWetMaskTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const [canvas, ctx] = canvas2d(size, size);
  ctx.clearRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'lighter';

  const blobs: Array<[number, number, number, number]> = [
    [0.5, 0.3, 0.36, 0.95],
    [0.34, 0.48, 0.28, 0.8],
    [0.64, 0.52, 0.3, 0.84],
    [0.46, 0.66, 0.32, 0.9],
    [0.58, 0.82, 0.24, 0.6],
    [0.24, 0.68, 0.2, 0.52],
  ];
  for (const [x, y, radius, alpha] of blobs) {
    const gradient = ctx.createRadialGradient(
      x * size,
      y * size,
      size * radius * 0.08,
      x * size,
      y * size,
      size * radius,
    );
    gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
    gradient.addColorStop(0.55, `rgba(255,255,255,${alpha * 0.72})`);
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }

  // 边缘打碎：挖掉若干软边小孔，避免倒影成为一个完整椭圆。
  ctx.globalCompositeOperation = 'destination-out';
  for (let index = 0; index < 14; index += 1) {
    const x = seeded01(index, 41, 3) * size;
    const y = seeded01(index, 42, 5) * size;
    const radius = 18 + seeded01(index, 43, 7) * 54;
    const hole = ctx.createRadialGradient(x, y, 0, x, y, radius);
    hole.addColorStop(0, `rgba(0,0,0,${0.24 + seeded01(index, 44) * 0.3})`);
    hole.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hole;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  ctx.globalCompositeOperation = 'source-over';

  const texture = makeTexture(canvas, anisotropy);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

const wetMirrorShader = {
  name: 'B01WetMirrorShader',
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    tMask: { value: null },
    uStrength: { value: 0.42 },
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec2 vMaskUv;

    #include <common>
    #include <logdepthbuf_pars_vertex>

    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vMaskUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

      #include <logdepthbuf_vertex>
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 color;
    uniform sampler2D tDiffuse;
    uniform sampler2D tMask;
    uniform float uStrength;
    varying vec4 vUv;
    varying vec2 vMaskUv;

    #include <logdepthbuf_pars_fragment>

    float blendOverlay(float base, float blend) {
      return (base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend)));
    }

    vec3 blendOverlay(vec3 base, vec3 blend) {
      return vec3(blendOverlay(base.r, blend.r), blendOverlay(base.g, blend.g), blendOverlay(base.b, blend.b));
    }

    void main() {
      #include <logdepthbuf_fragment>

      // 静态涟漪：低频、曲率缓的扰动 + 5 tap 软化，像被雨打湿的水泥地，而不是室内镜子。
      vec2 ripple = vec2(
        sin(vMaskUv.y * 26.0 + vMaskUv.x * 7.0) * 0.0011 +
          sin(vMaskUv.y * 11.0) * 0.0008,
        cos(vMaskUv.x * 19.0 - vMaskUv.y * 5.0) * 0.0013
      );
      vec4 coord = vec4(vUv.xy + vUv.w * ripple, vUv.zw);
      float spread = coord.w * (1.4 / 512.0);
      vec4 base =
        texture2DProj(tDiffuse, coord) * 0.4 +
        texture2DProj(tDiffuse, vec4(coord.xy + vec2(spread, 0.0), coord.zw)) * 0.15 +
        texture2DProj(tDiffuse, vec4(coord.xy - vec2(spread, 0.0), coord.zw)) * 0.15 +
        texture2DProj(tDiffuse, vec4(coord.xy + vec2(0.0, spread), coord.zw)) * 0.15 +
        texture2DProj(tDiffuse, vec4(coord.xy - vec2(0.0, spread), coord.zw)) * 0.15;
      float mask = texture2D(tMask, vMaskUv).a;
      // 平面四边做软收边，避免镜面在湿地砖上留下一条直角硬边。
      float edge =
        smoothstep(0.0, 0.08, vMaskUv.x) * smoothstep(0.0, 0.08, 1.0 - vMaskUv.x) *
        smoothstep(0.0, 0.10, vMaskUv.y) * smoothstep(0.0, 0.10, 1.0 - vMaskUv.y);
      vec3 reflected = blendOverlay(base.rgb, color);
      gl_FragColor = vec4(reflected * 0.94, mask * uStrength * edge);

      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
};

function addWetMirror(ctx: BuildContext, group: THREE.Group, frontZ: number): void {
  const mask = createWetMaskTexture(ctx.anisotropy);
  const mirror = new Reflector(new THREE.PlaneGeometry(14, 20), {
    clipBias: 0.003,
    textureWidth: 512,
    textureHeight: 512,
    multisample: 0,
    color: 0x7d8b98,
    shader: wetMirrorShader,
  });
  const mirrorMaterial = mirror.material as THREE.ShaderMaterial;
  mirrorMaterial.uniforms.tMask.value = mask;
  mirrorMaterial.transparent = true;
  mirrorMaterial.depthWrite = false;
  mirrorMaterial.toneMapped = false;
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.set(0, 0.034, frontZ + 9);
  mirror.renderOrder = 1;
  mirror.name = 'B01_WetMirror';
  group.add(mirror);
}

function addGroundGlow(
  ctx: BuildContext,
  group: THREE.Group,
  frontZ: number,
): void {
  const texture = createGroundSpillTexture(ctx.anisotropy);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const broad = new THREE.Mesh(new THREE.PlaneGeometry(15, 26), material);
  broad.rotation.x = -Math.PI / 2;
  broad.position.set(0, 0.036, frontZ + 10);
  broad.renderOrder = 1;
  broad.name = 'B01_GroundReflection';
  group.add(broad);

  const coreMaterial = material.clone();
  coreMaterial.opacity = 0.24;
  const core = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 16), coreMaterial);
  core.rotation.x = -Math.PI / 2;
  core.position.set(0, 0.041, frontZ + 6.5);
  core.renderOrder = 1;
  core.name = 'B01_GroundReflectionCore';
  group.add(core);

  const contact = ctx.materials.contactShadow.clone();
  contact.opacity = 0.58;
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(17, 15), contact);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.022, 0.4);
  shadow.renderOrder = 1;
  shadow.name = 'B01_ContactShadow';
  group.add(shadow);
}

type B01Mats = ReturnType<typeof createMaterials>;

function addFrontWindowFinish(
  ctx: BuildContext,
  group: THREE.Group,
  mats: B01Mats,
  x: number,
  y: number,
  w: number,
  h: number,
  zFront: number,
  reveal: number,
  lit: boolean,
  name: string,
): void {
  const zBack = zFront - reveal;
  addBox(ctx, group, mats.recess, w + 0.06, h + 0.06, 0.08, x, y, zBack + 0.04, { name });
  addBox(ctx, group, lit ? mats.warm : mats.glass, w - 0.16, h - 0.16, 0.035, x, y, zBack + 0.1);

  // 窗框是真正凸出墙面的金属构件，四个转角各留 0.08m 料头。
  const rail = 0.08;
  addBox(ctx, group, mats.bronze, w, rail, 0.16, x, y + h / 2, zFront - 0.01);
  addBox(ctx, group, mats.bronze, w, rail, 0.16, x, y - h / 2, zFront - 0.01);
  addBox(ctx, group, mats.bronze, rail, h, 0.16, x - w / 2, y, zFront - 0.01);
  addBox(ctx, group, mats.bronze, rail, h, 0.16, x + w / 2, y, zFront - 0.01);
  if (w > 1.2) addBox(ctx, group, mats.bronze, 0.055, h - 0.1, 0.12, x, y, zFront - 0.03);
  addBox(ctx, group, mats.shellLight, w + 0.36, 0.12, 0.36, x, y - h / 2 - 0.14, zFront + 0.1);
}

function addSideWindowFinish(
  ctx: BuildContext,
  group: THREE.Group,
  mats: B01Mats,
  xFront: number,
  y: number,
  z: number,
  w: number,
  h: number,
  reveal: number,
  lit: boolean,
  name: string,
): void {
  const xBack = xFront - reveal;
  addBox(ctx, group, mats.recess, 0.08, h + 0.06, w + 0.06, xBack + 0.04, y, z, { name });
  addBox(ctx, group, lit ? mats.warm : mats.glass, 0.035, h - 0.16, w - 0.16, xBack + 0.1, y, z);

  const rail = 0.08;
  addBox(ctx, group, mats.bronze, 0.16, rail, w, xFront - 0.01, y + h / 2, z);
  addBox(ctx, group, mats.bronze, 0.16, rail, w, xFront - 0.01, y - h / 2, z);
  addBox(ctx, group, mats.bronze, 0.16, h, rail, xFront - 0.01, y, z - w / 2);
  addBox(ctx, group, mats.bronze, 0.16, h, rail, xFront - 0.01, y, z + w / 2);
  if (w > 1.2) addBox(ctx, group, mats.bronze, 0.12, h - 0.1, 0.055, xFront - 0.03, y, z);
  addBox(ctx, group, mats.shellLight, 0.36, 0.12, w + 0.36, xFront + 0.1, y - h / 2 - 0.14, z);
}

function addFrontLouver(
  ctx: BuildContext,
  group: THREE.Group,
  mats: B01Mats,
  x: number,
  y: number,
  w: number,
  h: number,
  z: number,
  slats = 6,
): void {
  addBox(ctx, group, mats.recess, w, h, 0.12, x, y, z + 0.02);
  const step = h / slats;
  for (let index = 0; index < slats; index += 1) {
    addBox(ctx, group, mats.metal, w - 0.08, 0.035, 0.16, x, y - h / 2 + step * (index + 0.5), z + 0.1);
  }
  addBox(ctx, group, mats.frame, w + 0.12, 0.06, 0.2, x, y + h / 2 + 0.02, z + 0.08);
  addBox(ctx, group, mats.frame, w + 0.12, 0.06, 0.2, x, y - h / 2 - 0.02, z + 0.08);
}

function addSideLouver(
  ctx: BuildContext,
  group: THREE.Group,
  mats: B01Mats,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  slats = 6,
): void {
  addBox(ctx, group, mats.recess, 0.12, h, w, x + 0.02, y, z);
  const step = h / slats;
  for (let index = 0; index < slats; index += 1) {
    addBox(ctx, group, mats.metal, 0.16, 0.035, w - 0.08, x + 0.1, y - h / 2 + step * (index + 0.5), z);
  }
  addBox(ctx, group, mats.frame, 0.2, 0.06, w + 0.12, x + 0.08, y + h / 2 + 0.02, z);
  addBox(ctx, group, mats.frame, 0.2, 0.06, w + 0.12, x + 0.08, y - h / 2 - 0.02, z);
}

function addBrace(
  ctx: BuildContext,
  group: THREE.Group,
  material: THREE.Material,
  length: number,
  thickness: number,
  x: number,
  y: number,
  z: number,
  rotationZ: number,
  name?: string,
): THREE.Mesh {
  const mesh = new THREE.Mesh(boxGeometry(ctx, length, thickness, thickness), material);
  mesh.position.set(x, y, z);
  mesh.rotation.z = rotationZ;
  if (name) mesh.name = name;
  group.add(mesh);
  return mesh;
}

interface B01FacadeFrame {
  key: B01FacadeKey;
  yaw: number;
  origin: THREE.Vector3;
  normal: THREE.Vector3;
  tangent: THREE.Vector3;
  width: number;
}

interface B01PanelLayout {
  config: B01ComicPanelConfig;
  height: number;
  centerY: number;
  halfU: number;
  halfV: number;
}

function createFacadeFrames(shaftBase: number, shaftTop: number): Record<B01FacadeKey, B01FacadeFrame> {
  const y = (shaftBase + shaftTop) / 2;
  return {
    front: {
      key: 'front',
      yaw: 0,
      origin: new THREE.Vector3(0, y, 4.72),
      normal: new THREE.Vector3(0, 0, 1),
      tangent: new THREE.Vector3(1, 0, 0),
      width: 11.1,
    },
    right: {
      key: 'right',
      yaw: Math.PI / 2,
      origin: new THREE.Vector3(5.68, y, -0.2),
      normal: new THREE.Vector3(1, 0, 0),
      tangent: new THREE.Vector3(0, 0, -1),
      width: 9.4,
    },
    back: {
      key: 'back',
      yaw: Math.PI,
      origin: new THREE.Vector3(0, y, -4.78),
      normal: new THREE.Vector3(0, 0, -1),
      tangent: new THREE.Vector3(-1, 0, 0),
      width: 11.1,
    },
    left: {
      key: 'left',
      yaw: -Math.PI / 2,
      origin: new THREE.Vector3(-5.68, y, -0.2),
      normal: new THREE.Vector3(-1, 0, 0),
      tangent: new THREE.Vector3(0, 0, 1),
      width: 9.4,
    },
  };
}

function createPanelLayouts(
  shaftBase: number,
  shaftTop: number,
): Map<B01FacadeKey, B01PanelLayout> {
  const layouts = new Map<B01FacadeKey, B01PanelLayout>();
  for (const config of B01_COMIC_PANELS) {
    layouts.set(config.facade, {
      config,
      height: config.width / config.aspect,
      centerY: shaftBase + config.centerRatio * (shaftTop - shaftBase),
      halfU: config.width / 2 + 0.34,
      halfV: config.width / config.aspect / 2 + 0.34,
    });
  }
  return layouts;
}

function addFacadeBox(
  ctx: BuildContext,
  group: THREE.Group,
  frame: B01FacadeFrame,
  material: THREE.Material,
  u: number,
  y: number,
  uSize: number,
  ySize: number,
  outward: number,
  thickness: number,
  name?: string,
): THREE.Mesh {
  const position = frame.origin.clone().addScaledVector(frame.tangent, u).addScaledVector(frame.normal, outward);
  position.y = y;
  const width = frame.key === 'front' || frame.key === 'back' ? uSize : thickness;
  const depth = frame.key === 'front' || frame.key === 'back' ? thickness : uSize;
  return addBox(ctx, group, material, width, ySize, depth, position.x, position.y, position.z, {
    castShadow: true,
    receiveShadow: true,
    name,
  });
}

function addComicInstallation(
  ctx: BuildContext,
  group: THREE.Group,
  mats: B01Mats,
  frame: B01FacadeFrame,
  layout: B01PanelLayout,
  structureOnly: boolean,
  posterSlots: Map<string, THREE.Mesh>,
): void {
  const { config, height, centerY } = layout;
  const top = centerY + height / 2;
  const bottom = centerY - height / 2;

  // 深色背板先封住旧窗格，形成连续画布；细钢框从背板前挑出，面板再退入框内。
  addFacadeBox(ctx, group, frame, mats.recess, config.centerU, centerY, config.width + 0.72, height + 0.72, 0.03, 0.16);
  addFacadeBox(ctx, group, frame, mats.metal, config.centerU, centerY, config.width + 0.26, height + 0.26, 0.17, 0.03);

  // 四条细边框。
  for (const [u, y, uSize, ySize] of [
    [config.centerU, top + 0.12, config.width + 0.46, 0.15],
    [config.centerU, bottom - 0.12, config.width + 0.46, 0.15],
    [config.centerU - config.width / 2 - 0.12, centerY, 0.15, height + 0.46],
    [config.centerU + config.width / 2 + 0.12, centerY, 0.15, height + 0.46],
  ] as const) {
    addFacadeBox(ctx, group, frame, mats.frame, u, y, uSize, ySize, 0.27, 0.22);
  }

  // 上下支撑臂与外挑遮光檐，使画框真正属于立面，而不是贴在墙上的图片。
  for (const side of [-1, 1]) {
    addFacadeBox(
      ctx,
      group,
      frame,
      mats.metal,
      config.centerU + side * config.width * 0.31,
      top + 0.19,
      0.07,
      0.28,
      0.16,
      0.38,
    );
    addFacadeBox(
      ctx,
      group,
      frame,
      mats.metal,
      config.centerU + side * config.width * 0.31,
      bottom - 0.19,
      0.07,
      0.28,
      0.14,
      0.34,
    );
  }
  addFacadeBox(ctx, group, frame, mats.frame, config.centerU, top + 0.28, config.width + 0.8, 0.06, 0.4, 0.3);

  // 底部极细暖金收边，只做画框的暖色回应。
  addFacadeBox(ctx, group, frame, mats.amber, config.centerU, bottom - 0.12, config.width + 0.2, 0.025, 0.39, 0.02);

  if (structureOnly) return;

  const material = new THREE.MeshBasicMaterial({
    color: 0x090d11,
    toneMapped: false,
    side: THREE.FrontSide,
  });
  const position = frame.origin.clone().addScaledVector(frame.tangent, config.centerU).addScaledVector(frame.normal, 0.25);
  position.y = centerY;
  const panel = addPlane(group, material, config.width, height, position.x, position.y, position.z, frame.yaw, config.id);
  panel.renderOrder = 2;
  panel.userData.comicPanel = {
    facade: config.facade,
    image: config.image,
    aspect: config.aspect,
    width: config.width,
    height,
    centerY,
    centerU: config.centerU,
    label: config.label,
  };
  posterSlots.set(config.id, panel);
  if (config.facade === 'front') posterSlots.set('mainScreen', panel);

  const loader = new THREE.TextureLoader();
  loader.load(
    mediaAssetUrl(config.image),
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = ctx.anisotropy;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      const image = texture.image as { width?: number; height?: number } | undefined;
      const actual = image?.width && image?.height ? image.width / image.height : config.aspect;
      if (Math.abs(actual - config.aspect) > 0.01) {
        console.warn(
          `[B-01] ${config.id} 原图比例 ${actual.toFixed(3)} 与配置 ${config.aspect.toFixed(3)} 不一致；请更新 b01MediaConfig.ts。`,
        );
      }
      material.map = texture;
      material.color.setHex(config.tint);
      material.needsUpdate = true;
    },
    undefined,
    (error) => {
      console.warn(`[B-01] 漫画素材加载失败：${config.image}`, error);
    },
  );
}

const lightCurtainVertexShader = /* glsl */ `
  varying vec2 vLocal;
  void main() {
    vLocal = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const lightCurtainFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uPhase;
  uniform float uSpeed;
  uniform float uOpacity;
  uniform float uGoldBias;
  uniform vec2 uSize;
  uniform vec2 uComicCenter;
  uniform vec2 uComicHalf;
  uniform vec3 uCyan;
  uniform vec3 uGold;
  varying vec2 vLocal;

  float hash11(float n) {
    return fract(sin(n * 127.1 + uPhase * 17.3) * 43758.5453);
  }

  float pulse(float y, float offset, float tail) {
    float cycle = fract(y * 0.042 - uTime * uSpeed + uPhase + offset);
    float head = smoothstep(0.0, 0.022, cycle) * (1.0 - smoothstep(0.022, 0.11, cycle));
    float trail = smoothstep(1.0 - tail, 1.0, cycle) * (1.0 - smoothstep(0.988, 1.0, cycle));
    return head + trail * 0.55;
  }

  float beam(float u, float y, float seed, float widthScale, float brightness) {
    float pos = (hash11(seed * 1.13 + 4.7) * 2.0 - 1.0) * uSize.x * 0.47;
    float width = mix(0.032, 0.2, hash11(seed + 3.2)) * widthScale;
    float core = exp(-pow((u - pos) / width, 2.0));
    return core * pulse(y, hash11(seed + 7.9), 0.13 + hash11(seed + 5.1) * 0.2) * brightness;
  }

  void main() {
    float wide = 0.0;
    float narrow = 0.0;
    float gold = 0.0;
    for (int i = 0; i < 4; i++) wide += beam(vLocal.x, vLocal.y, float(i) + 1.0, 2.8, 0.6);
    for (int i = 0; i < 7; i++) narrow += beam(vLocal.x, vLocal.y, float(i) + 11.0, 1.0, 1.15);
    for (int i = 0; i < 2; i++) gold += beam(vLocal.x, vLocal.y, float(i) + 31.0, 0.8, 1.0);
    gold *= uGoldBias;

    float filament = pow(0.5 + 0.5 * sin(vLocal.x * 38.0 + sin(vLocal.y * 0.7 + uPhase * 8.0) * 1.6), 7.0);
    float base = 0.008 + 0.008 * (0.5 + 0.5 * sin(vLocal.y * 0.34 + uTime * 0.12 + uPhase * 6.283));

    float dx = abs(vLocal.x - uComicCenter.x) - uComicHalf.x;
    float dy = abs(vLocal.y - uComicCenter.y) - uComicHalf.y;
    float clear = smoothstep(-0.02, 0.34, max(dx, dy));
    float edge = smoothstep(0.0, 0.9, uSize.x * 0.5 - abs(vLocal.x)) *
      smoothstep(0.0, 1.0, uSize.y * 0.5 - abs(vLocal.y));

    vec3 color = uCyan * (base + wide * 0.42 + narrow * 1.05 + filament * 0.045) + uGold * gold * 0.95;
    float mask = uOpacity * clear * edge;
    gl_FragColor = vec4(color, mask);
  }
`;

function addLightCurtain(
  group: THREE.Group,
  spec: BuildingSpec,
  frame: B01FacadeFrame,
  layout: B01PanelLayout,
  phase: number,
  speed: number,
  goldBias: number,
  opacity: number,
  shaftBase: number,
  shaftTop: number,
): void {
  const height = shaftTop - shaftBase;
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPhase: { value: phase },
      uSpeed: { value: speed },
      uOpacity: { value: opacity },
      uGoldBias: { value: goldBias },
      uSize: { value: new THREE.Vector2(frame.width, height) },
      uComicCenter: { value: new THREE.Vector2(layout.config.centerU, layout.centerY - frame.origin.y) },
      uComicHalf: { value: new THREE.Vector2(layout.halfU, layout.halfV) },
      uCyan: { value: new THREE.Color(CYAN) },
      uGold: { value: new THREE.Color(AMBER) },
    },
    vertexShader: lightCurtainVertexShader,
    fragmentShader: lightCurtainFragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(frame.width, height), material);
  mesh.position.copy(frame.origin);
  mesh.rotation.y = frame.yaw;
  mesh.renderOrder = 2;
  mesh.name = `${spec.id}_LightCurtain_${frame.key}`;
  mesh.userData.lightCurtain = {
    facade: frame.key,
    phase,
    speed,
    goldBias,
    opacity,
    comicMask: {
      centerU: layout.config.centerU,
      centerY: layout.centerY,
      halfU: layout.halfU,
      halfV: layout.halfV,
    },
  };
  mesh.onBeforeRender = () => {
    material.uniforms.uTime.value = performance.now() * 0.001;
  };
  group.add(mesh);
}

function addCornerLightBands(
  ctx: BuildContext,
  group: THREE.Group,
  spec: BuildingSpec,
  shaftBase: number,
  shaftTop: number,
): void {
  const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(CYAN).multiplyScalar(0.58), toneMapped: false });
  const y0 = shaftBase + 0.25;
  const y1 = shaftTop - 0.15;
  const corners: Array<[number, number]> = [
    [-5.58, 4.62],
    [5.58, 4.62],
    [-5.58, -4.98],
    [5.58, -4.98],
  ];
  for (const [x, z] of corners) {
    addBox(ctx, group, material, 0.06, y1 - y0, 0.06, x, (y0 + y1) / 2, z, {
      name: `${spec.id}_CornerLightBand`,
    });
  }
}

export function createHeroMediaBuilding(
  ctx: BuildContext,
  spec: BuildingSpec,
): BuiltBuilding {
  const group = new THREE.Group();
  group.name = spec.id;

  // 结构审阅模式：?b01=structure 隐藏所有屏幕、海报、霓虹与地面反光，只看建筑本体。
  const structureOnly =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('b01') === 'structure';

  const mats = createMaterials(ctx.materials, structureOnly);
  // 门厅玻璃单独做半透明，让门后的暖色内壁与接待台形成第二层纵深。
  const doorGlass = mats.glass.clone();
  doorGlass.name = 'B01_LobbyGlass';
  doorGlass.color.setHex(0x0c1a24);
  doorGlass.transparent = true;
  doorGlass.opacity = 0.34;
  doorGlass.depthWrite = false;

  const beacon = mats.amber.clone();
  beacon.name = 'B01_Beacon';
  beacon.color.setHex(0x1c0303);
  beacon.emissive.setHex(0xff2a1e);
  beacon.emissiveIntensity = 3.4;
  const occluders: THREE.Mesh[] = [];
  const fadeMeshes: THREE.Mesh[] = [];
  const posterSlots = new Map<string, THREE.Mesh>();

  const podiumW = spec.size[0];
  const podiumD = spec.size[2];
  const podiumH = 7.2;
  const frontZ = podiumD / 2;
  const backZ = -podiumD / 2;
  // 后部实体后退，让主入口在门后仍有约 1.7m 的可见室内进深。
  const rearMassFront = 2.55;
  const rearMassBack = backZ + 0.2;
  const entranceW = 5.4;
  const entranceH = 4.4;
  const porchH = 2.75;
  const porchFront = rearMassFront + 2.3;

  const shaftW = 11.2;
  const shaftD = 9.2;
  const shaftZ = -0.4;
  const shaftBack = shaftZ - shaftD / 2;
  const shaftCoreBack = shaftBack + 0.3;
  const shaftBase = podiumH;
  const shaftTop = 32.4;
  const shaftH = shaftTop - shaftBase;

  const mediaW = 8.4;
  const mediaBottom = 11.2;
  const mediaTop = 27.2;
  const mediaH = mediaTop - mediaBottom;
  const mediaCY = (mediaBottom + mediaTop) / 2;

  const portalFront = 4.7;
  const mediaBack = 3.92;

  const facadeFrames = createFacadeFrames(shaftBase, shaftTop);
  const panelLayouts = createPanelLayouts(shaftBase, shaftTop);
  const rightComic = panelLayouts.get('right');
  const backComic = panelLayouts.get('back');
  const rightPanelZ = rightComic
    ? facadeFrames.right.origin.z + facadeFrames.right.tangent.z * rightComic.config.centerU
    : Number.POSITIVE_INFINITY;
  const backPanelX = backComic
    ? facadeFrames.back.origin.x + facadeFrames.back.tangent.x * backComic.config.centerU
    : Number.POSITIVE_INFINITY;
  const rightComicClearU = rightComic ? rightComic.halfU + 0.18 : 0;
  const rightComicClearV = rightComic ? rightComic.halfV + 0.18 : 0;
  const backComicClearU = backComic ? backComic.halfU + 0.18 : 0;
  const backComicClearV = backComic ? backComic.halfV + 0.18 : 0;
  const intersectsRightComic = (z: number, y: number, w = 0, h = 0): boolean =>
    !!rightComic &&
    Math.abs(z - rightPanelZ) < rightComicClearU + w / 2 &&
    Math.abs(y - rightComic.centerY) < rightComicClearV + h / 2;
  const intersectsBackComic = (x: number, y: number, w = 0, h = 0): boolean =>
    !!backComic &&
    Math.abs(x - backPanelX) < backComicClearU + w / 2 &&
    Math.abs(y - backComic.centerY) < backComicClearV + h / 2;

  // ————————————————————————————————————————————————
  // 1. 基座：真实凹入的主入口 + 东侧转角门廊
  // ————————————————————————————————————————————————
  addBox(ctx, group, mats.shellLight, podiumW + 0.5, 0.45, podiumD + 0.5, 0, 0.225, 0, {
    castShadow: true,
    receiveShadow: true,
    name: `${spec.id}_Plinth`,
  });

  const rearMass = addBox(
    ctx,
    group,
    mats.shell,
    podiumW - 0.6,
    podiumH - 0.45,
    rearMassFront - rearMassBack,
    0,
    0.45 + (podiumH - 0.45) / 2,
    (rearMassFront + rearMassBack) / 2,
    { castShadow: true, receiveShadow: true, name: `${spec.id}_PodiumMass` },
  );
  occluders.push(rearMass);
  fadeMeshes.push(rearMass);

  // 前墙分层：主门洞两侧做成真实墙体，窗洞因此有完整侧壁。
  const frontWallZ = (rearMassFront + frontZ) / 2;
  const frontWallD = frontZ - rearMassFront;

  const buildFrontPier = (inner: number, outer: number, windowCenter: number, windowW: number) => {
    const windowBottom = 0.9;
    const windowTop = 3.8;
    const windowH = windowTop - windowBottom;
    const windowY = (windowBottom + windowTop) / 2;
    const center = (inner + outer) / 2;
    const width = Math.abs(outer - inner);
    const leftEdge = Math.min(inner, outer);
    const rightEdge = Math.max(inner, outer);
    const winLeft = windowCenter - windowW / 2;
    const winRight = windowCenter + windowW / 2;

    addBox(
      ctx,
      group,
      mats.shell,
      winLeft - leftEdge,
      entranceH - 0.45,
      frontWallD,
      (leftEdge + winLeft) / 2,
      0.45 + (entranceH - 0.45) / 2,
      frontWallZ,
      { receiveShadow: true, name: `${spec.id}_PierStileW` },
    );
    addBox(
      ctx,
      group,
      mats.shell,
      rightEdge - winRight,
      entranceH - 0.45,
      frontWallD,
      (winRight + rightEdge) / 2,
      0.45 + (entranceH - 0.45) / 2,
      frontWallZ,
      { receiveShadow: true, name: `${spec.id}_PierStileE` },
    );
    addBox(
      ctx,
      group,
      mats.shell,
      windowW,
      windowBottom - 0.45,
      frontWallD,
      windowCenter,
      0.45 + (windowBottom - 0.45) / 2,
      frontWallZ,
      { receiveShadow: true, name: `${spec.id}_PierSill` },
    );
    addBox(
      ctx,
      group,
      mats.shell,
      windowW,
      entranceH - windowTop,
      frontWallD,
      windowCenter,
      windowTop + (entranceH - windowTop) / 2,
      frontWallZ,
      { receiveShadow: true, name: `${spec.id}_PierHeader` },
    );
    addFrontWindowFinish(
      ctx,
      group,
      mats,
      windowCenter,
      windowY,
      windowW,
      windowH,
      frontZ,
      0.5,
      !structureOnly,
      `${spec.id}_PodiumWindow`,
    );
    void center;
    void width;
  };

  buildFrontPier(-podiumW / 2 + 0.15, -entranceW / 2, -4.85, 1.9);
  buildFrontPier(entranceW / 2, 4.95, 3.8, 1.6);

  // 东侧转角门廊：x 4.95..6.85 的实体让位，形成两面临街的深凹口。
  const porchMinX = 4.95;
  const porchMaxX = podiumW / 2 - 0.15;
  addBox(
    ctx,
    group,
    mats.shell,
    porchMaxX - porchMinX,
    entranceH - 3.2,
    frontWallD,
    (porchMinX + porchMaxX) / 2,
    3.2 + (entranceH - 3.2) / 2,
    frontWallZ,
    { receiveShadow: true, name: `${spec.id}_PorchHeader` },
  );
  addBox(ctx, group, mats.shellLight, 0.45, porchH, 0.45, porchMaxX - 0.22, 0.45 + porchH / 2, porchFront - 0.22, {
    castShadow: true,
    receiveShadow: true,
    name: `${spec.id}_PorchColumn`,
  });
  addBox(ctx, group, mats.recess, porchMaxX - porchMinX - 0.1, 0.08, frontWallD, (porchMinX + porchMaxX) / 2, 0.06, frontWallZ, {
    name: `${spec.id}_PorchFloor`,
  });
  addBox(
    ctx,
    group,
    mats.shellMid,
    porchMaxX - porchMinX - 0.12,
    0.14,
    frontWallD - 0.2,
    (porchMinX + porchMaxX) / 2,
    3.12,
    frontWallZ - 0.05,
    { name: `${spec.id}_PorchCeiling` },
  );
  // 门廊西壁石饰面与东侧开口的金属收边。
  addBox(
    ctx,
    group,
    mats.shellLight,
    0.08,
    3.2,
    frontWallD - 0.15,
    porchMinX + 0.04,
    0.45 + 1.6,
    frontWallZ - 0.07,
    { name: `${spec.id}_PorchLining` },
  );
  addBox(ctx, group, mats.frame, 0.06, porchH, 0.12, porchMaxX - 0.02, 0.45 + porchH / 2, porchFront - 0.1);
  addBox(ctx, group, mats.recess, 1.9, 2.5, 0.08, 5.95, 1.7, rearMassFront + 0.03, {
    name: `${spec.id}_ServiceDoorRecess`,
  });
  addBox(ctx, group, mats.metal, 1.55, 2.35, 0.06, 5.95, 1.65, rearMassFront + 0.1);
  for (const offset of [-0.5, 0.5]) {
    addBox(ctx, group, mats.bronze, 0.05, 2.0, 0.08, 5.95 + offset, 1.6, rearMassFront + 0.14);
  }
  if (!structureOnly) {
    addBox(ctx, group, mats.cyan, 0.04, 2.2, 0.05, 6.65, 1.6, rearMassFront + 0.16);
  }

  // 入口雨棚：结构板 + 吊杆，底面留灯槽。
  addBox(ctx, group, mats.shellLight, 8.8, 0.26, 1.9, 0, 4.62, 6.9, {
    castShadow: true,
    receiveShadow: true,
    name: `${spec.id}_Canopy`,
  });
  addBox(ctx, group, mats.metal, 8.4, 0.03, 0.05, 0, 4.485, 7.72);
  for (const x of [-2.9, 2.9]) {
    addBox(ctx, group, mats.metal, 0.06, 1.62, 0.06, x, 5.5, 7.55);
  }
  if (!structureOnly) {
    addBox(ctx, group, mats.cyan, 8.3, 0.03, 0.05, 0, 4.5, 7.74);
    for (const x of [-2.4, 0, 2.4]) {
      addBox(ctx, group, mats.cyan, 0.9, 0.02, 0.08, x, 4.48, 6.6);
    }
  }

  // 入口内部：门后退 1.65m，能看到石侧壁、门窗框、接待台与暖色内壁。
  addBox(ctx, group, mats.recess, entranceW - 0.1, entranceH - 0.1, 0.06, 0, 2.2, rearMassFront + 0.03);
  addBox(ctx, group, mats.warm, entranceW - 0.5, 3.3, 0.03, 0, 1.9, rearMassFront + 0.09);
  addBox(ctx, group, mats.shellMid, entranceW - 0.3, 0.06, frontWallD - 0.1, 0, 3.92, frontWallZ);
  addBox(ctx, group, mats.recess, entranceW - 0.3, 0.08, frontWallD - 0.1, 0, 0.05, frontWallZ);
  for (const side of [-1, 1]) {
    addBox(
      ctx,
      group,
      mats.shellLight,
      0.06,
      3.5,
      frontWallD - 0.1,
      side * (entranceW / 2 - 0.09),
      2.2,
      frontWallZ,
    );
    addBox(ctx, group, mats.bronze, 0.1, 3.55, 0.11, side * (entranceW / 2 - 0.02), 2.2, frontZ - 0.01, {
      castShadow: true,
    });
  }
  // 门套与双扇门。
  addBox(ctx, group, mats.bronze, 3.7, 0.14, 0.22, 0, 3.55, 4.35, { castShadow: true });
  for (const side of [-1, 1]) {
    addBox(ctx, group, mats.bronze, 0.12, 3.15, 0.22, side * 1.79, 1.72, 4.35, { castShadow: true });
  }
  for (const side of [-1, 1]) {
    addBox(ctx, group, doorGlass, 1.6, 3.05, 0.04, side * 0.84, 1.62, 4.34);
    addBox(ctx, group, mats.bronze, 0.08, 3.1, 0.12, side * 1.66, 1.68, 4.36);
    addBox(ctx, group, mats.bronze, 0.06, 1.05, 0.07, side * 0.16, 1.65, 4.39);
  }
  addBox(ctx, group, mats.metal, 2.4, 0.62, 0.45, 0, 0.36, 3.3);
  addBox(ctx, group, mats.shellLight, 2.5, 0.08, 0.52, 0, 0.7, 3.3);
  if (!structureOnly) {
    addBox(ctx, group, mats.warm, entranceW - 0.9, 0.035, 0.06, 0, 4.02, 4.55);
    addBox(ctx, group, mats.cyan, 0.035, 2.9, 0.05, -2.58, 2.1, 5.88);
    addBox(ctx, group, mats.amber, 0.035, 2.9, 0.05, 2.58, 2.1, 5.88);
  } else {
    addBox(ctx, group, mats.bronze, 0.035, 2.9, 0.05, -2.58, 2.1, 5.88);
    addBox(ctx, group, mats.bronze, 0.035, 2.9, 0.05, 2.58, 2.1, 5.88);
  }

  // 上层裙房：实体檐带 + 一条真正凹入的横向长窗。
  addBox(ctx, group, mats.shell, podiumW - 0.2, 1.5, frontWallD, 0, 5.15, frontWallZ, {
    castShadow: true,
    receiveShadow: true,
    name: `${spec.id}_PodiumFascia`,
  });
  addBox(ctx, group, mats.shell, podiumW - 0.2, 0.85, frontWallD, 0, 6.775, frontWallZ, {
    receiveShadow: true,
    name: `${spec.id}_PodiumBrow`,
  });
  addBox(ctx, group, mats.recess, podiumW - 0.5, 0.5, 0.08, 0, 6.12, 5.52);
  addBox(ctx, group, mats.glass, podiumW - 0.7, 0.36, 0.03, 0, 6.12, 5.6);
  for (let x = -6.2; x <= 6.2; x += 1.55) {
    addBox(ctx, group, mats.bronze, 0.06, 0.44, 0.16, x, 6.12, 5.98);
  }

  // 裙房檐口与屋顶露台栏板。
  addBox(ctx, group, mats.shellLight, podiumW + 0.36, 0.4, podiumD + 0.36, 0, 7.15, 0, {
    castShadow: true,
    receiveShadow: true,
    name: `${spec.id}_PodiumCornice`,
  });
  addBox(ctx, group, mats.shellLight, podiumW + 0.12, 0.14, 0.3, 0, 6.92, frontZ + 0.18);
  for (const side of [-1, 1]) {
    addBox(ctx, group, mats.shellLight, 0.3, 0.8, 1.35, side * (podiumW / 2 - 0.15), 7.7, 5.25);
    addBox(ctx, group, mats.shellLight, 0.3, 0.8, podiumD - 0.2, side * (podiumW / 2 - 0.15), 7.7, 0);
  }
  addBox(ctx, group, mats.shellLight, podiumW - 0.2, 0.8, 0.3, 0, 7.7, backZ + 0.15);

  // 裙房东立面：用“留洞”的墙垛夹出三扇深窗，窗后才是玻璃。
  const podiumSideX = podiumW / 2;
  addBox(ctx, group, mats.shell, 0.34, 0.65, 9.4, podiumSideX - 0.17, 0.775, -1.05);
  addBox(ctx, group, mats.shell, 0.34, 3.45, 9.4, podiumSideX - 0.17, 5.475, -1.05);
  for (const [z0, z1] of [
    [-5.75, -3.55],
    [-1.65, -0.95],
    [0.95, 1.65],
    [3.55, 3.7],
  ] as const) {
    addBox(ctx, group, mats.shell, 0.34, 4.05, z1 - z0, podiumSideX - 0.17, 2.475, (z0 + z1) / 2);
  }
  for (const z of [2.6, 0, -2.6]) {
    addSideWindowFinish(ctx, group, mats, podiumSideX - 0.01, 2.4, z, 1.9, 2.7, 0.3, !structureOnly, `${spec.id}_PodiumSideWindow`);
  }
  addSideLouver(ctx, group, mats, podiumSideX + 0.02, 6.05, -4.55, 1.9, 1.0, 5);

  // ————————————————————————————————————————————————
  // 2. 塔身：媒体洞口由结构墙垛夹住，设备层外露
  // ————————————————————————————————————————————————
  addBox(ctx, group, mats.shellLight, shaftW + 0.6, 0.36, shaftD + 0.6, 0, shaftBase + 0.12, shaftZ, {
    castShadow: true,
    receiveShadow: true,
    name: `${spec.id}_ShaftBase`,
  });

  const shaftCore = addBox(
    ctx,
    group,
    mats.shell,
    shaftW - 0.6,
    shaftH,
    shaftD - 0.6,
    0,
    shaftBase + shaftH / 2,
    shaftZ,
    { castShadow: true, receiveShadow: true, name: `${spec.id}_ShaftCore` },
  );
  occluders.push(shaftCore);
  fadeMeshes.push(shaftCore);

  // 前立面：左右结构墙垛 + 上下设备带，洞口是真正的空腔。
  for (const side of [-1, 1]) {
    addBox(
      ctx,
      group,
      side < 0 ? mats.shell : mats.shellMid,
      1.4,
      shaftH,
      0.8,
      side * 4.9,
      shaftBase + shaftH / 2,
      4.3,
      { receiveShadow: true, name: `${spec.id}_MediaPier_${side < 0 ? 'W' : 'E'}` },
    );
    addBox(ctx, group, mats.shellLight, 0.16, shaftH, 0.12, side * 5.62, shaftBase + shaftH / 2, 4.68);
    addBox(ctx, group, mats.shellLight, 1.7, 0.2, 0.95, side * 4.9, shaftTop - 0.1, 4.3);
  }
  addBox(ctx, group, mats.shellMid, mediaW, mediaBottom - shaftBase, 0.8, 0, shaftBase + (mediaBottom - shaftBase) / 2, 4.3, {
    receiveShadow: true,
    name: `${spec.id}_MediaSillBand`,
  });
  addBox(ctx, group, mats.shellMid, mediaW, shaftTop - mediaTop, 0.8, 0, mediaTop + (shaftTop - mediaTop) / 2, 4.3, {
    receiveShadow: true,
    name: `${spec.id}_MediaHeadBand`,
  });

  // 设备层：百叶、检修门、外挑设备板。
  addFrontLouver(ctx, group, mats, -2.3, 8.55, 2.7, 1.25, portalFront, 7);
  addFrontLouver(ctx, group, mats, 2.3, 8.55, 2.7, 1.25, portalFront, 7);
  addBox(ctx, group, mats.frame, 1.2, 2.1, 0.1, 0, 8.5, portalFront + 0.06);
  addBox(ctx, group, mats.metal, 1.02, 1.95, 0.05, 0, 8.48, portalFront + 0.12);
  addBox(ctx, group, mats.metal, 8.4, 0.13, 0.5, 0, 10.78, portalFront + 0.18);
  for (const x of [-3.9, 3.9]) {
    addBox(ctx, group, mats.metal, 0.08, 0.9, 0.08, x, 11.25, portalFront + 0.42);
  }

  addFrontLouver(ctx, group, mats, -2.0, 28.3, 3.1, 1.0, portalFront, 6);
  addFrontLouver(ctx, group, mats, 2.0, 28.3, 3.1, 1.0, portalFront, 6);
  addBox(ctx, group, mats.shellLight, 8.4, 0.18, 0.95, 0, 29.15, 4.35, { castShadow: true });
  addFrontLouver(ctx, group, mats, 0, 30.2, 5.2, 0.9, portalFront, 6);
  addBox(ctx, group, mats.shellLight, 5.9, 0.12, 0.28, 0, 30.75, portalFront + 0.04);
  for (let y = 8.9; y < 31.6; y += 3.8) {
    addBox(ctx, group, mats.recess, 0.03, 0.035, 0.04, -5.63, y, 4.74);
    addBox(ctx, group, mats.recess, 0.03, 0.035, 0.04, 5.63, y, 4.74);
  }

  // 媒体洞口：背板与回壁保留，内部不再加横竖龙骨，给漫画和光幕留出连续面。
  addBox(ctx, group, mats.shellMid, mediaW + 0.2, mediaH + 0.2, 0.1, 0, mediaCY, mediaBack);
  for (const side of [-1, 1]) {
    addBox(ctx, group, mats.frame, 0.4, mediaH, 0.58, side * 4.0, mediaCY, 4.24, {
      name: `${spec.id}_MediaReturn_${side < 0 ? 'W' : 'E'}`,
    });
  }
  addBox(ctx, group, mats.frame, mediaW, 0.4, 0.58, 0, mediaBottom + 0.2, 4.24);
  addBox(ctx, group, mats.frame, mediaW, 0.4, 0.58, 0, mediaTop - 0.2, 4.24);
  addBox(ctx, group, mats.metal, 8.4, 0.1, 0.95, 0, 11.06, 4.9, { castShadow: true });
  addBox(ctx, group, mats.metal, 8.4, 0.05, 0.05, 0, 12.02, 5.36);
  for (let x = -4.1; x <= 4.1; x += 0.82) {
    addBox(ctx, group, mats.metal, 0.035, 0.94, 0.035, x, 11.58, 5.37);
  }
  for (const x of [-5.12, -4.82]) {
    addBox(ctx, group, mats.metal, 0.05, 3.6, 0.05, x, 9.25, 4.9);
  }
  for (let y = 7.6; y <= 10.9; y += 0.38) {
    addBox(ctx, group, mats.metal, 0.34, 0.035, 0.04, -4.97, y, 4.9);
  }

  // ————————————————————————————————————————————————
  // 3. 东立面：竖鳍 + 层间板 + 深窗 + 外露管井
  // ————————————————————————————————————————————————
  const sideX = shaftW / 2 - 0.3;
  const finX = sideX + 0.175;
  const windowFloors = [10.3, 14.1, 17.9, 21.7, 25.5, 29.3];
  const windowBays = [2.7, 0.65, -1.4, -3.45];
  const finRanges: Array<[number, number]> = [
    [3.9, 3.55],
    [1.85, 1.5],
    [-0.2, -0.55],
    [-2.25, -2.6],
    [-4.3, -4.65],
  ];

  for (const [z0, z1] of finRanges) {
    const zCenter = (z0 + z1) / 2;
    const finDepth = z0 - z1;
    if (rightComic && Math.abs(zCenter - rightPanelZ) < rightComicClearU + finDepth / 2) {
      // 漫画洞口内的竖鳍断开，只保留洞口上下两段。
      const top = rightComic.centerY + rightComic.height / 2 + 0.4;
      const bottom = rightComic.centerY - rightComic.height / 2 - 0.4;
      const lowerHeight = bottom - shaftBase;
      const upperHeight = shaftTop - top;
      if (lowerHeight > 0.2) {
        addBox(ctx, group, mats.shell, 0.35, lowerHeight, finDepth, finX, shaftBase + lowerHeight / 2, zCenter, {
          receiveShadow: true,
          name: `${spec.id}_SideFin_Lower`,
        });
      }
      if (upperHeight > 0.2) {
        addBox(ctx, group, mats.shell, 0.35, upperHeight, finDepth, finX, top + upperHeight / 2, zCenter, {
          receiveShadow: true,
          name: `${spec.id}_SideFin_Upper`,
        });
      }
    } else {
      addBox(ctx, group, mats.shell, 0.35, shaftH, finDepth, finX, shaftBase + shaftH / 2, zCenter, {
        receiveShadow: true,
        name: `${spec.id}_SideFin`,
      });
    }
  }
  for (const y of [8.4, 12.2, 16.0, 19.8, 23.6, 27.4, 31.2]) {
    if (intersectsRightComic(shaftZ, y, shaftD - 0.6, 0.7)) continue;
    addBox(ctx, group, mats.shell, 0.35, 0.7, shaftD - 0.6, finX, y, shaftZ, { receiveShadow: true });
  }
  addBox(ctx, group, mats.shellLight, 0.18, shaftH, 0.18, shaftW / 2 + 0.04, shaftBase + shaftH / 2, shaftCoreBack + 0.02);
  addBox(ctx, group, mats.shellLight, 0.18, shaftH, 0.18, shaftW / 2 + 0.04, shaftBase + shaftH / 2, 3.86);

  windowFloors.forEach((y, row) => {
    windowBays.forEach((z, bay) => {
      if (intersectsRightComic(z, y, 1.55, 2.1)) return;
      const isLouver = (row === 3 && bay === 2) || (row === 5 && bay === 0);
      if (isLouver) {
        addSideLouver(ctx, group, mats, shaftW / 2 - 0.01, y, z, 1.55, 2.0, 6);
      } else {
        const lit = !structureOnly && seeded01(row, bay, 7) > 0.42;
        addSideWindowFinish(
          ctx,
          group,
          mats,
          shaftW / 2 - 0.01,
          y,
          z,
          1.55,
          2.1,
          0.3,
          lit,
          `${spec.id}_SideWindow`,
        );
      }
    });
  });

  // 层间设备板：让开漫画洞口，避免金属板从画面中间穿过。
  for (const y of [14.2, 21.8, 29.4]) {
    if (intersectsRightComic(-2.6, y, 2.6, 0.16)) continue;
    addBox(ctx, group, mats.shellLight, 1.15, 0.16, 2.6, shaftW / 2 + 0.5, y, -2.6, { castShadow: true });
    addBox(ctx, group, mats.metal, 0.05, 0.9, 2.5, shaftW / 2 + 1.06, y + 0.5, -2.6);
    for (let z = -3.8; z <= -1.4; z += 0.6) {
      addBox(ctx, group, mats.metal, 0.04, 0.85, 0.04, shaftW / 2 + 1.05, y + 0.48, z);
    }
  }

  // 外露服务管井与爬梯。
  addBox(ctx, group, mats.metal, 0.5, shaftH + 0.4, 0.5, shaftW / 2 + 0.32, shaftBase + shaftH / 2, -4.42, {
    castShadow: true,
    name: `${spec.id}_ServiceRiser`,
  });
  for (let y = 8.2; y < 32.0; y += 3.2) {
    addBox(ctx, group, mats.metal, 0.62, 0.08, 0.08, shaftW / 2 + 0.32, y, -4.2);
  }
  for (const x of [5.83, 6.02]) {
    addBox(ctx, group, mats.metal, 0.045, 20.0, 0.045, x, 17.2, -2.4);
  }
  for (let y = 7.8; y <= 27.2; y += 0.42) {
    addBox(ctx, group, mats.metal, 0.3, 0.035, 0.035, 5.93, y, -2.4);
  }
  if (!structureOnly) {
    addBox(ctx, group, mats.cyan, 0.035, 20.0, 0.05, 6.1, 17.2, -4.68);
  }

  // ————————————————————————————————————————————————
  // 3b. 西立面：用同一套竖鳍语言托住漫画洞口
  // ————————————————————————————————————————————————
  const westFinX = -finX;
  for (const [z0, z1] of [
    [3.9, 3.55],
    [-4.3, -4.65],
  ] as const) {
    addBox(ctx, group, mats.shell, 0.35, shaftH, z0 - z1, westFinX, shaftBase + shaftH / 2, (z0 + z1) / 2, {
      receiveShadow: true,
      name: `${spec.id}_WestFin`,
    });
  }
  for (const y of [8.4, 31.2]) {
    addBox(ctx, group, mats.shell, 0.35, 0.7, shaftD - 0.6, westFinX, y, shaftZ, { receiveShadow: true });
  }
  // 上部设备百叶与西侧落水管，保证背面与西面交接时不是一块空白墙。
  for (const y of [29.4, 30.0, 30.6]) {
    addBox(ctx, group, mats.metal, 0.16, 0.035, 3.2, -5.6, y, -0.2);
  }
  addBox(ctx, group, mats.metal, 0.4, shaftH + 0.4, 0.4, -5.92, shaftBase + shaftH / 2, 3.98, {
    castShadow: true,
    name: `${spec.id}_WestServiceRiser`,
  });
  for (let y = 8.2; y < 32.0; y += 3.2) {
    addBox(ctx, group, mats.metal, 0.52, 0.08, 0.08, -5.92, y, 4.2);
  }
  if (!structureOnly) {
    addBox(ctx, group, mats.cyan, 0.035, 20.0, 0.05, -6.14, 17.2, 4.02);
  }

  // ————————————————————————————————————————————————
  // 4. 背面：楼梯核心 + 窗格，保证绕行时仍是一栋完整的楼
  // ————————————————————————————————————————————————
  addBox(ctx, group, mats.shellMid, 1.6, 23.8, 0.9, 1.4, shaftBase + 11.9, shaftCoreBack - 0.45, {
    castShadow: true,
    receiveShadow: true,
    name: `${spec.id}_RearCore`,
  });
  for (let row = 0; row < 6; row += 1) {
    for (const x of [-3.6, -0.2, 3.2]) {
      const y = 9.6 + row * 3.8;
      if (intersectsBackComic(x, y, 1.6, 2.0)) continue;
      addBox(ctx, group, mats.recess, 1.5, 1.9, 0.08, x, y, shaftCoreBack - 0.02);
      addBox(ctx, group, structureOnly || seeded01(row, x, 4) < 0.5 ? mats.glass : mats.warm, 1.3, 1.7, 0.03, x, y, shaftCoreBack - 0.08);
      addBox(ctx, group, mats.bronze, 1.6, 0.06, 0.12, x, y + 0.98, shaftCoreBack - 0.05);
      addBox(ctx, group, mats.bronze, 1.6, 0.06, 0.12, x, y - 0.98, shaftCoreBack - 0.05);
    }
  }
  addBox(ctx, group, mats.frame, 1.9, 2.8, 0.14, 1.4, 1.55, rearMassBack - 0.03);
  addBox(ctx, group, mats.metal, 1.65, 2.55, 0.06, 1.4, 1.5, rearMassBack - 0.1);
  addBox(ctx, group, mats.recess, 1.1, 1.7, 0.05, 4.45, 24.6, shaftCoreBack - 0.03);

  // ————————————————————————————————————————————————
  // 5. 退台与开放冠顶：结构框架自己成立
  // ————————————————————————————————————————————————
  addBox(ctx, group, mats.shellLight, shaftW + 0.6, 0.4, shaftD + 0.6, 0, shaftTop + 0.2, shaftZ, {
    castShadow: true,
    receiveShadow: true,
    name: `${spec.id}_ShaftCap`,
  });

  const setbackW = 8.8;
  const setbackD = 7.2;
  const setbackZ = -0.5;
  const setbackBase = shaftTop + 0.4;
  const setbackH = 3.8;
  const setbackTop = setbackBase + setbackH;
  const setbackFront = setbackZ + setbackD / 2;

  const setback = addBox(
    ctx,
    group,
    mats.shellMid,
    setbackW,
    setbackH,
    setbackD,
    0,
    setbackBase + setbackH / 2,
    setbackZ,
    { castShadow: true, receiveShadow: true, name: `${spec.id}_Setback` },
  );
  fadeMeshes.push(setback);
  for (const x of [-3.6, 3.6]) {
    addBox(ctx, group, mats.shellLight, 0.34, setbackH, 0.3, x, setbackBase + setbackH / 2, setbackFront + 0.1);
  }
  addFrontLouver(ctx, group, mats, 0, 33.9, 5.8, 0.95, setbackFront + 0.05, 5);
  addFrontLouver(ctx, group, mats, 0, 35.55, 5.8, 0.8, setbackFront + 0.05, 4);
  for (const side of [-1, 1]) {
    addSideLouver(ctx, group, mats, setbackW / 2 - 0.01, 34.6, side * 1.7, 2.2, 1.5, 4);
  }
  addBox(ctx, group, mats.shellLight, setbackW + 0.3, 0.22, setbackD + 0.3, 0, setbackTop + 0.11, setbackZ);
  for (const side of [-1, 1]) {
    addBox(ctx, group, mats.shellLight, 0.24, 0.55, setbackD + 0.2, side * (setbackW / 2 - 0.02), setbackTop + 0.28, setbackZ);
  }
  addBox(ctx, group, mats.shellLight, setbackW + 0.2, 0.55, 0.24, 0, setbackTop + 0.28, setbackZ + setbackD / 2 - 0.02);

  const crownBase = setbackTop + 0.22;
  const crownTop = 40.0;
  for (const x of [-3.9, 3.9]) {
    for (const z of [2.7, -3.3]) {
      addBox(ctx, group, mats.shellLight, 0.18, crownTop - crownBase, 0.18, x, (crownBase + crownTop) / 2, z, {
        castShadow: true,
        name: `${spec.id}_CrownColumn`,
      });
    }
  }
  addBox(ctx, group, mats.shellLight, 8.0, 0.18, 0.18, 0, crownBase + 0.75, 2.7);
  addBox(ctx, group, mats.shellLight, 8.0, 0.18, 0.18, 0, crownTop - 0.2, 2.7);
  addBox(ctx, group, mats.shellLight, 8.0, 0.18, 0.18, 0, crownTop - 0.2, -3.3);
  for (const x of [-3.9, 3.9]) {
    addBox(ctx, group, mats.shellLight, 0.18, 0.18, 6.0, x, crownTop - 0.2, -0.3);
  }
  addBrace(ctx, group, mats.shellLight, 8.2, 0.13, 0, (crownBase + 0.75 + crownTop - 0.2) / 2, 2.7, 0.31);
  addBrace(ctx, group, mats.shellLight, 8.2, 0.13, 0, (crownBase + 0.75 + crownTop - 0.2) / 2, 2.71, -0.31);

  // 广告牌框架（冠顶）。
  addBox(ctx, group, mats.frame, 7.0, 1.7, 0.26, 0, 38.2, 2.95, { name: `${spec.id}_RoofSignHousing` });
  addBox(ctx, group, mats.recess, 6.8, 1.52, 0.1, 0, 38.2, 3.1);
  for (const x of [-3.2, 3.2]) {
    addBox(ctx, group, mats.metal, 0.08, 2.3, 0.08, x, 38.0, 2.65);
  }

  // 屋顶设备与天线。
  for (const [x, z, w, h, d] of [
    [-2.5, -2.3, 2.0, 0.9, 1.5],
    [1.6, -2.6, 1.5, 0.8, 1.2],
  ] as const) {
    addBox(ctx, group, mats.metal, w, h, d, x, setbackTop + 0.22 + h / 2, z, { castShadow: true });
    addBox(ctx, group, mats.recess, w * 0.7, h * 0.4, 0.05, x, setbackTop + 0.22 + h / 2, z + d / 2 + 0.03);
  }
  addBox(ctx, group, mats.metal, 0.14, 4.6, 0.14, 3.2, crownBase + 2.3, -2.6);
  for (const y of [39.1, 40.0]) {
    addBox(ctx, group, mats.metal, 1.4, 0.05, 0.05, 3.2, y, -2.6);
  }
  addBox(ctx, group, beacon, 0.18, 0.18, 0.18, 3.2, crownBase + 4.64, -2.6);

  // 落水管与线槽，把顶部和基座在立面上连起来。
  for (const side of [-1, 1]) {
    addBox(ctx, group, mats.metal, 0.1, 25.0, 0.1, side * 5.66, 19.8, 4.7);
    for (let y = 8.4; y < 32.0; y += 2.4) {
      addBox(ctx, group, mats.metal, 0.2, 0.05, 0.14, side * 5.66, y, 4.76);
    }
  }

  // ————————————————————————————————————————————————
  // 6. 四面错层漫画展位：结构框体在两种模式下都保留，媒体面板只在正式模式出现
  // ————————————————————————————————————————————————
  for (const config of B01_COMIC_PANELS) {
    const layout = panelLayouts.get(config.facade);
    if (!layout) continue;
    addComicInstallation(
      ctx,
      group,
      mats,
      facadeFrames[config.facade],
      layout,
      structureOnly,
      posterSlots,
    );
  }

  // ————————————————————————————————————————————————
  // 7. 流动光幕、转角光带、标识、灯光与湿地
  // ————————————————————————————————————————————————
  if (structureOnly) {
    // 审阅用中性光：只负责读体积、凹面和框料厚度，不进入最终夜景。
    const reviewRig = new THREE.Group();
    reviewRig.name = `${spec.id}_StructureRig`;
    const key = new THREE.DirectionalLight(0xe8eeff, 2.8);
    key.position.set(26, 34, 30);
    key.target.position.set(0, 17, 2);
    const fill = new THREE.DirectionalLight(0x9db4da, 1.15);
    fill.position.set(-28, 15, 24);
    fill.target.position.set(0, 12, 2);
    const rim = new THREE.DirectionalLight(0xffb489, 1.2);
    rim.position.set(-16, 22, -34);
    rim.target.position.set(0, 24, 0);
    const lobbyLight = new THREE.PointLight(0xffe7c8, 16, 10, 2);
    lobbyLight.position.set(0, 3.2, 3.5);
    reviewRig.add(key, key.target, fill, fill.target, rim, rim.target, lobbyLight);
    group.add(reviewRig);
  }

  if (!structureOnly) {
    for (const curtain of B01_LIGHT_CURTAINS) {
      const layout = panelLayouts.get(curtain.facade);
      if (!layout) continue;
      addLightCurtain(
        group,
        spec,
        facadeFrames[curtain.facade],
        layout,
        curtain.phase,
        curtain.speed,
        curtain.goldBias,
        curtain.opacity,
        shaftBase,
        shaftTop,
      );
    }
    addCornerLightBands(ctx, group, spec, shaftBase, shaftTop);

    const roofSignTexture = createSignTexture('LOHINA', 'NORTH · B-01', {
      color: '#e9fdff',
      subColor: 'rgba(255,196,107,0.78)',
      width: 1024,
      height: 256,
    });
    addPlane(group, createLabelMaterial(roofSignTexture), 6.55, 1.4, 0, 38.2, 3.17, 0, `${spec.id}_RoofSign`);

    const entryLabel = createSignTexture('LOHINA', 'NORTH · B-01', {
      color: '#e9fdff',
      subColor: 'rgba(255,196,107,0.78)',
      width: 1024,
      height: 256,
    });
    addBox(ctx, group, mats.frame, 4.7, 0.78, 0.16, 0, 5.38, frontZ + 0.02);
    addPlane(group, createLabelMaterial(entryLabel), 4.45, 0.64, 0, 5.38, frontZ + 0.11, 0, `${spec.id}_EntrySign`);

    // 媒体结构的霓虹边只做“收口”，不替代建筑。
    for (const side of [-1, 1]) {
      addBox(ctx, group, mats.cyan, 0.045, 15.6, 0.05, side * 4.18, mediaCY, 4.72);
    }

    const mediaLight = new THREE.PointLight(0x48e9ff, 26, 30, 2);
    mediaLight.position.set(0, 16, 9);
    mediaLight.name = `${spec.id}_MediaWash`;
    group.add(mediaLight);
    const entryLight = new THREE.PointLight(0xffc07a, 10, 9, 2);
    entryLight.position.set(0, 2.8, 3.4);
    entryLight.name = `${spec.id}_EntryWash`;
    group.add(entryLight);

    // 建筑泛光：只洗 B-01 自己的立面，避免屏幕成为黑盒子里唯一的亮面。
    const facadeWash = new THREE.SpotLight(0xb9dcff, 260, 70, 0.72, 0.85, 2);
    facadeWash.position.set(0, 26, 16);
    facadeWash.target.position.set(0, 15, 4);
    facadeWash.name = `${spec.id}_FacadeWash`;
    group.add(facadeWash, facadeWash.target);
    const baseFill = new THREE.SpotLight(0xffb877, 60, 34, 0.6, 0.9, 2);
    baseFill.position.set(-8, 1.6, 12);
    baseFill.target.position.set(-2, 7.5, 4.5);
    baseFill.name = `${spec.id}_BaseFill`;
    group.add(baseFill, baseFill.target);

    addWetMirror(ctx, group, frontZ);
    addGroundGlow(ctx, group, frontZ);
  }

  group.userData.mediaFacade = {
    entityId: spec.id,
    mode: structureOnly ? 'structure' : 'media',
    podium: `${podiumW} × ${podiumH} × ${podiumD} m · 3.45m 深门洞 · 门后 ${(rearMassFront - rearMassBack).toFixed(2)}m 内部空间`,
    shaft: `${shaftW} × ${shaftH} × ${shaftD} m · 设备层 4 道`,
    mediaBay: B01_COMIC_PANELS.map((panel) => {
      const layout = panelLayouts.get(panel.facade);
      if (!layout) return panel.facade;
      return `${panel.facade} ${panel.width}×${layout.height.toFixed(2)}m @ ${layout.centerY.toFixed(2)}m`;
    }).join(' · '),
    setbacks: `${setbackW} × ${setbackH} × ${setbackD} m · 开放钢冠顶`,
    textures: structureOnly
      ? []
      : B01_COMIC_PANELS.map((panel) => `comic ${panel.facade} ${panel.image} (${panel.aspect.toFixed(3)})`).concat(
          'light curtain shader · 4 facades',
        ),
  };

  group.position.set(spec.position[0], spec.position[1], spec.position[2]);
  group.rotation.y = spec.yawRad;

  return {
    spec,
    group,
    posterSlots,
    occluders,
    fadeMaterials: mats.fade,
    fadeMeshes,
  };
}
