"""Capture the upgraded crossroads: markings, bollards, flow lines and overall brightness."""
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
    out = Path('docs/road-review/2026-11-11') / datetime.now().strftime('%H%M%S')
    out.mkdir(parents=True, exist_ok=False)
    # (name, feetX, feetZ, targetX, targetZ, pitch)
    views = [
        ('01-north-approach', 0, 22, 0, -20, -0.05),
        ('02-south-to-plaza', 0, -24, 0, 20, -0.04),
        ('03-crossing-north', 0, 15, 0, -30, -0.18),
        ('04-corners', 17, 17, 0, -17, -0.12),
        ('05-east-road', 30, 4, -30, 0, -0.04),
        ('06-west-road', -30, 4, 30, 0, -0.04),
        ('09-learning-off-road', -48, -17, -62, -17, -0.1),
        ('10-terminal-off-road', 48, -17, 62, -17, -0.1),
        ('11-west-road-clear', 0, -12, -70, -12, -0.05),
        ('12-west-road-far', -50, 0, -88, 0, -0.03),
        ('13-east-road-far', 50, 0, 88, 0, -0.03),
    ]
    records = []
    for name, x, z, tx, tz, pitch in views:
        yaw = math.atan2(-(tx - x), -(tz - z))
        page.evaluate('v => window.__lohina.teleport(...v)', [x, z, yaw])
        page.evaluate('v => window.__lohina.look(...v)', [yaw, pitch, 8.5])
        page.wait_for_timeout(1600)
        page.screenshot(path=str(out / f'{name}.png'))
        records.append({'view': name, 'feet': [x, z], 'yaw': yaw,
                        'diagnostics': page.evaluate('window.__lohina.diagnostics()')})
    # flow pulse movement evidence: same camera, two frames ~1.1s apart
    yaw = math.atan2(-(0 - 0), -(-20 - 22))
    page.evaluate('v => window.__lohina.teleport(...v)', [0, 22, yaw])
    page.evaluate('v => window.__lohina.look(...v)', [yaw, -0.05, 8.5])
    page.wait_for_timeout(1500)
    page.screenshot(path=str(out / '07-flow-a.png'))
    page.wait_for_timeout(1100)
    page.screenshot(path=str(out / '07-flow-b.png'))
    page.evaluate('window.__lohina.lookEffects({bloom:false,reflection:true})')
    page.wait_for_timeout(1200)
    page.screenshot(path=str(out / '08-bloom-off.png'))
    page.evaluate('window.__lohina.lookEffects({bloom:true,reflection:true})')
    stats = page.evaluate('window.__lohina.sceneStats()')
    (out / 'capture.json').write_text(json.dumps({
        'backend': 'Edge + SwiftShader', 'viewport': [1440, 810], 'dpr': 1,
        'views': records, 'stats': stats, 'pageErrors': errors,
    }, ensure_ascii=False, indent=2), encoding='utf-8')
    context.close()
    browser.close()
    print(out)
    print('errors:', errors)
