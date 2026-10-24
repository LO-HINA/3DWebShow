import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'docs/screenshots/hero/after';
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
await page.waitForFunction(() => (window.__lohina?.sceneStats?.()?.calls ?? 0) > 0, { timeout: 120000 });
await page.waitForTimeout(1800);

async function scene(position, cameraYaw, pitch, distance, name) {
  await page.evaluate(([x, z, yaw]) => window.__lohina?.teleport?.(x, z, yaw), [position[0], position[1], cameraYaw]);
  await page.waitForTimeout(500);
  await page.evaluate(
    ([yaw, p, d]) => window.__lohina?.look?.(yaw, p, d),
    [cameraYaw, pitch, distance],
  );
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
      heroMaterials: stats?.materials?.filter((entry) => entry.includes('H-01')),
      heroCasters: stats?.casters?.filter((entry) => entry.includes('H-01')),
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
  console.log('  materials', JSON.stringify(info.heroMaterials));
  console.log('  casters', JSON.stringify(info.heroCasters));
}

// 1. 出生点：广场屏上方的 H-01 冠顶与媒体墙。
await scene([0, 6.5], 0, -0.14, 12, '01-spawn');
// 2. 北侧通道：正立面与悬挑 HUD。
await scene([0, -20], 0, -0.5, 8, '02-front');
// 3. 近景入口：底层文字墙、入口与地面幽灵。
await scene([0, -23], 0, -0.55, 7, '03-entry');
// 4. 东南三分之四：主塔、附楼、悬挑 HUD 与红色竖招。
await scene([6, -24], 0.54, -0.55, 8, '04-three-quarter');
// 5. 西南三分之四：避开 T-01 近景墙体，保留裙房桁架与主塔侧立面。
await scene([-14, -30], -1.2925, -0.45, 7.2, '05-west-three-quarter');
// 6. 背面：服务门、背立面灯带与塔冠。
await scene([14, -44], 2.191, -0.45, 10, '06-back');

await browser.close();
