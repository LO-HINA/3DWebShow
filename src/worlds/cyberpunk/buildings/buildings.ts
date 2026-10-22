import type { BuildingSpec } from '../types';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getArtwork } from '../../../content/artworks/index';
import type { Vec3 } from '../../../engine/contracts/types';
import { createLabelMaterial, createPosterMaterial, type WorldMaterials } from '../materials';
import {
  createGalleryFeatureTexture,
  createGalleryPosterTexture,
  createGallerySignTexture,
  createSignTexture,
  createVerticalSignTexture,
} from '../textures';

export interface BuiltBuilding {
  spec: BuildingSpec;
  group: THREE.Group;
  posterSlots: Map<string, THREE.Mesh>;
  occluders: THREE.Mesh[];
  fadeMaterials: THREE.MeshStandardMaterial[];
  fadeMeshes: THREE.Mesh[];
}

interface BuildContext {
  materials: WorldMaterials;
  anisotropy: number;
  geometryCache: Map<string, THREE.BufferGeometry>;
}

const LIGHT_SLOT = { thin: 0.035 } as const;

function boxGeometry(ctx: BuildContext, width: number, height: number, depth: number): THREE.BufferGeometry {
  const key = `box:${width.toFixed(3)}:${height.toFixed(3)}:${depth.toFixed(3)}`;
  let geometry = ctx.geometryCache.get(key);
  if (!geometry) {
    geometry = new THREE.BoxGeometry(width, height, depth);
    ctx.geometryCache.set(key, geometry);
  }
  return geometry;
}

function roundedGeometry(
  ctx: BuildContext,
  width: number,
  height: number,
  depth: number,
  segments: number,
  radius: number,
): THREE.BufferGeometry {
  const key = `round:${width.toFixed(3)}:${height.toFixed(3)}:${depth.toFixed(3)}:${segments}:${radius.toFixed(3)}`;
  let geometry = ctx.geometryCache.get(key);
  if (!geometry) {
    geometry = new RoundedBoxGeometry(width, height, depth, segments, radius);
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

function addRounded(
  ctx: BuildContext,
  parent: THREE.Object3D,
  material: THREE.Material,
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number,
  radius: number,
  segments: number,
  options: { castShadow?: boolean; receiveShadow?: boolean; name?: string } = {},
): THREE.Mesh {
  return addMesh(
    parent,
    roundedGeometry(ctx, width, height, depth, segments, radius),
    material,
    [x, y, z],
    options,
  );
}

function addSign(
  parent: THREE.Object3D,
  texture: THREE.Texture,
  width: number,
  height: number,
  x: number,
  y: number,
  z: number,
  yawRad = 0,
): THREE.Mesh {
  const material = createLabelMaterial(texture);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = yawRad;
  mesh.renderOrder = 2;
  parent.add(mesh);
  return mesh;
}

function addContactShadow(ctx: BuildContext, parent: THREE.Object3D, width: number, depth: number, opacity = 0.5): THREE.Mesh {
  const material = ctx.materials.contactShadow.clone();
  material.opacity = opacity;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.015;
  mesh.renderOrder = 1;
  parent.add(mesh);
  return mesh;
}

function createShellMaterialPair(ctx: BuildContext): {
  warm: THREE.MeshStandardMaterial;
  light: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  fade: THREE.MeshStandardMaterial[];
} {
  const warm = ctx.materials.concreteWarm.clone();
  warm.name = 'Shell_Warm';
  const light = ctx.materials.concreteWarmLight.clone();
  light.name = 'Shell_WarmLight';
  const dark = ctx.materials.concreteDark.clone();
  dark.name = 'Shell_Dark';
  return { warm, light, dark, fade: [warm, light, dark] };
}

function addPoster(
  ctx: BuildContext,
  parent: THREE.Object3D,
  artworkId: string,
  slot: string,
  localX: number,
  localY: number,
  depth: number,
  frameMaterial: THREE.Material,
  glowMaterial: THREE.Material,
): THREE.Mesh {
  const artwork = getArtwork(artworkId);
  const texture = new THREE.CanvasTexture(artwork.canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = ctx.anisotropy;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  const frame = new THREE.Mesh(
    boxGeometry(ctx, 3.62, 6.08, 0.1),
    frameMaterial,
  );
  frame.position.set(localX, localY, depth / 2 + 0.02);
  frame.name = `${slot}_Frame`;
  parent.add(frame);

  const imageMaterial = createPosterMaterial(texture);
  const image = new THREE.Mesh(new THREE.PlaneGeometry(3.15, 5.6), imageMaterial);
  image.position.set(localX, localY, depth / 2 + 0.09);
  image.name = slot;
  image.userData.slotName = slot;
  parent.add(image);

  // 细灯槽只出现在海报上方，避免整面墙发亮。
  const bar = new THREE.Mesh(
    boxGeometry(ctx, 3.1, 0.045, 0.06),
    glowMaterial,
  );
  bar.position.set(localX, localY + 2.93, depth / 2 + 0.07);
  parent.add(bar);

  return image;
}

function towerA(ctx: BuildContext, spec: BuildingSpec): BuiltBuilding {
  const group = new THREE.Group();
  group.name = spec.id;
  const [width, , depth] = spec.size;
  const shell = createShellMaterialPair(ctx);
  const posterSlots = new Map<string, THREE.Mesh>();
  const occluders: THREE.Mesh[] = [];
  const fadeMeshes: THREE.Mesh[] = [];

  addRounded(ctx, group, ctx.materials.concreteDark, width + 0.32, 0.5, depth + 0.32, 0, 0.25, 0, 0.06, 1, {
    receiveShadow: true,
    name: `${spec.id}_Plinth`,
  });

  const bodyHeight = 15.1;
  const body = addRounded(
    ctx,
    group,
    shell.warm,
    width - 0.4,
    bodyHeight,
    depth - 0.2,
    0,
    0.5 + bodyHeight / 2,
    0,
    0.12,
    2,
    { castShadow: true, receiveShadow: true, name: `${spec.id}_Occluder_Shell` },
  );
  occluders.push(body);
  fadeMeshes.push(body);

  const upperHeight = 6.0;
  const upper = addRounded(
    ctx,
    group,
    shell.light,
    width - 1.35,
    upperHeight,
    depth - 1.15,
    -0.6,
    15.6 + upperHeight / 2,
    -0.4,
    0.1,
    2,
    { castShadow: true, receiveShadow: true, name: `${spec.id}_Upper` },
  );
  occluders.push(upper);
  fadeMeshes.push(upper);

  addBox(ctx, group, shell.dark, width - 0.75, 0.24, depth - 0.7, -0.6, 21.72, -0.4, {
    castShadow: true,
    receiveShadow: true,
  });
  addRounded(ctx, group, shell.light, 3.6, 1.25, 2.9, 1.15, 22.55, -0.9, 0.07, 1, {
    castShadow: true,
  });

  // 竖向鳍片与分层凹槽，形成可读的立面节奏。
  for (const finX of [-4.35, 0, 4.35]) {
    addBox(ctx, group, shell.dark, 0.2, 14.8, 0.26, finX, 8.0, depth / 2 + 0.02, {
      castShadow: true,
    });
  }
  for (const bandY of [9.35, 16.05]) {
    addBox(ctx, group, shell.dark, width - 0.18, 0.11, depth - 0.02, 0, bandY, 0);
  }

  // 底部入口：深色门洞、暖光框、雨棚。
  addBox(ctx, group, ctx.materials.frameBack, 3.5, 3.0, 0.18, 0, 1.75, depth / 2 + 0.01);
  addBox(ctx, group, ctx.materials.glass, 2.35, 2.55, 0.08, 0, 1.52, depth / 2 + 0.12);
  addBox(ctx, group, ctx.materials.emissiveGoldSoft, 2.55, 0.055, 0.06, 0, 2.86, depth / 2 + 0.16);
  addBox(ctx, group, ctx.materials.emissiveGoldSoft, 0.055, 2.55, 0.06, -1.25, 1.58, depth / 2 + 0.16);
  addBox(ctx, group, ctx.materials.emissiveGoldSoft, 0.055, 2.55, 0.06, 1.25, 1.58, depth / 2 + 0.16);
  addBox(ctx, group, shell.dark, 4.3, 0.16, 1.1, 0, 3.32, depth / 2 + 0.48, { castShadow: true });
  addBox(ctx, group, ctx.materials.metal, 0.09, 2.8, 0.09, -1.85, 1.55, depth / 2 + 0.92);
  addBox(ctx, group, ctx.materials.metal, 0.09, 2.8, 0.09, 1.85, 1.55, depth / 2 + 0.92);
  addBox(ctx, group, ctx.materials.emissiveGold, 3.5, LIGHT_SLOT.thin, 0.05, 0, 3.22, depth / 2 + 1.0);

  const label = createSignTexture(spec.sign, spec.subSign, {
    color: '#f3e2cc',
    subColor: 'rgba(255,196,130,0.78)',
    width: 1024,
    height: 256,
  });
  addSign(group, label, 4.4, 1.1, 0, 3.95, depth / 2 + 0.07);

  // 少量暖窗，控制发光面积。
  for (const [wx, wy] of [
    [-3.2, 5.2],
    [3.2, 5.2],
    [-3.2, 7.4],
    [3.2, 7.4],
  ] as Array<[number, number]>) {
    addBox(ctx, group, ctx.materials.frameBack, 1.15, 1.65, 0.05, wx, wy, depth / 2 + 0.015);
    addBox(ctx, group, ctx.materials.warmWindow, 0.94, 1.42, 0.03, wx, wy, depth / 2 + 0.05);
  }

  // 屋顶设备与天线，让天际线不是平切。
  addBox(ctx, group, shell.dark, 1.3, 0.7, 1.0, -2.6, 23.55, -1.3, { castShadow: true });
  addBox(ctx, group, ctx.materials.metal, 0.055, 1.6, 0.055, 1.9, 24.0, -1.6);
  addBox(ctx, group, ctx.materials.emissiveGold, 0.09, 0.09, 0.09, 1.9, 24.82, -1.6);

  for (const poster of spec.posters ?? []) {
    posterSlots.set(
      poster.slot,
      addPoster(ctx, group, poster.artworkId, poster.slot, poster.localX, poster.localY, depth, ctx.materials.frame, ctx.materials.emissiveGoldSoft),
    );
  }

  addContactShadow(ctx, group, width + 2.6, depth + 2.6, 0.46);

  group.position.set(spec.position[0], spec.position[1], spec.position[2]);
  group.rotation.y = spec.yawRad;
  return { spec, group, posterSlots, occluders, fadeMaterials: shell.fade, fadeMeshes };
}

function towerB(ctx: BuildContext, spec: BuildingSpec): BuiltBuilding {
  const group = new THREE.Group();
  group.name = spec.id;
  const [width, , depth] = spec.size;
  const shell = createShellMaterialPair(ctx);
  const posterSlots = new Map<string, THREE.Mesh>();
  const occluders: THREE.Mesh[] = [];
  const fadeMeshes: THREE.Mesh[] = [];

  addRounded(ctx, group, ctx.materials.concreteDark, width + 0.34, 0.48, depth + 0.3, 0, 0.24, 0, 0.06, 1, {
    receiveShadow: true,
  });

  const bodyHeight = 17.2;
  const body = addRounded(
    ctx,
    group,
    shell.warm,
    width - 0.5,
    bodyHeight,
    depth - 0.2,
    0,
    0.48 + bodyHeight / 2,
    0,
    0.12,
    2,
    { castShadow: true, receiveShadow: true, name: `${spec.id}_Occluder_Shell` },
  );
  occluders.push(body);
  fadeMeshes.push(body);

  const upperHeight = 6.4;
  const upper = addRounded(
    ctx,
    group,
    shell.light,
    width - 2.0,
    upperHeight,
    depth - 1.2,
    0.7,
    17.68 + upperHeight / 2,
    -0.35,
    0.1,
    2,
    { castShadow: true, receiveShadow: true },
  );
  occluders.push(upper);
  fadeMeshes.push(upper);

  addBox(ctx, group, shell.dark, width - 1.4, 0.26, depth - 0.75, 0.7, 24.18, -0.35, {
    castShadow: true,
    receiveShadow: true,
  });
  addRounded(ctx, group, shell.dark, 4.4, 1.1, 3.1, -0.3, 24.85, -0.7, 0.06, 1, {
    castShadow: true,
  });

  for (const finX of [-4.7, 0, 4.7]) {
    addBox(ctx, group, shell.dark, 0.22, 16.6, 0.3, finX, 8.9, depth / 2 + 0.02, {
      castShadow: true,
    });
  }
  for (const bandY of [10.0, 18.1]) {
    addBox(ctx, group, shell.dark, width - 0.24, 0.1, depth, 0, bandY, 0);
  }

  addBox(ctx, group, ctx.materials.frameBack, 3.3, 2.9, 0.18, 0, 1.7, depth / 2 + 0.01);
  addBox(ctx, group, ctx.materials.glass, 2.2, 2.5, 0.08, 0, 1.48, depth / 2 + 0.12);
  addBox(ctx, group, ctx.materials.emissiveCyanSoft, 2.4, 0.05, 0.06, 0, 2.8, depth / 2 + 0.16);
  addBox(ctx, group, ctx.materials.emissiveCyanSoft, 0.05, 2.5, 0.06, -1.15, 1.55, depth / 2 + 0.16);
  addBox(ctx, group, ctx.materials.emissiveCyanSoft, 0.05, 2.5, 0.06, 1.15, 1.55, depth / 2 + 0.16);
  addBox(ctx, group, shell.dark, 4.0, 0.16, 1.05, 0, 3.25, depth / 2 + 0.45, { castShadow: true });
  addBox(ctx, group, ctx.materials.metal, 0.09, 2.7, 0.09, -1.72, 1.5, depth / 2 + 0.88);
  addBox(ctx, group, ctx.materials.metal, 0.09, 2.7, 0.09, 1.72, 1.5, depth / 2 + 0.88);

  const label = createSignTexture(spec.sign, spec.subSign, {
    color: '#edf5ff',
    subColor: 'rgba(0,240,255,0.68)',
    width: 1024,
    height: 256,
  });
  addSign(group, label, 4.3, 1.06, 0, 3.9, depth / 2 + 0.07);

  const vertical = createVerticalSignTexture(spec.sign);
  addSign(group, vertical, 1.45, 5.8, -width / 2 - 0.04, 13.2, 0.6, -Math.PI / 2);

  // 低频灯槽，沿立面只出现两段。
  addBox(ctx, group, ctx.materials.emissiveCyanSoft, 0.05, 4.1, 0.06, -width / 2 + 0.4, 6.4, depth / 2 + 0.03);
  addBox(ctx, group, ctx.materials.emissiveGoldSoft, 0.05, 2.4, 0.06, width / 2 - 0.35, 5.2, depth / 2 + 0.03);

  for (const poster of spec.posters ?? []) {
    posterSlots.set(
      poster.slot,
      addPoster(ctx, group, poster.artworkId, poster.slot, poster.localX, poster.localY, depth, ctx.materials.frame, ctx.materials.emissiveCyanSoft),
    );
  }

  addBox(ctx, group, ctx.materials.metal, 0.06, 2.0, 0.06, 0.4, 26.3, -0.7);
  addBox(ctx, group, ctx.materials.emissiveCyan, 0.1, 0.1, 0.1, 0.4, 27.32, -0.7);

  addContactShadow(ctx, group, width + 2.8, depth + 2.8, 0.48);

  group.position.set(spec.position[0], spec.position[1], spec.position[2]);
  group.rotation.y = spec.yawRad;
  return { spec, group, posterSlots, occluders, fadeMaterials: shell.fade, fadeMeshes };
}

function gallery(ctx: BuildContext, spec: BuildingSpec): BuiltBuilding {
  const group = new THREE.Group();
  group.name = spec.id;
  const [width, , depth] = spec.size;
  const shell = createShellMaterialPair(ctx);
  const occluders: THREE.Mesh[] = [];
  const fadeMeshes: THREE.Mesh[] = [];

  // E-01 专属材料：铜色窗框、近黑凹槽和更薄的透明玻璃。
  const bronze = ctx.materials.metalSoft.clone();
  bronze.name = 'Gallery_Bronze';
  bronze.color.setHex(0x6b523b);
  bronze.metalness = 0.58;
  bronze.roughness = 0.4;
  bronze.envMapIntensity = 1.1;

  const darkBronze = ctx.materials.metal.clone();
  darkBronze.name = 'Gallery_DarkBronze';
  darkBronze.color.setHex(0x2a241f);
  darkBronze.metalness = 0.5;
  darkBronze.roughness = 0.52;

  const recess = ctx.materials.frameBack.clone();
  recess.name = 'Gallery_Recess';
  recess.color.setHex(0x06070b);
  recess.roughness = 0.96;

  const glass = ctx.materials.glass.clone();
  glass.name = 'Gallery_Glass';
  glass.color.setHex(0x6f8a9e);
  glass.transparent = true;
  glass.opacity = 0.06;
  glass.depthWrite = false;
  glass.roughness = 0.08;
  glass.metalness = 0.12;
  glass.envMapIntensity = 1.15;

  const pictureLight = ctx.materials.emissiveGoldSoft.clone();
  pictureLight.name = 'Gallery_PictureLight';
  pictureLight.emissiveIntensity = 0.5;

  const featureMaterial = createPosterMaterial(createGalleryFeatureTexture());
  const posterMaterial = createPosterMaterial(createGalleryPosterTexture());
  const doorSignMaterial = createLabelMaterial(createGallerySignTexture());
  const captionMaterial = createLabelMaterial(
    createSignTexture('暮光构造', '主视觉 / FEATURED', {
      width: 512,
      height: 128,
      color: '#d8c1a2',
      subColor: 'rgba(255,179,102,0.62)',
      align: 'left',
    }),
  );
  const backSignMaterial = createLabelMaterial(
    createSignTexture('GALLERY', '视觉与摄影 · E-01', {
      width: 512,
      height: 128,
      color: '#d9c5a8',
      subColor: 'rgba(0,240,255,0.58)',
    }),
  );

  // 基座压低到 0.30m，门前保持可通行尺度；主体 8.5×4.05×11.2m。
  addRounded(ctx, group, ctx.materials.concreteDark, width + 0.4, 0.3, depth + 0.4, 0, 0.15, 0, 0.05, 1, {
    receiveShadow: true,
  });
  addBox(ctx, group, recess, 2.58, 0.035, 0.34, 0, 0.315, 6.18, { receiveShadow: true });

  const bodyW = 8.5;
  const bodyH = 4.05;
  const bodyD = 11.2;
  const baseY = 0.3;
  const bodyTop = baseY + bodyH;
  const frontZ = bodyD / 2;
  const wallZ = frontZ + 0.23;
  const wallT = 0.46;
  const openingTop = 3.22;

  const body = addRounded(
    ctx,
    group,
    shell.warm,
    bodyW,
    bodyH,
    bodyD,
    0,
    baseY + bodyH / 2,
    0,
    0.12,
    2,
    { castShadow: true, receiveShadow: true, name: `${spec.id}_Occluder_Shell` },
  );
  occluders.push(body);
  fadeMeshes.push(body);

  // 屋顶灯笼体：把主体从单一体块变成“基座 + 采光体 + 压顶”的主次关系。
  const lantern = addRounded(
    ctx,
    group,
    shell.light,
    4.4,
    1.5,
    8.2,
    1.6,
    bodyTop + 0.75,
    -0.8,
    0.08,
    2,
    { castShadow: true, receiveShadow: true },
  );
  occluders.push(lantern);
  fadeMeshes.push(lantern);
  addRounded(ctx, group, shell.dark, 4.7, 0.14, 8.5, 1.6, bodyTop + 1.57, -0.8, 0.04, 1, {
    castShadow: true,
  });

  // 灯笼体东立面：三扇高窗与横向金属压条，远看形成细密的上层节奏。
  addBox(ctx, group, darkBronze, 4.42, 0.055, 0.06, 1.6, bodyTop + 0.16, 3.33);
  for (const lx of [0.95, 1.95, 2.95]) {
    addBox(ctx, group, recess, 0.9, 0.62, 0.06, lx, bodyTop + 0.5, 3.33);
    addBox(ctx, group, ctx.materials.warmWindow, 0.78, 0.5, 0.025, lx, bodyTop + 0.5, 3.365);
    addBox(ctx, group, bronze, 0.84, 0.035, 0.03, lx, bodyTop + 0.77, 3.385);
    addBox(ctx, group, bronze, 0.03, 0.52, 0.03, lx - 0.42, bodyTop + 0.5, 3.385);
    addBox(ctx, group, bronze, 0.03, 0.52, 0.03, lx + 0.42, bodyTop + 0.5, 3.385);
  }
  addBox(ctx, group, ctx.materials.emissiveGoldSoft, 4.2, 0.03, 0.035, 1.6, bodyTop + 1.44, 3.31);

  // 东立面墙体拆成左右墙垛、窗下墙与门头梁，中央留出真实门洞。
  const wallBlock = (
    x0: number,
    x1: number,
    y0: number,
    y1: number,
  ): THREE.Mesh =>
    addRounded(
      ctx,
      group,
      shell.warm,
      x1 - x0,
      y1 - y0,
      wallT,
      (x0 + x1) / 2,
      (y0 + y1) / 2,
      wallZ,
      0.035,
      1,
      { castShadow: true, receiveShadow: true },
    );

  const mainWindow = { x: -2.74, bottom: 0.76, top: 2.8 };
  const narrowWindow = { x: 2.81, bottom: 0.76, top: 2.88 };
  const mainHalf = 1.18;
  const outer = bodyW / 2;

  wallBlock(-outer, mainWindow.x - 1.18, baseY, openingTop);
  wallBlock(mainWindow.x + 1.18, -mainHalf, baseY, openingTop);
  wallBlock(mainHalf, narrowWindow.x - 0.39, baseY, openingTop);
  wallBlock(narrowWindow.x + 0.39, outer, baseY, openingTop);
  wallBlock(mainWindow.x - 1.18, mainWindow.x + 1.18, baseY, mainWindow.bottom);
  wallBlock(mainWindow.x - 1.18, mainWindow.x + 1.18, mainWindow.top, openingTop);
  wallBlock(narrowWindow.x - 0.39, narrowWindow.x + 0.39, baseY, narrowWindow.bottom);
  wallBlock(narrowWindow.x - 0.39, narrowWindow.x + 0.39, narrowWindow.top, openingTop);
  wallBlock(-outer, outer, openingTop, bodyTop);

  // 门头梁前缘做一道暗色滴水线，雨棚与门洞之间多一层厚度。
  addBox(ctx, group, shell.dark, bodyW, 0.07, 0.06, 0, openingTop + 0.035, 6.075);
  addBox(ctx, group, shell.dark, bodyW, 0.12, 0.035, 0, 0.36, 6.075);

  // 西南转角竖向石质翼墙，强化近景轮廓并遮住墙垛接缝。
  addRounded(ctx, group, shell.dark, 0.16, bodyH, 0.36, -4.33, baseY + bodyH / 2, 5.9, 0.03, 1, {
    castShadow: true,
    receiveShadow: true,
  });

  // 主橱窗：深凹槽 + 铜框 + 高反差主视觉 + 玻璃 + 画框灯。
  const mwW = 2.36;
  const mwH = mainWindow.top - mainWindow.bottom;
  const mwY = (mainWindow.top + mainWindow.bottom) / 2;
  const mwX = mainWindow.x;
  addBox(ctx, group, recess, mwW, mwH, 0.06, mwX, mwY, 5.63);
  addBox(ctx, group, bronze, 2.28, 1.66, 0.05, mwX, 1.78, 5.675);
  const feature = new THREE.Mesh(new THREE.PlaneGeometry(2.16, 1.52), featureMaterial);
  feature.position.set(mwX, 1.78, 5.708);
  group.add(feature);
  addBox(ctx, group, glass, 2.32, mwH - 0.04, 0.02, mwX, mwY, 5.99);
  addBox(ctx, group, bronze, 2.52, 0.08, 0.12, mwX, 2.84, 6.04, { castShadow: true });
  addBox(ctx, group, bronze, 2.52, 0.08, 0.12, mwX, 0.72, 6.04, { castShadow: true });
  addBox(ctx, group, bronze, 0.08, 2.2, 0.12, mwX - 1.22, 1.78, 6.04, { castShadow: true });
  addBox(ctx, group, bronze, 0.08, 2.2, 0.12, mwX + 1.22, 1.78, 6.04, { castShadow: true });
  addBox(ctx, group, shell.dark, 2.62, 0.06, 0.2, mwX, 0.69, 6.1);
  addBox(ctx, group, darkBronze, 2.1, 0.07, 0.13, mwX, 2.7, 5.94);
  addBox(ctx, group, pictureLight, 2.0, 0.028, 0.035, mwX, 2.665, 5.93);
  const caption = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.2), captionMaterial);
  caption.position.set(mwX - 0.46, 0.54, 6.075);
  caption.renderOrder = 2;
  group.add(caption);

  // 北侧窄窗：竖向展览海报，作为第二层级信息，不与主视觉争夺注意力。
  const nwW = 0.78;
  const nwH = narrowWindow.top - narrowWindow.bottom;
  const nwY = (narrowWindow.top + narrowWindow.bottom) / 2;
  const nwX = narrowWindow.x;
  addBox(ctx, group, recess, nwW, nwH, 0.06, nwX, nwY, 5.63);
  addBox(ctx, group, bronze, 0.72, 1.4, 0.045, nwX, 1.94, 5.672);
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 1.32), posterMaterial);
  poster.position.set(nwX, 1.94, 5.706);
  group.add(poster);
  addBox(ctx, group, glass, 0.74, nwH - 0.04, 0.02, nwX, nwY, 5.99);
  addBox(ctx, group, bronze, 0.9, 0.06, 0.1, nwX, 2.91, 6.04);
  addBox(ctx, group, bronze, 0.9, 0.06, 0.1, nwX, 0.73, 6.04);
  addBox(ctx, group, bronze, 0.06, 2.22, 0.1, nwX - 0.42, 1.82, 6.04);
  addBox(ctx, group, bronze, 0.06, 2.22, 0.1, nwX + 0.42, 1.82, 6.04);
  addBox(ctx, group, pictureLight, 0.52, 0.022, 0.03, nwX, 2.98, 6.045);
  addBox(ctx, group, ctx.materials.emissiveCyanSoft, 0.38, 0.02, 0.03, nwX, 0.66, 6.045);

  // 门洞：背板、双扇玻璃门、铜色门框、侧壁灯槽与门槛，逐层后退约 0.5m。
  addBox(ctx, group, recess, 2.36, 2.92, 0.06, 0, 1.76, 5.62);
  for (const dx of [-0.55, 0.55]) {
    addBox(ctx, group, glass, 1.04, 2.66, 0.02, dx, 1.73, 5.74);
  }
  addBox(ctx, group, bronze, 0.055, 2.7, 0.07, 0, 1.73, 5.78);
  addBox(ctx, group, bronze, 0.05, 2.7, 0.07, -1.1, 1.73, 5.78);
  addBox(ctx, group, bronze, 0.05, 2.7, 0.07, 1.1, 1.73, 5.78);
  addBox(ctx, group, bronze, 2.24, 0.06, 0.07, 0, 3.07, 5.78);
  addBox(ctx, group, bronze, 2.24, 0.09, 0.07, 0, 0.39, 5.78);
  addBox(ctx, group, bronze, 0.028, 0.62, 0.045, -0.19, 1.32, 5.82);
  addBox(ctx, group, bronze, 0.028, 0.62, 0.045, 0.19, 1.32, 5.82);
  addBox(ctx, group, ctx.materials.emissiveGoldSoft, 0.024, 2.18, 0.03, -0.94, 1.8, 5.69);
  addBox(ctx, group, ctx.materials.emissiveGoldSoft, 0.024, 2.18, 0.03, 0.94, 1.8, 5.69);
  addBox(ctx, group, bronze, 0.14, 2.96, 0.18, -1.25, 1.8, 6.02, { castShadow: true });
  addBox(ctx, group, bronze, 0.14, 2.96, 0.18, 1.25, 1.8, 6.02, { castShadow: true });
  addBox(ctx, group, bronze, 2.64, 0.14, 0.18, 0, 3.21, 6.02, { castShadow: true });
  addBox(ctx, group, ctx.materials.emissiveGoldSoft, 0.02, 2.5, 0.025, -1.16, 1.72, 6.045);
  addBox(ctx, group, ctx.materials.emissiveGoldSoft, 0.02, 2.5, 0.025, 1.16, 1.72, 6.045);

  // 雨棚：悬挑板 + 前缘滴水 + 底面灯槽 + 两根拉杆，构件关系可读。
  addRounded(ctx, group, shell.dark, 4.6, 0.14, 1.2, 0, 3.42, 6.55, 0.035, 1, {
    castShadow: true,
    receiveShadow: true,
  });
  addBox(ctx, group, shell.dark, 4.6, 0.15, 0.06, 0, 3.36, 7.14);
  addBox(ctx, group, ctx.materials.emissiveGoldSoft, 3.95, 0.022, 0.03, 0, 3.36, 7.18);
  addBox(ctx, group, ctx.materials.emissiveGoldSoft, 0.035, 0.02, 0.82, -1.62, 3.335, 6.52);
  addBox(ctx, group, ctx.materials.emissiveGoldSoft, 0.035, 0.02, 0.82, 1.62, 3.335, 6.52);
  for (const dl of [-1.4, 0, 1.4]) {
    addBox(ctx, group, ctx.materials.emissiveGold, 0.06, 0.018, 0.06, dl, 3.335, 6.82);
  }
  for (const rx of [-2.15, 2.15]) {
    const rod = addBox(ctx, group, bronze, 0.035, 1.1, 0.035, rx, 3.765, 6.55);
    rod.rotation.x = -1.02;
    addBox(ctx, group, bronze, 0.12, 0.12, 0.04, rx, 4.06, 6.07);
  }

  // 门头铜牌：低亮度底板 + 字标贴图，避免旧版纯白过曝。
  addRounded(ctx, group, darkBronze, 3.96, 0.74, 0.08, 0, 3.82, 6.11, 0.02, 1, {
    castShadow: true,
  });
  const doorSign = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.66), doorSignMaterial);
  doorSign.position.set(0, 3.82, 6.157);
  doorSign.renderOrder = 2;
  group.add(doorSign);
  addBox(ctx, group, bronze, 4.02, 0.025, 0.03, 0, 4.2, 6.155);
  addBox(ctx, group, bronze, 4.02, 0.025, 0.03, 0, 3.44, 6.155);

  // 侧立面：南侧两扇、北侧一扇窄窗，均有凹槽、铜框、玻璃与窗台灯。
  for (const side of [-1, 1]) {
    const faceX = side * (bodyW / 2);
    const positions = side < 0 ? [-1.6, 1.5] : [0.9];
    for (const wz of positions) {
      addBox(ctx, group, recess, 0.045, 1.0, 0.56, faceX + side * 0.01, 2.32, wz);
      addBox(ctx, group, ctx.materials.warmWindow, 0.02, 0.82, 0.42, faceX + side * 0.035, 2.32, wz);
      addBox(ctx, group, glass, 0.018, 0.9, 0.5, faceX + side * 0.05, 2.32, wz);
      addBox(ctx, group, bronze, 0.07, 0.05, 0.66, faceX + side * 0.075, 2.83, wz);
      addBox(ctx, group, bronze, 0.07, 0.05, 0.66, faceX + side * 0.075, 1.81, wz);
      addBox(ctx, group, bronze, 0.07, 1.08, 0.05, faceX + side * 0.075, 2.32, wz - 0.305);
      addBox(ctx, group, bronze, 0.07, 1.08, 0.05, faceX + side * 0.075, 2.32, wz + 0.305);
      addBox(ctx, group, ctx.materials.emissiveGoldSoft, 0.04, 0.028, 0.4, faceX + side * 0.08, 2.9, wz);
    }
  }

  // 侧墙横向分缝与竖向石缝，让绕行视角也能看到尺度线索。
  for (const side of [-1, 1]) {
    addBox(ctx, group, shell.dark, 0.025, 0.045, bodyD - 0.2, side * (bodyW / 2 + 0.012), 3.24, 0);
    addBox(ctx, group, shell.dark, 0.025, 0.03, bodyD - 0.2, side * (bodyW / 2 + 0.012), 0.62, 0);
    for (const seamZ of [-3.7, -1.0, 4.6]) {
      addBox(ctx, group, shell.dark, 0.025, 3.0, 0.035, side * (bodyW / 2 + 0.012), 2.0, seamZ);
    }
    addBox(ctx, group, ctx.materials.emissiveGoldSoft, 0.03, 0.028, 7.2, side * (bodyW / 2 + 0.03), 3.9, 0);
  }

  // 背面：服务门、设备百叶、小字标与落水管，保证 360° 可看。
  addBox(ctx, group, shell.dark, 1.34, 2.32, 0.08, -2.1, 1.46, -bodyD / 2 - 0.04);
  addBox(ctx, group, bronze, 1.06, 2.1, 0.06, -2.1, 1.45, -bodyD / 2 - 0.1);
  addBox(ctx, group, bronze, 0.035, 0.38, 0.035, -1.69, 1.24, -bodyD / 2 - 0.16);
  addBox(ctx, group, bronze, 0.16, 0.035, 0.035, -1.62, 1.24, -bodyD / 2 - 0.16);
  addBox(ctx, group, shell.dark, 1.3, 0.08, 0.52, -2.1, 2.7, -bodyD / 2 - 0.24, { castShadow: true });
  addBox(ctx, group, ctx.materials.emissiveGoldSoft, 0.94, 0.02, 0.04, -2.1, 2.66, -bodyD / 2 - 0.5);
  addBox(ctx, group, ctx.materials.emissiveGoldSoft, 0.42, 0.018, 0.03, -2.1, 2.63, -bodyD / 2 - 0.56);
  addBox(ctx, group, shell.dark, 1.52, 0.78, 0.08, 1.85, 3.42, -bodyD / 2 - 0.04);
  for (let i = 0; i < 5; i += 1) {
    addBox(ctx, group, ctx.materials.metalSoft, 1.34, 0.035, 0.04, 1.85, 3.13 + i * 0.14, -bodyD / 2 - 0.1);
  }
  addBox(ctx, group, darkBronze, 1.74, 0.44, 0.05, 0, 4.02, -bodyD / 2 - 0.05);
  const backSign = new THREE.Mesh(new THREE.PlaneGeometry(1.62, 0.4), backSignMaterial);
  backSign.position.set(0, 4.02, -bodyD / 2 - 0.085);
  backSign.rotation.y = Math.PI;
  backSign.renderOrder = 2;
  group.add(backSign);
  addBox(ctx, group, bronze, 1.86, 0.035, 0.03, 0, 4.245, -bodyD / 2 - 0.095);
  addBox(ctx, group, bronze, 1.86, 0.035, 0.03, 0, 3.795, -bodyD / 2 - 0.095);
  addBox(ctx, group, bronze, 0.035, 0.48, 0.03, -0.9, 4.02, -bodyD / 2 - 0.095);
  addBox(ctx, group, bronze, 0.035, 0.48, 0.03, 0.9, 4.02, -bodyD / 2 - 0.095);
  addBox(ctx, group, shell.dark, bodyW - 0.1, 0.045, 0.025, 0, 3.24, -bodyD / 2 - 0.012);
  addBox(ctx, group, shell.dark, bodyW - 0.1, 0.12, 0.025, 0, 0.58, -bodyD / 2 - 0.012);
  for (const seamX of [-3.7, 0.25, 3.55]) {
    addBox(ctx, group, shell.dark, 0.03, 2.9, 0.02, seamX, 2.0, -bodyD / 2 - 0.012);
  }

  // 灯笼体背面：百叶与检修口，避免背向镜头时出现一块完整空墙。
  addBox(ctx, group, recess, 1.3, 0.72, 0.05, 1.6, 5.1, -4.93);
  for (let i = 0; i < 4; i += 1) {
    addBox(ctx, group, bronze, 1.18, 0.03, 0.02, 1.6, 4.87 + i * 0.13, -4.96);
  }
  addBox(ctx, group, darkBronze, 0.62, 0.52, 0.04, 3.2, 5.1, -4.93);
  addBox(ctx, group, bronze, 0.7, 0.03, 0.02, 3.2, 5.34, -4.96);

  for (const [px, pz] of [
    [-4.3, -5.34],
    [4.3, -5.34],
    [4.3, 5.34],
  ] as Array<[number, number]>) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 3.95, 8), ctx.materials.metalSoft);
    pipe.position.set(px, 2.28, pz);
    pipe.castShadow = true;
    group.add(pipe);
    addBox(ctx, group, ctx.materials.metalSoft, 0.12, 0.05, 0.12, px, 0.35, pz);
  }

  // 屋面：女儿墙、分缝、空调机组、排气管与天线，给斜上方镜头足够信息。
  addBox(ctx, group, shell.dark, bodyW - 0.2, 0.2, 0.12, 0, bodyTop + 0.1, 5.62, { castShadow: true });
  addBox(ctx, group, shell.dark, bodyW - 0.2, 0.2, 0.12, 0, bodyTop + 0.1, -5.62, { castShadow: true });
  addBox(ctx, group, shell.dark, 0.12, 0.2, bodyD - 0.4, -4.19, bodyTop + 0.1, 0, { castShadow: true });
  addBox(ctx, group, shell.dark, 0.12, 0.2, bodyD - 0.4, 4.19, bodyTop + 0.1, 0, { castShadow: true });
  for (const seamX of [-3.5, -1.5, 4.0]) {
    addBox(ctx, group, ctx.materials.metalSoft, 0.045, 0.02, bodyD - 2.0, seamX, bodyTop + 0.012, 0);
  }
  addBox(ctx, group, shell.dark, 1.3, 0.55, 1.0, -2.85, bodyTop + 0.28, -3.3, { castShadow: true });
  addBox(ctx, group, ctx.materials.metal, 1.14, 0.04, 0.84, -2.85, bodyTop + 0.575, -3.3);
  addBox(ctx, group, ctx.materials.metalSoft, 1.0, 0.04, 0.03, -2.85, bodyTop + 0.43, -2.785);
  addBox(ctx, group, shell.dark, 0.62, 0.36, 0.5, -3.55, bodyTop + 0.18, -1.6);
  addBox(ctx, group, ctx.materials.metalSoft, 0.48, 0.03, 0.36, -3.55, bodyTop + 0.37, -1.6);
  addBox(ctx, group, ctx.materials.metal, 0.04, 0.9, 0.04, -3.6, bodyTop + 0.45, -4.7);
  addBox(ctx, group, ctx.materials.emissiveCyan, 0.07, 0.07, 0.07, -3.6, bodyTop + 0.92, -4.7);

  addContactShadow(ctx, group, width + 2.6, depth + 2.4, 0.44);

  group.position.set(spec.position[0], spec.position[1], spec.position[2]);
  group.rotation.y = spec.yawRad;
  return { spec, group, posterSlots: new Map(), occluders, fadeMaterials: shell.fade, fadeMeshes };
}

function learning(ctx: BuildContext, spec: BuildingSpec): BuiltBuilding {
  const group = new THREE.Group();
  group.name = spec.id;
  const [width, , depth] = spec.size;
  const shell = createShellMaterialPair(ctx);
  const occluders: THREE.Mesh[] = [];
  const fadeMeshes: THREE.Mesh[] = [];

  addRounded(ctx, group, ctx.materials.concreteDark, width + 0.4, 0.4, depth + 0.4, 0, 0.2, 0, 0.05, 1, {
    receiveShadow: true,
  });

  const bodyHeight = 6.7;
  const body = addRounded(
    ctx,
    group,
    shell.warm,
    width - 0.5,
    bodyHeight,
    depth - 0.5,
    0,
    0.4 + bodyHeight / 2,
    0,
    0.1,
    2,
    { castShadow: true, receiveShadow: true, name: `${spec.id}_Occluder_Shell` },
  );
  occluders.push(body);
  fadeMeshes.push(body);

  const topHeight = 2.0;
  const top = addRounded(
    ctx,
    group,
    shell.light,
    width - 1.6,
    topHeight,
    depth - 1.5,
    0.45,
    7.1 + topHeight / 2,
    -0.25,
    0.08,
    2,
    { castShadow: true, receiveShadow: true },
  );
  occluders.push(top);
  fadeMeshes.push(top);

  addBox(ctx, group, shell.dark, width - 1.2, 0.2, depth - 1.1, 0.45, 9.18, -0.25, {
    castShadow: true,
  });

  // 正门（局部 +Z，世界朝南）。
  addBox(ctx, group, ctx.materials.frameBack, 3.0, 3.1, 0.18, 0, 1.8, depth / 2 + 0.01);
  addBox(ctx, group, ctx.materials.glass, 2.25, 2.7, 0.06, 0, 1.62, depth / 2 + 0.1);
  addBox(ctx, group, ctx.materials.emissiveCyanSoft, 2.45, 0.05, 0.06, 0, 3.08, depth / 2 + 0.16);
  addBox(ctx, group, ctx.materials.emissiveCyanSoft, 0.05, 2.75, 0.06, -1.19, 1.68, depth / 2 + 0.16);
  addBox(ctx, group, ctx.materials.emissiveCyanSoft, 0.05, 2.75, 0.06, 1.19, 1.68, depth / 2 + 0.16);
  addBox(ctx, group, ctx.materials.emissiveCyan, 2.2, 0.04, 0.05, 0, 0.45, depth / 2 + 0.35);

  const label = createSignTexture(spec.sign, `${spec.subSign} · 下一轮开放`, {
    color: '#e8f4ff',
    subColor: 'rgba(0,240,255,0.66)',
    width: 1024,
    height: 256,
  });
  addSign(group, label, 4.7, 1.18, 0, 4.25, depth / 2 + 0.07);

  // 视觉外楼梯：V1 不可通行，仅作为体量切分。
  const stairMaterial = ctx.materials.metalSoft;
  for (let i = 0; i < 8; i += 1) {
    addBox(ctx, group, stairMaterial, 1.1, 0.16, 0.55, width / 2 - 0.15, 0.55 + i * 0.46, 2.4 - i * 0.52, {
      castShadow: true,
    });
  }
  addBox(ctx, group, ctx.materials.metal, 0.06, 3.4, 0.06, width / 2 + 0.35, 2.9, 1.1);
  addBox(ctx, group, ctx.materials.metal, 0.06, 3.4, 0.06, width / 2 + 0.35, 2.9, -1.9);

  // 窄窗与暖色阅读灯。
  for (const [wx, wy, hh] of [
    [-2.5, 5.4, 1.8],
    [2.5, 5.4, 1.8],
    [-2.5, 7.3, 1.2],
    [2.5, 7.3, 1.2],
  ] as Array<[number, number, number]>) {
    addBox(ctx, group, ctx.materials.frameBack, 1.0, hh, 0.05, wx, wy, depth / 2 + 0.015);
    addBox(ctx, group, ctx.materials.warmWindow, 0.8, hh - 0.22, 0.03, wx, wy, depth / 2 + 0.05);
  }

  addContactShadow(ctx, group, width + 2.4, depth + 2.4, 0.44);

  group.position.set(spec.position[0], spec.position[1], spec.position[2]);
  group.rotation.y = spec.yawRad;
  return { spec, group, posterSlots: new Map(), occluders, fadeMaterials: shell.fade, fadeMeshes };
}

function terminal(ctx: BuildContext, spec: BuildingSpec): BuiltBuilding {
  const group = new THREE.Group();
  group.name = spec.id;
  const [width, , depth] = spec.size;
  const shell = createShellMaterialPair(ctx);
  const occluders: THREE.Mesh[] = [];
  const fadeMeshes: THREE.Mesh[] = [];

  addRounded(ctx, group, ctx.materials.concreteDark, width + 0.36, 0.32, depth + 0.36, 0, 0.16, 0, 0.04, 1, {
    receiveShadow: true,
  });

  const backWall = addBox(ctx, group, shell.dark, width - 0.7, 4.2, 0.55, 0, 2.35, -depth / 2 + 0.45, {
    castShadow: true,
    receiveShadow: true,
    name: `${spec.id}_Occluder_Shell`,
  });
  const sideLeft = addRounded(ctx, group, shell.light, 0.6, 3.9, depth - 0.9, -width / 2 + 0.45, 2.2, 0, 0.08, 2, {
    castShadow: true,
    receiveShadow: true,
  });
  const sideRight = addRounded(ctx, group, shell.light, 0.6, 3.9, depth - 0.9, width / 2 - 0.45, 2.2, 0, 0.08, 2, {
    castShadow: true,
    receiveShadow: true,
  });
  occluders.push(backWall, sideLeft, sideRight);
  fadeMeshes.push(backWall, sideLeft, sideRight);

  // 内部屏幕，正面朝外（局部 +Z，世界朝西）。
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.55), ctx.materials.screen);
  screen.position.set(0, 2.35, -depth / 2 + 0.76);
  screen.name = 'Terminal_Screen';
  group.add(screen);
  addBox(ctx, group, ctx.materials.metal, 4.55, 2.9, 0.08, 0, 2.35, -depth / 2 + 0.7);

  // 半开放屋檐。
  addBox(ctx, group, shell.dark, width - 0.2, 0.22, depth - 0.4, 0, 4.5, 0.15, {
    castShadow: true,
    receiveShadow: true,
  });
  addBox(ctx, group, ctx.materials.emissiveCyan, width - 1.8, 0.035, 0.05, 0, 4.36, depth / 2 - 0.18);
  addBox(ctx, group, ctx.materials.emissiveGoldSoft, 0.045, 3.8, 0.05, -width / 2 + 0.43, 2.2, depth / 2 - 0.4);
  addBox(ctx, group, ctx.materials.emissiveGoldSoft, 0.045, 3.8, 0.05, width / 2 - 0.43, 2.2, depth / 2 - 0.4);

  const label = createSignTexture(spec.sign, `${spec.subSign} · 下一轮开放`, {
    color: '#e9fbff',
    subColor: 'rgba(0,240,255,0.66)',
    width: 1024,
    height: 256,
  });
  addSign(group, label, 4.5, 1.15, 0, 4.0, depth / 2 + 0.36);

  // 屏幕基座与门前地面光。
  addBox(ctx, group, ctx.materials.metal, 4.6, 0.18, 1.0, 0, 0.55, -depth / 2 + 1.1);
  addBox(ctx, group, ctx.materials.emissiveCyanSoft, 3.8, 0.03, 0.08, 0, 0.66, -depth / 2 + 1.58);

  addContactShadow(ctx, group, width + 2.0, depth + 2.0, 0.42);

  group.position.set(spec.position[0], spec.position[1], spec.position[2]);
  group.rotation.y = spec.yawRad;
  return { spec, group, posterSlots: new Map(), occluders, fadeMaterials: shell.fade, fadeMeshes };
}

export function createBuildings(
  specs: BuildingSpec[],
  materials: WorldMaterials,
  anisotropy: number,
): { buildings: BuiltBuilding[]; geometryCache: Map<string, THREE.BufferGeometry> } {
  const ctx: BuildContext = {
    materials,
    anisotropy,
    geometryCache: new Map<string, THREE.BufferGeometry>(),
  };

  const buildings = specs.map((spec) => {
    switch (spec.variant) {
      case 'towerA':
        return towerA(ctx, spec);
      case 'towerB':
        return towerB(ctx, spec);
      case 'gallery':
        return gallery(ctx, spec);
      case 'learning':
        return learning(ctx, spec);
      case 'terminal':
        return terminal(ctx, spec);
      default:
        return towerA(ctx, spec);
    }
  });

  return { buildings, geometryCache: ctx.geometryCache };
}
