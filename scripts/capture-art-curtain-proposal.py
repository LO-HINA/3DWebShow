"""Same-camera WebGL proposal captures; writes failure honestly if browser cannot launch."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path('docs/plaza-screen-review/proposal')
out.mkdir(parents=True, exist_ok=True)
report = {'status': 'running', 'errors': [], 'captures': []}
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True,
            args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        try:
            page = browser.new_page(viewport={'width': 1440, 'height': 1000}, device_scale_factor=1)
            page.on('pageerror', lambda e: report['errors'].append(str(e)))
            page.goto('http://127.0.0.1:5173/docs/plaza-screen-review/proposal.html', wait_until='networkidle')
            page.wait_for_function('window.__screenReview?.ready', timeout=120000)
            reference = page.evaluate('window.__screenReview.camera()')
            for width in [12, 14]:
                page.evaluate('width=>window.__screenReview.choose(width)', width)
                page.wait_for_timeout(600)
                assert reference == page.evaluate('window.__screenReview.camera()')
                page.locator('canvas').screenshot(path=str(out / f'{width}m-webgl.png'))
                report['captures'].append(f'{width}m-webgl.png')
            assert not report['errors'], report['errors']
            report.update(status='passed', camera=reference)
        finally:
            browser.close()
except Exception as error:
    report.update(status='failed', error=f'{type(error).__name__}: {error}')
    raise
finally:
    (out / 'browser-checks.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
