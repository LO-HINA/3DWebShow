import * as THREE from 'three';
import { CAMERA, PLAYER } from '../config/world';
import type { WorldSettings } from '../config/types';

const BASE_DISTANCE = Math.hypot(CAMERA.offset[1], CAMERA.offset[2]);
const BASE_POLAR = Math.atan2(CAMERA.offset[2], CAMERA.offset[1]);

function damp(current: number, target: number, lambda: number, delta: number): number {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * delta));
}

export class FollowCamera {
  readonly camera: THREE.PerspectiveCamera;
  private readonly look = new THREE.Vector3();
  private readonly desiredLook = new THREE.Vector3();
  private readonly desiredPosition = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();
  private azimuth = 0;
  private polar = BASE_POLAR;
  private targetAzimuth = 0;
  private targetPolar = BASE_POLAR;
  private introTime = 0;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(CAMERA.fov, aspect, CAMERA.near, CAMERA.far);
    this.camera.position.set(CAMERA.offset[0], CAMERA.offset[1] + 1.1, CAMERA.offset[2] + 6.5);
  }

  setParallax(nx: number, ny: number, enabled: boolean): void {
    if (!enabled) {
      this.targetAzimuth = 0;
      this.targetPolar = BASE_POLAR;
      return;
    }
    this.targetAzimuth = THREE.MathUtils.clamp(nx, -1, 1) * CAMERA.parallaxYaw;
    this.targetPolar = BASE_POLAR + THREE.MathUtils.clamp(ny, -1, 1) * CAMERA.parallaxPitch;
  }

  reset(feet: THREE.Vector3): void {
    this.azimuth = 0;
    this.polar = BASE_POLAR;
    this.targetAzimuth = 0;
    this.targetPolar = BASE_POLAR;
    this.look.set(feet.x, feet.y + 1.05, feet.z);
    this.computePosition(feet, this.desiredPosition);
    this.camera.position.copy(this.desiredPosition);
    this.camera.lookAt(this.look);
  }

  private computePosition(feet: THREE.Vector3, target: THREE.Vector3): void {
    const horizontal = Math.sin(this.polar) * BASE_DISTANCE;
    target.set(
      feet.x + Math.sin(this.azimuth) * horizontal,
      feet.y + 1.05 + Math.cos(this.polar) * BASE_DISTANCE,
      feet.z + Math.cos(this.azimuth) * horizontal,
    );
  }

  update(
    delta: number,
    feet: THREE.Vector3,
    moving: boolean,
    settings: WorldSettings,
    introActive: boolean,
  ): { position: THREE.Vector3; lookAt: THREE.Vector3 } {
    const lambda = CAMERA.followLambda;
    const motionBoost = settings.reducedMotion ? 24 : 1;

    if (introActive) {
      this.introTime += delta;
      const drift = Math.sin(this.introTime * 0.16) * 0.2;
      this.azimuth = damp(this.azimuth, drift, 1.4, delta);
      this.polar = damp(this.polar, BASE_POLAR - 0.035, 1.4, delta);
    } else {
      this.azimuth = damp(this.azimuth, this.targetAzimuth, 3.4 * motionBoost, delta);
      this.polar = damp(this.polar, this.targetPolar, 3.4 * motionBoost, delta);
    }

    this.forward.set(Math.sin(this.azimuth), 0, Math.cos(this.azimuth));
    const lookAhead = moving && !settings.reducedMotion ? CAMERA.lookAheadMax : 0;
    this.desiredLook.set(
      feet.x - this.forward.x * lookAhead,
      feet.y + 1.05,
      feet.z - this.forward.z * lookAhead,
    );

    this.computePosition(feet, this.desiredPosition);

    const posLambda = lambda * (settings.reducedMotion ? 3 : 1);
    this.camera.position.x = damp(this.camera.position.x, this.desiredPosition.x, posLambda, delta);
    this.camera.position.y = damp(this.camera.position.y, this.desiredPosition.y, posLambda, delta);
    this.camera.position.z = damp(this.camera.position.z, this.desiredPosition.z, posLambda, delta);

    this.look.x = damp(this.look.x, this.desiredLook.x, posLambda * 1.4, delta);
    this.look.y = damp(this.look.y, this.desiredLook.y, posLambda * 1.4, delta);
    this.look.z = damp(this.look.z, this.desiredLook.z, posLambda * 1.4, delta);

    return { position: this.camera.position, lookAt: this.look };
  }

  /** 相机碰撞后直接回写位置，避免穿进建筑。 */
  clampToObstacle(hitDistance: number): void {
    const direction = this.camera.position.clone().sub(this.look);
    const length = direction.length();
    if (length <= 0.001) return;
    const safe = Math.max(1.4, hitDistance - 0.42);
    direction.normalize().multiplyScalar(Math.min(length, safe));
    this.camera.position.copy(this.look).add(direction);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  ensureAboveGround(): void {
    const minimum = PLAYER.height + 0.5;
    if (this.camera.position.y < minimum) this.camera.position.y = minimum;
  }
}
