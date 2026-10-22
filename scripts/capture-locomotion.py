"""One uncut browser recording: fixed side camera, then normal follow camera.

Start npm run dev first. Python Playwright + Edge are required.
The 0.2 input scale is the same as a 20% joystick deflection; production speed is unchanged.
"""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5173/world')
parser.add_argument('--channel', default='msedge')
parser.add_argument('--out', default='docs/locomotion-review')
args = parser.parse_args()
out = Path(args.out).resolve()
out.mkdir(parents=True, exist_ok=True)
report = {'status': 'running', 'viewport': [1920, 1080], 'phases': [], 'errors': []}

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel=args.channel, headless=True)
        try:
            context = browser.new_context(viewport={'width': 1920, 'height': 1080}, device_scale_factor=1,
                record_video_dir=str(out / '.raw'), record_video_size={'width': 1920, 'height': 1080})
            context.add_init_script("localStorage.setItem('lohina-world:settings:v1',JSON.stringify({quality:'high',reducedMotion:false}));sessionStorage.clear()")
            page = context.new_page()
            page.on('pageerror', lambda error: report['errors'].append(str(error)))
            page.goto(args.url, wait_until='networkidle')
            page.wait_for_selector('.intro', timeout=120000)
            page.locator('.intro__actions button').click()
            page.wait_for_function('Boolean(window.__lohina?.review)')
            report['renderer'] = page.evaluate('''() => {let gl=document.querySelector('canvas').getContext('webgl2');
              let e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)}''')
            page.evaluate('''() => {
              window.__motionSamples=[]; let last=0;
              const title=document.createElement('div'); title.id='motion-caption';
              title.style.cssText='position:fixed;left:32px;top:108px;z-index:9999;padding:12px 18px;background:#10141de6;color:#ffe0b2;font:18px sans-serif;pointer-events:none';
              document.body.appendChild(title);
              function sample(t){if(t-last>50){last=t;window.__motionSamples.push({t,...window.__lohina.diagnostics()})}requestAnimationFrame(sample)}
              requestAnimationFrame(sample);
            }''')

            def phase(view, text):
                report['phases'].append({'view': view, 'name': text, 'timeMs': page.evaluate('performance.now()')})
                page.evaluate("text=>document.getElementById('motion-caption').textContent=text", f'{view} · {text}')

            def move(key, seconds):
                page.keyboard.down(key)
                page.wait_for_timeout(seconds * 1000)
                page.keyboard.up(key)

            for view, name in [('side', '固定侧面机位'), ('follow', '正常跟随机位')]:
                phase(name, '准备；接下来整段不传送、不剪辑')
                page.evaluate("() => {window.__lohina.teleport(-9,6,Math.PI);window.__lohina.review('"+view+"',0.2)}")
                page.wait_for_timeout(600)
                phase(name, '待机')
                page.wait_for_timeout(1000)
                phase(name, '起步 → 直行；20% 摇杆幅值')
                move('w', 1.2)
                phase(name, '90° 转弯')
                move('d', 0.7)
                phase(name, '180° 反向')
                move('a', 1.2)
                phase(name, '停止')
                page.wait_for_timeout(600)
                stopped = page.evaluate('window.__lohina.diagnostics()')
                assert stopped['player']['speed'] < 0.05
                assert stopped['gait']['state'] == 'idle'
                phase(name, '走向摄影馆墙体 → 持续顶墙')
                page.keyboard.down('a')
                page.wait_for_function('window.__lohina.feet()[0] < -12.5', timeout=30000)
                page.wait_for_timeout(1400)
                blocked = page.evaluate('window.__lohina.diagnostics()')
                assert blocked['player']['speed'] < 0.08, 'wall does not block this review path'
                assert blocked['gait']['state'] == 'idle', 'character keeps marching against the wall'
                page.screenshot(path=str(out / f'wall-{view}.png'))
                page.keyboard.up('a')
                phase(name, '本机位检查结束')
                page.wait_for_timeout(700)

            phase('补充检查', '冲刺 → 起跳 → 腾空 → 落地')
            page.evaluate("() => {window.__lohina.teleport(-5,12,Math.PI);window.__lohina.review('follow',1)}")
            page.keyboard.down('Shift')
            page.keyboard.down('w')
            page.wait_for_timeout(300)
            page.keyboard.press('Space')
            page.wait_for_timeout(700)
            page.keyboard.up('w')
            page.keyboard.up('Shift')
            page.wait_for_timeout(1000)
            report['samples'] = page.evaluate('window.__motionSamples')
            assert not report['errors'], report['errors']
            video = page.video
            page.close()
            context.close()
            video.save_as(str(out / 'locomotion-side-and-follow.webm'))
            report['status'] = 'passed'
            report['video'] = 'locomotion-side-and-follow.webm'
        finally:
            browser.close()
except Exception as error:
    report['status'] = 'failed'
    report['failure'] = str(error)
    raise
finally:
    (out / 'browser-checks.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
