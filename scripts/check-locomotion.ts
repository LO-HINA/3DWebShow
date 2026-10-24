const { WORLD_BOUNDS } = await import('../src/worlds/cyberpunk/layout');
const { worldColliders } = await import('../src/worlds/cyberpunk/colliders');
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { WorldMaterials } from '../src/worlds/cyberpunk/materials';
Object.assign(globalThis, { document: { createElement: () => ({ width: 0, height: 0,
  getContext: () => null, toDataURL: () => '' }) } });
const { createPlayerRig } = await import('../src/engine/player/avatar');
const { PhysicsStepper, PlayerController, createPhysicsWorld } = await import('../src/engine/player/controller');
const { angleDelta, DistanceGait } = await import('../src/engine/player/gait');
const { FollowCamera } = await import('../src/engine/camera/follow');
await RAPIER.init();

type Pose = { phase: number; state: string; updates: number; maxReachError: number;
  feet: Array<{ planted: boolean; position: number[] }>; joints: Array<{ knee: number[] }> };
const material = new THREE.MeshStandardMaterial();
const materials = new Proxy({}, { get: () => material }) as WorldMaterials;
const report: Record<string, unknown> = {};

function simulate(fps: number, speed = 0.2, turns = false) {
  const world = new RAPIER.World({ x: 0, y: -24, z: 0 });
  world.timestep = 1 / 60;
  world.createCollider(RAPIER.ColliderDesc.cuboid(100, 0.5, 100).setTranslation(0, -0.5, 0));
  world.createCollider(RAPIER.ColliderDesc.cuboid(8, 3, 0.2).setTranslation(0, 3, speed > 1 ? -80 : -4));
  const rig = createPlayerRig(materials);
  const player = new PlayerController(world, rig, [0, 0, 0], Math.PI, WORLD_BOUNDS);
  const stepper = new PhysicsStepper();
  const camera = new FollowCamera(16 / 9);
  camera.reset(rig.group.position);
  const samples: object[] = [];
  const oldFeet = [new THREE.Vector3(), new THREE.Vector3()];
  const oldPlanted = [false, false];
  let slip = 0, kneeRange = 0, maxYawStep = 0, previousYaw = player.yawRad;
  let lowestSole = Infinity;
  let firstKnee: number[] | null = null;
  let blockedPhase = 0, phaseAtEnd = 0;
  for (let frame = 0; frame < fps * 8; frame++) {
    const t = frame / fps;
    let input = { x: 0, z: 0 };
    if (t > 0.3 && t < 5.5) input.z = -Math.min(1, speed);
    if (turns && t > 1.4 && t < 2.3) input = { x: speed, z: 0 };
    if (turns && t >= 2.3 && t < 3.2) input = { x: -speed, z: 0 };
    if (turns && t >= 3.2 && t < 3.6) input = { x: 0, z: 0 };
    if (turns && t >= 3.6 && t < 6.9) input = { x: 0, z: -speed };
    if (speed > 1 && frame === fps) player.requestJump();
    const alpha = stepper.advance(1 / fps, () => { player.update(1 / 60, input, false); world.step(); });
    player.render(alpha, 1 / fps);
    camera.update(1 / fps, rig.group.position, { reducedMotion: false });
    assert.equal(camera.pivot.x, rig.group.position.x);
    assert.equal(camera.pivot.z, rig.group.position.z);
    assert.ok(Math.abs(camera.pivot.y - rig.group.position.y - 1.25) < 1e-8);
    rig.group.updateMatrixWorld(true);
    const pose = rig.diagnostics!() as Pose;
    assert.equal(pose.updates, frame + 1, 'animation must update once per render, independent of physics substeps');
    assert.ok(Number.isFinite(pose.phase));
    const yaw = rig.group.rotation.y;
    maxYawStep = Math.max(maxYawStep, Math.abs(angleDelta(previousYaw, yaw)));
    previousYaw = yaw;
    for (let side = 0; side < 2; side++) {
      const ankle = rig.group.getObjectByName(side === 0 ? 'Ankle_L' : 'Ankle_R')!;
      const foot = ankle.getWorldPosition(new THREE.Vector3());
      if (pose.feet[side].planted) lowestSole = Math.min(lowestSole, new THREE.Box3().setFromObject(ankle).min.y);
      if (pose.feet[side].planted && oldPlanted[side]) {
        slip = Math.max(slip, Math.hypot(foot.x - oldFeet[side].x, foot.z - oldFeet[side].z));
      }
      oldFeet[side].copy(foot); oldPlanted[side] = pose.feet[side].planted;
    }
    if (!firstKnee) firstKnee = pose.joints[0].knee;
    kneeRange = Math.max(kneeRange, Math.abs(pose.joints[0].knee[0] - firstKnee[0]));
    if (frame === fps * 7) blockedPhase = pose.phase;
    phaseAtEnd = pose.phase;
    if (frame % Math.max(1, Math.round(fps / 15)) === 0) samples.push({ t, player: player.diagnostics(), gait: pose });
  }
  const final = rig.diagnostics!() as Pose;
  assert.equal(final.state, 'idle');
  assert.ok(Math.abs(blockedPhase - phaseAtEnd) < 1e-4, 'stopped / blocked feet must not keep marching');
  assert.ok(kneeRange > 0.02, 'knees must articulate');
  assert.ok(slip < 0.001, `planted ankle slides ${slip}m`);
  assert.ok(final.maxReachError < 0.005, `IK target out of reach ${final.maxReachError}m`);
  assert.ok(maxYawStep <= 12 / fps + 1e-6, 'turn exceeds angular speed limit');
  assert.ok(lowestSole > -0.015, `foot penetrates ground ${lowestSole}`);
  const result = { fps, analog: speed, slipMetersPerFrame: slip, kneeRange, maxYawStep,
    maxReachError: final.maxReachError, lowestSole, finalPhase: final.phase, samples };
  player.dispose(); world.free(); rig.dispose();
  return result;
}

const slow = simulate(60, 0.2);
const turning = simulate(60, 0.2, true);
const run = simulate(60, 1.1);
const rates = [30, 60, 144].map(fps => simulate(fps, 0.2));
assert.ok(Math.abs(angleDelta(Math.PI - 0.01, -Math.PI + 0.01) - 0.02) < 1e-8);
report.slowWalk = slow;
report.turn90AndReverse = turning;
report.runAndJump = run;
report.frameRates = rates.map(({ samples: _, ...rest }) => rest);
const distancePhases = [30, 60, 144].map(fps => {
  const gait = new DistanceGait();
  const root = new THREE.Vector3();
  const motion = { distance: 0, speed: 1.2, velocity: { x: 0, z: 1.2 }, grounded: true,
    height: 0, verticalVelocity: 0, landingId: 0, landingImpact: 0, reducedMotion: true };
  gait.update(0, root, 0, motion);
  for (let frame = 0; frame < 4 * fps; frame++) {
    motion.distance += 1.2 / fps;
    root.z += 1.2 / fps;
    gait.update(1 / fps, root, 0, motion);
  }
  return gait.phase;
});
assert.ok(distancePhases.every(phase => Math.abs(phase - distancePhases[0]) < 1e-8));
report.distanceDrivenPhase = { phases: distancePhases, reducedMotionPreservesEssentialGait: true };
// Check the recording route against the current map's real colliders, without altering the map.
const routeWorld = createPhysicsWorld(worldColliders, WORLD_BOUNDS);
const routeRig = createPlayerRig(materials);
const routePlayer = new PlayerController(routeWorld, routeRig, [-9, 0, 6], Math.PI, WORLD_BOUNDS);
const routeInputs = [
  [0, 0, 1], [0, -0.2, 1.2], [0.2, 0, 0.7], [-0.2, 0, 1.2],
  [0, 0, 0.6], [-0.2, 0, 4.6], [0, 0, 0.7],
];
for (const [x, z, seconds] of routeInputs) for (let frame = 0; frame < seconds * 60; frame++) {
  routePlayer.update(1 / 60, { x, z }, false);
  routeWorld.step();
  routePlayer.render(1, 1 / 60);
}
assert.ok(routePlayer.position.x < -12.5, 'review route is blocked before the intended wall');
assert.ok(routePlayer.speedRatio < 0.01);
assert.equal((routeRig.diagnostics!() as Pose).state, 'idle');
report.recordingRoutePhysics = { position: routePlayer.position.toArray(), gait: routeRig.diagnostics!(),
  note: 'route verified against actual map colliders; browser recording remains pending' };
routePlayer.dispose(); routeWorld.free(); routeRig.dispose();
mkdirSync('docs/locomotion-review', { recursive: true });
writeFileSync('docs/locomotion-review/logic-checks.json', JSON.stringify(report, null, 2));
for (const [name, value] of Object.entries(report)) {
  console.log(name, Array.isArray(value) ? value : { ...value as object, samples: undefined });
}
