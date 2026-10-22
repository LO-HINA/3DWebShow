import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import RAPIER from '@dimforge/rapier3d-compat';
import { plazaScreen, WORLD_BOUNDS } from '../src/worlds/cyberpunk/layout';
import { worldColliders } from '../src/worlds/cyberpunk/colliders';
import { createPlazaScreenColliders, fitScreenImage, screenDimensions } from '../src/worlds/cyberpunk/props/plazaScreenConfig';
import { createPhysicsWorld } from '../src/engine/player/controller';

await RAPIER.init();
const world = createPhysicsWorld(worldColliders, WORLD_BOUNDS);
world.step();
const identity = { x: 0, y: 0, z: 0, w: 1 };
const north = { x: 0, y: 0, z: -1 };
const capsule = new RAPIER.Capsule(0.5, 0.3);
const walk = (x: number) => world.castShape({ x, y: 0.83, z: -3 }, identity, north, capsule, 0, 7, true);
assert.equal(walk(0), null, 'screen must leave central passage open');
assert.equal(walk(-5), null, 'west bypass must stay open');
assert.equal(walk(5), null, 'east bypass must stay open');
assert.ok(walk(screenDimensions(plazaScreen).supportX), 'support must block player');
assert.ok(world.castShape({ x: 0, y: 4, z: -3 }, identity, north, new RAPIER.Ball(0.28), 0, 7, true),
  'screen body must block the camera');
assert.ok(worldColliders.some(c => c.id === 'LM-01:base'), 'existing sculpture retained');
const rotated = createPlazaScreenColliders({ ...plazaScreen, position: [10, 2, 20], yawRad: Math.PI / 2 });
const foot = rotated.find(c => c.id.endsWith('foot-1'))!;
assert.ok(Math.abs(foot.center[0] - 10) < 1e-6);
assert.ok(Math.abs(foot.center[2] - (20 - plazaScreen.width * 0.36)) < 1e-6);
assert.equal(foot.center[1], 2.09);
assert.deepEqual(fitScreenImage(8, 4.5, 1600, 900), [8, 4.5]);
assert.deepEqual(fitScreenImage(8, 4.5, 900, 1600), [2.53125, 4.5]);
assert.deepEqual(fitScreenImage(8, 4.5, 2000, 500), [8, 2]);
world.free();
const report = { status: 'passed', note: 'Rapier and configuration checks; no rendered image evidence',
  centralAndSidePassages: true, supportAndScreenCollision: true, sculptureRetained: true,
  rotatedTranslatedColliders: true, imageAspectPreserved: true, spec: plazaScreen };
mkdirSync('docs/plaza-screen-review', { recursive: true });
writeFileSync('docs/plaza-screen-review/logic-checks.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
