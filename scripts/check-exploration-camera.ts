import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
Object.assign(globalThis, { document: { createElement: () => ({ width: 0, height: 0,
  getContext: () => null, toDataURL: () => '' }) } });
const { FollowCamera } = await import('../src/engine/camera/follow');
const { CameraCollision } = await import('../src/engine/camera/collision');
const { AvatarFade } = await import('../src/engine/camera/avatarFade');
const { validateCamera } = await import('../src/worlds/cyberpunk/session');
const { CAMERA } = await import('../src/engine/camera/settings');
// Read the movement interface for regression checks; this script never modifies it.
const { cameraRelativeInput } = await import('../src/engine/player/controller');
await RAPIER.init();
const ID = { x: 0, y: 0, z: 0, w: 1 };
const report: Record<string, unknown> = {};
const close = (a: number, b: number, tolerance = 1e-5) => assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);

function setup(groundY = 0) {
  const world = new RAPIER.World({ x: 0, y: -24, z: 0 });
  world.createCollider(RAPIER.ColliderDesc.cuboid(100, 0.5, 100).setTranslation(0, groundY - 0.5, 0));
  const exclude = world.createCollider(RAPIER.ColliderDesc.capsule(0.52, 0.28).setTranslation(0, groundY + 0.8, 0));
  world.step();
  const feet = new THREE.Vector3(0, groundY, 0);
  const follow = new FollowCamera(16 / 9);
  follow.reset(feet);
  const collision = new CameraCollision();
  const frame = (delta = 1 / 60) => {
    follow.update(delta, feet, { reducedMotion: false });
    collision.update(world, follow, exclude, delta);
  };
  const safe = () => {
    const hit = world.intersectionWithShape(follow.camera.position, ID,
      new RAPIER.Ball(follow.sweepRadius - 0.005), RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, exclude);
    assert.equal(hit, null, `camera volume overlaps collider ${hit?.handle}`);
  };
  return { world, exclude, feet, follow, collision, frame, safe };
}

for (const height of [0, 2]) {
  const t = setup(height);
  const samples: object[] = [];
  for (let i = 0; i < 150; i++) {
    t.follow.orbit(0, -3);
    t.frame();
    t.safe();
    const direction = t.follow.camera.getWorldDirection(new THREE.Vector3());
    assert.ok(direction.distanceTo(t.follow.viewDirection) < 1e-6, 'ground clamp overwrote the view ray');
    if (i % 15 === 0) samples.push(t.follow.diagnostics(t.feet));
  }
  close(t.follow.camera.position.y, height + CAMERA.groundClearance, 0.015);
  assert.ok(t.follow.viewDirection.y > 0.95, 'cannot look clearly upward after reaching the ground');
  for (const x of [-1, 1]) for (const y of [-1, 1]) {
    const nearCorner = new THREE.Vector3(x, y, -1).unproject(t.follow.camera);
    assert.ok(nearCorner.y >= height, 'near clipping plane intersects the floor');
  }
  const yaw = t.follow.movementYaw;
  const movement = cameraRelativeInput(0, -1, yaw);
  t.follow.orbit(0, 1000);
  for (let i = 0; i < 90; i++) t.frame();
  assert.ok(t.follow.viewDirection.y < -0.95, 'cannot look down');
  close(cameraRelativeInput(0, -1, t.follow.movementYaw).x, movement.x);
  close(cameraRelativeInput(0, -1, t.follow.movementYaw).z, movement.z);
  report[`ground_${height}`] = { samples, upwardAndDownwardDrag: true, nearPlaneClear: true,
    skyMovementStable: true };
  t.world.free();
}

const wide = setup();
wide.follow.resize(12);
wide.follow.orbit(0, -1000);
for (let i = 0; i < 120; i++) { wide.frame(); wide.safe(); }
assert.ok(wide.follow.sweepRadius > CAMERA.collisionRadius, 'wide near plane did not enlarge collision volume');
close(wide.follow.camera.position.y, wide.follow.clearance, 0.01);
for (const x of [-1, 1]) for (const y of [-1, 1]) {
  assert.ok(new THREE.Vector3(x, y, -1).unproject(wide.follow.camera).y >= 0);
}
report.wideNearPlane = { aspect: 12, radius: wide.follow.sweepRadius, clearance: wide.follow.clearance };
wide.world.free();

// 真实地面碰撞下逐步抬头：触地后连续靠近、保持净空，反拖恢复原取景。
const approachSamples: object[] = [];
for (const height of [0, 2]) for (const fps of [30, 60, 120]) {
  const t = setup(height);
  const avatar = new THREE.Group();
  const material = new THREE.MeshStandardMaterial();
  avatar.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1), material));
  const fading = new AvatarFade(avatar);
  let previousDistance = Infinity;
  let previousOpacity = 1;
  const samples: object[] = [];
  for (const degrees of [15, 25, 35, 45, 55, 65, 75, 85]) {
    const saved = t.follow.snapshot();
    t.follow.reset(t.feet, { ...saved, pitch: -degrees * Math.PI / 180 });
    for (let i = 0; i < fps; i++) {
      t.frame(1 / fps); t.safe();
      fading.update(1 / fps, t.follow.camera, t.feet);
    }
    const distance = Math.hypot(t.follow.camera.position.x, t.follow.camera.position.z);
    const opacity = (fading.diagnostics() as { opacity: number }).opacity;
    assert.ok(distance <= previousDistance + 1e-5, 'ground approach moved away from the feet');
    assert.ok(opacity <= previousOpacity + 0.001, 'avatar became opaque while approaching');
    close(t.follow.camera.position.y, height + CAMERA.groundClearance, 0.015);
    previousDistance = distance; previousOpacity = opacity;
    samples.push({ degrees, distance, opacity });
  }
  close(previousDistance, CAMERA.groundApproachDistance, 0.01);
  assert.ok(previousOpacity < 0.01, 'avatar did not fade at the feet');
  t.follow.orbit(0, 1000);
  t.follow.setFraming('medium');
  for (let i = 0; i < fps * 3; i++) {
    t.frame(1 / fps); t.safe(); fading.update(1 / fps, t.follow.camera, t.feet);
  }
  close(t.follow.snapshot().distance, CAMERA.framings.medium.distance);
  close((fading.diagnostics() as { opacity: number }).opacity, 1, 0.001);
  approachSamples.push({ height, fps, samples, restored: true });
  fading.dispose(); material.dispose();
  t.world.free();
}
report.groundApproach = approachSamples;

const corner = setup();
corner.world.createCollider(RAPIER.ColliderDesc.cuboid(0.35, 4, 5).setTranslation(-3, 4, 0));
corner.world.createCollider(RAPIER.ColliderDesc.cuboid(4, 4, 0.35).setTranslation(0, 4, -3));
corner.world.step();
let hitFrames = 0, temporalFrames = 0;
for (let i = 0; i < 240; i++) {
  corner.follow.orbit(-9, i < 80 ? -1.5 : 0);
  corner.frame(); corner.safe();
  const stats = corner.collision.diagnostics() as { primaryHit: number | null; temporalHit: number | null };
  if (stats.primaryHit !== null) hitFrames++;
  if (stats.temporalHit !== null) temporalFrames++;
}
assert.ok(hitFrames > 20);
// Hold a blocked direction, then remove the obstacle and check smooth arm recovery.
corner.follow.snapTo(-Math.PI / 2, 0.05, 8.5, corner.feet);
corner.frame(); corner.safe();
const before = corner.follow.resolvedLength;
const colliders: RAPIER.Collider[] = [];
corner.world.forEachCollider(collider => {
  if (collider !== corner.exclude && collider.translation().y > 1) colliders.push(collider);
});
for (const collider of colliders) corner.world.removeCollider(collider, true);
corner.world.step();
corner.frame();
const recovery = corner.follow.resolvedLength;
assert.ok(before < recovery && recovery < 8.5 && recovery - before < 0.8);
for (let i = 0; i < 100; i++) { corner.frame(); corner.safe(); }
close(corner.follow.resolvedLength, 8.5, 0.001);
report.cornerVolume = { hitFrames, temporalFrames, contractedLength: before, nextRecoveryLength: recovery };
corner.world.free();

// 移动中的碰撞回归：角色贴着建筑外墙走、绕过墙角，再离开障碍。
// 相机必须在每一帧跟随角色当前位置，不能停留在上一帧的世界坐标。
const moving = setup();
moving.world.createCollider(RAPIER.ColliderDesc.cuboid(4, 4, 4).setTranslation(0, 4, 0));
moving.world.step();
const movingFeet = new THREE.Vector3(4.28, 0, 0);
moving.follow.reset(movingFeet);
// 镜臂朝东，正对建筑；角色绕到哪一面，都对着一堵墙或墙角。
moving.follow.snapTo(Math.PI / 2, 0.22, CAMERA.framings.medium.distance, movingFeet);
const previousCamera = moving.follow.camera.position.clone();
const previousFeet = movingFeet.clone();
let movingStalls = 0, movingTemporal = 0, movingMaxGap = 0;
const radius = 4.28;
const perimeter = radius * 8;
for (let i = 0; i < 720; i++) {
  // 逆时针绕建筑一周，距墙面 0.28m（与角色胶囊半径一致）。
  const s = (i * 0.03) % perimeter;
  const side = Math.min(3, Math.floor(s / (radius * 2)));
  const t = s % (radius * 2);
  if (side === 0) movingFeet.set(radius, 0, -radius + t);
  else if (side === 1) movingFeet.set(radius - t, 0, radius);
  else if (side === 2) movingFeet.set(-radius, 0, radius - t);
  else movingFeet.set(-radius + t, 0, -radius);
  moving.follow.update(1 / 60, movingFeet, { reducedMotion: false });
  moving.collision.update(moving.world, moving.follow, moving.exclude, 1 / 60);
  const stats = moving.collision.diagnostics() as { temporalHit: number | null };
  if (stats.temporalHit !== null) movingTemporal++;
  const feetMoved = Math.hypot(movingFeet.x - previousFeet.x, movingFeet.z - previousFeet.z);
  const cameraMoved = Math.hypot(moving.follow.camera.position.x - previousCamera.x,
    moving.follow.camera.position.z - previousCamera.z);
  if (feetMoved > 0.005 && cameraMoved < 1e-5) movingStalls++;
  movingMaxGap = Math.max(movingMaxGap, Math.hypot(moving.follow.camera.position.x - moving.follow.pivot.x,
    moving.follow.camera.position.z - moving.follow.pivot.z));
  previousCamera.copy(moving.follow.camera.position);
  previousFeet.copy(movingFeet);
}
assert.equal(movingStalls, 0, 'camera stayed at a fixed world position while the character moved');
assert.ok(movingMaxGap <= CAMERA.framings.medium.distance + 0.01, 'moving camera left the current arm');
// 离开建筑后，镜臂应平滑恢复到用户设定的距离。
for (let i = 0; i < 420; i++) {
  movingFeet.z += 0.04;
  moving.follow.update(1 / 60, movingFeet, { reducedMotion: false });
  moving.collision.update(moving.world, moving.follow, moving.exclude, 1 / 60);
}
close(moving.follow.resolvedLength, CAMERA.framings.medium.distance, 0.05);
report.movingCollision = { frames: 720, movingStalls, movingTemporal, movingMaxGap,
  recoveredLength: moving.follow.resolvedLength };
moving.world.free();

const root = new THREE.Group();
const source = new THREE.MeshStandardMaterial();
const sharedCityMesh = new THREE.Mesh(new THREE.BoxGeometry(), source);
const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1), source);
body.castShadow = true;
root.add(body);
const shadowSource = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55, depthWrite: false });
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(), shadowSource); root.add(shadow);
const fade = new AvatarFade(root);
const cam = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 200);
const feet = new THREE.Vector3();
function tickFade(position: THREE.Vector3, look: THREE.Vector3, frames = 60) {
  cam.position.copy(position); cam.lookAt(look); cam.updateMatrixWorld();
  for (let i = 0; i < frames; i++) fade.update(1 / 60, cam, feet);
  return fade.diagnostics() as { fading: boolean; opacity: number };
}
let state = tickFade(new THREE.Vector3(0, 0.4, 8), new THREE.Vector3(0, 20, -15));
assert.equal(state.fading, false, 'low camera unconditionally hides the character'); close(state.opacity, 1);
// 大幅仰视构图：只弱化，不隐藏；并确认写入的是角色实际引用的克隆材质。
state = tickFade(new THREE.Vector3(0, 0.4, 8),
  new THREE.Vector3(0, 0.4 + 10 * Math.sin(85 * Math.PI / 180), 8 - 10 * Math.cos(85 * Math.PI / 180)), 120);
assert.equal((state as unknown as { reason: string }).reason, '仰视构图');
close(state.opacity, CAMERA.avatarFade.upLookOpacity, 0.001);
close((body.material as THREE.Material).opacity, state.opacity, 0.001);
close(source.opacity, 1);
state = tickFade(new THREE.Vector3(0, 0.4, 8), new THREE.Vector3(0, 20, -15));
assert.equal(state.fading, false, 'upward composition fade did not recover');
close(state.opacity, 1);
state = tickFade(new THREE.Vector3(0, 1, 2), new THREE.Vector3(0, 1, 0));
assert.equal(state.fading, true, 'central character occlusion did not fade'); assert.ok(state.opacity < 0.08);
state = tickFade(new THREE.Vector3(0.3, 0.8, 0), new THREE.Vector3(0.3, 0.8, 10));
assert.ok(state.opacity < 0.001, 'inside the avatar must fade fully');
for (const distance of [0.72, 0.95, 0.73, 0.9]) {
  state = tickFade(new THREE.Vector3(distance, 0.8, 0), new THREE.Vector3(distance, 0.8, 10), 1);
  assert.equal(state.fading, true, 'hysteresis did not hold');
}
state = tickFade(new THREE.Vector3(3.2, 0.8, 0), new THREE.Vector3(3.2, 0.8, 10));
assert.equal(state.fading, false); assert.ok(state.opacity > 0.99);
close(source.opacity, 1); assert.equal(source.transparent, false); assert.equal(source.depthWrite, true);
assert.equal(sharedCityMesh.material, source);
shadowSource.opacity = 0.31; fade.update(1 / 60, cam, feet);
close((shadow.material as THREE.Material).opacity, 0.31 * state.opacity, 0.002);
fade.dispose(); assert.equal(body.material, source); assert.equal(shadow.material, shadowSource);
assert.equal(body.castShadow, true);
report.avatarFade = { nearAndCenterTriggers: true, lowCameraStaysVisible: true,
  upLookComposition: true, actualMaterialOpacity: true,
  distinctEnterExitThresholds: true, cityMaterialsUntouched: true, animatedShadowPreserved: true };

const legacy = validateCamera({ mode: 'follow', pitch: 20 * Math.PI / 180, distance: 8.5 });
assert.equal(legacy.orientationVersion, 2);
assert.ok(legacy.pitch > 0.2 && legacy.pitch < 0.3);
const restored = validateCamera({ ...legacy, pitch: -1.2, orientationVersion: 2, distance: 0.4 });
close(restored.pitch, -1.2); close(restored.distance, 0.4);
const reset = setup(); reset.follow.orbit(800, -500); reset.follow.zoom(-200);
reset.follow.reset(reset.feet); reset.frame();
close(reset.follow.snapshot().yaw, 0); close(reset.follow.snapshot().pitch, CAMERA.framings.medium.pitch);
report.snapshotAndReset = { oldPitchMigrated: true, upwardPitchRestored: true, resetDefault: true };
reset.world.free();
mkdirSync('docs/exploration-camera-review', { recursive: true });
writeFileSync('docs/exploration-camera-review/logic-checks.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ status: 'passed', checks: Object.keys(report), corner: report.cornerVolume }, null, 2));
