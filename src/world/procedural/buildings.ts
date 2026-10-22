import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { getArtwork } from '../data/artworks';
import type { BuildingSpec, Vec3 } from '../config/types';
import { createLabelMaterial, createPosterMaterial, type WorldMaterials } from './materials';
import { createSignTexture, createVerticalSignTexture } from './textures';

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

  addRounded(ctx, group, ctx.materials.concreteDark, width + 0.4, 0.38, depth + 0.4, 0, 0.19, 0, 0.05, 1, {
    receiveShadow: true,
  });

  const bodyHeight = 4.5;
  const body = addRounded(
    ctx,
    group,
    shell.warm,
    width - 0.5,
    bodyHeight,
    depth - 0.4,
    0,
    0.38 + bodyHeight / 2,
    0,
    0.1,
    2,
    { castShadow: true, receiveShadow: true, name: `${spec.id}_Occluder_Shell` },
  );
  occluders.push(body);
  fadeMeshes.push(body);

  const topHeight = 1.0;
  const top = addRounded(
    ctx,
    group,
    shell.light,
    width - 1.1,
    topHeight,
    depth - 1.3,
    0,
    4.88 + topHeight / 2,
    -0.2,
    0.08,
    2,
    { castShadow: true, receiveShadow: true },
  );
  occluders.push(top);
  fadeMeshes.push(top);

  addBox(ctx, group, shell.dark, width - 0.8, 0.14, depth - 0.8, 0, 5.45, -0.2, {
    castShadow: true,
  });

  // 东立面（局部 +Z）的三个橱窗与中央门洞。
  for (const wx of [-2.85, 2.85]) {
    addBox(ctx, group, ctx.materials.frameBack, 2.35, 2.7, 0.12, wx, 2.15, depth / 2 + 0.01);
    addBox(ctx, group, ctx.materials.glass, 2.05, 2.4, 0.05, wx, 2.12, depth / 2 + 0.07);
    addBox(ctx, group, ctx.materials.warmWindow, 1.9, 0.9, 0.025, wx, 2.8, depth / 2 + 0.1);
    addBox(ctx, group, ctx.materials.emissiveGoldSoft, 0.045, 2.5, 0.06, wx - 1.02, 2.1, depth / 2 + 0.11);
    addBox(ctx, group, ctx.materials.emissiveGoldSoft, 0.045, 2.5, 0.06, wx + 1.02, 2.1, depth / 2 + 0.11);
  }

  addBox(ctx, group, ctx.materials.frameBack, 2.9, 3.0, 0.18, 0, 1.75, depth / 2 + 0.01);
  addBox(ctx, group, ctx.materials.glass, 2.15, 2.6, 0.06, 0, 1.6, depth / 2 + 0.09);
  addBox(ctx, group, ctx.materials.emissiveGoldSoft, 2.35, 0.05, 0.06, 0, 2.97, depth / 2 + 0.15);
  addBox(ctx, group, ctx.materials.emissiveGoldSoft, 0.05, 2.65, 0.06, -1.12, 1.64, depth / 2 + 0.15);
  addBox(ctx, group, ctx.materials.emissiveGoldSoft, 0.05, 2.65, 0.06, 1.12, 1.64, depth / 2 + 0.15);

  addBox(ctx, group, shell.dark, 5.2, 0.16, 1.35, 0, 3.58, depth / 2 + 0.48, { castShadow: true });
  addBox(ctx, group, ctx.materials.metal, 0.08, 3.1, 0.08, -2.25, 1.6, depth / 2 + 1.08);
  addBox(ctx, group, ctx.materials.metal, 0.08, 3.1, 0.08, 2.25, 1.6, depth / 2 + 1.08);
  addBox(ctx, group, ctx.materials.emissiveGold, 4.7, 0.045, 0.06, 0, 3.47, depth / 2 + 1.12);

  const label = createSignTexture(spec.sign, spec.subSign, {
    color: '#fff1dd',
    subColor: 'rgba(255,179,102,0.78)',
    width: 1024,
    height: 256,
  });
  addSign(group, label, 4.8, 1.2, 0, 4.22, depth / 2 + 0.07);

  // 屋顶檐口与设备。
  addBox(ctx, group, shell.dark, width - 1.0, 0.18, 1.3, 0, 5.55, 2.7, { castShadow: true });

  // 从斜上方跟随镜头会频繁看到屋面，补足檐口、分缝与设备，避免大面积暗面。
  const roofY = 5.94;
  addBox(ctx, group, shell.dark, width - 0.5, 0.24, 0.16, 0, roofY + 0.1, -depth / 2 + 0.75, {
    castShadow: true,
  });
  addBox(ctx, group, shell.dark, width - 0.5, 0.24, 0.16, 0, roofY + 0.1, depth / 2 - 0.75, {
    castShadow: true,
  });
  addBox(ctx, group, shell.dark, 0.16, 0.24, depth - 1.35, -width / 2 + 0.75, roofY + 0.1, 0, {
    castShadow: true,
  });
  addBox(ctx, group, shell.dark, 0.16, 0.24, depth - 1.35, width / 2 - 0.75, roofY + 0.1, 0, {
    castShadow: true,
  });
  for (const seamX of [-2.6, 0, 2.6]) {
    addBox(ctx, group, ctx.materials.metalSoft, 0.06, 0.05, depth - 2.2, seamX, roofY + 0.02, 0);
  }
  for (const [unitX, unitZ, unitW, unitD] of [
    [2.35, -3.1, 1.7, 1.4],
    [-2.4, -3.35, 1.25, 1.1],
  ] as Array<[number, number, number, number]>) {
    addBox(ctx, group, shell.dark, unitW, 0.85, unitD, unitX, roofY + 0.44, unitZ, {
      castShadow: true,
    });
    addBox(ctx, group, ctx.materials.metal, unitW - 0.24, 0.05, unitD - 0.24, unitX, roofY + 0.89, unitZ);
  }
  for (const [lightX, lightZ] of [
    [-1.9, 1.7],
    [1.5, 0.6],
  ] as Array<[number, number]>) {
    addBox(ctx, group, ctx.materials.frameBack, 2.3, 0.12, 1.35, lightX, roofY + 0.06, lightZ);
    addBox(ctx, group, ctx.materials.warmWindow, 2.02, 0.04, 1.08, lightX, roofY + 0.13, lightZ);
  }

  addContactShadow(ctx, group, width + 2.4, depth + 2.4, 0.44);

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
