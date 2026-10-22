import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (err) => console.log('PAGEERROR', err.message));
await page.goto('http://127.0.0.1:5173/world', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.intro, .screen--fallback', { timeout: 180000 });
await page.locator('.intro__actions button').click();
await page.waitForTimeout(2000);

const check = async (label, x, z, yaw, shot) => {
  await page.evaluate(([px, pz, pyaw]) => window.__lohina?.teleport?.(px, pz, pyaw), [x, z, yaw]);
  await page.waitForTimeout(2600);
  const stats = await page.evaluate(() => window.__lohina?.sceneStats?.());
  const feet = await page.evaluate(() => window.__lohina?.feet?.());
  console.log(label, { feet, calls: stats?.calls, triangles: stats?.triangles, meshes: stats?.meshes });
  if (shot) await page.screenshot({ path: `docs/screenshots/${shot}.png` });
};

await check('spawn', 0, 6.5, Math.PI);
await check('edge looking out', 0, -30, Math.PI, '14-void-edge');
await check('deep void corridor', 0, -110, Math.PI, '15-void-deep');
await check('far void', 120, -300, Math.PI, '16-void-far');

await browser.close();
