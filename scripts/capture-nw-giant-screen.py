"""Capture NW(0) giant virtual screen facing LM-01. Camera yaw convention: forward = (-sin yaw, -cos yaw)."""
import json
import math
from datetime import datetime
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:5173'

with sync_playwright() as p:
    browser = p.chromium.launch(
        channel='msedge', headless=True,
        args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    context = browser.new_context(viewport={'width': 1440, 'height': 810}, device_scale_factor=1)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE + '/world', wait_until='networkidle', timeout=180000)
    page.wait_for_selector('.intro, .screen--fallback', timeout=180000)
    if page.locator('.screen--fallback').count():
        raise RuntimeError('Renderer fallback')
    page.locator('.intro__actions button').click()
    page.wait_for_function('Boolean(window.__lohina?.nightStudy)', timeout=180000)
    out = Path('docs/nw-night-review/runtime') / datetime.now().strftime('%Y%m%d-%H%M%S')
    out.mkdir(parents=True, exist_ok=False)
    # (name, feetX, feetZ, targetX, targetZ, pitch)
    views = [
        ('01-plaza-to-nw', 0, 1, -25, -25, -0.06),
        ('02-diagonal', -11, -11, -25, -25, -0.22),
        ('03-screen-close', -17, -17, -25, -25, -0.55),
        ('05-approach', -6, 4, -25, -25, -0.05),
    ]
    records = []
    for name, x, z, tx, tz, pitch in views:
        yaw = math.atan2(-(tx - x), -(tz - z))
        page.evaluate('v => window.__lohina.teleport(...v)', [x, z, yaw])
        page.evaluate('v => window.__lohina.look(...v)', [yaw, pitch, 8.5])
        page.wait_for_timeout(1800)
        page.screenshot(path=str(out / f'{name}.png'))
        records.append({'view': name, 'feet': [x, z], 'yaw': yaw,
                        'diagnostics': page.evaluate('window.__lohina.diagnostics()')})
    # effect toggles at plaza view
    yaw = math.atan2(25, 26)
    page.evaluate('v => window.__lohina.teleport(...v)', [0, 1, yaw])
    page.evaluate('v => window.__lohina.look(...v)', [yaw, -0.06, 8.5])
    for name, effects in [('06-bloom-off', {'bloom': False, 'reflection': True}),
                          ('07-reflection-off', {'bloom': True, 'reflection': False})]:
        page.evaluate('v => window.__lohina.lookEffects(v)', effects)
        page.wait_for_timeout(1200)
        page.screenshot(path=str(out / f'{name}.png'))
    page.evaluate('window.__lohina.lookEffects({bloom:true,reflection:true})')
    page.wait_for_timeout(1000)
    (out / 'capture.json').write_text(json.dumps({
        'backend': 'Edge + SwiftShader', 'viewport': [1440, 810], 'dpr': 1,
        'views': records, 'pageErrors': errors}, ensure_ascii=False, indent=2), encoding='utf-8')
    context.close()
    browser.close()
    print(out)
    print('errors:', errors)
