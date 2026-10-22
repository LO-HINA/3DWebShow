const { WORLD_BOUNDS } = await import('../src/worlds/cyberpunk/layout');
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

// Canvas artwork creation is irrelevant to physics/math checks; no rendered evidence is produced here.
Object.assign(globalThis, { document: { createElement: () => ({ width: 0, height: 0,
  getContext: () => null, toDataURL: () => '' }) } });
const { FollowCamera } = await import('../src/engine/camera/follow');
const { PhysicsStepper, PlayerController, cameraRelativeInput } = await import('../src/engine/player/controller');
const { validateCamera, createSnapshot, loadSnapshot, saveSnapshot } = await import('../src/worlds/cyberpunk/session');
const { CAMERA } = await import('../src/engine/camera/settings');
const { PLAYER } = await import('../src/engine/player/settings');
const { SNAPSHOT_KEY } = await import('../src/worlds/cyberpunk/layout');
await RAPIER.init();
const results: Record<string, unknown> = {};
const close = (a: number, b: number, epsilon = 1e-5) => assert.ok(Math.abs(a - b) < epsilon, `${a} != ${b}`);

for (const yaw of [0, Math.PI / 2, -Math.PI / 2, Math.PI]) {
  const forward = cameraRelativeInput(0, -1, yaw);
  close(forward.x, -Math.sin(yaw)); close(forward.z, -Math.cos(yaw));
  const diagonal = cameraRelativeInput(1, -1, yaw);
  close(Math.hypot(diagonal.x, diagonal.z), 1);
}
close(Math.hypot(...Object.values(cameraRelativeInput(0.2, -0.3, 1))), Math.hypot(0.2, 0.3));
results.cameraRelativeMovement = 'four headings, diagonal normalization and analog magnitude passed';

function fixture() {
  const world = new RAPIER.World({ x: 0, y: -24, z: 0 });
  world.timestep = 1 / 60;
  world.createCollider(RAPIER.ColliderDesc.cuboid(50, 0.5, 50).setTranslation(0, -0.5, 0));
  const rig = { group: new THREE.Group(), update: () => {}, dispose: () => {} };
  const player = new PlayerController(world, rig, [0, 0, 0], Math.PI, WORLD_BOUNDS);
  const step = (input: { x: number; z: number; sprint?: boolean } = { x: 0, z: 0 }) => { player.update(1 / 60, input, false); world.step(); };
  return { world, rig, player, step, dispose: () => { player.dispose(); world.free(); } };
}

const f = fixture();
f.step({ x: 0, z: -1 });
assert.ok(f.player.position.z < 0);
for (let i = 1; i < 6; i++) f.step({ x: 0, z: -1 });
close(f.player.speedRatio * PLAYER.speed, PLAYER.speed, 0.01);
const stopStart = f.player.position.clone();
const stopSteps = Math.ceil(PLAYER.speed / PLAYER.deceleration / PLAYER.physicsStep);
for (let i = 0; i < stopSteps; i++) f.step();
const stopDistance = stopStart.distanceTo(f.player.position);
assert.ok(stopDistance <= PLAYER.speed ** 2 / (2 * PLAYER.deceleration), `stop drift ${stopDistance}`);
assert.equal(f.player.moving, false);
const stopped = f.player.position.clone();
for (let i = 0; i < 20; i++) f.step();
close(Math.hypot(stopped.x - f.player.position.x, stopped.z - f.player.position.z), 0);
results.response = { speed: PLAYER.speed, sprintSpeed: PLAYER.sprintSpeed,
  fullSpeedWithinSeconds: 0.1, stoppedWithinSeconds: stopSteps / 60, stopDistanceMeters: stopDistance };
f.step({ x: 1, z: 0 });
const paused = f.player.position.clone();
f.player.stop();
f.step();
close(Math.hypot(paused.x - f.player.position.x, paused.z - f.player.position.z), 0);
f.dispose();

const distances: Record<string, number> = {};
for (const fps of [1, 2, 5, 10, 20, 30, 60, 144]) {
  const sim = fixture();
  const timer = new PhysicsStepper();
  for (let frame = 0; frame < fps * 2; frame++) {
    const alpha = timer.advance(1 / fps, () => sim.step({ x: 0, z: -1 }));
    sim.player.render(alpha);
  }
  distances[fps] = -sim.player.position.z;
  assert.ok(distances[fps] > 11.5, `slow at ${fps}fps: ${distances[fps]}`);
  sim.dispose();
}
for (const distance of Object.values(distances)) close(distance, distances[60]);
const timer = new PhysicsStepper();
let longStallSteps = 0;
timer.advance(30, () => longStallSteps++);
assert.equal(longStallSteps, PLAYER.maxPhysicsSubSteps);
timer.reset();
timer.advance(0, () => assert.fail('unexpected background catchup'));
results.lowFpsTravel = { seconds: 2, distances, longStallSteps };

const sprint = fixture();
for (let i = 0; i < 60; i++) sprint.step({ x: 1, z: 0, sprint: true });
close(sprint.player.speedRatio * PLAYER.speed, PLAYER.sprintSpeed, 0.01);
assert.ok(sprint.player.position.x > 9);
const sprintDistance = sprint.player.position.x;
sprint.dispose();
results.sprint = { speed: PLAYER.sprintSpeed, oneSecondDistance: sprintDistance };

const jumping = fixture();
for (let i = 0; i < 6; i++) jumping.step();
assert.ok(jumping.player.grounded);
jumping.player.requestJump();
jumping.step();
assert.ok(jumping.player.position.y > 0.1 && !jumping.player.grounded);
let peak = jumping.player.position.y;
for (let i = 0; i < 65; i++) {
  if (i === 8) jumping.player.requestJump(); // An airborne press must not create a second jump.
  jumping.step({ x: 1, z: 0 });
  peak = Math.max(peak, jumping.player.position.y);
}
assert.ok(peak > 1.15 && peak < 1.4, `jump height ${peak}`);
assert.ok(jumping.player.grounded && jumping.player.position.y < 0.04);
assert.ok(jumping.player.position.x > 5);
jumping.player.requestJump();
jumping.step();
assert.ok(jumping.player.position.y > 0.1 && !jumping.player.grounded, 'cannot jump again after landing');
jumping.dispose();

const ceiling = fixture();
ceiling.world.createCollider(RAPIER.ColliderDesc.cuboid(4, 0.1, 4).setTranslation(0, 2.2, 0));
for (let i = 0; i < 6; i++) ceiling.step();
ceiling.player.requestJump();
let ceilingPeak = 0;
for (let i = 0; i < 70; i++) {
  ceiling.step();
  ceilingPeak = Math.max(ceilingPeak, ceiling.player.position.y);
}
assert.ok(ceilingPeak > 0.2 && ceilingPeak < 0.51, `ceiling penetration ${ceilingPeak}`);
assert.ok(ceiling.player.grounded);
ceiling.dispose();
results.jump = { heightMeters: peak, ceilingLimitedHeightMeters: ceilingPeak,
  checks: 'takeoff, air steering, no double jump, landing, repeat after landing, ceiling collision' };

// Real Rapier collision and wall sliding, including animation speed when blocked.
const wall = fixture();
wall.world.createCollider(RAPIER.ColliderDesc.cuboid(8, 3, 0.2).setTranslation(0, 3, -3));
for (let i = 0; i < 120; i++) wall.step({ x: 0, z: -1 });
assert.ok(wall.player.position.z > -2.53);
assert.ok(wall.player.speedRatio < 0.01);
const slideStart = wall.player.position.clone();
for (let i = 0; i < 60; i++) wall.step(cameraRelativeInput(1, -1, 0));
assert.ok(wall.player.position.x - slideStart.x > 2);
assert.ok(wall.player.position.z > -2.53);
results.wallSlide = 'capsule blocked; actual speed zero; diagonal input slides along wall';
wall.dispose();

const camera = new FollowCamera(1440 / 900);
const feet = new THREE.Vector3(0, 0, 6.5);
const framing: object[] = [];
for (const preset of ['low', 'medium', 'high'] as const) {
  camera.reset(feet);
  camera.setFraming(preset);
  for (let i = 0; i < 120; i++) { camera.update(1 / 60, feet, { reducedMotion: false }); camera.resolveCollision(null, 1 / 60); }
  camera.camera.updateMatrixWorld();
  const center = feet.clone().add(new THREE.Vector3(0, 0.8, 0)).project(camera.camera);
  const screenY = (1 - center.y) / 2;
  assert.ok(screenY > 0.5 && screenY < 0.85, `${preset} screenY=${screenY}`);
  framing.push({ preset, screenY, camera: camera.camera.position.toArray() });
}
results.framingMathOnly = framing;

camera.reset(feet);
camera.orbit(120, 35); camera.zoom(-100);
const follow = camera.snapshot();
camera.toggleLookUp(); camera.orbit(-220, -60); camera.zoom(150);
camera.update(1, feet, { reducedMotion: true });
camera.resolveCollision(null, 1, true);
assert.ok(camera.look.y > feet.y + 2.5);
camera.toggleLookUp();
const after = camera.snapshot();
close(after.yaw, follow.yaw); close(after.pitch, follow.pitch); close(after.distance, follow.distance);
results.lookUpRestore = 'yaw, pitch and distance preserved independently';

const rateStates: number[][] = [];
for (const fps of [30, 60, 144]) {
  const follow = new FollowCamera(16 / 10);
  follow.reset(feet);
  follow.orbit(200, 40);
  follow.zoom(150);
  for (let i = 0; i < fps; i++) {
    const movingFeet = feet.clone().add(new THREE.Vector3((i + 1) * 3.2 / fps, 0, 0));
    follow.update(1 / fps, movingFeet, { reducedMotion: false });
    follow.resolveCollision(null, 1 / fps);
    close(follow.pivot.x, movingFeet.x);
    close(follow.look.x - follow.camera.position.x, follow.viewDirection.x * 10);
  }
  rateStates.push(follow.desiredPosition.toArray());
}
for (let i = 1; i < rateStates.length; i++) for (let axis = 0; axis < 3; axis++) close(rateStates[i][axis], rateStates[0][axis]);
results.frameRateIndependence = '30/60/144fps orbit converges identically; moving player anchor has no extra position damping';

// Sweep a 0.3m camera sphere against a real Rapier wall, then recover smoothly.
const collision = fixture();
collision.world.createCollider(RAPIER.ColliderDesc.cuboid(5, 5, 0.2).setTranslation(0, 5, 5));
collision.world.step();
camera.reset(new THREE.Vector3());
camera.update(1 / 60, new THREE.Vector3(), { reducedMotion: false });
const direction = camera.desiredPosition.clone().sub(camera.pivot).normalize();
const hit = collision.world.castShape(camera.pivot, { x: 0, y: 0, z: 0, w: 1 }, direction,
  new RAPIER.Ball(CAMERA.collisionRadius), 0, 10, true, undefined, undefined, collision.player.colliderHandle);
assert.ok(hit);
camera.resolveCollision(hit.time_of_impact, 1 / 60);
assert.ok(camera.camera.position.z < 4.51);
const contracted = camera.camera.position.distanceTo(camera.pivot);
camera.resolveCollision(null, 1 / 60);
const recovering = camera.camera.position.distanceTo(camera.pivot);
assert.ok(recovering > contracted && recovering < 8.5);
results.cameraCollision = { contracted, firstRecoveryLength: recovering };
collision.dispose();

const memory = new Map<string, string>();
Object.assign(globalThis, { sessionStorage: { setItem: (k: string, v: string) => memory.set(k, v),
  getItem: (k: string) => memory.get(k) ?? null } });
saveSnapshot([0, 0, 6.5], Math.PI, 'E-01', follow);
assert.deepEqual(loadSnapshot()?.camera, follow);
const legacy = createSnapshot([0, 0, 6.5], Math.PI);
memory.set(SNAPSHOT_KEY, JSON.stringify({ ...legacy, camera: { mode: 'follow', offset: [0, 11, 14] } }));
assert.equal(loadSnapshot()?.camera.framing, 'medium');
const malformed = validateCamera({ yaw: NaN, pitch: Infinity, distance: -500, lookUpYaw: NaN });
assert.ok(Object.values(malformed).every(v => typeof v !== 'number' || Number.isFinite(v)));
assert.equal(malformed.distance, CAMERA.minDistance);
results.snapshot = 'new camera round-trip, legacy migration, malformed numeric bounds passed';

mkdirSync('docs/camera-review', { recursive: true });
writeFileSync('docs/camera-review/logic-checks.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
