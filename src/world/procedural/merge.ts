import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function normalizeAttributes(geometry: THREE.BufferGeometry): void {
  for (const name of Object.keys(geometry.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'uv') {
      geometry.deleteAttribute(name);
    }
  }
  if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
  if (!geometry.getAttribute('uv')) {
    const count = geometry.getAttribute('position').count;
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
  }
}

function isExcluded(object: THREE.Object3D, root: THREE.Object3D, excluded: Set<THREE.Object3D>): boolean {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (excluded.has(current)) return true;
    if (current === root) return false;
    current = current.parent;
  }
  return false;
}

function mergeableMaterial(material: THREE.Material): boolean {
  if (Array.isArray(material)) return false;
  // 不透明材质始终可合并；透明材质只有在不写深度时合并（地面导视、接触阴影等平铺层），
  // 避免破坏玻璃 / 发光体的排序。
  return material.transparent ? material.depthWrite === false : material.depthWrite !== false;
}

function bucketKey(mesh: THREE.Mesh): string {
  const material = mesh.material as THREE.Material;
  return `${material.uuid}:${mesh.renderOrder}:${Boolean(material.depthWrite)}`;
}

/**
 * 合并同一材质下的静态网格，降低 draw call。
 * 只处理顶层、不透明、非实例化的 Mesh；保留独立材质（贴图、铭牌）与遮挡体。
 */
export function mergeStaticGroup(
  group: THREE.Group,
  exclude?: ReadonlySet<THREE.Object3D>,
): void {
  group.updateMatrixWorld(true);
  const buckets = new Map<string, THREE.Mesh[]>();
  for (const child of group.children) {
    if (!(child instanceof THREE.Mesh) || child instanceof THREE.InstancedMesh) continue;
    if (exclude?.has(child)) continue;
    if (Array.isArray(child.material)) continue;
    if (!mergeableMaterial(child.material)) continue;
    if (child.userData.noMerge) continue;
    const key = bucketKey(child);
    const list = buckets.get(key);
    if (list) list.push(child);
    else buckets.set(key, [child]);
  }

  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    const geometries: THREE.BufferGeometry[] = [];
    let castShadow = false;
    let receiveShadow = false;

    for (const mesh of list) {
      mesh.updateMatrix();
      const source = mesh.geometry;
      const geometry = source.index ? source.toNonIndexed() : source.clone();
      // 统一属性集合，避免 Box / RoundedBox / Plane 之间的属性差异导致合并失败。
      normalizeAttributes(geometry);
      geometry.applyMatrix4(mesh.matrix);
      geometries.push(geometry);
      castShadow = castShadow || mesh.castShadow;
      receiveShadow = receiveShadow || mesh.receiveShadow;
    }

    const merged = mergeGeometries(geometries, false);
    for (const geometry of geometries) geometry.dispose();
    if (!merged) continue;

    for (const mesh of list) {
      group.remove(mesh);
      mesh.removeFromParent();
    }

    const mesh = new THREE.Mesh(merged, list[0].material);
    mesh.name = `${group.name || 'Group'}_Merged`;
    mesh.renderOrder = list[0].renderOrder;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    group.add(mesh);
  }
}

/**
 * 场景级静态合并：把不同建筑、道具与展位之间共享材质的网格合并到场景根节点。
 * 动态对象（雕塑旋转环、角色）与建筑遮挡壳通过 excluded 保留独立节点。
 */
export function mergeStaticScene(
  root: THREE.Object3D,
  excluded: ReadonlySet<THREE.Object3D>,
): void {
  root.updateMatrixWorld(true);
  const exclusions = new Set(excluded);
  const buckets = new Map<string, THREE.Mesh[]>();

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh) return;
    if (object instanceof THREE.SkinnedMesh) return;
    if (Array.isArray(object.material)) return;
    if (isExcluded(object, root, exclusions)) return;
    if (!mergeableMaterial(object.material)) return;
    if (object.userData.noMerge) return;
    const key = bucketKey(object);
    const list = buckets.get(key);
    if (list) list.push(object);
    else buckets.set(key, [object]);
  });

  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    const geometries: THREE.BufferGeometry[] = [];
    let castShadow = false;
    let receiveShadow = false;
    for (const mesh of list) {
      const source = mesh.geometry;
      const geometry = source.index ? source.toNonIndexed() : source.clone();
      normalizeAttributes(geometry);
      geometry.applyMatrix4(mesh.matrixWorld);
      geometries.push(geometry);
      castShadow = castShadow || mesh.castShadow;
      receiveShadow = receiveShadow || mesh.receiveShadow;
    }
    const merged = mergeGeometries(geometries, false);
    for (const geometry of geometries) geometry.dispose();
    if (!merged) continue;

    for (const mesh of list) mesh.removeFromParent();
    const mesh = new THREE.Mesh(merged, list[0].material);
    mesh.name = 'StaticScene_Merged';
    mesh.renderOrder = list[0].renderOrder;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    root.add(mesh);
  }
}
