"""Real keyboard/mouse review: three framings, start/stop, turns and a building loop.

Start npm run dev, then: python scripts/capture-camera.py
Requires Python Playwright and an installed Chromium browser (defaults to Edge).
No screenshots or videos are synthesized; capture failure exits with an error.
"""
import argparse
import json
import math
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5173/world')
parser.add_argument('--channel', default='msedge')
parser.add_argument('--framing', choices=['all', 'low', 'medium', 'high'], default='all')
parser.add_argument('--out', default='docs/camera-review')
args = parser.parse_args()
out = Path(args.out).resolve()
out.mkdir(parents=True, exist_ok=True)

def diagnostics(page):
    return page.evaluate('window.__lohina.diagnostics()')

def key_run(page, keys, seconds):
    for key in keys:
        page.keyboard.down(key)
    page.wait_for_timeout(seconds * 1000)
    for key in keys:
        page.keyboard.up(key)

def teleport(page, x, z):
    page.evaluate('([x,z]) => window.__lohina.teleport(x,z,Math.PI)', [x, z])
    page.wait_for_timeout(350)

def preset(page, framing):
    page.get_by_role('button', name='设置', exact=True).click()
    page.get_by_role('group', name='跟随取景').get_by_role('button', name={
        'low': '低位', 'medium': '中位', 'high': '高位'}[framing]).click()
    page.keyboard.press('Escape')
    page.wait_for_timeout(700)

def caption(page, text):
    page.evaluate('''text => {
      let el=document.getElementById('capture-caption');
      if(!el){el=document.createElement('div');el.id='capture-caption';
        el.style.cssText='position:fixed;top:100px;left:32px;z-index:9999;padding:12px 18px;background:#111829dd;color:#ffe0b2;font:16px sans-serif;pointer-events:none';
        document.body.appendChild(el)}
      el.textContent=text;
    }''', text)

def rotate_to(page, target):
    current = diagnostics(page)['camera']['yaw']
    delta = (target-current+math.pi) % (2*math.pi)-math.pi
    while abs(delta) > 0.001:
        change = max(-1.2, min(1.2, delta))
        dx = -change / 0.004
        page.mouse.move(700, 430)
        page.mouse.down()
        page.mouse.move(700+dx, 430, steps=15)
        page.mouse.up()
        delta -= change
    page.wait_for_timeout(400)

def walk_to(page, x, z):
    start = diagnostics(page)['player']['feet']
    rotate_to(page, math.atan2(start[0]-x, start[2]-z))
    page.keyboard.down('w')
    try:
        page.wait_for_function('''([x,z]) => {
          let p=window.__lohina.feet(); return Math.hypot(p[0]-x,p[2]-z)<0.17;
        }''', arg=[x, z], timeout=60000, polling=30)
    finally:
        page.keyboard.up('w')
    page.wait_for_timeout(180)

summary = {'status': 'running', 'viewport': [1440, 900], 'quality': 'high', 'runs': []}
with sync_playwright() as p:
    browser = p.chromium.launch(channel=args.channel, headless=True)
    try:
        for framing in (['low', 'medium', 'high'] if args.framing == 'all' else [args.framing]):
            print(f'Capturing {framing}', flush=True)
            context = browser.new_context(viewport={'width': 1440, 'height': 900}, device_scale_factor=1,
                record_video_dir=str(out / '.raw'), record_video_size={'width': 1440, 'height': 900})
            context.add_init_script("localStorage.setItem('lohina-world:settings:v1', JSON.stringify({quality:'high',reducedMotion:false}))")
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(args.url, wait_until='networkidle')
            page.wait_for_selector('.intro', timeout=120000)
            page.locator('.intro__actions button').click()
            page.wait_for_function('Boolean(window.__lohina)')
            preset(page, framing)
            page.wait_for_timeout(700)
            page.screenshot(path=str(out / f'follow-{framing}.png'))
            frame_state = diagnostics(page)
            assert 0.5 < frame_state['camera']['characterScreen'][1] < 0.85
            renderer = page.evaluate('''() => {let gl=document.querySelector('canvas').getContext('webgl2');
              let ext=gl.getExtension('WEBGL_debug_renderer_info'); return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)}''')
            # Telemetry is sampled from actual rendered frames, not wall-clock assumptions.
            page.evaluate('''() => {
              window.__cameraSamples=[];let last=0;
              function sample(t){if(t-last>80){last=t;window.__cameraSamples.push({t,...window.__lohina.diagnostics()})}requestAnimationFrame(sample)}
              requestAnimationFrame(sample);
            }''')
            phases = []
            def phase(text):
                caption(page, f'{framing.upper()} · {text}')
                phases.append({'name': text, 'browserTimeMs': page.evaluate('performance.now()')})
            teleport(page, -5, 12)
            preset(page, framing)
            phase('起步与急停 · W')
            page.wait_for_timeout(500)
            key_run(page, ['w'], 1.3)
            page.wait_for_timeout(450)
            stop = diagnostics(page)['player']['feet']
            page.wait_for_timeout(500)
            assert math.dist(stop, diagnostics(page)['player']['feet']) < 0.025
            teleport(page, -5, 12)
            preset(page, framing)
            phase('冲刺与跳跃 · Shift + W / 空格')
            page.keyboard.down('Shift')
            page.keyboard.down('w')
            page.keyboard.press('Space')
            page.wait_for_timeout(800)
            page.keyboard.up('w')
            page.keyboard.up('Shift')
            page.wait_for_timeout(600)
            phase('连续转弯 · W / WD / D / SD / S / SA / A')
            for keys in [['w'], ['w','d'], ['d'], ['s','d'], ['s'], ['s','a'], ['a']]:
                key_run(page, keys, 0.6)
            page.wait_for_timeout(500)
            teleport(page, 11, 2)
            preset(page, framing)
            phase('绕 AI 馆 · 四边连续行走与拖动转向（本段无传送）')
            for x, z in [(25, 2), (25, -12), (11, -12), (11, 2)]:
                walk_to(page, x, z)
            phase('仰望与返回 · V / 拖动 / 滚轮 / V')
            before = diagnostics(page)['camera']
            page.keyboard.press('v')
            page.mouse.move(700, 430); page.mouse.down()
            page.mouse.move(780, 350, steps=20); page.mouse.up()
            page.mouse.wheel(0, 150)
            page.wait_for_timeout(600)
            page.screenshot(path=str(out / f'look-up-{framing}.png'))
            page.keyboard.press('v')
            page.wait_for_timeout(600)
            after = diagnostics(page)['camera']
            for key in ['yaw', 'pitch', 'distance']:
                assert abs(before[key]-after[key]) < 0.001
            # Return through a real content route; restore camera as well as portal return position.
            samples = page.evaluate('window.__cameraSamples')
            teleport(page, -10.5, 4)
            preset(page, framing)
            page.mouse.move(700, 430);page.mouse.down();page.mouse.move(760,450,steps=10);page.mouse.up()
            page.mouse.wheel(0, -80)
            page.wait_for_timeout(500)
            saved = diagnostics(page)['camera']
            page.keyboard.press('e')
            page.wait_for_url('**/world/gallery')
            page.get_by_role('link', name='返回街区', exact=True).click()
            page.wait_for_selector('.hud', timeout=120000)
            restored = diagnostics(page)['camera']
            for key in ['yaw', 'pitch', 'distance']:
                assert abs(saved[key]-restored[key]) < 0.001
            page.wait_for_timeout(500)
            video = page.video
            page.close()
            context.close()
            video.save_as(str(out / f'movement-{framing}.webm'))
            summary['runs'].append({'framing': framing, 'renderer': renderer, 'framingState': frame_state,
                'phases': phases, 'errors': errors, 'video': f'movement-{framing}.webm', 'samples': samples})
            assert not errors, errors
        summary['status'] = 'passed'
    except Exception as error:
        summary['status'] = 'failed'
        summary['error'] = str(error)
        raise
    finally:
        browser.close()
        (out / 'browser-checks.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Actual browser captures saved to {out}', flush=True)
