"""Real browser review of the standalone building; never replace failures with mock images."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path('docs/zenith-building-review')
out.mkdir(parents=True, exist_ok=True)
report = {'status': 'running', 'errors': [], 'captures': []}
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True,
            args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        try:
            page = browser.new_page(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
            page.on('pageerror', lambda e: report['errors'].append(str(e)))
            page.goto('http://127.0.0.1:5173/__preview/zenith.html?backend=webgl', wait_until='networkidle')
            page.wait_for_function('window.__zenithStudy?.ready()', timeout=120000)
            for view in ['overall', 'front', 'street', 'back']:
                page.get_by_role('button', name={'overall':'整体','front':'正面','street':'街道近景','back':'背面'}[view], exact=True).click()
                page.wait_for_timeout(800)
                page.screenshot(path=str(out / f'{view}.png'))
                report['captures'].append(view+'.png')
            report['diagnostics'] = page.evaluate('window.__zenithStudy.diagnostics()')
            page.get_by_role('button', name='辉光', exact=True).click()
            page.wait_for_timeout(600)
            page.screenshot(path=str(out / 'glow-off.png'))
            assert not report['errors'], report['errors']
            report['status'] = 'passed'
        finally:
            browser.close()
except Exception as error:
    report.update(status='failed', error=f'{type(error).__name__}: {error}')
    raise
finally:
    (out / 'browser-checks.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
