"""Capture the actual world: three LM-01 views and one continuous motion recording."""
import argparse
import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5173/world')
args = parser.parse_args()
out = Path('docs/orrery-review')
out.mkdir(parents=True, exist_ok=True)
report = {'status': 'running', 'url': args.url, 'viewport': [1600, 900],
          'backend': 'Edge headless / SwiftShader (not physical GPU)', 'captures': [], 'errors': [], 'samples': []}
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True,
            args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        try:
            context = browser.new_context(viewport={'width': 1600, 'height': 900}, device_scale_factor=1,
                record_video_dir=str(out / '.raw'), record_video_size={'width': 1600, 'height': 900})
            page = context.new_page()
            page.on('pageerror', lambda error: report['errors'].append(str(error)))
            page.add_init_script("localStorage.removeItem('lohina-world:snapshot:v1');localStorage.setItem('lohina-world:settings:v1', JSON.stringify({quality:'high', reducedMotion:false}))")
            page.goto(args.url, wait_until='networkidle')
            page.wait_for_selector('.intro, .screen--fallback', timeout=120000)
            page.locator('.intro__actions button').click()
            page.wait_for_function('Boolean(window.__lohina?.landmarkReview)', timeout=120000)
            page.wait_for_timeout(1000)
            page.keyboard.press('h')
            report['userAgent'] = page.evaluate('navigator.userAgent')
            for number, (view, seconds) in enumerate([('spawn', 10), ('side', 12), ('close', 10)], 1):
                page.evaluate('view=>window.__lohina.landmarkReview(view)', view)
                page.wait_for_timeout(1500)
                name = f'{number:02d}-{view}.png'
                page.screenshot(path=str(out / name))
                report['captures'].append(name)
                for _ in range(seconds // 2):
                    report['samples'].append({'view': view, 'state': page.evaluate('window.__lohina.landmarkState()')})
                    page.wait_for_timeout(2000)
            assert not report['errors'], report['errors']
            for star in [0, 1]:
                assert report['samples'][0]['state']['stars'][star]['position'] != report['samples'][1]['state']['stars'][star]['position']
            report['sceneStats'] = page.evaluate('window.__lohina.sceneStats()')
            page.evaluate("window.__lohina.landmarkReview('spawn')")
            page.keyboard.press('h')
            page.get_by_role('button', name='进入：轨道中枢仪表盘').first.wait_for(state='visible')
            page.keyboard.press('e')
            page.wait_for_url('**/world/observatory')
            page.locator('.observatory-destinations').wait_for(state='visible')
            page.screenshot(path=str(out / '04-dashboard.png'))
            report['captures'].append('04-dashboard.png')
            page.get_by_role('link', name=re.compile('视觉与摄影馆')).click()
            page.wait_for_url('**/world/gallery')
            page.get_by_role('link', name='返回街区', exact=True).click()
            page.get_by_role('button', name='进入：轨道中枢仪表盘').first.wait_for(state='visible', timeout=120000)
            feet = page.evaluate('window.__lohina.feet()')
            assert abs(feet[0]) < .1 and abs(feet[2] + .5) < .1, feet
            page.keyboard.press('e')
            page.wait_for_url('**/world/observatory')
            page.get_by_role('link', name=re.compile('返回出生庭')).click()
            page.wait_for_url('**/world')
            page.get_by_role('button', name='进入：轨道中枢仪表盘').first.wait_for(state='visible', timeout=120000)
            assert not report['errors'], report['errors']
            report['consoleFlow'] = 'E → dashboard → gallery → safe console return → dashboard → spawn court'
            video = page.video
            page.close()
            video.save_as(str(out / 'LM-01-continuous.webm'))
            context.close()
            report.update(status='passed', video='LM-01-continuous.webm',
                note='Includes startup then spawn → side → close, continuous real render; software backend only.')
        finally:
            browser.close()
except Exception as error:
    report.update(status='failed', error=f'{type(error).__name__}: {error}')
    raise
finally:
    (out / 'browser-checks.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
