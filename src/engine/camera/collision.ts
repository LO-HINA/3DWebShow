import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { CAMERA } from './settings';
import type { FollowCamera } from './follow';

const IDENTITY = { x: 0, y: 0, z: 0, w: 1 };
const START_OVERLAP_EPSILON = 1e-4;

/**
 * 镜头模块独立持有查询状态，不修改角色碰撞体或运动控制器。
 *
 * 玩家贴墙时，人物中心（扫掠起点）可能已经落在“镜头球半径 + 墙”的内部。
 * 此时 castShape(stopAtPenetration=true) 会一直返回 0，旧实现把镜头永久锁在
 * 人物头部。这里先记录起点重叠，再用小半径探针沿拖拽方向重查：朝墙仍会缩短，
 * 朝外或沿墙则可正常恢复，旋转不再被起点重叠卡死。
 */
export class CameraCollision {
  private readonly previousOffset = new THREE.Vector3();
  private readonly previousPivot = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();
  private readonly temporalDirection = new THREE.Vector3();
  private readonly temporalStart = new THREE.Vector3();
  private readonly temporalPoint = new THREE.Vector3();
  private readonly armDirection = new THREE.Vector3();
  private readonly origin = new THREE.Vector3();
  private readonly safePosition = new THREE.Vector3();
  private revision = -1;
  private radius = 0;
  private sphere!: RAPIER.Ball;
  private probeSphere!: RAPIER.Ball;
  private lastPrimaryHit: number | null = null;
  private lastPrimaryRawHit: number | null = null;
  private lastPrimaryHandle: number | null = null;
  private lastPrimaryStartOverlap = false;
  private lastProbeUsed = false;
  private lastTemporalHit: number | null = null;

  constructor(private readonly labelFor: (handle: number) => string = (handle) => `collider#${handle}`) {}

  private cast(
    world: RAPIER.World,
    start: THREE.Vector3,
    end: THREE.Vector3,
    exclude: RAPIER.Collider,
    skipInitialOverlap: boolean,
    sphere: RAPIER.Ball,
    direction = this.direction,
  ) {
    direction.copy(end).sub(start);
    const length = direction.length();
    if (length < 0.00001) return null;
    direction.divideScalar(length);
    return world.castShape(
      start,
      IDENTITY,
      direction,
      sphere,
      0,
      length,
      !skipInitialOverlap,
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
      undefined,
      exclude,
    );
  }

  update(world: RAPIER.World, follow: FollowCamera, exclude: RAPIER.Collider,
    delta: number, immediate = false): void {
    if (this.radius !== follow.sweepRadius) {
      this.radius = follow.sweepRadius;
      this.sphere = new RAPIER.Ball(this.radius);
      this.probeSphere = new RAPIER.Ball(Math.min(CAMERA.collisionProbeRadius, this.radius));
    }
    // 只接受附近朝上的支撑面，忽略从墙体内部向下射出的底面。
    this.origin.copy(follow.desiredPosition);
    this.origin.y = Math.max(this.origin.y, follow.pivot.y) + this.radius + 0.05;
    const ground = world.castRayAndGetNormal(new RAPIER.Ray(this.origin, { x: 0, y: -1, z: 0 }),
      Math.max(3 + this.radius, this.origin.y - follow.pivot.y + CAMERA.chestHeight + 2),
      false, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, exclude);
    follow.setGroundHeight(ground && ground.normal.y > 0.55 ? this.origin.y - ground.timeOfImpact : 0);

    const primary = this.cast(world, follow.pivot, follow.desiredPosition, exclude, false, this.sphere);
    this.lastPrimaryRawHit = primary?.time_of_impact ?? null;
    this.lastPrimaryStartOverlap = primary !== null && primary.time_of_impact <= START_OVERLAP_EPSILON;
    this.lastProbeUsed = false;
    let hitDistance = this.lastPrimaryRawHit;
    this.lastPrimaryHandle = primary?.collider.handle ?? null;

    if (this.lastPrimaryStartOverlap) {
      this.lastProbeUsed = true;
      const probe = this.cast(world, follow.pivot, follow.desiredPosition, exclude, true, this.probeSphere);
      if (probe) {
        hitDistance = probe.time_of_impact;
        this.lastPrimaryHandle = probe.collider.handle;
      } else {
        // 起点被撑开后，沿当前方向没有新障碍：允许镜头离开墙面恢复。
        hitDistance = null;
        this.lastPrimaryHandle = null;
      }
    }
    this.lastPrimaryHit = hitDistance;

    const length = follow.resolveLength(hitDistance, delta, immediate);
    follow.positionAtLength(length, this.safePosition);

    this.lastTemporalHit = null;
    const reset = this.revision !== follow.revision || this.previousPivot.distanceTo(follow.pivot) > 2;
    // 帧间扫掠只用于快速拖拽或移动中可能跨过墙角的少量帧：起点随角色平移，
    // 修正结果也必须落回当前“角色→期望机位”的镜臂上。旧实现把上一帧的世界坐标
    // 当作固定端点，角色贴墙时会被逐帧锁在同一处，最终离开画面。
    if (!reset && !this.lastPrimaryStartOverlap) {
      this.temporalStart.copy(follow.pivot).add(this.previousOffset);
      const pathLength = this.temporalStart.distanceTo(this.safePosition);
      const temporal = pathLength > 0.00001
        ? this.cast(world, this.temporalStart, this.safePosition, exclude, true, this.sphere,
          this.temporalDirection)
        : null;
      if (temporal && temporal.time_of_impact < pathLength) {
        this.lastTemporalHit = temporal.time_of_impact;
        this.temporalPoint.copy(this.temporalStart).addScaledVector(this.temporalDirection,
          Math.max(0, this.lastTemporalHit));
        // 只允许沿当前镜臂缩短，不把相机放到角色当前解之外的旧世界位置。
        this.armDirection.copy(follow.desiredPosition).sub(follow.pivot);
        const armLength = this.armDirection.length();
        if (armLength > 0.00001) {
          this.armDirection.divideScalar(armLength);
          const projected = this.temporalPoint.sub(follow.pivot).dot(this.armDirection) -
            CAMERA.collisionSkin;
          const limited = THREE.MathUtils.clamp(projected, 0, length);
          if (limited < length) follow.positionAtLength(limited, this.safePosition);
        }
      }
    }
    follow.commit(this.safePosition);
    this.previousPivot.copy(follow.pivot);
    this.previousOffset.copy(follow.camera.position).sub(follow.pivot);
    this.revision = follow.revision;
  }

  diagnostics(): object {
    return {
      primaryHit: this.lastPrimaryHit,
      primaryRawHit: this.lastPrimaryRawHit,
      primaryObject: this.lastPrimaryHandle === null ? '—' : this.labelFor(this.lastPrimaryHandle),
      primaryHandle: this.lastPrimaryHandle,
      primaryStartOverlap: this.lastPrimaryStartOverlap,
      probeUsed: this.lastProbeUsed,
      temporalHit: this.lastTemporalHit,
      sphereRadius: this.radius,
    };
  }
}
