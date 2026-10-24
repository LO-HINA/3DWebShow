import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeStaticGroup } from '../../../engine/primitives/merge';
import type { WorldMaterials } from '../materials';
import { createSignTexture } from '../textures';
import { PALETTE } from '../theme';
import { createImageChannel, createVideoChannel, type MediaChannel, type MediaFit, type MediaFrame, type MediaManifest } from '../media';
import { MEDIA_TOWER } from '../layout';
import { buildDeepFacades } from './cityStyle';

export interface MediaTowerHandle {
  group: THREE.Group;
  update(time: number, delta: number, reducedMotion: boolean): void;
  dispose(): void;
}

interface ScreenSurface {
  mesh: THREE.Mesh;
  show(frame: MediaFrame | null): void;
  dispose(): void;
}

const PODIUM = MEDIA_TOWER.podium;
const SHAFT = MEDIA_TOWER.shaft;
const FRONT_Z = SHAFT.depth / 2;
const SHELL_TOP = SHAFT.base + SHAFT.height;

const SCREEN = {
  neon: { width: 26, height: 42, centerY: 43 },
  video: { width: 26, height: 30, centerY: 81 },
  image: { width: 26, height: 18, centerY: 107 },
} as const;

function meshOf(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  castShadow = false,
  receiveShadow = false,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  return mesh;
}

function box(
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  castShadow = false,
  receiveShadow = false,
): THREE.Mesh {
  return meshOf(new THREE.BoxGeometry(width, height, depth), material, x, y, z, castShadow, receiveShadow);
}

function createStandbyTexture(anisotropy: number): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建媒体塔待机纹理');

  const background = ctx.createLinearGradient(0, 0, size, size);
  background.addColorStop(0, '#050a12');
  background.addColorStop(0.55, '#0a1622');
  background.addColorStop(1, '#03060b');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(80, 190, 235, 0.16)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 8; i += 1) {
    const p = (i / 8) * size;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  const glow = ctx.createRadialGradient(size * 0.5, size * 0.46, 0, size * 0.5, size * 0.46, size * 0.5);
  glow.addColorStop(0, 'rgba(0, 240, 255, 0.16)');
  glow.addColorStop(1, 'rgba(0, 240, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e9f8ff';
  ctx.font = '600 132px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.fillText('LOHINA', size / 2, size * 0.42);
  ctx.fillStyle = 'rgba(0, 240, 255, 0.82)';
  ctx.font = '500 44px "Segoe UI", sans-serif';
  ctx.fillText('MEDIA TOWER', size / 2, size * 0.52);
  ctx.fillStyle = 'rgba(233, 226, 214, 0.55)';
  ctx.font = '400 28px "Microsoft YaHei", sans-serif';
  ctx.fillText('把视频放入 videos/ 并写入 manifest.json', size / 2, size * 0.6);

  ctx.fillStyle = 'rgba(255, 179, 102, 0.9)';
  ctx.fillRect(size * 0.3, size * 0.48, size * 0.4, 3);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  return texture;
}

function createGridOverlayTexture(anisotropy: number): THREE.CanvasTexture {
  const width = 512;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建媒体塔幕墙网格');

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(126, 196, 232, 0.18)';
  ctx.lineWidth = 2;
  for (let i = 1; i < 6; i += 1) {
    const x = (i / 6) * width;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let i = 1; i < 18; i += 1) {
    const y = (i / 18) * height;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // 斜向玻璃反光，让“屏幕”仍然像一整面幕墙。
  const sheen = ctx.createLinearGradient(0, height, width, 0);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0)');
  sheen.addColorStop(0.46, 'rgba(196, 233, 255, 0.1)');
  sheen.addColorStop(0.52, 'rgba(196, 233, 255, 0.02)');
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = anisotropy;
  return texture;
}

function createNeonMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uGold: { value: new THREE.Color(PALETTE.emissiveGold) },
      uCyan: { value: new THREE.Color(PALETTE.emissiveCyan) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec3 uGold;
      uniform vec3 uCyan;

      float hash(float n) {
        return fract(sin(n * 127.1) * 43758.5453123);
      }

      void main() {
        vec2 uv = vUv;
        float columns = 16.0;
        float column = floor(uv.x * columns);
        float h1 = hash(column + 1.7);
        float h2 = hash(column * 3.7 + 11.3);
        float speed = 0.05 + h1 * 0.13;
        float headPos = 0.68 + h2 * 0.14;

        // 往上流动的彗星状光束：亮头 + 长尾，尾部用 mod 包住接缝，避免硬切边。
        float seg = fract(uv.y * 1.7 - uTime * speed + h2);
        float behind = mod(headPos - seg, 1.0);
        float ahead = mod(seg - headPos, 1.0);
        float core = exp(-ahead * ahead * 1500.0);
        float lead = exp(-ahead * 24.0) * 0.3;
        float tail = exp(-behind * 3.1) * 0.42;
        float flicker = 0.84 + 0.16 * sin(uTime * (1.6 + h1 * 2.4) + column * 2.1);
        float beam = (core * 2.0 + lead + tail) * (0.4 + h1 * 0.8) * flicker;

        // 每列宽度不同，横向高斯轮廓让光束有发光衰减而不是实心色块。
        float across = abs(fract(uv.x * columns) - 0.5) * 2.0;
        float width = 0.55 + h2 * 0.45;
        beam *= exp(-pow(across / width, 2.0) * 3.4);

        vec3 tint = mix(uGold, uCyan, step(0.58, h2));
        float sweep = exp(-pow((fract(uv.y * 0.45 - uTime * 0.07) - 0.5) * 8.0, 2.0)) * 0.2;
        float grid = smoothstep(0.96, 1.0, fract(uv.y * 26.0)) * 0.05;
        float vignette = smoothstep(0.0, 0.1, uv.x) * smoothstep(0.0, 0.1, 1.0 - uv.x);
        vec3 base = vec3(0.008, 0.016, 0.03);
        vec3 color = base + (tint * (beam + sweep) + vec3(0.16, 0.42, 0.62) * grid) * vignette;
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
    toneMapped: false,
  });
}

function setUvRange(geometry: THREE.PlaneGeometry, u0: number, v0: number, u1: number, v1: number): void {
  const uv = geometry.getAttribute('uv') as THREE.BufferAttribute;
  // PlaneGeometry 顶点顺序：左上、右上、左下、右下。
  uv.setXY(0, u0, v1);
  uv.setXY(1, u1, v1);
  uv.setXY(2, u0, v0);
  uv.setXY(3, u1, v0);
  uv.needsUpdate = true;
}

function createScreenSurface(
  width: number,
  height: number,
  fit: MediaFit,
  standby: THREE.Texture,
): ScreenSurface {
  const geometry = new THREE.PlaneGeometry(width, height);
  const material = new THREE.MeshBasicMaterial({
    map: standby,
    toneMapped: false,
    side: THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  setUvRange(geometry, 0, 0, 1, 1);

  const show = (frame: MediaFrame | null): void => {
    mesh.scale.set(1, 1, 1);
    if (!frame) {
      material.map = standby;
      setUvRange(geometry, 0, 0, 1, 1);
      return;
    }
    material.map = frame.texture;
    const panelAspect = width / height;
    const sourceAspect = frame.aspect > 0 ? frame.aspect : 16 / 9;
    if (fit === 'contain') {
      setUvRange(geometry, 0, 0, 1, 1);
      if (sourceAspect > panelAspect) mesh.scale.set(1, panelAspect / sourceAspect, 1);
      else mesh.scale.set(sourceAspect / panelAspect, 1, 1);
      return;
    }
    if (sourceAspect > panelAspect) {
      const crop = panelAspect / sourceAspect;
      setUvRange(geometry, (1 - crop) / 2, 0, (1 + crop) / 2, 1);
    } else {
      const crop = sourceAspect / panelAspect;
      setUvRange(geometry, 0, (1 - crop) / 2, 1, (1 + crop) / 2);
    }
  };

  return {
    mesh,
    show,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

export function createMediaTower(
  materials: WorldMaterials,
  anisotropy: number,
  manifest: MediaManifest,
): MediaTowerHandle {
  const group = new THREE.Group();
  group.name = MEDIA_TOWER.id;

  const staticGroup = new THREE.Group();
  staticGroup.name = 'MediaTower_Static';

  const shellMaterial = new THREE.MeshStandardMaterial({
    color: 0x0b111c,
    roughness: 0.24,
    metalness: 0.82,
    envMapIntensity: 1.35,
  });
  shellMaterial.name = 'MediaTower_Shell';
  const podiumMaterial = new THREE.MeshStandardMaterial({
    color: 0x2b303c,
    roughness: 0.78,
    metalness: 0.18,
    envMapIntensity: 0.7,
  });
  podiumMaterial.name = 'MediaTower_Podium';
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x05080e,
    roughness: 0.4,
    metalness: 0.9,
    envMapIntensity: 0.8,
  });
  frameMaterial.name = 'MediaTower_Frame';
  const beaconMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a0505,
    emissive: 0xff2a18,
    emissiveIntensity: 3,
    roughness: 0.4,
    metalness: 0.1,
  });
  beaconMaterial.name = 'MediaTower_Beacon';
  const gold = materials.emissiveGold;
  const cyan = materials.emissiveCyan;
  const cyanSoft = materials.emissiveCyanSoft;
  const goldSoft = materials.emissiveGoldSoft;

  const add = (mesh: THREE.Mesh): THREE.Mesh => {
    staticGroup.add(mesh);
    return mesh;
  };

  // 塔基与广场地面接触阴影。
  const shadowMaterial = materials.contactShadow.clone();
  shadowMaterial.opacity = 0.55;
  const shadow = meshOf(new THREE.PlaneGeometry(50, 42), shadowMaterial, 0, 0.02, 0);
  shadow.rotation.x = -Math.PI / 2;
  shadow.renderOrder = 1;
  add(shadow);

  add(box(PODIUM.width + 1.2, 0.6, PODIUM.depth + 1.2, frameMaterial, 0, 0.3, 0, true, true));
  add(meshOf(
    new RoundedBoxGeometry(PODIUM.width - 2.6, PODIUM.height, PODIUM.depth - 2.6, 3, 0.28),
    podiumMaterial,
    0,
    PODIUM.height / 2,
    0,
    true,
    true,
  ));

  // 入口：深色门洞、玻璃、暖光框与雨棚。
  const doorZ = PODIUM.depth / 2;
  add(box(12, 8.2, 0.35, materials.frameBack, 0, 4.1, doorZ + 0.02));
  add(box(9, 6.4, 0.12, materials.glass, 0, 3.7, doorZ + 0.2));
  add(box(0.12, 6.4, 0.1, gold, -4.55, 3.7, doorZ + 0.28));
  add(box(0.12, 6.4, 0.1, gold, 4.55, 3.7, doorZ + 0.28));
  add(box(9.2, 0.12, 0.1, gold, 0, 6.95, doorZ + 0.28));
  add(box(14, 0.5, 3.4, frameMaterial, 0, 8.6, doorZ + 1.4, true));
  add(box(12.6, 0.08, 0.12, goldSoft, 0, 8.32, doorZ + 2.75));

  const signTexture = createSignTexture('LOHINA MEDIA', '媒体立面 · MEDIA TOWER', {
    color: '#f4e6d5',
    subColor: 'rgba(150,224,233,0.8)',
    width: 1024,
    height: 256,
  });
  const signMaterial = new THREE.MeshBasicMaterial({
    map: signTexture,
    transparent: true,
    toneMapped: false,
    depthWrite: false,
  });
  const sign = meshOf(new THREE.PlaneGeometry(12, 3), signMaterial, 0, 11.7, doorZ + 0.06);
  sign.renderOrder = 2;
  add(sign);

  // 裙房竖向壁柱与顶圈灯带。
  for (const x of [-18, -12, 12, 18]) {
    add(box(0.34, 14.6, 0.28, frameMaterial, x, 7.4, doorZ + 0.05, true));
  }
  add(box(PODIUM.width - 0.6, 0.12, 0.1, gold, 0, 15.5, doorZ + 0.02));
  add(box(PODIUM.width - 0.6, 0.12, 0.1, gold, 0, 15.5, -doorZ - 0.02));
  add(box(0.1, 0.12, PODIUM.depth - 0.6, gold, PODIUM.width / 2 + 0.02, 15.5, 0));
  add(box(0.1, 0.12, PODIUM.depth - 0.6, gold, -PODIUM.width / 2 - 0.02, 15.5, 0));

  // 塔身。
  add(meshOf(
    new RoundedBoxGeometry(SHAFT.width - 2.6, SHAFT.height, SHAFT.depth - 2.6, 2, 0.12),
    shellMaterial,
    0,
    SHAFT.base + SHAFT.height / 2,
    0,
    true,
    true,
  ));

  // 四角竖向灯线：从裙房顶一直读到冠顶。
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      const material = z > 0 ? cyan : goldSoft;
      add(box(0.12, SHAFT.height - 2, 0.12, material, x * (SHAFT.width / 2 - 0.06), SHAFT.base + SHAFT.height / 2, z * (SHAFT.depth / 2 - 0.06)));
    }
  }

  // 侧立面横向灯带。
  for (let i = 0; i < 9; i += 1) {
    const y = 26 + i * 12;
    const material = i % 2 === 0 ? cyanSoft : goldSoft;
    add(box(0.08, 0.09, SHAFT.depth - 3, material, SHAFT.width / 2 + 0.02, y, 0));
    add(box(0.08, 0.09, SHAFT.depth - 3, material, -SHAFT.width / 2 - 0.02, y, 0));
  }
  add(box(0.12, SHAFT.height - 12, 0.12, cyanSoft, 0, SHAFT.base + SHAFT.height / 2, -SHAFT.depth / 2 - 0.03));

  const screenZ = FRONT_Z + 0.05;

  // 下半部：程序化流动霓虹光束。
  const neonMaterial = createNeonMaterial();
  const neon = meshOf(
    new THREE.PlaneGeometry(SCREEN.neon.width, SCREEN.neon.height),
    neonMaterial,
    0,
    SCREEN.neon.centerY,
    screenZ,
  );
  group.add(neon);

  // 媒体幕墙网格：覆盖整块显示区，像幕墙竖框而不是贴图。
  for (const x of [-13, -7.8, -2.6, 2.6, 7.8, 13]) {
    add(box(0.18, 96, 0.16, frameMaterial, x, 69, screenZ + 0.04));
  }
  for (let y = 21; y <= 117; y += 6) {
    add(box(26.2, 0.09, 0.14, frameMaterial, 0, y, screenZ + 0.04));
  }

  const bezel = (width: number, height: number, centerY: number, material: THREE.Material): void => {
    const t = 0.3;
    add(box(width + t * 2, t, 0.26, material, 0, centerY + height / 2 + t / 2, screenZ + 0.06));
    add(box(width + t * 2, t, 0.26, material, 0, centerY - height / 2 - t / 2, screenZ + 0.06));
    add(box(t, height, 0.26, material, -width / 2 - t / 2, centerY, screenZ + 0.06));
    add(box(t, height, 0.26, material, width / 2 + t / 2, centerY, screenZ + 0.06));
  };
  bezel(SCREEN.neon.width, SCREEN.neon.height, SCREEN.neon.centerY, frameMaterial);
  bezel(SCREEN.video.width, SCREEN.video.height, SCREEN.video.centerY, gold);
  bezel(SCREEN.image.width, SCREEN.image.height, SCREEN.image.centerY, cyan);

  // 两块屏幕之间的分隔灯带。
  add(box(28, 1.15, 0.3, frameMaterial, 0, 65, screenZ + 0.07, true));
  add(box(27.4, 0.1, 0.1, gold, 0, 65, screenZ + 0.24));
  add(box(28, 0.7, 0.28, frameMaterial, 0, 97, screenZ + 0.06));
  add(box(27.4, 0.08, 0.1, cyan, 0, 97, screenZ + 0.22));

  // 屏幕底衬：contain 模式留黑边时不会露出塔身纹理。
  const backingMaterial = new THREE.MeshBasicMaterial({ color: 0x02040a, toneMapped: false });
  add(meshOf(new THREE.PlaneGeometry(SCREEN.video.width, SCREEN.video.height), backingMaterial, 0, SCREEN.video.centerY, screenZ - 0.01));
  add(meshOf(new THREE.PlaneGeometry(SCREEN.image.width, SCREEN.image.height), backingMaterial, 0, SCREEN.image.centerY, screenZ - 0.01));

  // 冠顶：实体退台 + 开放框架 + LED 环梁。
  add(box(31, 1.1, 23.2, frameMaterial, 0, SHELL_TOP - 0.3, 0, true));
  add(meshOf(
    new RoundedBoxGeometry(24, 12, 16, 2, 0.12),
    shellMaterial,
    0,
    SHELL_TOP + 6,
    0,
    true,
  ));
  add(box(8, 3.2, 6.4, frameMaterial, 0, SHELL_TOP + 7.6, 0, true));
  for (const x of [-10.5, 10.5]) {
    for (const z of [-6, 6]) {
      add(box(1.1, 10, 1.1, frameMaterial, x, SHELL_TOP + 17, z, true));
    }
  }
  add(box(23, 0.72, 0.92, gold, 0, SHELL_TOP + 21.4, -6.4));
  add(box(23, 0.72, 0.92, gold, 0, SHELL_TOP + 21.4, 6.4));
  add(box(0.92, 0.72, 12.8, gold, -11.1, SHELL_TOP + 21.4, 0));
  add(box(0.92, 0.72, 12.8, gold, 11.1, SHELL_TOP + 21.4, 0));
  add(box(20, 0.5, 12, frameMaterial, 0, SHELL_TOP + 22, 0, true));

  // 桅杆与航空障碍灯。
  add(box(0.55, 20, 0.55, frameMaterial, 0, SHELL_TOP + 32, 0, true));
  for (const y of [SHELL_TOP + 26, SHELL_TOP + 32, SHELL_TOP + 35]) {
    add(box(4.6, 0.12, 0.12, frameMaterial, 0, y, 0));
  }
  const beaconGeometry = new THREE.SphereGeometry(0.38, 10, 8);
  for (const y of [SHELL_TOP + 27, SHELL_TOP + 33, SHELL_TOP + 41.4]) {
    add(meshOf(beaconGeometry, beaconMaterial, 0, y, 0));
  }
  for (const x of [-10.5, 10.5]) {
    for (const z of [-6, 6]) {
      add(meshOf(beaconGeometry, beaconMaterial, x, SHELL_TOP + 22.6, z));
    }
  }

  const facade = buildDeepFacades(group,[
    {x:0,y:PODIUM.height/2,z:0,w:PODIUM.width,h:PODIUM.height,d:PODIUM.depth},
    {x:0,y:SHAFT.base+SHAFT.height/2,z:0,w:SHAFT.width,h:SHAFT.height,d:SHAFT.depth},
  ],303,{far:true,reserved:[
    {x:0,y:4.1,w:14,h:8.2},
    {x:0,y:SCREEN.neon.centerY,w:SCREEN.neon.width+0.4,h:SCREEN.neon.height+0.4},
    {x:0,y:SCREEN.video.centerY,w:SCREEN.video.width+0.4,h:SCREEN.video.height+0.4},
    {x:0,y:SCREEN.image.centerY,w:SCREEN.image.width+0.4,h:SCREEN.image.height+0.4},
  ]});
  group.userData.cityStyle={style:'zenith-physical-windows',...facade};
  mergeStaticGroup(staticGroup);
  group.add(staticGroup);

  const standby = createStandbyTexture(anisotropy);
  const gridTexture = createGridOverlayTexture(anisotropy);
  const gridMaterial = new THREE.MeshBasicMaterial({
    map: gridTexture,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    toneMapped: false,
    side: THREE.FrontSide,
  });
  const grid = meshOf(new THREE.PlaneGeometry(27, 97), gridMaterial, 0, 69, screenZ + 0.16);
  grid.renderOrder = 3;
  group.add(grid);

  const videoSurface = createScreenSurface(SCREEN.video.width, SCREEN.video.height, manifest.videoFit, standby);
  videoSurface.mesh.position.set(0, SCREEN.video.centerY, screenZ + 0.02);
  videoSurface.mesh.renderOrder = 2;
  group.add(videoSurface.mesh);

  const imageSurface = createScreenSurface(SCREEN.image.width, SCREEN.image.height, manifest.videoFit, standby);
  imageSurface.mesh.position.set(0, SCREEN.image.centerY, screenZ + 0.02);
  imageSurface.mesh.renderOrder = 2;
  group.add(imageSurface.mesh);

  // 背面图片带：绕到塔后仍有内容可看。
  const backSurface = createScreenSurface(18, 10, manifest.videoFit, standby);
  backSurface.mesh.position.set(0, 84, -FRONT_Z - 0.03);
  backSurface.mesh.rotation.y = Math.PI;
  group.add(backSurface.mesh);

  const channels: MediaChannel[] = [];
  const unsubscribe: Array<() => void> = [];
  const imageChannel = createImageChannel(manifest.images, anisotropy, manifest.imageDuration);
  const videoChannel = createVideoChannel(manifest.videos);
  channels.push(imageChannel, videoChannel);
  unsubscribe.push(
    imageChannel.subscribe((frame) => {
      imageSurface.show(frame);
      backSurface.show(frame);
    }),
    videoChannel.subscribe((frame) => {
      videoSurface.show(frame);
    }),
  );

  const glow = new THREE.PointLight(PALETTE.emissiveCyan, 32, 58, 2);
  glow.position.set(0, 8, FRONT_Z + 8);
  group.add(glow);

  group.position.set(MEDIA_TOWER.position[0], MEDIA_TOWER.position[1], MEDIA_TOWER.position[2]);
  group.rotation.y = MEDIA_TOWER.yawRad;

  const neonTime = neonMaterial.uniforms.uTime as THREE.IUniform<number>;
  let disposed = false;

  return {
    group,
    update(time, delta, reducedMotion) {
      if (disposed) return;
      neonTime.value = reducedMotion ? 4 : time;
      beaconMaterial.emissiveIntensity = reducedMotion ? 2.6 : 2.6 + Math.sin(time * 2.4) * 1.5;
      imageChannel.update(delta);
      videoChannel.update(delta);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const off of unsubscribe) off();
      for (const channel of channels) channel.dispose();
      for (const surface of [videoSurface, imageSurface, backSurface]) surface.dispose();
      neonMaterial.dispose();
      gridMaterial.dispose();
      gridTexture.dispose();
      standby.dispose();
      signTexture.dispose();
      signMaterial.dispose();
      shellMaterial.dispose();
      podiumMaterial.dispose();
      frameMaterial.dispose();
      beaconMaterial.dispose();
      shadowMaterial.dispose();
      backingMaterial.dispose();
      group.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
    },
  };
}
