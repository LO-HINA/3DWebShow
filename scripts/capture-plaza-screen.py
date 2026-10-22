"""Capture actual browser rendering of the installed plaza screen."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path('docs/plaza-screen-review')
out.mkdir(parents=True, exist_ok=True)
report = {'status': 'running', 'errors': []}
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True,
            args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        try:
            page = browser.new_page(viewport={'width': 1440, 'height': 900})
            page.on('pageerror', lambda error: report['errors'].append(str(error)))
            page.add_init_script('sessionStorage.clear()')
            page.goto('http://127.0.0.1:5173/world', wait_until='networkidle')
            page.locator('.intro__actions button').click()
            page.wait_for_function("window.__lohina?.diagnostics().plazaScreen.imageStatus === 'loaded'", timeout=120000)
            page.wait_for_timeout(700)
            page.screenshot(path=str(out / '01-spawn.png'))
            page.evaluate('window.__lohina.teleport(0, -2.8, Math.PI)')
            page.evaluate('window.__lohina.look(0, -0.07, 6)')
            page.wait_for_timeout(800)
            page.screenshot(path=str(out / '02-front.png'))
            page.evaluate('window.__lohina.teleport(5.5, -3, Math.PI)')
            page.evaluate('window.__lohina.look(0.45, -0.1, 6)')
            page.wait_for_timeout(800)
            page.screenshot(path=str(out / '03-side.png'))
            report['sceneStats'] = page.evaluate('window.__lohina.sceneStats()')
            assert not report['errors'], report['errors']
            report['status'] = 'passed'
        finally:
            browser.close()
except Exception as error:
    report.update(status='failed', error=f'{type(error).__name__}: {error}')
    raise
finally:
    (out / 'browser-checks.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
