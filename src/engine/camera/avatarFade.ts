import * as THREE from 'three';
import { CAMERA } from './settings';

interface MaterialLink { source: THREE.Material; clone: THREE.Material }
interface MeshLink {
  mesh: THREE.Mesh;
  material: THREE.Material | THREE.Material[];
  castShadow: boolean;
}

/** 只克隆角色材质；动画 agent 仍可更新原材质（如接地阴影透明度）。 */
export class AvatarFade {
  private readonly materials = new Map<THREE.Material, MaterialLink>();
  private readonly meshes: MeshLink[] = [];
  private readonly ray = new THREE.Ray();
  private readonly axisStart = new THREE.Vector3();
  private readonly axisEnd = new THREE.Vector3();
  private readonly closest = new THREE.Vector3();
  private readonly rayClosest = new THREE.Vector3();
  private readonly toBody = new THREE.Vector3();
  private nearFading = false;
  private centerFading = false;
  private fading = false;
  private opacity = 1;
  private targetOpacity = 1;
  private reason = 'none';
  private upLookFactor = 0;
  private upLookPitch = 0;
  private nearDistance = Infinity;
  private centerDistance = Infinity;
  private screenHeight = 0;
  private materialOpacity = 1;
  private transparentMaterials = 0;

  constructor(root: THREE.Object3D) {
    root.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const original = object.material;
      const list = Array.isArray(original) ? original : [original];
      const clones = list.map(source => {
        let link = this.materials.get(source);
        if (!link) {
          // 同一个源材质只生成一个克隆，并把这个克隆挂到所有使用它的角色网格。
          // 旧实现返回“克隆的克隆”，实际改的是无人引用的材质，所以淡出不可见。
          link = { source, clone: source.clone() };
          this.materials.set(source, link);
        }
        return link.clone;
      });
      this.meshes.push({ mesh: object, material: original, castShadow: object.castShadow });
      object.material = Array.isArray(original) ? clones : clones[0];
    });
  }

  update(delta: number, camera: THREE.PerspectiveCamera, feet: THREE.Vector3): void {
    const settings = CAMERA.avatarFade;
    this.axisStart.copy(feet).y += 0.25;
    this.axisEnd.copy(feet).y += 1.45;
    this.closest.copy(camera.position);
    this.closest.y = THREE.MathUtils.clamp(camera.position.y, this.axisStart.y, this.axisEnd.y);
    this.closest.x = feet.x; this.closest.z = feet.z;
    this.nearDistance = camera.position.distanceTo(this.closest);
    this.ray.origin.copy(camera.position);
    camera.getWorldDirection(this.ray.direction);
    // 近距时 sqrDist 可能因浮点误差落到负数，sqrt 会变成 NaN。
    const centerSq = this.ray.distanceSqToSegment(this.axisStart, this.axisEnd, this.rayClosest);
    this.centerDistance = Number.isFinite(centerSq) ? Math.sqrt(Math.max(0, centerSq)) : 0;
    this.toBody.copy(this.axisStart).add(this.axisEnd).multiplyScalar(0.5).sub(camera.position);
    const inFront = this.toBody.dot(this.ray.direction) > camera.near;
    this.screenHeight = 1.6 / (Math.max(0.05, this.toBody.length()) *
      2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));

    this.nearFading = this.nearDistance < (this.nearFading ? settings.nearExit : settings.nearEnter);
    const centerBlocks = inFront &&
      this.centerDistance < (this.centerFading ? settings.centerExit : settings.centerEnter) &&
      this.screenHeight > (this.centerFading ? settings.screenExit : settings.screenEnter);
    this.centerFading = centerBlocks;

    this.upLookPitch = Math.asin(THREE.MathUtils.clamp(this.ray.direction.y, -1, 1));
    const upT = THREE.MathUtils.clamp(
      (this.upLookPitch - settings.upLookStart) / (settings.upLookFull - settings.upLookStart),
      0,
      1,
    );
    this.upLookFactor = upT * upT * (3 - 2 * upT);

    let target = 1;
    let reason = 'none';
    if (this.nearFading || this.centerFading) {
      target = this.nearDistance < 0.45 ? settings.insideOpacity : settings.closeOpacity;
      reason = this.nearFading ? '近距' : '中心遮挡';
    } else if (this.upLookFactor > 0.001) {
      // 独立构图规则：大幅仰视时只弱化人物，不当作遮挡隐藏。
      target = 1 - this.upLookFactor * (1 - settings.upLookOpacity);
      reason = '仰视构图';
    }
    this.targetOpacity = target;
    this.reason = reason;
    this.fading = target < 0.999;
    const rate = target < this.opacity ? settings.fadeRate : settings.recoverRate;
    this.opacity = THREE.MathUtils.damp(this.opacity, target, rate, delta);
    if (Math.abs(this.opacity - target) < 0.001) this.opacity = target;

    const active = this.opacity < 0.999;
    let sample: MaterialLink | null = null;
    let transparent = 0;
    for (const { source, clone } of this.materials.values()) {
      const transparentNow = active || source.transparent;
      if (clone.transparent !== transparentNow) { clone.transparent = transparentNow; clone.needsUpdate = true; }
      clone.opacity = source.opacity * this.opacity;
      clone.depthWrite = active ? false : source.depthWrite;
      if (transparentNow) transparent += 1;
      // 用于调试面板核对“标量 opacity 已写入实际角色材质”，避免旧克隆 bug 假通过。
      if (!sample && !source.transparent) sample = { source, clone };
    }
    this.materialOpacity = sample ? sample.clone.opacity : this.opacity;
    this.transparentMaterials = transparent;
    for (const link of this.meshes) link.mesh.castShadow = link.castShadow && this.opacity >= 0.4;
  }

  diagnostics(): object {
    return {
      fading: this.fading,
      reason: this.reason,
      targetOpacity: this.targetOpacity,
      opacity: this.opacity,
      nearFading: this.nearFading,
      centerFading: this.centerFading,
      upLookFactor: this.upLookFactor,
      upLookPitchDeg: THREE.MathUtils.radToDeg(this.upLookPitch),
      nearDistance: this.nearDistance,
      centerDistance: this.centerDistance,
      screenHeight: this.screenHeight,
      materialOpacity: this.materialOpacity,
      transparentMaterials: this.transparentMaterials,
      materialCount: this.materials.size,
      meshCount: this.meshes.length,
    };
  }

  dispose(): void {
    for (const link of this.meshes) {
      link.mesh.material = link.material;
      link.mesh.castShadow = link.castShadow;
    }
    for (const link of this.materials.values()) link.clone.dispose();
    this.materials.clear();
    this.meshes.length = 0;
  }
}
