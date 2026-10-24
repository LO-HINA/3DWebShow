import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const URL = process.env.LOHINA_URL ?? 'http://127.0.0.1:5173/world';
const OUT = '.camera-preview/camera-follow';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.on('pageerror', (error) => console.log('[pageerror]', error.message));
page.on('console', (message) => {
  if (message.type() === 'error') console.log('[console]', message.text());
});

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.intro, .screen--fallback', { timeout: 180000 });
await page.locator('.intro__actions button').click();
await page.waitForTimeout(1800);

// E-03 西墙外侧 2m；镜头在角色东侧，初始镜臂被建筑压缩。
// 角色沿西墙向北走过西北墙角，沿北墙向东、折返向西回到墙角，
// 再沿西墙向南，最后向西离开建筑。全程必须跟随角色，镜臂应恢复。
await page.evaluate(() => window.__lohina?.teleport?.(12, -5, 0));
await page.waitForTimeout(300);
await page.evaluate(() => window.__lohina?.look?.(Math.PI / 2, 0.22, 8.5));
await page.waitForTimeout(1000);

const start = await page.evaluate(() => window.__lohina?.diagnostics?.());

await page.evaluate(() => {
  const samples = [];
  window.__cameraFollowSamples = samples;
  window.__cameraFollowTimer = setInterval(() => {
    const d = window.__lohina?.diagnostics?.();
    if (!d) return;
    samples.push({
      t: performance.now(),
      feet: d.player?.feet,
      camera: d.camera?.position,
      screen: d.camera?.characterScreen,
      boom: d.camera?.boomLength,
      desired: d.camera?.desiredLength,
      temporal: d.cameraCollision?.temporalHit,
      startOverlap: d.cameraCollision?.primaryStartOverlap,
      review: d.review?.view,
      fps: d.fps,
    });
  }, 100);
});

// 沿西墙向北，越过 z=-8.5 的西北墙角。
await page.keyboard.down('d');
await page.waitForTimeout(600);
await page.keyboard.up('d');
await page.waitForTimeout(250);
await page.screenshot({ path: `${OUT}/01-around-corner.png` });

// 沿北墙向东走，远离建筑，镜臂应平滑恢复。
await page.keyboard.down('s');
await page.waitForTimeout(1000);
await page.keyboard.up('s');
await page.waitForTimeout(250);
await page.screenshot({ path: `${OUT}/02-north-wall.png` });

// 沿北墙折返向西，回到墙角。
await page.keyboard.down('w');
await page.waitForTimeout(1000);
await page.keyboard.up('w');
await page.waitForTimeout(250);
await page.screenshot({ path: `${OUT}/03-back-to-corner.png` });

// 沿西墙向南回到起点附近，再向西离开建筑，镜臂应再次恢复。
await page.keyboard.down('a');
await page.waitForTimeout(600);
await page.keyboard.up('a');
await page.keyboard.down('w');
await page.waitForTimeout(900);
await page.keyboard.up('w');
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/04-returned.png` });

const samples = await page.evaluate(() => {
  clearInterval(window.__cameraFollowTimer);
  return window.__cameraFollowSamples;
});
const end = await page.evaluate(() => window.__lohina?.diagnostics?.());
await browser.close();

const round = (value) => (typeof value === 'number' ? +value.toFixed(3) : value);
let stalls = 0;
let reviewEnabled = 0;
let maxBoom = 0;
let minBoom = Infinity;
let minScreenX = Infinity, maxScreenX = -Infinity;
let minScreenY = Infinity, maxScreenY = -Infinity;
let previous = null;
for (const sample of samples) {
  if (!sample.feet || !sample.camera) continue;
  if (sample.review !== 'follow') reviewEnabled++;
  maxBoom = Math.max(maxBoom, sample.boom ?? 0);
  minBoom = Math.min(minBoom, sample.boom ?? Infinity);
  if (sample.screen) {
    minScreenX = Math.min(minScreenX, sample.screen[0]); maxScreenX = Math.max(maxScreenX, sample.screen[0]);
    minScreenY = Math.min(minScreenY, sample.screen[1]); maxScreenY = Math.max(maxScreenY, sample.screen[1]);
  }
  if (previous) {
    const feetMoved = Math.hypot(sample.feet[0] - previous.feet[0], sample.feet[2] - previous.feet[2]);
    const cameraMoved = Math.hypot(sample.camera[0] - previous.camera[0],
      sample.camera[2] - previous.camera[2]);
    if (feetMoved > 0.05 && cameraMoved < 1e-4) stalls++;
  }
  previous = sample;
}

const report = {
  url: URL,
  samples: samples.length,
  durationMs: samples.length ? samples[samples.length - 1].t - samples[0].t : 0,
  averageFps: samples.length
    ? +(samples.reduce((sum, sample) => sum + (sample.fps ?? 0), 0) / samples.length).toFixed(1)
    : 0,
  startFeet: start?.player?.feet,
  endFeet: end?.player?.feet,
  startBoom: start?.camera?.boomLength,
  cameraStalls: stalls,
  reviewEnabledFrames: reviewEnabled,
  minBoom,
  maxBoom,
  screenBounds: [round(minScreenX), round(maxScreenX), round(minScreenY), round(maxScreenY)],
  finalBoom: end?.camera?.boomLength,
  finalDesired: end?.camera?.desiredLength,
  finalReview: end?.review?.view,
  finalCollision: end?.cameraCollision,
};
writeFileSync(`${OUT}/report.json`, JSON.stringify({ report, samples }, null, 2));
console.log(JSON.stringify(report, null, 2));

const failures = [];
if (samples.length < 30) failures.push(`too few samples: ${samples.length}`);
if (stalls > 0) failures.push(`${stalls} samples moved feet without moving camera`);
if (reviewEnabled > 0) failures.push(`review camera active in ${reviewEnabled} samples`);
if (!(start?.camera?.boomLength < 8)) failures.push(`wall did not compress the starting arm: ${start?.camera?.boomLength}`);
if (maxBoom > 8.6) failures.push(`boom exceeded framing distance: ${maxBoom}`);
if (minScreenX < -0.05 || maxScreenX > 1.05 || minScreenY < -0.05 || maxScreenY > 1.05) {
  failures.push('character left the viewport');
}
if (!(end?.camera?.boomLength > 8.3)) failures.push(`camera did not recover: ${end?.camera?.boomLength}`);
if (failures.length) {
  console.error('FAIL', failures);
  process.exitCode = 1;
} else {
  console.log('PASS camera followed along the wall, around the corner, back and away');
}
