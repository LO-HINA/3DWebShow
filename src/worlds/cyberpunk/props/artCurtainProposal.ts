import * as THREE from 'three';
import { mergeStaticGroup } from '../../../engine/primitives/merge';
import { fitScreenImage, type PlazaScreenSpec } from './plazaScreenConfig';
import type { PlazaScreenHandle } from './plazaScreen';

/** 仅供本轮提案比较；不覆盖正式布局或碰撞配置。 */
export const ART_CURTAIN_CANDIDATES: PlazaScreenSpec[] = [12, 14].map(width => ({
  id: `SCREEN-PROPOSAL-${width}`, position: [0, 0, -9.7], yawRad: 0,
  width, height: width * 9 / 16, bottom: 1.2, frameWidth: 0.14, depth: 0.64,
  imageUrl: '/assets/worlds/cyberpunk/media/plaza-cyber-curtain.svg',
}));
export const PROPOSED_SCULPTURE_POSITION = [-6.5, 0, 3] as const;

/** 与原大屏保持相同 group / dispose 交接，不注册或改变任何打开关闭事件。 */
export function createArtCurtainProposal(spec: PlazaScreenSpec, anisotropy = 1): PlazaScreenHandle {
  const bottom = spec.bottom ?? 1.2, frame = spec.frameWidth ?? 0.14, depth = spec.depth ?? 0.64;
  const group = new THREE.Group();
  group.name = spec.id;
  group.position.fromArray(spec.position);
  group.rotation.y = spec.yawRad;
  group.userData.imageStatus = 'loading';
  const metal = new THREE.MeshStandardMaterial({ color: 0x303641, metalness: 0.65, roughness: 0.55 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x494952, metalness: 0.12, roughness: 0.82 });
  const recess = new THREE.MeshStandardMaterial({ color: 0x121924, metalness: 0.4, roughness: 0.6 });
  const glow = new THREE.MeshBasicMaterial({ color: 0xffbd87, toneMapped: false });
  const black = new THREE.MeshBasicMaterial({ color: 0x080e1a, toneMapped: false });
  const imageMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, toneMapped: false });
  const materials = [metal, stone, recess, glow, black, imageMaterial];
  const geometries = new Set<THREE.BufferGeometry>();
  const mesh = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
    geometries.add(geometry);
    const object = new THREE.Mesh(geometry, material);
    object.name = name; object.position.set(x, y, z);
    object.castShadow = material instanceof THREE.MeshStandardMaterial;
    object.receiveShadow = object.castShadow;
    group.add(object); return object;
  };
  const box = (name: string, w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material = metal) =>
    mesh(name, new THREE.BoxGeometry(w, h, d), material, x, y, z);
  const centerY = bottom + spec.height / 2;
  // 整体低基座；中间无立柱。侧墩沿画面两侧布置，不侵占有效画面。
  box('ContinuousPlinth', spec.width + 2.0, 0.32, 2.0, 0, 0.16, -0.15, stone);
  box('PlinthShadowJoint', spec.width + 1.75, 0.08, 1.75, 0, 0.36, -0.15, recess);
  box('RearHousing', spec.width + frame * 2, spec.height + frame * 2, depth, 0, centerY, -0.04);
  box('DisplayBacking', spec.width, spec.height, 0.03, 0, centerY, depth / 2 + 0.01, black);
  for (const side of [-1, 1]) {
    const outline = new THREE.Shape();
    const points = [[0, 0.4], [0.95, 0.4], [0.95, bottom + spec.height - 0.24],
      [0.57, bottom + spec.height + 0.16], [0, bottom + spec.height + 0.16]];
    points.forEach(([x, y], index) => index ? outline.lineTo(x, y) : outline.moveTo(x, y));
    outline.closePath();
    const pier = mesh('ChamferedSidePier', new THREE.ExtrudeGeometry(outline,
      { depth: 1.25, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 1, steps: 1 }),
      stone, side * (spec.width / 2 + frame + 0.04), 0, -0.8);
    pier.scale.x = side;
    box('SideFrame', frame, spec.height + frame * 2, 0.12,
      side * (spec.width + frame) / 2, centerY, depth / 2 + 0.045);
    box('HorizontalFrame', spec.width, frame, 0.12, 0,
      centerY + side * (spec.height + frame) / 2, depth / 2 + 0.045);
    // 侧墩向观众面的凹槽：两侧盖边在前，窄灯芯退后 4cm。
    const x = side * (spec.width / 2 + frame + 0.48);
    box('PierLightWell', 0.17, 1.25, 0.035, x, 1.15, 0.475, recess);
    for (const edge of [-1, 1]) box('WellLip', 0.035, 1.28, 0.11, x + edge * 0.10, 1.15, 0.48, stone);
    box('RecessedLight', 0.025, 1.05, 0.012, x, 1.15, 0.5, glow);
  }
  const image = mesh('ScreenImage', new THREE.PlaneGeometry(1, 1), imageMaterial,
    0, centerY, depth / 2 + 0.035);
  image.visible = false;
  mergeStaticGroup(group, new Set([image]));
  let disposed = false;
  const texture = new THREE.TextureLoader().load(spec.imageUrl, loaded => {
    if (disposed) { loaded.dispose(); return; }
    loaded.colorSpace = THREE.SRGBColorSpace; loaded.anisotropy = anisotropy;
    const source = loaded.image as { width: number; height: number };
    const [w, h] = fitScreenImage(spec.width, spec.height, source.width, source.height);
    image.scale.set(w, h, 1); imageMaterial.map = loaded; imageMaterial.needsUpdate = true;
    image.visible = true; group.userData.imageStatus = 'loaded';
  }, undefined, () => { if (!disposed) group.userData.imageStatus = 'error'; });
  return { group, dispose: () => {
    if (disposed) return; disposed = true; group.removeFromParent();
    group.traverse(object => { if (object instanceof THREE.Mesh) geometries.add(object.geometry); });
    geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose()); texture.dispose();
  } };
}
