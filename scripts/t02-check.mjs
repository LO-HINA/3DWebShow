import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'docs/screenshots/t02/after';
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
      towerMaterials: stats?.materials?.filter((entry) => entry.includes('T-02')),
      towerCasters: stats?.casters?.filter((entry) => entry.includes('T-02')),
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
  console.log('  materials', JSON.stringify(info.towerMaterials));
  console.log('  casters', JSON.stringify(info.towerCasters));
}

// 1. 从广场南侧看 T-02 与街区的整体关系。
await scene([4, 3], -0.3948, -0.33, 12, '01-plaza');
// 2. 西侧全景：竖招、西立面与冠顶。
await scene([4, -21], -Math.PI / 2, -0.58, 10, '02-west');
// 3. 东南低机位：幕墙窗格、压带 LED 与角部轮廓线。
await scene([24, -16], 1.107, -0.7, 9, '03-facade');
// 4. 正面右前方：入口、海报媒体舱与字标。
await scene([9, -10], -0.5, -0.3, 9, '04-entry');

await browser.close();
