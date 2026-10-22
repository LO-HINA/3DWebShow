import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = 'docs/screenshots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

const logs = [];
page.on('console', (msg) => {
  if (msg.type() !== 'debug') logs.push(`[${msg.type()}] ${msg.text()}`);
});
page.on('pageerror', (err) => logs.push(`[pageerror] ${err.stack ?? err.message}`));
page.on('requestfailed', (req) =>
  logs.push(`[requestfailed] ${req.url()} :: ${req.failure()?.errorText}`),
);

const snap = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`  · shot ${name}`);
};

const ui = () =>
  page.evaluate(() => ({
    url: location.pathname,
    intro: Boolean(document.querySelector('.intro')),
    hud: Boolean(document.querySelector('.hud')),
    lightbox: Boolean(document.querySelector('.lightbox')),
    overlay: Boolean(document.querySelector('.overlay')),
    fallback: Boolean(document.querySelector('.screen--fallback')),
    loading: Boolean(document.querySelector('.screen--loading')),
    prompt: document.querySelector('.prompt')?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
    locked: document.querySelector('.locked-hint')?.textContent?.trim() ?? null,
    zone: document.querySelector('.hud__zone')?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
    stats: document.querySelector('.hud__stats')?.textContent?.replace(/\s+/g, ' ').trim() ?? null,
  }));

const teleport = async (x, z, yaw) => {
  await page.evaluate(
    ([px, pz, pyaw]) => window.__lohina?.teleport?.(px, pz, pyaw),
    [x, z, yaw],
  );
  await page.waitForTimeout(1900);
};

const waitFor = async (selector, timeout = 180000) => {
  await page.waitForSelector(selector, { timeout });
};

console.log('→ goto /world');
await page.goto('http://127.0.0.1:5173/world', { waitUntil: 'domcontentloaded' });
const start = Date.now();
await waitFor('.intro, .screen--fallback');
console.log(`→ ready in ${((Date.now() - start) / 1000).toFixed(1)}s`, await ui());
await page.waitForTimeout(1600);
await snap('01-intro');

if (await page.locator('.intro').count()) {
  console.log('→ start exploring');
  await page.locator('.intro__actions button').click();
  await page.waitForTimeout(1800);
  console.log('  ', await ui());
  await snap('02-spawn');

  console.log('→ plaza, south approach');
  await teleport(0, 4.6, Math.PI);
  console.log('  ', await ui());
  await snap('03-plaza');

  console.log('→ W1, west image street');
  await teleport(-10.5, 10, Math.PI);
  console.log('  ', await ui());
  await snap('04-frame-west');
  if (await page.locator('.prompt').count()) {
    await page.keyboard.press('e');
    await page.waitForTimeout(900);
    console.log('  open lightbox', await ui());
    await snap('05-lightbox');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
    console.log('  after close', await ui());

    console.log('→ E-01 portal');
    await teleport(-10.5, 4, Math.PI / 2);
    console.log('  ', await ui());
    await snap('06-portal');
    if (await page.locator('.prompt').count()) {
      await page.keyboard.press('e');
      await page.waitForTimeout(1500);
      console.log('  gallery', await ui());
      await snap('07-gallery');
      const back = page.locator('a[href="/world"]').first();
      if (await back.count()) {
        await back.click();
        await waitFor('.hud', 120000);
        await page.waitForTimeout(2000);
        console.log('  returned', await ui());
        await snap('08-return');
      }
    }
  }

  console.log('→ directory');
  await page.keyboard.press('c');
  await page.waitForTimeout(2500);
  console.log('  ', await ui());
  await snap('09-directory');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1200);

  console.log('→ settings + quality low');
  await page.locator('.hud-btn').nth(1).click();
  await page.waitForTimeout(2500);
  await snap('10-settings');
  await page.locator('.segmented button').nth(1).click();
  await page.waitForTimeout(1800);
  console.log('  after quality low', await ui());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  await snap('11-quality-low');
}

console.log('\nfinal url:', page.url());
console.log('logs:\n' + logs.join('\n'));

await browser.close();

// Mobile pass in a fresh context so the intro is visible.
const mobile = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const mctx = await mobile.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  hasTouch: true,
  isMobile: true,
});
const mpage = await mctx.newPage();
await mpage.goto('http://127.0.0.1:5173/world', { waitUntil: 'domcontentloaded' });
await mpage.waitForSelector('.intro, .screen--fallback', { timeout: 180000 });
await mpage.waitForTimeout(1500);
await mpage.screenshot({ path: `${OUT}/12-mobile-intro.png` });
console.log('mobile intro shot');
await mpage.locator('.intro__actions button').click();
await mpage.waitForTimeout(1600);
await mpage.screenshot({ path: `${OUT}/13-mobile-explore.png` });
console.log('mobile explore shot');
console.log(
  'mobile ui',
  await mpage.evaluate(() => ({
    touch: Boolean(document.querySelector('.touch')),
    joystick: Boolean(document.querySelector('.touch__joystick')),
    hud: Boolean(document.querySelector('.hud')),
  })),
);
await mobile.close();
