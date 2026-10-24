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
await page.goto('http://127.0.0.1:5174/world', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.intro, .screen--fallback', { timeout: 180000 });
await page.locator('.intro__actions button').click();
await page.waitForTimeout(1800);

async function shot(x, z, yaw, pitch, distance, name) {
  await page.evaluate(([px, pz, y]) => window.__lohina?.teleport?.(px, pz, y), [x, z, yaw]);
  await page.waitForTimeout(400);
  await page.evaluate(([y, p, d]) => window.__lohina?.look?.(y, p, d), [yaw, pitch, distance]);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}.png` });
}

await shot(-32, -18, 0, 0.22, 9, '12-ground-look-down');
await shot(-32, -11, 0, 0.05, 9, '13-ground-eye');
await shot(-26, -17, 0.5, 0.12, 12, '14-ground-oblique');

await browser.close();
