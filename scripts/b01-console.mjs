import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (msg) => console.log(`[${msg.type()}]`, msg.text()));
page.on('pageerror', (error) => console.log('[pageerror]', error.message));
await page.goto('http://127.0.0.1:5174/world', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.intro, .screen--fallback', { timeout: 180000 });
await page.locator('.intro__actions button').click();
await page.waitForTimeout(2500);
const info = await page.evaluate(() => {
  const stats = window.__lohina?.sceneStats?.();
  return { stats };
});
console.log(JSON.stringify(info));
await browser.close();
