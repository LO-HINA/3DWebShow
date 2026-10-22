import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import {
  benches,
  frames,
  guideLines,
  lamps,
  paths,
  planters,
  PALETTE,
} from '../config/world';
import type { WorldMaterials } from './materials';
import { createLabelMaterial, createPosterMaterial } from './materials';
import { createSignTexture } from './textures';
import { getArtwork } from '../data/artworks';

export interface LandmarkHandle {
  group: THREE.Group;
  update: (time: number, reducedMotion: boolean) => void;
}

export interface FrameHandle {
  groups: Map<string, THREE.Group>;
  interactables: Map<string, THREE.Object3D>;
}

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function planeRotated(width: number, depth: number, material: THREE.Material, y: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.receiveShadow = true;
  return mesh;
}

function lineBetween(
  from: [number, number],
  to: [number, number],
  width: number,
  material: THREE.Material,
  y = 0.028,
): THREE.Mesh {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const length = Math.hypot(dx, dz);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, length), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = -Math.atan2(dx, dz);
  mesh.position.set((from[0] + to[0]) / 2, y, (from[1] + to[1]) / 2);
  return mesh;
}

export function createGround(materials: WorldMaterials): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Ground';

  const undersideMaterial = materials.concreteDark.clone();
  undersideMaterial.color.setHex(0x141823);
  undersideMaterial.roughness = 0.9;
  const island = new THREE.Mesh(new RoundedBoxGeometry(63, 1.4, 63, 2, 0.22), undersideMaterial);
  island.position.y = -0.72;
  island.receiveShadow = true;
  group.add(island);

  const lowerTier = new THREE.Mesh(new RoundedBoxGeometry(42, 2.2, 42, 2, 0.3), undersideMaterial);
  lowerTier.position.y = -2.2;
  lowerTier.receiveShadow = false;
  group.add(lowerTier);

  const ground = planeRotated(64, 64, materials.ground, 0);
  group.add(ground);

  const plazaMaterial = materials.plaza;
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(8.1, 96), plazaMaterial);
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0.014;
  plaza.receiveShadow = true;
  group.add(plaza);

  for (const path of paths) {
    const mesh = planeRotated(path.size[0], path.size[1], materials.walkway, 0.011);
    mesh.position.x = path.center[0];
    mesh.position.z = path.center[2];
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  const cyanLine = new THREE.MeshBasicMaterial({
    color: PALETTE.emissiveCyan,
    transparent: true,
    opacity: 0.42,
    toneMapped: false,
    depthWrite: false,
  });
  const goldLine = new THREE.MeshBasicMaterial({
    color: PALETTE.emissiveGold,
    transparent: true,
    opacity: 0.46,
    toneMapped: false,
    depthWrite: false,
  });
  for (const line of guideLines) {
    const material = line.accent === 'cyan' ? cyanLine : goldLine;
    group.add(lineBetween(line.from, line.to, 0.055, material));
  }

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(7.72, 7.84, 96),
    new THREE.MeshBasicMaterial({
      color: PALETTE.emissiveCyan,
      transparent: true,
      opacity: 0.26,
      toneMapped: false,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.021;
  group.add(ring);

  const goldInlay = new THREE.Mesh(
    new THREE.RingGeometry(4.6, 4.66, 96),
    new THREE.MeshBasicMaterial({
      color: PALETTE.emissiveGold,
      transparent: true,
      opacity: 0.18,
      toneMapped: false,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  goldInlay.rotation.x = -Math.PI / 2;
  goldInlay.position.y = 0.022;
  group.add(goldInlay);

  // 广场边缘的地灯：用无光照圆盘，不增加额外点光源。
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    const radius = 7.55;
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(0.075, 18),
      i % 3 === 0 ? goldLine : cyanLine,
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(Math.cos(angle) * radius, 0.032, Math.sin(angle) * radius);
    group.add(disc);
  }

  // 外围可见边界与四角灯柱。
  const rimMaterial = materials.metal.clone();
  rimMaterial.color.setHex(0x202430);
  const rimTopMaterial = materials.emissiveCyanSoft.clone();
  const rimParts: Array<[number, number, number, number]> = [
    [0, -29, 59, 1],
    [0, 29, 59, 1],
    [-29, 0, 1, 59],
    [29, 0, 1, 59],
  ];
  for (const [x, z, width, depth] of rimParts) {
    const rim = new THREE.Mesh(new THREE.BoxGeometry(width, 0.64, depth), rimMaterial);
    rim.position.set(x, 0.32, z);
    rim.receiveShadow = true;
    group.add(rim);
    const light = new THREE.Mesh(new THREE.BoxGeometry(width * 0.96, 0.022, depth * 0.96), rimTopMaterial);
    light.position.set(x, 0.65, z);
    group.add(light);
  }
  for (const x of [-29, 29]) {
    for (const z of [-29, 29]) {
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4.6, 0.8), rimMaterial);
      pylon.position.set(x, 2.3, z);
      pylon.castShadow = true;
      group.add(pylon);
      const light = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.7, 0.08), materials.emissiveCyan);
      light.position.set(x + (x > 0 ? -0.42 : 0.42), 2.45, z + (z > 0 ? -0.42 : 0.42));
      group.add(light);
    }
  }

  return group;
}

const glowPoolCache = new WeakMap<WorldMaterials, Map<string, THREE.MeshBasicMaterial>>();

function addGlowPool(
  group: THREE.Group,
  materials: WorldMaterials,
  x: number,
  z: number,
  color: number,
  scaleX: number,
  scaleZ: number,
  opacity: number,
): void {
  let cache = glowPoolCache.get(materials);
  if (!cache) {
    cache = new Map();
    glowPoolCache.set(materials, cache);
  }
  const key = `${color}:${opacity}`;
  let material = cache.get(key);
  if (!material) {
    material = new THREE.MeshBasicMaterial({
      map: materials.glow.map,
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    cache.set(key, material);
  }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(scaleX, scaleZ), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.036, z);
  mesh.renderOrder = 1;
  group.add(mesh);
}

export function createSky(materials: WorldMaterials): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Sky';

  const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 24), materials.sky);
  sky.name = 'SkyDome';
  group.add(sky);

  const starGeometry = new THREE.BufferGeometry();
  const starCount = 520;
  const positions = new Float32Array(starCount * 3);
  const rand = seeded(4201);
  for (let i = 0; i < starCount; i += 1) {
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(rand() * 0.92);
    const radius = 108 + rand() * 24;
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = 8 + radius * Math.cos(phi) * 0.8;
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }
  starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(starGeometry, materials.star);
  stars.name = 'Stars';
  group.add(stars);

  const moonGlowMaterial = materials.glow.clone();
  moonGlowMaterial.color.setHex(0xb9cfff);
  moonGlowMaterial.opacity = 0.42;
  const moonGlow = new THREE.Sprite(moonGlowMaterial);
  moonGlow.position.set(-48, 64, -96);
  moonGlow.scale.set(24, 24, 1);
  group.add(moonGlow);

  const moonCoreMaterial = materials.glow.clone();
  moonCoreMaterial.color.setHex(0xf1f6ff);
  moonCoreMaterial.opacity = 0.9;
  const moonCore = new THREE.Sprite(moonCoreMaterial);
  moonCore.position.copy(moonGlow.position);
  moonCore.scale.set(6.2, 6.2, 1);
  group.add(moonCore);

  return group;
}

export function createDistantSkyline(materials: WorldMaterials): THREE.Group {
  const group = new THREE.Group();
  group.name = 'DistantSkyline';
  const rand = seeded(8128);
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    metalness: 0.05,
    envMapIntensity: 0.2,
  });
  const count = 40;
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + rand() * 0.06;
    const radius = 48 + rand() * 36;
    const width = 3 + rand() * 7;
    const depth = 3 + rand() * 8;
    const height = 8 + Math.pow(rand(), 1.8) * 38;
    matrix.compose(
      new THREE.Vector3(Math.cos(angle) * radius, height / 2 - 1, Math.sin(angle) * radius),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI),
      new THREE.Vector3(width, height, depth),
    );
    mesh.setMatrixAt(i, matrix);
    color.setHSL(0.61, 0.18 + rand() * 0.1, 0.075 + rand() * 0.045);
    mesh.setColorAt(i, color);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.frustumCulled = false;
  group.add(mesh);

  const glowMaterial = materials.glow.clone();
  glowMaterial.color.setHex(0x6d8fe0);
  glowMaterial.opacity = 0.22;
  for (let i = 0; i < 7; i += 1) {
    const angle = rand() * Math.PI * 2;
    const radius = 55 + rand() * 25;
    const sprite = new THREE.Sprite(glowMaterial);
    sprite.position.set(Math.cos(angle) * radius, 22 + rand() * 22, Math.sin(angle) * radius);
    sprite.scale.set(9, 9, 1);
    group.add(sprite);
  }

  return group;
}

export function createLandmark(materials: WorldMaterials): LandmarkHandle {
  const group = new THREE.Group();
  group.name = 'LM-01';

  const baseMaterial = materials.metal.clone();
  baseMaterial.color.setHex(0x2c2f3b);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.86, 1.96, 0.5, 72), baseMaterial);
  base.position.y = 0.25;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const inlay = new THREE.Mesh(
    new THREE.RingGeometry(1.5, 1.72, 72),
    new THREE.MeshBasicMaterial({
      color: PALETTE.emissiveCyan,
      transparent: true,
      opacity: 0.5,
      toneMapped: false,
      side: THREE.DoubleSide,
    }),
  );
  inlay.rotation.x = -Math.PI / 2;
  inlay.position.y = 0.505;
  group.add(inlay);

  const monolithMaterial = materials.concreteWarm.clone();
  monolithMaterial.name = 'Landmark_Stone';
  const monolith = new THREE.Mesh(new RoundedBoxGeometry(0.78, 3.7, 0.78, 2, 0.06), monolithMaterial);
  monolith.position.y = 2.35;
  monolith.castShadow = true;
  monolith.receiveShadow = true;
  group.add(monolith);

  const slit = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, 2.55, 0.03),
    materials.emissiveGold,
  );
  slit.position.set(0, 2.38, 0.4);
  group.add(slit);

  const pivotA = new THREE.Group();
  pivotA.position.y = 3.12;
  const ringMaterial = materials.metal.clone();
  ringMaterial.color.setHex(0x343848);
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(2.36, 0.075, 14, 120), ringMaterial);
  ringA.castShadow = true;
  ringA.rotation.x = Math.PI / 2.6;
  ringA.rotation.z = 0.16;
  pivotA.add(ringA);

  const nodeMaterial = materials.emissiveCyan;
  for (let i = 0; i < 4; i += 1) {
    const angle = (i / 4) * Math.PI * 2;
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), nodeMaterial);
    node.position.set(Math.cos(angle) * 2.36, Math.sin(angle) * 2.36, 0);
    ringA.add(node);
  }
  group.add(pivotA);

  const pivotB = new THREE.Group();
  pivotB.position.y = 3.12;
  const innerRingMaterial = materials.metalSoft.clone();
  innerRingMaterial.color.setHex(0x454957);
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.055, 12, 100), innerRingMaterial);
  ringB.castShadow = true;
  ringB.rotation.x = -Math.PI / 3.1;
  ringB.rotation.z = -0.62;
  pivotB.add(ringB);
  for (let i = 0; i < 3; i += 1) {
    const angle = (i / 3) * Math.PI * 2 + 0.4;
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), materials.emissiveGold);
    node.position.set(Math.cos(angle) * 1.62, Math.sin(angle) * 1.62, 0);
    ringB.add(node);
  }
  group.add(pivotB);

  const coreGlowMaterial = materials.glow.clone();
  coreGlowMaterial.color.setHex(0x66ecff);
  coreGlowMaterial.opacity = 0.2;
  const coreGlow = new THREE.Sprite(coreGlowMaterial);
  coreGlow.position.y = 3.12;
  coreGlow.scale.set(6.2, 6.2, 1);
  group.add(coreGlow);

  // 四枚基座小灯，为雕塑建立接地层次。
  for (let i = 0; i < 4; i += 1) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const lightBase = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.26, 12), baseMaterial);
    lightBase.position.set(Math.cos(angle) * 2.35, 0.13, Math.sin(angle) * 2.35);
    group.add(lightBase);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 12), materials.emissiveGoldSoft);
    cap.position.set(Math.cos(angle) * 2.35, 0.28, Math.sin(angle) * 2.35);
    group.add(cap);
  }

  addGlowPool(group, materials, 0, 0, PALETTE.emissiveCyan, 9.5, 9.5, 0.16);
  addGlowPool(group, materials, 0, 0, PALETTE.emissiveGold, 3.4, 3.4, 0.18);

  const update = (time: number, reducedMotion: boolean): void => {
    if (reducedMotion) {
      pivotA.rotation.y = 0.35;
      pivotB.rotation.y = -0.2;
      return;
    }
    pivotA.rotation.y = time * 0.12;
    pivotB.rotation.y = -time * 0.085;
    pivotA.rotation.z = Math.sin(time * 0.22) * 0.035;
    pivotB.rotation.z = Math.sin(time * 0.18 + 1.4) * 0.045;
  };

  return { group, update };
}

export function createFrames(materials: WorldMaterials, anisotropy: number): FrameHandle {
  const groups = new Map<string, THREE.Group>();
  const interactables = new Map<string, THREE.Object3D>();
  // 所有展位共用一个接地阴影材质，场景级合并时能收成一次绘制。
  const frameShadowMaterial = materials.contactShadow.clone();
  frameShadowMaterial.opacity = 0.4;

  for (const frame of frames) {
    const group = new THREE.Group();
    group.name = `Frame_${frame.exhibitId}`;
    const artwork = getArtwork(frame.exhibitId);

    const bottom = 0.55;
    const centerY = 1.7;
    const frameWidth = 3.5;
    const frameHeight = 2.3;

    const backing = new THREE.Mesh(
      new THREE.BoxGeometry(frameWidth, frameHeight, 0.14),
      materials.frame,
    );
    backing.position.y = centerY;
    backing.castShadow = true;
    backing.receiveShadow = true;
    group.add(backing);

    const innerRecess = new THREE.Mesh(
      new THREE.BoxGeometry(frameWidth - 0.28, frameHeight - 0.28, 0.04),
      materials.frameBack,
    );
    innerRecess.position.set(0, centerY, 0.08);
    group.add(innerRecess);

    const texture = new THREE.CanvasTexture(artwork.canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = anisotropy;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    const imageMaterial = createPosterMaterial(texture);
    const image = new THREE.Mesh(new THREE.PlaneGeometry(2.86, 1.79), imageMaterial);
    image.position.set(0, centerY, 0.105);
    image.name = 'Frame_Slot_01';
    image.userData.exhibitId = frame.exhibitId;
    group.add(image);
    interactables.set(frame.exhibitId, image);

    // 四段边框。
    const top = new THREE.Mesh(new THREE.BoxGeometry(frameWidth + 0.12, 0.14, 0.2), materials.frame);
    top.position.set(0, centerY + frameHeight / 2 + 0.07, 0.02);
    top.castShadow = true;
    group.add(top);
    const bottomBar = new THREE.Mesh(new THREE.BoxGeometry(frameWidth + 0.12, 0.14, 0.2), materials.frame);
    bottomBar.position.set(0, centerY - frameHeight / 2 - 0.07, 0.02);
    bottomBar.castShadow = true;
    group.add(bottomBar);
    for (const side of [-1, 1]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.14, frameHeight, 0.2), materials.frame);
      bar.position.set((side * (frameWidth + 0.12)) / 2, centerY, 0.02);
      bar.castShadow = true;
      group.add(bar);
    }

    for (const legX of [-1.35, 1.35]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, bottom, 0.1), materials.metal);
      leg.position.set(legX, bottom / 2, 0);
      leg.castShadow = true;
      group.add(leg);
    }

    if (frame.lit) {
      const lightBar = new THREE.Mesh(new THREE.BoxGeometry(frameWidth - 0.5, 0.035, 0.05), materials.emissiveGoldSoft);
      lightBar.position.set(0, centerY + frameHeight / 2 + 0.15, 0.09);
      group.add(lightBar);
      const haloMaterial = materials.glow.clone();
      haloMaterial.color.setHex(PALETTE.emissiveGold);
      haloMaterial.opacity = 0.13;
      const halo = new THREE.Sprite(haloMaterial);
      halo.position.set(0, centerY + frameHeight / 2 + 0.2, 0.2);
      halo.scale.set(2.1, 1.0, 1);
      group.add(halo);
    }

    const plaqueTexture = createSignTexture(`${frame.exhibitId} · 近景演示`, undefined, {
      width: 512,
      height: 96,
      color: frame.lit ? 'rgba(255,230,200,0.84)' : 'rgba(210,220,240,0.66)',
      align: 'center',
    });
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.21), createLabelMaterial(plaqueTexture));
    plaque.position.set(0.95, centerY - frameHeight / 2 - 0.22, 0.12);
    group.add(plaque);

    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.1, 1.7), frameShadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.012;
    group.add(shadow);

    group.position.set(frame.position[0], frame.position[1], frame.position[2]);
    group.rotation.y = frame.yawRad;
    groups.set(frame.exhibitId, group);
  }

  return { groups, interactables };
}

function createBench(materials: WorldMaterials, position: [number, number, number], yawRad: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  group.rotation.y = yawRad;

  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.64), materials.wood);
  seat.position.y = 0.46;
  seat.castShadow = true;
  seat.receiveShadow = true;
  group.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.1), materials.wood);
  back.position.set(0, 0.78, -0.28);
  back.rotation.x = -0.12;
  back.castShadow = true;
  group.add(back);

  for (const x of [-1.0, 1.0]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.5), materials.metal);
    leg.position.set(x, 0.2, 0);
    leg.castShadow = true;
    group.add(leg);
  }

  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 1.2), materials.contactShadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;
  group.add(shadow);
  return group;
}

function createPlanter(materials: WorldMaterials, position: [number, number, number]): THREE.Group {
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);

  const box = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.82, 1.6), materials.concreteDark);
  box.position.y = 0.41;
  box.castShadow = true;
  box.receiveShadow = true;
  group.add(box);

  const soil = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.06, 1.38), materials.frameBack);
  soil.position.y = 0.84;
  group.add(soil);

  const rand = seeded(Math.round(position[0] * 13 + position[2] * 29) + 100);
  for (let i = 0; i < 3; i += 1) {
    const shrub = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42 + rand() * 0.25, 1), materials.foliage);
    shrub.position.set((rand() - 0.5) * 0.7, 1.05 + rand() * 0.3, (rand() - 0.5) * 0.7);
    shrub.castShadow = true;
    group.add(shrub);
  }

  const edge = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.025, 1.64), materials.emissiveGoldSoft);
  edge.position.y = 0.835;
  group.add(edge);

  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), materials.contactShadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.011;
  group.add(shadow);
  return group;
}

function createLamp(materials: WorldMaterials, position: [number, number, number]): THREE.Group {
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.24, 16), materials.metal);
  base.position.y = 0.12;
  base.castShadow = true;
  group.add(base);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 4.0, 12), materials.metal);
  pole.position.y = 2.12;
  pole.castShadow = true;
  group.add(pole);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.34), materials.emissiveGold);
  head.position.y = 4.18;
  group.add(head);

  const shade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.5), materials.metal);
  shade.position.y = 4.3;
  shade.castShadow = true;
  group.add(shade);

  const haloMaterial = materials.glow.clone();
  haloMaterial.color.setHex(PALETTE.emissiveGold);
  haloMaterial.opacity = 0.34;
  const halo = new THREE.Sprite(haloMaterial);
  halo.position.y = 4.18;
  halo.scale.set(2.4, 2.4, 1);
  group.add(halo);

  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), materials.contactShadow);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  group.add(shadow);
  return group;
}

function createWayfinding(
  materials: WorldMaterials,
  position: [number, number, number],
  primary: string,
  secondary: string,
  accent: 'gold' | 'cyan',
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.72, 0.08), materials.frame);
  panel.position.y = 1.78;
  panel.castShadow = true;
  group.add(panel);

  for (const x of [-0.95, 0.95]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.5, 0.07), materials.metal);
    post.position.set(x, 0.75, 0);
    group.add(post);
  }

  const texture = createSignTexture(primary, secondary, {
    width: 1024,
    height: 256,
    color: '#edf4ff',
    subColor: accent === 'cyan' ? 'rgba(0,240,255,0.7)' : 'rgba(255,179,102,0.72)',
    align: 'center',
  });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(2.45, 0.61), createLabelMaterial(texture));
  face.position.set(0, 1.78, 0.045);
  group.add(face);

  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 0.03, 0.02),
    accent === 'cyan' ? materials.emissiveCyanSoft : materials.emissiveGoldSoft,
  );
  edge.position.set(0, 1.42, 0.07);
  group.add(edge);
  return group;
}

export function createProps(materials: WorldMaterials): THREE.Group {
  const group = new THREE.Group();
  group.name = 'StreetProps';

  for (const bench of benches) {
    group.add(createBench(materials, bench.position, bench.yawRad));
  }
  for (const planter of planters) {
    group.add(createPlanter(materials, planter.position));
  }
  for (const lamp of lamps) {
    group.add(createLamp(materials, lamp.position));
  }

  group.add(createWayfinding(materials, [-7.7, 0, 7.8], '← GALLERY · LEARNING', '西侧图片街 / 学习馆', 'gold'));
  group.add(createWayfinding(materials, [7.7, 0, 7.8], 'AI LAB · ALLEY →', '东侧终端 / 装置小院', 'cyan'));

  // 北侧扩建预留的围挡。
  const hoarding = new THREE.Group();
  hoarding.position.set(0, 0, -25.6);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(8.8, 2.4, 0.16), materials.metal);
  panel.position.y = 1.2;
  panel.castShadow = true;
  panel.receiveShadow = true;
  hoarding.add(panel);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 2.2), materials.hoarding);
  face.position.set(0, 1.2, 0.09);
  hoarding.add(face);
  for (const x of [-4.4, 4.4]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.7, 0.16), materials.metal);
    post.position.set(x, 1.35, 0);
    post.castShadow = true;
    hoarding.add(post);
  }
  for (const x of [-3.8, 3.8]) {
    const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), materials.emissiveGold);
    beacon.position.set(x, 2.52, 0.12);
    hoarding.add(beacon);
  }
  group.add(hoarding);

  addGlowPool(group, materials, -12.4, 4, PALETTE.emissiveGold, 7.5, 5.5, 0.2);
  addGlowPool(group, materials, -19, -3.8, PALETTE.emissiveCyan, 5.5, 4.5, 0.16);
  addGlowPool(group, materials, 12.6, -5, PALETTE.emissiveCyan, 5.5, 4.5, 0.16);
  addGlowPool(group, materials, 17, 10, PALETTE.emissiveGold, 6.0, 6.0, 0.1);

  return group;
}

export function createMotes(materials: WorldMaterials): THREE.Points {
  const rand = seeded(1777);
  const count = 160;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const radius = 2 + rand() * 26;
    const angle = rand() * Math.PI * 2;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = 0.5 + rand() * 9;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = materials.star.clone();
  material.color.setHex(0xffd8ae);
  material.size = 0.34;
  material.opacity = 0.42;
  material.blending = THREE.AdditiveBlending;
  const points = new THREE.Points(geometry, material);
  points.name = 'AtmosphereMotes';
  points.frustumCulled = false;
  return points;
}
