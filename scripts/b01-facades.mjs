import { chromium } from 'playwright';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

const OUT = 'docs/screenshots/b01/facades';
const FRAMES = 'docs/screenshots/b01/facades/orbit-frames';
mkdirSync(OUT, { recursive: true });
rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  recordVideo: { dir: OUT, size: { width: 1280, height: 720 } },
});
const page = await context.newPage();
page.on('pageerror', (error) => console.log('[pageerror]', error.message));
page.on('console', (message) => {
  if (message.type() === 'error') console.log('[console]', message.text());
});

const BASE = process.env.LOHINA_URL ?? 'http://127.0.0.1:5174';
await page.goto(`${BASE}/world`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.intro, .screen--fallback', { timeout: 180000 });
await page.locator('.intro__actions button').click();
await page.waitForTimeout(1800);
const hasBridge = await page.evaluate(() => Boolean(window.__lohina?.teleport));
if (!hasBridge) throw new Error('window.__lohina 不可用：请连接开发服务器而不是生产预览。');

async function scene(position, yaw, pitch, distance, name, settle = 1100) {
  await page.evaluate(([x, z, y]) => window.__lohina?.teleport?.(x, z, y), [position[0], position[1], yaw]);
  await page.waitForTimeout(400);
  await page.evaluate(([y, p, d]) => window.__lohina?.look?.(y, p, d), [yaw, pitch, distance]);
  await page.waitForTimeout(settle);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  const info = await page.evaluate(() => {
    const stats = window.__lohina?.sceneStats?.();
    const diagnostics = window.__lohina?.diagnostics?.();
    return {
      camera: diagnostics?.camera,
      calls: stats?.calls,
      triangles: stats?.triangles,
      meshes: stats?.meshes,
    };
  });
  console.log(
    name,
    JSON.stringify({
      position: info.camera?.position,
      yaw: info.camera?.actualYaw,
      pitch: info.camera?.actualPitch,
      boom: info.camera?.boomLength,
      calls: info.calls,
      triangles: info.triangles,
      meshes: info.meshes,
    }),
  );
}

// 立面机位：正面 35% / 右面 55% / 背面 70% / 左面 45%，中心高度约 16.0 / 21.1 / 24.8 / 18.5 m。
await scene([-32, -15], 0, -0.55, 16, '01-front');
await scene([-14, -34], Math.PI / 2, -0.62, 16, '02-right');
await scene([-32, -53], Math.PI, -0.68, 16, '03-back');
await scene([-50, -34], -Math.PI / 2, -0.58, 16, '04-left');
// 街区整体关系：从西侧远景读到 B-01 左立面、裙房与相邻楼群的进深层次。
await scene([-62, -20], -1.11, -0.42, 16, '05-block');

// 绕楼一周：逐帧截图留档，同时由 Playwright 录制页面视频。
const CENTER = [-32, -34];
const RADIUS = 14;
const STEPS = 28;
const started = Date.now();
for (let index = 0; index <= STEPS; index += 1) {
  const theta = (index / STEPS) * Math.PI * 2;
  const x = CENTER[0] + Math.cos(theta) * RADIUS;
  const z = CENTER[1] + Math.sin(theta) * RADIUS;
  const yaw = Math.PI / 2 - theta;
  await page.evaluate(([px, pz, y]) => window.__lohina?.teleport?.(px, pz, y), [x, z, yaw]);
  await page.evaluate(([y, p, d]) => window.__lohina?.look?.(y, p, d), [yaw, -0.66, 16]);
  await page.waitForTimeout(260);
  if (index % 4 === 0) {
    await page.screenshot({ path: `${FRAMES}/frame-${String(index).padStart(3, '0')}.png` });
  }
}
const orbitSeconds = (Date.now() - started) / 1000;
console.log('frames', STEPS + 1, 'seconds', orbitSeconds.toFixed(1));

const video = page.video();
await context.close();
await browser.close();

if (video) {
  const source = await video.path();
  writeFileSync(`${FRAMES}/README.txt`, [
    'B-01 绕楼一周逐帧截图与录屏。',
    `机位：以 (${CENTER[0]}, ${CENTER[1]}) 为圆心，半径 ${RADIUS}m，${STEPS + 1} 个机位覆盖 360°。`,
    `抽帧：每 4 步保存 1 张，共 ${Math.ceil((STEPS + 1) / 4)} 张。`,
    '相机：跟随镜头，臂长 16m，俯仰 -0.66rad，软件渲染（Edge + SwiftShader）。',
    `原始录屏：${source}`,
    `绕楼段时长：约 ${orbitSeconds.toFixed(1)}s；b01-orbit.webm 由 ffmpeg 从原始录屏末尾截取（33.48s，1280×720）。`,
  ].join('\n'));
  console.log('raw video', source);
}

