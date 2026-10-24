import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { ColliderSpec, Vec3 } from '../contracts/types';
import { PLAYER } from './settings';
import type { PlayerRig } from './avatar';

export interface MovementBounds { min: number; max: number }

export interface MoveInput {
  x: number;
  z: number;
}

/** 物理按真实经过时间补步，渲染阻尼的 delta 限制不影响移动速度。 */
export class PhysicsStepper {
  private accumulator = 0;

  reset(): void { this.accumulator = 0; }

  advance(elapsed: number, step: () => void): number {
    const budget = Math.max(0, Math.min(PLAYER.maxSimulationDelta, elapsed));
    this.accumulator = Math.min(this.accumulator + budget, PLAYER.physicsStep * PLAYER.maxPhysicsSubSteps);
    let count = 0;
    while (this.accumulator + 1e-9 >= PLAYER.physicsStep && count < PLAYER.maxPhysicsSubSteps) {
      step();
      this.accumulator = Math.max(0, this.accumulator - PLAYER.physicsStep);
      count++;
    }
    return this.accumulator / PLAYER.physicsStep;
  }
}

/** 屏幕平面输入映射到相机在地面的方位，保留摇杆幅值。 */
export function cameraRelativeInput(x: number, z: number, yaw: number): MoveInput {
  const length = Math.hypot(x, z);
  if (length > 1) { x /= length; z /= length; }
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return { x: x * cos + z * sin, z: -x * sin + z * cos };
}

const UP = new THREE.Vector3(0, 1, 0);

function quaternionFromYaw(yawRad: number): RAPIER.Rotation {
  return { x: 0, y: Math.sin(yawRad / 2), z: 0, w: Math.cos(yawRad / 2) };
}

function addStaticCollider(world: RAPIER.World, spec: ColliderSpec): void {
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(spec.center[0], spec.center[1], spec.center[2]),
  );
  if (spec.kind === 'box') {
    const half = [spec.size[0] / 2, spec.size[1] / 2, spec.size[2] / 2] as const;
    const desc = RAPIER.ColliderDesc.cuboid(half[0], half[1], half[2]).setRotation(
      quaternionFromYaw(spec.yawRad),
    );
    world.createCollider(desc, body);
  } else {
    const desc = RAPIER.ColliderDesc.cylinder(spec.halfHeight, spec.radius);
    world.createCollider(desc, body);
  }
}

function shortestAngle(from: number, to: number): number {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

export function createPhysicsWorld(worldColliders: readonly ColliderSpec[], bounds: MovementBounds): RAPIER.World {
  const world = new RAPIER.World({ x: 0, y: -PLAYER.gravity, z: 0 });
  world.timestep = PLAYER.physicsStep;

  const groundBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0));
  const groundHalf = Math.max(Math.abs(bounds.min), Math.abs(bounds.max)) + 64;
  world.createCollider(RAPIER.ColliderDesc.cuboid(groundHalf, 0.5, groundHalf), groundBody);

  for (const spec of worldColliders) addStaticCollider(world, spec);
  return world;
}

export class PlayerController {
  readonly rig: PlayerRig;
  readonly world: RAPIER.World;
  readonly feet = new THREE.Vector3();
  yawRad = Math.PI;
  grounded = true;
  moving = false;
  speedRatio = 0;
  private readonly body: RAPIER.RigidBody;
  private readonly collider: RAPIER.Collider;
  private readonly character: RAPIER.KinematicCharacterController;
  private verticalVelocity = 0;
  private jumpBuffer = 0;
  private coyoteTime = 0;
  private readonly desired = new THREE.Vector3();
  private readonly movement = new THREE.Vector3();
  private readonly moveDir = new THREE.Vector3();
  private readonly velocity = new THREE.Vector3();
  private readonly previousFeet = new THREE.Vector3();
  private previousYaw = Math.PI;
  private distance = 0;
  private previousDistance = 0;
  private readonly actualVelocity = new THREE.Vector3();
  private readonly previousActualVelocity = new THREE.Vector3();
  private readonly renderVelocity = new THREE.Vector3();
  private landingId = 0;
  private landingImpact = 0;

  constructor(world: RAPIER.World, rig: PlayerRig, spawn: Vec3, spawnYaw: number, private readonly bounds: MovementBounds) {
    this.world = world;
    this.rig = rig;
    this.feet.set(spawn[0], 0, spawn[2]);
    this.yawRad = spawnYaw;
    this.previousYaw = spawnYaw;
    this.previousFeet.copy(this.feet);

    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(
      this.feet.x,
      this.feet.y + PLAYER.centerHeight,
      this.feet.z,
    );
    this.body = world.createRigidBody(bodyDesc);
    this.collider = world.createCollider(
      RAPIER.ColliderDesc.capsule(PLAYER.halfHeight, PLAYER.radius).setFriction(0.4),
      this.body,
    );

    this.character = world.createCharacterController(0.015);
    this.character.enableAutostep(0.3, 0.18, false);
    this.character.enableSnapToGround(0.35);
    this.character.setMaxSlopeClimbAngle((48 * Math.PI) / 180);
    this.character.setMinSlopeSlideAngle((35 * Math.PI) / 180);
    this.character.setApplyImpulsesToDynamicBodies(false);
    this.character.setCharacterMass(70);

    this.rig.group.position.copy(this.feet);
    this.rig.group.rotation.y = this.yawRad;
  }

  get position(): THREE.Vector3 {
    return this.feet;
  }

  get colliderHandle(): RAPIER.Collider {
    return this.collider;
  }

  stop(): void {
    this.velocity.set(0, 0, 0);
    this.moving = false;
    this.speedRatio = 0;
    this.previousFeet.copy(this.feet);
    this.previousYaw = this.yawRad;
    this.jumpBuffer = 0;
    this.actualVelocity.set(0, 0, 0);
    this.previousActualVelocity.set(0, 0, 0);
    this.previousDistance = this.distance;
  }

  requestJump(): void { this.jumpBuffer = PLAYER.jumpBufferSeconds; }

  teleport(feet: Vec3, yawRad: number): void {
    this.feet.set(feet[0], 0, feet[2]);
    this.yawRad = yawRad;
    this.verticalVelocity = 0;
    this.jumpBuffer = 0;
    this.coyoteTime = 0;
    this.grounded = true;
    this.velocity.set(0, 0, 0);
    this.previousFeet.copy(this.feet);
    this.previousYaw = yawRad;
    this.distance = this.previousDistance = 0;
    this.actualVelocity.set(0, 0, 0);
    this.previousActualVelocity.set(0, 0, 0);
    this.rig.reset?.();
    this.body.setTranslation(
      { x: this.feet.x, y: this.feet.y + PLAYER.centerHeight, z: this.feet.z },
      true,
    );
    this.body.setNextKinematicTranslation({
      x: this.feet.x,
      y: this.feet.y + PLAYER.centerHeight,
      z: this.feet.z,
    });
    this.rig.group.position.copy(this.feet);
    this.rig.group.rotation.y = this.yawRad;
  }

  update(delta: number, input: MoveInput, reducedMotion: boolean): void {
    this.previousFeet.copy(this.feet);
    this.previousYaw = this.yawRad;
    this.previousDistance = this.distance;
    this.previousActualVelocity.copy(this.actualVelocity);
    const wasGrounded = this.grounded;
    const length = Math.hypot(input.x, input.z);
    const active = length > 0.001;
    this.coyoteTime = this.grounded ? PLAYER.coyoteSeconds : Math.max(0, this.coyoteTime - delta);
    if (this.jumpBuffer > 0 && this.coyoteTime > 0) {
      this.verticalVelocity = PLAYER.jumpSpeed;
      this.grounded = false;
      this.coyoteTime = 0;
      this.jumpBuffer = 0;
    }
    this.jumpBuffer = Math.max(0, this.jumpBuffer - delta);
    this.moveDir.set(0, 0, 0);
    if (active) {
      // 归一化后保持恒定速度，斜向不会更快。
      this.moveDir.set(input.x / length, 0, input.z / length);
      this.moveDir.multiplyScalar(PLAYER.speed * Math.min(1, length));
    }
    const maxChange = (active ? PLAYER.acceleration : PLAYER.deceleration) * delta;
    const change = this.desired.copy(this.moveDir).sub(this.velocity);
    if (change.length() > maxChange) change.setLength(maxChange);
    this.velocity.add(change);
    this.desired.copy(this.velocity).multiplyScalar(delta);
    this.verticalVelocity = Math.max(this.verticalVelocity - PLAYER.gravity * delta, -30);
    this.desired.y = this.verticalVelocity * delta;
    if (this.verticalVelocity > 0) this.character.disableSnapToGround();
    else this.character.enableSnapToGround(0.35);

    this.character.computeColliderMovement(this.collider, {
      x: this.desired.x,
      y: this.desired.y,
      z: this.desired.z,
    });
    const corrected = this.character.computedMovement();
    this.movement.set(corrected.x, corrected.y, corrected.z);
    this.feet.x = THREE.MathUtils.clamp(
      this.feet.x + this.movement.x,
      this.bounds.min + PLAYER.radius,
      this.bounds.max - PLAYER.radius,
    );
    this.feet.z = THREE.MathUtils.clamp(
      this.feet.z + this.movement.z,
      this.bounds.min + PLAYER.radius,
      this.bounds.max - PLAYER.radius,
    );
    this.feet.y = Math.max(0, this.feet.y + this.movement.y);

    this.grounded = this.character.computedGrounded() && this.verticalVelocity <= 0;
    if (this.grounded && !wasGrounded) {
      this.landingId++;
      this.landingImpact = Math.max(0, -this.verticalVelocity);
    }
    if (this.verticalVelocity > 0 && this.movement.y < this.desired.y - 0.001) this.verticalVelocity = 0;
    if (this.grounded && this.verticalVelocity < 0) this.verticalVelocity = 0;

    this.body.setNextKinematicTranslation({
      x: this.feet.x,
      y: this.feet.y + PLAYER.centerHeight,
      z: this.feet.z,
    });

    this.actualVelocity.copy(this.feet).sub(this.previousFeet).setY(0).divideScalar(delta);
    const speed = this.actualVelocity.length();
    this.distance += speed * delta;
    if (speed > 0.05) {
      const targetYaw = Math.atan2(this.actualVelocity.x, this.actualVelocity.z);
      const turnLambda = reducedMotion ? 40 : PLAYER.turnLambda;
      const turn = shortestAngle(this.yawRad, targetYaw) * (1 - Math.exp(-delta * turnLambda));
      this.yawRad += THREE.MathUtils.clamp(turn, -12 * delta, 12 * delta);
    }
    this.speedRatio = Math.min(1, speed / PLAYER.speed);
    this.moving = this.speedRatio > 0.015;
  }

  render(alpha: number, delta = 0, reducedMotion = false): void {
    this.rig.group.position.lerpVectors(this.previousFeet, this.feet, alpha);
    this.rig.group.rotation.y = this.previousYaw + shortestAngle(this.previousYaw, this.yawRad) * alpha;
    this.renderVelocity.lerpVectors(this.previousActualVelocity, this.actualVelocity, alpha);
    this.rig.update(delta, {
      distance: THREE.MathUtils.lerp(this.previousDistance, this.distance, alpha),
      speed: this.renderVelocity.length(), velocity: this.renderVelocity,
      grounded: this.grounded, height: this.rig.group.position.y, verticalVelocity: this.verticalVelocity,
      landingId: this.landingId, landingImpact: this.landingImpact, reducedMotion,
    });
  }

  diagnostics(): object {
    return { feet: this.feet.toArray(), yaw: this.yawRad, moving: this.moving,
      speed: this.speedRatio * PLAYER.speed, velocity: this.velocity.toArray(),
      verticalVelocity: this.verticalVelocity, grounded: this.grounded };
  }

  /** 角色当前朝向在前方的单位向量，供相机前瞻使用。 */
  forward(): THREE.Vector3 {
    return new THREE.Vector3(Math.sin(this.yawRad), 0, Math.cos(this.yawRad));
  }

  up(): THREE.Vector3 {
    return UP.clone();
  }

  dispose(): void {
    this.world.removeCharacterController(this.character);
  }
}
