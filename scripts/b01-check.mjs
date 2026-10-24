import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'docs/screenshots/b01';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.on('pageerror', (error) => console.log('[pageerror]', error.message));
page.on('console', (message) => {
  if (message.type() === 'error') console.log('[console]', message.text());
});

await page.goto('http://127.0.0.1:5174/world', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.intro, .screen--fallback', { timeout: 180000 });
await page.locator('.intro__actions button').click();
await page.waitForTimeout(1800);

async function scene(position, yaw, pitch, distance, name) {
  await page.evaluate(([x, z, y]) => window.__lohina?.teleport?.(x, z, y), [position[0], position[1], yaw]);
  await page.waitForTimeout(500);
  await page.evaluate(([y, p, d]) => window.__lohina?.look?.(y, p, d), [yaw, pitch, distance]);
  await page.waitForTimeout(1100);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  const info = await page.evaluate(() => {
    const stats = window.__lohina?.sceneStats?.();
    const diagnostics = window.__lohina?.diagnostics?.();
    return {
      camera: diagnostics?.camera,
      occluded: diagnostics?.occluded,
      calls: stats?.calls,
      triangles: stats?.triangles,
      meshes: stats?.meshes,
      b01Materials: stats?.materials?.filter((entry) => entry.includes('B-01')),
      b01Casters: stats?.casters?.filter((entry) => entry.includes('B-01')),
      facade: stats?.facade?.filter?.((entry) => entry.includes('B-01')),
    };
  });
  console.log(name, JSON.stringify({
    yaw: info.camera?.actualYaw,
    pitch: info.camera?.actualPitch,
    viewPitch: info.camera?.viewPitchUpDeg,
    position: info.camera?.position,
    boom: info.camera?.boomLength,
    desired: info.camera?.desiredLength,
    occluded: info.occluded,
    calls: info.calls,
    triangles: info.triangles,
    meshes: info.meshes,
  }));
  console.log('  B-01 materials', JSON.stringify(info.b01Materials));
  console.log('  B-01 casters', JSON.stringify(info.b01Casters));
}

// 1. 出生点：B-01 是否进入左后方天际线，且不遮挡 H-01。
await scene([0, 6.5], 0.748, -0.12, 14, '01-spawn');
// 2. 广场西北通道：B-01 主屏与 T-01 的关系。
await scene([-20, -10], 0.588, -0.34, 10, '02-corridor');
// 3. 正立面：主屏、双竖灯箱、ticker、屋顶标识是否分层可读。
await scene([-32, -16], 0, -0.42, 9, '03-front');
// 4. 三分之四低机位：洞口凹入、结构竖梃与地面溢光。
await scene([-24, -19], 0.727, -0.3, 11, '04-three-quarter');
// 5. 东侧回看：B-01 与 H-01 的双 hero 构图。
await scene([-13, -12], 0.45, -0.2, 12, '05-pair');

await browser.close();
