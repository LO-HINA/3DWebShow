import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const LABEL = process.argv[2] ?? 'before';
const OUT = `docs/screenshots/e01/${LABEL}`;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.on('pageerror', (error) => console.log('[pageerror]', error.message));

await page.goto('http://127.0.0.1:5173/world', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.intro, .screen--fallback', { timeout: 180000 });
await page.locator('.intro__actions button').click();
await page.waitForTimeout(1800);

async function teleport(x, z, yaw) {
  await page.evaluate(([px, pz, pyaw]) => window.__lohina?.teleport?.(px, pz, pyaw), [x, z, yaw]);
  await page.waitForTimeout(600);
}

async function look(yaw, pitch, distance) {
  await page.evaluate(
    ([pyaw, ppitch, pdistance]) => window.__lohina?.look?.(pyaw, ppitch, pdistance),
    [yaw, pitch, distance],
  );
  await page.waitForTimeout(900);
}

async function shot(name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  const info = await page.evaluate(() => {
    const stats = window.__lohina?.sceneStats?.();
    return {
      camera: window.__lohina?.diagnostics?.().camera,
      hud: document.querySelector('.hud__stats')?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
      calls: stats?.calls,
      triangles: stats?.triangles,
      meshes: stats?.meshes,
    };
  });
  console.log(
    name,
    JSON.stringify({
      yaw: info.camera?.actualYaw,
      pitch: info.camera?.actualPitch,
      hud: info.hud,
      calls: info.calls,
      triangles: info.triangles,
      meshes: info.meshes,
    }),
  );
}

async function scene(cameraYaw, pitch, position, name, distance) {
  await teleport(position[0], position[1], position[2] ?? Math.PI / 2);
  await look(cameraYaw, pitch, distance);
  await shot(name);
}

// 1. 广场方向的正面全景
await scene(Math.PI / 2, 0.15, [-8.6, 4, Math.PI / 2], '01-front', 9.5);
// 2. 侧前方，展示体量与屋面
await scene(0.72, 0.2, [-8.4, 8.2, Math.PI / 2], '02-side-front', 9.5);
// 3. 正常游玩距离的入口
await scene(Math.PI / 2, 0.09, [-10.8, 4.9, Math.PI / 2], '03-entry', 6.2);
// 4. 门窗与画框近景
await scene(Math.PI / 2, 0.16, [-11.4, 5.2, Math.PI / 2], '04-window', 5.6);
// 5. 从广场看整体关系
await scene(0.95, 0.18, [-6.2, 4.6, Math.PI / 2], '05-context', 11);
// 6. 背面：检查服务门、设备百叶、落水管与背标是否成立
await scene(-Math.PI / 2, 0.16, [-27, 4, Math.PI / 2], '06-back', 9);

await browser.close();
