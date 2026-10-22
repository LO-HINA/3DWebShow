"""Capture one continuous real-input camera review; never synthesize footage.

Start npm run dev, then python scripts/capture-exploration-camera.py.
Requires Python Playwright and Edge. A failed capture writes failed metadata.
"""
import argparse
import json
import math
from pathlib import Path
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5173/world')
parser.add_argument('--channel', default='msedge')
parser.add_argument('--out', default='docs/exploration-camera-review')
args = parser.parse_args()
out = Path(args.out).resolve()
out.mkdir(parents=True, exist_ok=True)
report = {'status': 'running', 'phases': [], 'errors': []}


def state(page):
    return page.evaluate('window.__lohina.diagnostics()')


def phase(page, name):
    page.evaluate('''text => {
      let el=document.getElementById('capture-caption');
      if(!el){el=document.createElement('div');el.id='capture-caption';
        el.style.cssText='position:fixed;top:100px;left:32px;z-index:9999;padding:12px 18px;background:#111829dd;color:#ffe0b2;font:16px sans-serif;pointer-events:none';
        document.body.appendChild(el)}
      el.textContent=text;
    }''', name)
    report['phases'].append({'name': name, 'timeMs': page.evaluate('performance.now()'), 'state': state(page)})


def drag(page, dx=0, dy=0):
    page.mouse.move(700, 430)
    page.mouse.down()
    page.mouse.move(700 + dx, 430 + dy, steps=24)
    page.mouse.up()
    page.wait_for_timeout(400)


def walk(page, key, seconds):
    page.keyboard.down(key)
    page.wait_for_timeout(seconds * 1000)
    page.keyboard.up(key)
    page.wait_for_timeout(350)


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel=args.channel, headless=True)
        try:
            context = browser.new_context(viewport={'width': 1440, 'height': 900},
                record_video_dir=str(out / '.raw'), record_video_size={'width': 1440, 'height': 900})
            context.add_init_script("sessionStorage.clear();localStorage.setItem('lohina-world:settings:v1',JSON.stringify({quality:'high',reducedMotion:false}))")
            page = context.new_page()
            page.on('pageerror', lambda error: report['errors'].append(str(error)))
            page.goto(args.url, wait_until='networkidle')
            page.wait_for_selector('.intro', timeout=120000)
            page.locator('.intro__actions button').click()
            page.wait_for_function('Boolean(window.__lohina)')
            page.wait_for_timeout(700)
            page.evaluate('''() => {window.__explorationSamples=[];let last=0;
              function tick(t){if(t-last>100){last=t;window.__explorationSamples.push({t,...window.__lohina.diagnostics()})}requestAnimationFrame(tick)}
              requestAnimationFrame(tick)}''')
            phase(page, '正常行走视角')
            walk(page, 'w', 0.35)
            phase(page, '拖到近地面')
            drag(page, dy=-150)
            low = state(page)['camera']
            assert abs(low['position'][1] - low['groundHeight'] - low['clearance']) < 0.04, low
            phase(page, '继续抬头看楼顶')
            drag(page, dy=-80)
            up = state(page)['camera']
            assert up['viewDirection'][1] > 0.55, up
            assert abs(up['position'][1] - low['position'][1]) < 0.04, up
            phase(page, '绕人物旋转一周')
            for _ in range(6):
                drag(page, dx=-260)
            drag(page, dx=-(2 * math.pi / 0.004 - 1560))
            phase(page, '靠近人物触发淡出')
            for _ in range(9):
                page.mouse.wheel(0, -240)
                page.wait_for_timeout(130)
            page.wait_for_timeout(700)
            assert state(page)['avatarFade']['opacity'] < 0.15
            phase(page, '拉远恢复人物')
            for _ in range(9):
                page.mouse.wheel(0, 240)
                page.wait_for_timeout(130)
            page.wait_for_timeout(1000)
            assert state(page)['avatarFade']['opacity'] > 0.95
            phase(page, '步行到展馆外墙，转动镜头检查收缩')
            page.keyboard.down('a')
            try:
                page.wait_for_function('window.__lohina.feet()[0]<-12.0', timeout=12000)
            finally:
                page.keyboard.up('a')
            page.wait_for_timeout(400)
            drag(page, dx=math.pi / 2 / 0.004)
            assert state(page)['cameraCollision']['primaryHit'] is not None
            drag(page, dy=60)
            drag(page, dx=45)
            drag(page, dx=-45)
            phase(page, '离墙平滑恢复')
            walk(page, 'w', 0.9)
            phase(page, 'R 一键复位，不改变人物位置')
            feet = state(page)['player']['feet']
            page.keyboard.press('r')
            page.wait_for_timeout(800)
            restored = state(page)
            assert math.dist(feet, restored['player']['feet']) < 0.03
            assert abs(restored['camera']['yaw']) < 0.001
            assert abs(restored['camera']['pitch'] - math.radians(13)) < 0.001
            report['samples'] = page.evaluate('window.__explorationSamples')
            assert not report['errors'], report['errors']
            page.screenshot(path=str(out / 'final-reset.png'))
            video = page.video
            page.close()
            context.close()
            video.save_as(str(out / 'exploration-continuous.webm'))
            report.update(status='passed', video='exploration-continuous.webm')
        finally:
            browser.close()
except Exception as error:
    report.update(status='failed', error=f'{type(error).__name__}: {error}')
    raise
finally:
    (out / 'browser-checks.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
