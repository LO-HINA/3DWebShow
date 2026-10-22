import * as THREE from 'three';
import { screenDimensions, fitScreenImage, type PlazaScreenSpec } from './plazaScreenConfig';
import { mergeStaticGroup } from '../../../engine/primitives/merge';

export interface PlazaScreenHandle {
  group: THREE.Group;
  /** 先移除并释放自有资源，异步加载完成后也不会重新写入已销毁场景。 */
  dispose: () => void;
}

export function createPlazaScreen(spec: PlazaScreenSpec, anisotropy = 1): PlazaScreenHandle {
  const d = screenDimensions(spec);
  const group = new THREE.Group();
  group.name = spec.id;
  group.position.fromArray(spec.position);
  group.rotation.y = spec.yawRad;
  group.userData.entityId = spec.id;
  group.userData.worldId = 'cyberpunk';
  group.userData.imageStatus = 'loading';

  const metal = new THREE.MeshStandardMaterial({ color: 0x292e36, roughness: 0.48, metalness: 0.72 });
  const inset = new THREE.MeshStandardMaterial({ color: 0x0c1018, roughness: 0.76, metalness: 0.25 });
  const edge = new THREE.MeshStandardMaterial({ color: 0x48515b, roughness: 0.42, metalness: 0.7 });
  const light = new THREE.MeshBasicMaterial({ color: 0xb8d8d6, toneMapped: false });
  const black = new THREE.MeshBasicMaterial({ color: 0x080c13, toneMapped: false, fog: false });
  const imageMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, fog: false });
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = [metal, inset, edge, light, black, imageMaterial];
  const box = (name: string, w: number, h: number, depth: number, x: number, y: number, z: number,
    material: THREE.Material = metal) => {
    const geometry = new THREE.BoxGeometry(w, h, depth);
    geometries.add(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.castShadow = material instanceof THREE.MeshStandardMaterial;
    mesh.receiveShadow = mesh.castShadow;
    group.add(mesh);
    return mesh;
  };

  // 后壳、侧框和前方内沿是独立实体，屏幕不是贴在无厚度平面上的发光矩形。
  box('RearHousing', d.outerWidth, d.outerHeight, 0.08, 0, d.centerY, -d.depth / 2 + 0.04);
  for (const side of [-1, 1]) {
    box('SideFrame', d.frame, d.outerHeight, d.depth, side * (spec.width + d.frame) / 2, d.centerY, 0);
    if (side === 1) box('TopFrame', spec.width, d.frame, d.depth, 0,
      d.centerY + (spec.height + d.frame) / 2, 0);
    box('InnerLip', 0.025, spec.height, 0.035, side * (spec.width / 2 + 0.0125), d.centerY,
      d.depth / 2 - 0.045, edge);
    box('Support', 0.18, d.bottom, 0.24, side * d.supportX, d.bottom / 2, 0);
    box('LowFoot', d.footWidth, 0.18, d.footDepth, side * d.supportX, 0.09, 0);
    // 仅底边两段内凹灯槽：外侧深色槽口，灯芯退后，避免整圈霓虹抢画面。
    const grooveWidth = spec.width * 0.16;
    box('LightRecess', grooveWidth, d.frame * 0.54, 0.008, side * spec.width * 0.29,
      d.bottom - d.frame / 2, d.depth / 2 - 0.035, inset);
    box('RecessedLight', grooveWidth - 0.06, 0.018, 0.008, side * spec.width * 0.29,
      d.bottom - d.frame / 2, d.depth / 2 - 0.025, light);
  }
  const bottomY = d.bottom - d.frame / 2;
  const bandHeight = d.frame * 0.23;
  box('BottomFrameRear', spec.width, d.frame, d.depth - 0.04, 0, bottomY, -0.02);
  for (const side of [-1, 1]) box('SlotRim', spec.width, bandHeight, 0.04, 0,
    bottomY + side * (d.frame - bandHeight) / 2, d.depth / 2 - 0.02);
  // 正面分段留出两处真槽口，灯芯位于边框前沿后方。
  const ends = [-spec.width / 2, -spec.width * 0.37, -spec.width * 0.21,
    spec.width * 0.21, spec.width * 0.37, spec.width / 2];
  for (let i = 0; i < ends.length; i += 2) box('SlotDivider', ends[i + 1] - ends[i],
    d.frame * 0.54, 0.04, (ends[i] + ends[i + 1]) / 2, bottomY, d.depth / 2 - 0.02);
  box('RearSpine', spec.width * 0.78, 0.12, 0.06, 0, d.centerY, -d.depth / 2 - 0.03);
  box('DisplayBacking', spec.width, spec.height, 0.025, 0, d.centerY, d.depth / 2 - 0.065, black);
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometries.add(geometry);
  const image = new THREE.Mesh(geometry, imageMaterial);
  image.name = 'ScreenImage';
  image.position.set(0, d.centerY, d.depth / 2 - 0.047);
  image.visible = false;
  group.add(image);
  mergeStaticGroup(group, new Set([image]));

  let disposed = false;
  let texture: THREE.Texture;
  texture = new THREE.TextureLoader().load(spec.imageUrl, loaded => {
    if (disposed) { loaded.dispose(); return; }
    loaded.colorSpace = THREE.SRGBColorSpace;
    loaded.anisotropy = anisotropy;
    const source = loaded.image as { width: number; height: number };
    const [w, h] = fitScreenImage(spec.width, spec.height, source.width, source.height);
    image.scale.set(w, h, 1);
    imageMaterial.map = loaded;
    imageMaterial.needsUpdate = true;
    image.visible = true;
    group.userData.imageStatus = 'loaded';
  }, undefined, () => {
    if (disposed) return;
    group.userData.imageStatus = 'error';
    // 保留完整装置与暗色屏底，不阻断世界加载；失败状态可由诊断读取。
    console.warn(`Plaza screen image failed to load: ${spec.imageUrl}`);
  });

  return { group, dispose: () => {
    if (disposed) return;
    disposed = true;
    group.removeFromParent();
    group.traverse(object => { if (object instanceof THREE.Mesh) geometries.add(object.geometry); });
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    texture.dispose();
  } };
}
