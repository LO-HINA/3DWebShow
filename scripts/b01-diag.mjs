import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'docs/screenshots/b01/diag';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (error) => console.log('[pageerror]', error.message));
await page.goto('http://127.0.0.1:5174/world', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.intro, .screen--fallback', { timeout: 180000 });
await page.locator('.intro__actions button').click();
await page.waitForTimeout(1800);

async function shot(x, z, targetX, targetZ, pitch, distance, name) {
  const yaw = Math.atan2(-(targetX - x), -(targetZ - z));
  await page.evaluate(([px, pz, y]) => window.__lohina?.teleport?.(px, pz, y), [x, z, yaw]);
  await page.waitForTimeout(400);
  await page.evaluate(([y, p, d]) => window.__lohina?.look?.(y, p, d), [yaw, pitch, distance]);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(name, { x, z, yaw: yaw.toFixed(3) });
}

// 同距离、不同水平偏移：若黑楔随屏幕纹理固定，则为贴图问题；若随视差移动，则为遮挡几何。
await shot(-32, -16, -32, -30.4, -0.42, 9, '01-center');
await shot(-29, -16, -32, -30.4, -0.42, 9, '02-left-offset');
await shot(-35, -16, -32, -30.4, -0.42, 9, '03-right-offset');
await shot(-32, -5, -32, -30.4, -0.18, 8.5, '04-far');
await shot(-44, -34, -32, -30.4, -0.32, 9, '05-side');

await browser.close();
