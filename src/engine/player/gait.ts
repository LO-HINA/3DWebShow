import * as THREE from 'three';

export interface MotionSample {
  distance: number;
  speed: number;
  velocity: { x: number; z: number };
  grounded: boolean;
  height: number;
  verticalVelocity: number;
  landingId: number;
  landingImpact: number;
  reducedMotion: boolean;
}

export interface FootPose {
  position: THREE.Vector3;
  yaw: number;
  pitch: number;
  toe: number;
  planted: boolean;
}

interface FootState extends FootPose {
  side: number;
  start: THREE.Vector3;
  target: THREE.Vector3;
  liftPhase: number;
  landPhase: number;
  startYaw: number;
  settleTime: number;
}

const UP = new THREE.Vector3(0, 1, 0);
export const LEG = { hipHeight: 0.73, upper: 0.34, lower: 0.34, ankle: 0.085, separation: 0.105 };
const ease = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);
export function angleDelta(from: number, to: number): number {
  return THREE.MathUtils.euclideanModulo(to - from + Math.PI, Math.PI * 2) - Math.PI;
}

/** 距离驱动相位；支撑脚保留世界位置，摆动脚单独插值，不平滑整个骨架。 */
export class DistanceGait {
  readonly feet: FootState[] = [-1, 1].map(side => ({ side, position: new THREE.Vector3(),
    start: new THREE.Vector3(), target: new THREE.Vector3(), yaw: 0, startYaw: 0,
    pitch: 0, toe: 0, planted: true, liftPhase: 0, landPhase: 1, settleTime: 0 }));
  phase = 0.3;
  run = 0;
  state = 'idle';
  private initialized = false;
  private lastDistance = 0;
  private wasGrounded = true;
  private stopping = false;
  private stopAge = 0;
  private movingAge = 0;
  private readonly neutral = new THREE.Vector3();
  private readonly lead = new THREE.Vector3();
  private readonly lastRoot = new THREE.Vector3();
  private readonly rootTravel = new THREE.Vector3();

  reset(): void { this.initialized = false; }

  private neutralAt(root: THREE.Vector3, yaw: number, side: number, target: THREE.Vector3): void {
    target.set(side * LEG.separation, LEG.ankle, 0).applyAxisAngle(UP, yaw).add(root);
  }

  update(delta: number, root: THREE.Vector3, yaw: number, motion: MotionSample): void {
    this.rootTravel.copy(root).sub(this.lastRoot);
    this.lastRoot.copy(root);
    const moving = motion.speed > 0.035 && motion.grounded;
    if (!this.initialized || (motion.grounded && !this.wasGrounded)) {
      for (const foot of this.feet) {
        this.neutralAt(root, yaw, foot.side, foot.position);
        foot.start.copy(foot.position); foot.target.copy(foot.position);
        foot.yaw = yaw; foot.planted = true; foot.settleTime = 0;
      }
      this.phase = 0.3;
      this.lastDistance = motion.distance;
      this.initialized = true;
      this.stopping = false;
      this.rootTravel.set(0, 0, 0);
    }
    const travel = Math.max(0, motion.distance - this.lastDistance);
    this.lastDistance = motion.distance;
    this.run = THREE.MathUtils.smoothstep(motion.speed, 2.1, 3.8);
    const stride = THREE.MathUtils.lerp(0.5 + Math.min(motion.speed, 2.2) * 0.21,
      2 + motion.speed * 0.23, this.run);
    const stance = THREE.MathUtils.lerp(0.6, 0.18, this.run);
    if (moving && this.wasGrounded) this.phase += travel / stride;
    this.wasGrounded = motion.grounded;

    if (!motion.grounded) {
      this.state = 'air';
      this.stopping = false;
      for (const foot of this.feet) {
        this.neutralAt(root, yaw, foot.side, this.neutral);
        this.neutral.y += 0.11 + Math.max(0, motion.verticalVelocity) * 0.006;
        this.neutral.z += (foot.side < 0 ? 0.07 : -0.07) * Math.cos(yaw);
        this.neutral.x += (foot.side < 0 ? 0.07 : -0.07) * Math.sin(yaw);
        foot.position.add(this.rootTravel).lerp(this.neutral, 1 - Math.exp(-24 * delta));
        foot.yaw = yaw; foot.pitch = 0.1; foot.toe = 0; foot.planted = false;
      }
      return;
    }

    if (!moving) {
      if (!this.stopping) {
        this.stopAge = 0;
        for (const foot of this.feet) {
          foot.start.copy(foot.position); foot.startYaw = foot.yaw;
          this.neutralAt(root, yaw, foot.side, foot.target);
          // 支撑脚只在确实偏离休息站姿时补小步，不在停止时整脚拖回。
          const needsStep = foot.position.distanceTo(foot.target) > 0.055 ||
            Math.abs(angleDelta(foot.yaw, yaw)) > 0.35;
          if (needsStep) foot.planted = false;
          foot.settleTime = foot.side < 0 ? 0 : 0.045;
        }
      }
      this.stopping = true;
      this.stopAge += delta;
      this.movingAge = 0;
      this.state = this.feet.some(foot => !foot.planted) ? 'stop' : 'idle';
      for (const foot of this.feet) {
        if (!foot.planted) {
          const p = THREE.MathUtils.clamp((this.stopAge - foot.settleTime) / 0.095, 0, 1);
          foot.position.lerpVectors(foot.start, foot.target, ease(p));
          foot.position.y += Math.sin(p * Math.PI) * 0.035;
          foot.yaw = foot.startYaw + angleDelta(foot.startYaw, yaw) * ease(p);
          if (p === 1) foot.planted = true;
        }
        foot.pitch = 0; foot.toe = 0;
      }
      return;
    }

    if (this.stopping) {
      for (let i = 0; i < this.feet.length; i++) {
        const foot = this.feet[i];
        if (foot.planted) continue;
        foot.start.copy(foot.position).sub(root);
        foot.startYaw = foot.yaw;
        foot.liftPhase = this.phase + i * 0.5;
        foot.landPhase = foot.liftPhase + 0.3;
      }
    }
    this.stopping = false;
    this.stopAge = 0;
    this.movingAge += delta;
    this.state = this.movingAge < 0.09 ? 'start' : this.run > 0.5 ? 'run' : 'walk';
    const speed = Math.max(0.05, motion.speed);
    for (let i = 0; i < this.feet.length; i++) {
      const foot = this.feet[i];
      const absolutePhase = this.phase + i * 0.5;
      const p = absolutePhase % 1;
      this.neutralAt(root, yaw, foot.side, this.neutral);
      const horizontalReach = Math.hypot(foot.position.x - this.neutral.x, foot.position.z - this.neutral.z);
      const pivotStep = Math.abs(angleDelta(foot.yaw, yaw)) > 0.65;
      if (foot.planted && (p >= stance || horizontalReach > 0.34 || pivotStep)) {
        foot.planted = false;
        foot.start.copy(foot.position).sub(root); foot.startYaw = foot.yaw;
        foot.liftPhase = absolutePhase;
        const phaseLeft = p >= stance ? 1 - p : 0.32;
        foot.landPhase = absolutePhase + Math.max(0.12, phaseLeft);
      }
      if (foot.planted) {
        const push = THREE.MathUtils.smoothstep(p / stance, 0.62, 1);
        foot.pitch = push * 0.22;
        foot.toe = -push * 0.3;
        continue;
      }
      const progress = THREE.MathUtils.clamp((absolutePhase - foot.liftPhase) /
        Math.max(0.001, foot.landPhase - foot.liftPhase), 0, 1);
      const leadTime = stride * stance / (2 * speed);
      this.lead.set(motion.velocity.x * leadTime, 0, motion.velocity.z * leadTime);
      // 摆动阶段采用相对身体的前摆轨迹，避免高速时脚在世界空间滞后到腿长之外。
      foot.target.copy(this.neutral).sub(root).add(this.lead);
      foot.position.lerpVectors(foot.start, foot.target, ease(progress)).add(root);
      foot.position.y += Math.sin(Math.PI * progress) * THREE.MathUtils.lerp(0.095, 0.16, this.run);
      foot.yaw = foot.startYaw + angleDelta(foot.startYaw, yaw) * ease(progress);
      foot.pitch = THREE.MathUtils.lerp(0.2, -0.12, progress);
      foot.toe = 0;
      if (progress >= 1) {
        foot.position.copy(foot.target).add(root);
        foot.planted = true;
        foot.pitch = -0.12;
      }
    }
  }

  diagnostics(): object {
    return { state: this.state, phase: this.phase, run: this.run,
      feet: this.feet.map(foot => ({ position: foot.position.toArray(), planted: foot.planted,
        pitch: foot.pitch, toe: foot.toe, yaw: foot.yaw })) };
  }
}

/** 两段腿的解析 IK，膝盖朝角色前方弯；返回大腿和小腿的局部旋转。 */
export function solveLeg(target: THREE.Vector3, upper: THREE.Quaternion, lower: THREE.Quaternion): number {
  const distance = target.length();
  const reach = THREE.MathUtils.clamp(distance, 0.05, LEG.upper + LEG.lower - 0.001);
  const direction = target.clone().normalize();
  const pole = new THREE.Vector3(0, 0, 1).addScaledVector(direction, -direction.z).normalize();
  const cosine = THREE.MathUtils.clamp((LEG.upper ** 2 + reach ** 2 - LEG.lower ** 2) /
    (2 * LEG.upper * reach), -1, 1);
  const knee = direction.clone().multiplyScalar(LEG.upper * cosine)
    .addScaledVector(pole, LEG.upper * Math.sqrt(1 - cosine * cosine));
  upper.setFromUnitVectors(new THREE.Vector3(0, -1, 0), knee.clone().normalize());
  const end = direction.multiplyScalar(reach);
  const shin = end.sub(knee).applyQuaternion(upper.clone().invert()).normalize();
  lower.setFromUnitVectors(new THREE.Vector3(0, -1, 0), shin);
  return Math.max(0, distance - reach);
}
