"""Browser regression for the source migration; run against the Vite dev server."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path('docs/structure-review')
out.mkdir(parents=True, exist_ok=True)
report = {'status': 'running', 'checks': [], 'errors': [], 'device': 'headless Edge / SwiftShader; simulated viewports'}

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
            headless=True, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        try:
            page = browser.new_page(viewport={'width': 1440, 'height': 900})
            page.on('pageerror', lambda error: report['errors'].append(str(error)))
            page.goto('http://127.0.0.1:5173/world', wait_until='networkidle')
            page.locator('.intro').wait_for(timeout=120000)
            page.locator('.intro__actions button').click()
            page.locator('.hud').wait_for()
            assert page.locator('canvas').count() == 1
            report['checks'].append('desktop exploration / single canvas')
            page.evaluate('window.__lohina.teleport(-10.5, 9.5, Math.PI / 2)')
            page.locator('.prompt').wait_for()
            page.keyboard.press('e')
            page.locator('.lightbox').wait_for()
            assert page.locator('.lightbox__image').evaluate('(img) => img.complete && img.naturalWidth > 0')
            page.keyboard.press('Escape')
            page.locator('.lightbox').wait_for(state='detached')
            report['checks'].append('W1 lightbox image / close')
            page.keyboard.press('c')
            page.locator('.directory-list').first.wait_for()
            assert page.locator('.directory-row').count() == 8
            page.keyboard.press('Escape')
            report['checks'].append('directory / eight exhibits / close')
            page.locator('.hud-btn', has_text='设置').click()
            page.locator('.setting-row').first.wait_for()
            page.keyboard.press('Escape')
            report['checks'].append('settings / close')
            page.evaluate('window.__lohina.teleport(-10.5, 4, Math.PI / 2)')
            page.wait_for_function("document.querySelector('.prompt')?.textContent.includes('视觉')")
            page.keyboard.press('e')
            page.wait_for_url('**/world/gallery')
            page.locator('.gallery').wait_for()
            page.locator('a[href="/world"]').first.click()
            page.locator('.hud').wait_for(timeout=120000)
            assert page.locator('canvas').count() == 1
            page.screenshot(path=str(out / 'desktop.png'))
            report['checks'].append('E-01 enter / gallery / return / single canvas')
            page.goto('http://127.0.0.1:5173/world/gallery', wait_until='networkidle')
            page.locator('.gallery').wait_for()
            assert page.locator('canvas').count() == 0
            report['checks'].append('direct gallery route')
            mobile = browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
            mpage = mobile.new_page()
            mpage.on('pageerror', lambda error: report['errors'].append(str(error)))
            mpage.goto('http://127.0.0.1:5173/world', wait_until='networkidle')
            mpage.locator('.intro').wait_for(timeout=120000)
            mpage.locator('.intro__actions button').click()
            mpage.locator('.touch__joystick').wait_for()
            mpage.screenshot(path=str(out / 'mobile.png'))
            mobile.close()
            report['checks'].append('mobile viewport / exploration / touch controls')
            assert not report['errors'], report['errors']
            report['status'] = 'passed'
        finally:
            browser.close()
except Exception as error:
    report['status'] = 'failed'
    report['failure'] = str(error)
    raise
finally:
    (out / 'browser-checks.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))
