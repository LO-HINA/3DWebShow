import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { ColliderSpec, Vec3 } from '../config/types';
import { PLAYER, WORLD_BOUNDS, worldColliders } from '../config/world';
import type { PlayerRig } from './player';

export interface MoveInput {
  x: number;
  z: number;
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

export function createPhysicsWorld(): RAPIER.World {
  const world = new RAPIER.World({ x: 0, y: -24, z: 0 });
  world.timestep = PLAYER.physicsStep;

  const groundBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0));
  world.createCollider(RAPIER.ColliderDesc.cuboid(40, 0.5, 40), groundBody);

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
  private readonly desired = new THREE.Vector3();
  private readonly movement = new THREE.Vector3();
  private readonly moveDir = new THREE.Vector3();

  constructor(world: RAPIER.World, rig: PlayerRig, spawn: Vec3, spawnYaw: number) {
    this.world = world;
    this.rig = rig;
    this.feet.set(spawn[0], 0, spawn[2]);
    this.yawRad = spawnYaw;

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

  teleport(feet: Vec3, yawRad: number): void {
    this.feet.set(feet[0], 0, feet[2]);
    this.yawRad = yawRad;
    this.verticalVelocity = 0;
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
    const length = Math.hypot(input.x, input.z);
    const active = length > 0.001;
    this.moving = active;
    this.speedRatio = active ? Math.min(1, length) : 0;

    if (active) {
      // 归一化后保持恒定速度，斜向不会更快。
      this.moveDir.set(input.x / length, 0, input.z / length);
      const targetYaw = Math.atan2(this.moveDir.x, this.moveDir.z);
      const turnLambda = reducedMotion ? 18 : 12;
      this.yawRad += shortestAngle(this.yawRad, targetYaw) * Math.min(1, delta * turnLambda);
      this.desired.set(
        this.moveDir.x * PLAYER.speed * delta,
        this.verticalVelocity * delta,
        this.moveDir.z * PLAYER.speed * delta,
      );
    } else {
      this.desired.set(0, this.verticalVelocity * delta, 0);
    }

    this.verticalVelocity = Math.max(this.verticalVelocity - 24 * delta, -20);

    this.character.computeColliderMovement(this.collider, {
      x: this.desired.x,
      y: this.desired.y,
      z: this.desired.z,
    });
    const corrected = this.character.computedMovement();
    this.movement.set(corrected.x, corrected.y, corrected.z);
    this.feet.x = THREE.MathUtils.clamp(
      this.feet.x + this.movement.x,
      WORLD_BOUNDS.min + PLAYER.radius,
      WORLD_BOUNDS.max - PLAYER.radius,
    );
    this.feet.z = THREE.MathUtils.clamp(
      this.feet.z + this.movement.z,
      WORLD_BOUNDS.min + PLAYER.radius,
      WORLD_BOUNDS.max - PLAYER.radius,
    );
    this.feet.y = Math.max(0, this.feet.y + this.movement.y);

    this.grounded = this.character.computedGrounded();
    if (this.grounded && this.verticalVelocity < 0) this.verticalVelocity = 0;

    this.body.setNextKinematicTranslation({
      x: this.feet.x,
      y: this.feet.y + PLAYER.centerHeight,
      z: this.feet.z,
    });

    this.rig.group.position.copy(this.feet);
    this.rig.group.rotation.y = this.yawRad;
    this.rig.update(delta, this.speedRatio, active, reducedMotion);
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
