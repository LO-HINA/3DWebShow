import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'docs/screenshots/b01/structure';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (msg) => {
  if (msg.type() === 'error') console.log('[console.error]', msg.text());
});
await page.goto('http://127.0.0.1:5174/world?b01=structure', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.intro, .screen--fallback', { timeout: 180000 });
await page.locator('.intro__actions button').click();
await page.waitForTimeout(1800);

async function shot(x, z, yaw, pitch, distance, name) {
  await page.evaluate(([px, pz, y]) => window.__lohina?.teleport?.(px, pz, y), [x, z, yaw]);
  await page.waitForTimeout(400);
  await page.evaluate(([y, p, d]) => window.__lohina?.look?.(y, p, d), [yaw, pitch, distance]);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  const stats = await page.evaluate(() => window.__lohina?.sceneStats?.());
  console.log(name, 'calls', stats?.calls, 'tris', stats?.triangles);
}

function aim(x, z, tx, tz) {
  return Math.atan2(-(tx - x), -(tz - z));
}

// 正立面全高、转角、东立面、入口近景、门廊近景。
await shot(-32, -14, 0, -0.5, 16, '01-front-full');
await shot(-21, -18, aim(-21, -18, -32, -30), -0.42, 17, '02-southeast-corner');
await shot(-14, -34, Math.PI / 2, -0.42, 16, '03-east-side');
await shot(-32, -23, 0, 0.02, 6, '04-entry-closeup');
await shot(-25.5, -24, aim(-25.5, -24, -30.5, -29), 0.0, 5, '05-porch-closeup');
await shot(-26, -12, aim(-26, -12, -32, -30), -0.55, 14, '06-three-quarter');
// 冠顶与塔身设备带：确认开放钢架、退台与广告牌框架没有互相吞没。
await shot(-32, -16, 0, -0.86, 16, '07-crown');

await browser.close();
