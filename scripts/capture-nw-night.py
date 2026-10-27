"""Capture actual running NW study; creates no substitute images if the browser fails."""
import argparse
import json
import math
from datetime import datetime
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--base-url', default='http://127.0.0.1:5173')
parser.add_argument('--cdp', help='Existing browser CDP URL; otherwise launch Edge headless')
args = parser.parse_args()

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(args.cdp) if args.cdp else p.chromium.launch(
        channel='msedge', headless=True,
        args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    context = browser.new_context(viewport={'width': 1440, 'height': 810}, device_scale_factor=1)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(args.base_url + '/world?study=NW(0)', wait_until='networkidle', timeout=180000)
    page.wait_for_selector('.intro, .screen--fallback', timeout=180000)
    if page.locator('.screen--fallback').count():
        raise RuntimeError('Renderer fallback; screenshots would not show the real world')
    page.locator('.intro__actions button').click()
    page.wait_for_function('Boolean(window.__lohina?.nightStudy)', timeout=180000)
    out = Path('docs/nw-night-review/runtime') / datetime.now().strftime('%Y%m%d-%H%M%S')
    out.mkdir(parents=True, exist_ok=False)
    views = [
        ('01-front', -25, 5, -25, -25, -.48, 8.5),
        ('02-side', -46, -16, -25, -25, -.45, 8.5),
        ('03-close', -32, -13, -31.5, -20, -.70, 4),
        ('04-block', 0, 10, -20, -23, -.35, 8.5),
        ('05-walking', -25, 0, -25, -25, math.radians(13), 8.5),
    ]
    records = []
    for name, x, z, tx, tz, pitch, distance in views:
        yaw = math.atan2(-(tx-x), -(tz-z))
        page.evaluate('v => window.__lohina.teleport(...v)', [x,z,yaw])
        page.evaluate('v => window.__lohina.look(...v)', [yaw,pitch,distance])
        page.wait_for_timeout(1800)
        page.screenshot(path=str(out / (name+'.png')))
        records.append({'view':name, 'diagnostics':page.evaluate('window.__lohina.diagnostics()'),
                        'stats':page.evaluate('window.__lohina.sceneStats()')})
    # Identical front viewpoint, effect switches only; no review lights or boosted exposure.
    page.evaluate('window.__lohina.teleport(-25,5,0);window.__lohina.look(0,-.48,8.5)')
    for name, effects in [('06-bloom-off',{'bloom':False,'reflection':True}),
                          ('07-reflection-off',{'bloom':True,'reflection':False})]:
        page.evaluate('v=>window.__lohina.lookEffects(v)',effects)
        page.wait_for_timeout(1200)
        page.screenshot(path=str(out/(name+'.png')))
    page.evaluate('window.__lohina.lookEffects({bloom:true,reflection:true})')
    (out/'capture.json').write_text(json.dumps({'backend':'Edge + SwiftShader (default launch), verify actual backend if CDP',
        'viewport':[1440,810],'dpr':1,'views':records,'pageErrors':errors},ensure_ascii=False,indent=2),encoding='utf-8')
    context.close()
    browser.close()
    print(out)
