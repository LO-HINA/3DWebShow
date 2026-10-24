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

async function shot(x, z, pitch, distance, name) {
  const yaw = 0;
  await page.evaluate(([px, pz, y]) => window.__lohina?.teleport?.(px, pz, y), [x, z, yaw]);
  await page.waitForTimeout(400);
  await page.evaluate(([y, p, d]) => window.__lohina?.look?.(y, p, d), [yaw, pitch, distance]);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  const info = await page.evaluate(() => window.__lohina?.diagnostics?.());
  console.log(name, JSON.stringify({ cam: info?.camera?.position, pitch: info?.camera?.viewPitchUpDeg, boom: info?.camera?.boomLength }));
}

await shot(-32, -8, -0.6, 12, '08-pitch60');
await shot(-32, -8, -0.72, 12, '09-pitch72');
await shot(-34, -8, -0.72, 12, '10-pitch72-west');
await shot(-30, -8, -0.72, 12, '11-pitch72-east');

await browser.close();
