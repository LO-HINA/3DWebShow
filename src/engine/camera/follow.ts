import * as THREE from 'three';
import { CAMERA } from './settings';
import type { CameraSnapshot, FollowFraming, WorldSettings } from '../contracts/types';

const clamp = THREE.MathUtils.clamp;
const damp = THREE.MathUtils.damp;

export class FollowCamera {
  readonly camera: THREE.PerspectiveCamera;
  readonly pivot = new THREE.Vector3();
  readonly desiredPosition = new THREE.Vector3();
  readonly look = new THREE.Vector3();
  readonly viewDirection = new THREE.Vector3();
  private readonly offset = new THREE.Vector3();
  private readonly finalDirection = new THREE.Vector3();
  private state: CameraSnapshot = this.defaults();
  private yaw = 0;
  private pitch = CAMERA.framings.medium.pitch;
  private distance = CAMERA.framings.medium.distance;
  private boomLength = CAMERA.framings.medium.distance;
  private groundHeight = 0;
  revision = 0;

  private defaults(): CameraSnapshot {
    return { orientationVersion: 2, mode: 'follow', yaw: 0, pitch: CAMERA.framings.medium.pitch,
      distance: CAMERA.framings.medium.distance, framing: 'medium', lookUpPitch: -0.42,
      lookUpHeight: 6, lookUpYaw: 0, lookUpDistance: CAMERA.framings.medium.distance };
  }

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(CAMERA.fov, aspect, CAMERA.near, CAMERA.far);
  }

  get movementYaw(): number { return this.yaw; }
  get inspecting(): boolean { return this.state.mode === 'lookUp'; }
  get resolvedLength(): number { return this.boomLength; }
  get sweepRadius(): number {
    const nearPlaneRadius = this.camera.near * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) *
      Math.hypot(this.camera.aspect, 1);
    return Math.max(CAMERA.collisionRadius, nearPlaneRadius + CAMERA.collisionSkin);
  }
  get clearance(): number { return Math.max(CAMERA.groundClearance, this.sweepRadius + CAMERA.collisionSkin); }
  snapshot(): CameraSnapshot { return { ...this.state }; }

  snapTo(yaw: number, pitch: number, distance: number, feet: THREE.Vector3): void {
    const state = this.snapshot();
    state.mode = 'follow';
    state.yaw = yaw;
    state.pitch = clamp(pitch, CAMERA.minPitch, CAMERA.maxPitch);
    state.distance = clamp(distance, CAMERA.minDistance, CAMERA.maxDistance);
    this.reset(feet, state);
  }

  setFraming(framing: FollowFraming): void {
    this.state.framing = framing;
    this.state.pitch = CAMERA.framings[framing].pitch;
    this.state.distance = CAMERA.framings[framing].distance;
  }

  toggleLookUp(): void {
    if (!this.inspecting) {
      this.state.lookUpYaw = this.state.yaw;
      this.state.lookUpDistance = this.state.distance;
    }
    this.state.mode = this.inspecting ? 'follow' : 'lookUp';
  }

  orbit(dx: number, dy: number): void {
    const yaw = this.inspecting ? 'lookUpYaw' : 'yaw';
    const pitch = this.inspecting ? 'lookUpPitch' : 'pitch';
    this.state[yaw] -= dx * CAMERA.dragYawSensitivity;
    this.state[pitch] = clamp(
      this.state[pitch] + dy * CAMERA.dragPitchSensitivity,
      CAMERA.minPitch,
      CAMERA.maxPitch,
    );
  }

  zoom(delta: number): void {
    const key = this.inspecting ? 'lookUpDistance' : 'distance';
    this.state[key] = clamp(this.state[key] * Math.exp(clamp(delta, -240, 240) * 0.0015),
      CAMERA.minDistance, CAMERA.maxDistance);
  }

  reset(feet: THREE.Vector3, saved?: CameraSnapshot): void {
    this.state = saved ? { ...saved } : this.defaults();
    this.yaw = this.inspecting ? this.state.lookUpYaw : this.state.yaw;
    this.pitch = this.inspecting ? this.state.lookUpPitch : this.state.pitch;
    this.distance = this.inspecting ? this.state.lookUpDistance : this.state.distance;
    this.boomLength = this.distance;
    this.groundHeight = 0;
    this.revision++;
    this.update(1, feet, { reducedMotion: true });
    this.settle();
  }

  update(delta: number, feet: THREE.Vector3, settings: Pick<WorldSettings, 'reducedMotion'>): void {
    const lambda = settings.reducedMotion ? 1000 : CAMERA.orbitLambda;
    this.yaw = damp(this.yaw, this.inspecting ? this.state.lookUpYaw : this.state.yaw, lambda, delta);
    this.pitch = damp(this.pitch, this.inspecting ? this.state.lookUpPitch : this.state.pitch, lambda, delta);
    this.distance = damp(this.distance, this.inspecting ? this.state.lookUpDistance : this.state.distance, lambda, delta);
    this.pivot.copy(feet).y += CAMERA.chestHeight;
    this.viewDirection.set(-Math.sin(this.yaw) * Math.cos(this.pitch), -Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch));
    this.computePosition();
  }

  setGroundHeight(height: number): void {
    this.groundHeight = height;
    this.computePosition();
  }

  private computePosition(): void {
    const minimumY = this.groundHeight + this.clearance;
    const floorPitch = Math.asin(clamp((minimumY - this.pivot.y) / this.distance, -1, 1));
    const armPitch = clamp(Math.max(floorPitch, this.pitch + CAMERA.compositionTilt), -Math.PI / 2, Math.PI / 2);
    let horizontal = Math.cos(armPitch) * this.distance;
    // 触地后把剩余的仰视拖拽映射为沿地面靠近脚边；反向拖拽沿原路径退出。
    // 不修改用户缩放距离，避免退回正常轨道时丢失原来的取景。
    const groundPitch = floorPitch - CAMERA.compositionTilt;
    if (this.pitch < groundPitch) {
      const progress = clamp((groundPitch - this.pitch) / (groundPitch - CAMERA.minPitch), 0, 1);
      const eased = progress * progress * (3 - 2 * progress);
      horizontal = THREE.MathUtils.lerp(horizontal,
        Math.min(horizontal, CAMERA.groundApproachDistance), eased);
    }
    this.desiredPosition.set(this.pivot.x + Math.sin(this.yaw) * horizontal,
      Math.max(minimumY, this.pivot.y + Math.sin(armPitch) * this.distance),
      this.pivot.z + Math.cos(this.yaw) * horizontal);
  }

  /** 未经碰撞处理的用户期望臂长，碰撞只能缩短显示位置。 */
  get desiredLength(): number {
    return this.pivot.distanceTo(this.desiredPosition);
  }

  /** 只计算碰撞后的显示臂长，不改写用户目标角度或距离。 */
  resolveLength(hitDistance: number | null, delta: number, immediate = false): number {
    const desiredLength = this.desiredLength;
    const safeLength = hitDistance === null
      ? desiredLength
      : Math.max(0, hitDistance - CAMERA.collisionSkin);
    const limit = Math.min(desiredLength, safeLength);
    this.boomLength = limit < this.boomLength || immediate
      ? limit
      : damp(this.boomLength, limit, CAMERA.recoveryLambda, delta);
    return this.boomLength;
  }

  positionAtLength(length: number, target: THREE.Vector3): THREE.Vector3 {
    this.offset.copy(this.desiredPosition).sub(this.pivot);
    if (this.offset.lengthSq() < 1e-8) return target.copy(this.pivot);
    this.offset.normalize();
    return target.copy(this.pivot).addScaledVector(this.offset, Math.max(0, length));
  }

  /** 每帧唯一的最终提交点：位置和观察方向只在这里写入 camera。 */
  commit(position: THREE.Vector3): void {
    this.camera.position.copy(position);
    this.boomLength = this.pivot.distanceTo(position);
    this.applyView();
  }

  private settle(): void {
    this.camera.position.copy(this.desiredPosition);
    this.boomLength = this.desiredLength;
    this.applyView();
  }

  private applyView(): void {
    // Independent view ray: collision and ground clamps never aim back at the avatar.
    this.look.copy(this.camera.position).addScaledVector(this.viewDirection, 10);
    this.camera.lookAt(this.look);
    this.camera.updateMatrixWorld();
  }

  diagnostics(feet: THREE.Vector3): object {
    const screen = feet.clone().add(new THREE.Vector3(0, 0.8, 0)).project(this.camera);
    const finalDirection = this.camera.getWorldDirection(this.finalDirection);
    return {
      ...this.snapshot(),
      mode: this.state.mode,
      targetPitchUpDeg: THREE.MathUtils.radToDeg(-this.state.pitch),
      actualPitchUpDeg: THREE.MathUtils.radToDeg(-this.pitch),
      viewPitchUpDeg: THREE.MathUtils.radToDeg(Math.asin(clamp(finalDirection.y, -1, 1))),
      actualYaw: this.yaw,
      yawDeg: THREE.MathUtils.radToDeg(this.yaw),
      position: this.camera.position.toArray(),
      cameraHeight: this.camera.position.y,
      lookAt: this.look.toArray(),
      pivot: this.pivot.toArray(),
      viewDirection: finalDirection.toArray(),
      solverViewDirection: this.viewDirection.toArray(),
      boomLength: this.boomLength,
      desiredDistance: this.distance,
      targetDistance: this.state.distance,
      desiredLength: this.desiredLength,
      groundHeight: this.groundHeight,
      clearance: this.clearance,
      sweepRadius: this.sweepRadius,
      characterScreen: [(screen.x + 1) / 2, (1 - screen.y) / 2],
    };
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
