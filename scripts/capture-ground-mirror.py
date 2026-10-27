"""黑色湿镜面地坪：正常行走视角、反射/辉光对照、屏幕倒影与地面亮度采样。"""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright

out = Path('docs/ground-review')
out.mkdir(parents=True, exist_ok=True)
report = {'status': 'running', 'errors': [], 'captures': []}

VIEWS = [
    ('01-spawn', (0, 1, 3.14159, 3.14159, -0.12, 5.0)),
    ('02-plaza-south', (0, 9, 3.14159, 3.14159, -0.16, 5.0)),
    ('03-pavilion', (0, -12, 0.0, 0.0, -0.12, 5.0)),
    ('04-east-entry', (10.5, 2, -1.5708, -1.5708, -0.1, 5.0)),
    ('05-low-ground', (0, 5.5, 3.14159, 3.14159, -0.02, 4.0)),
    ('06-screen-eye', (0, -16, 0.0, 0.0, -0.06, 4.5)),
    ('09-plaza-wide', (0, 15, 3.14159, 3.14159, -0.2, 9.0)),
    ('11-paving-close', (2, 6, 3.14159, 3.14159, 0.55, 4.0)),
    ('14-screen-ground', (0, -6, 0.0, 0.0, 0.18, 11.0)),
    ('15-screen-ground-side', (4, -14, 0.0, 0.0, 0.3, 7.0)),
]


def luminance(path):
    image = Image.open(path).convert('RGB')
    array = np.asarray(image).astype('float32') / 255
    return (array @ np.array([0.2126, 0.7152, 0.0722], dtype='float32')), image


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True,
            args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        try:
            page = browser.new_page(viewport={'width': 1440, 'height': 900}, device_scale_factor=1)
            page.on('pageerror', lambda error: report['errors'].append(str(error)))
            page.add_init_script(
                "sessionStorage.clear();localStorage.setItem('lohina-world:settings:v1',"
                "JSON.stringify({quality:'high',reducedMotion:false}))")
            page.goto('http://127.0.0.1:5173/world', wait_until='networkidle')
            page.locator('.intro__actions button').click()
            page.wait_for_function('Boolean(window.__lohina?.buildingStyles)')
            page.wait_for_timeout(1500)
            report['look'] = page.evaluate('window.__lohina.buildingStyles().look')

            def shot(name):
                page.screenshot(path=str(out / (name + '.png')))
                report['captures'].append(name + '.png')

            for name, (x, z, pyaw, lyaw, pitch, dist) in VIEWS:
                page.evaluate('([x,z,yaw])=>window.__lohina.teleport(x,z,yaw)', [x, z, pyaw])
                page.evaluate('([yaw,pitch,dist])=>window.__lohina.look(yaw,pitch,dist)', [lyaw, pitch, dist])
                page.wait_for_timeout(900)
                shot(name)

            # 反射/辉光对照：同一机位，确认倒影来自平面反射而非光斑。
            page.evaluate('window.__lohina.teleport(0,9,3.14159)')
            page.evaluate('window.__lohina.look(3.14159,-0.16,5.0)')
            page.wait_for_timeout(800)
            page.evaluate('window.__lohina.lookEffects({reflection:false})')
            page.wait_for_timeout(700)
            shot('07-reflection-off')
            page.evaluate('window.__lohina.lookEffects({reflection:true})')
            page.wait_for_timeout(700)
            shot('08-reflection-on')
            page.evaluate('window.__lohina.lookEffects({bloom:false})')
            page.wait_for_timeout(700)
            shot('10-bloom-off')
            page.evaluate('window.__lohina.lookEffects({bloom:true})')
            page.wait_for_timeout(700)

            # 动态倒影：同一机位隔 2.6 秒，屏幕内容与波纹都会改变反射带像素。
            page.evaluate('window.__lohina.teleport(0,-16,0.0)')
            page.evaluate('window.__lohina.look(0.0,-0.06,4.5)')
            page.wait_for_timeout(900)
            shot('12-anim-a')
            page.wait_for_timeout(2600)
            shot('12-anim-b')

            # 静态建筑倒影区：只保留波纹/时间扰动带来的像素变化。
            page.evaluate('window.__lohina.teleport(0,9,3.14159)')
            page.evaluate('window.__lohina.look(3.14159,-0.16,5.0)')
            page.wait_for_timeout(900)
            shot('16-ripple-a')
            page.wait_for_timeout(2400)
            shot('16-ripple-b')

            report['diagnostics'] = page.evaluate('window.__lohina.diagnostics()')
            report['stats'] = page.evaluate('window.__lohina.sceneStats()')
            report['status'] = 'passed' if not report['errors'] else 'failed'
        finally:
            browser.close()

    # 地面亮度：排除顶部天空与底部 HUD 条。
    ground, _ = luminance(out / '02-plaza-south.png')
    band = ground[560:860, :]
    report['groundLuminance'] = {
        'p10': round(float(np.percentile(band, 10)), 4),
        'p50': round(float(np.percentile(band, 50)), 4),
        'p90': round(float(np.percentile(band, 90)), 4),
        'above075': round(float((band > 0.75).mean()), 4),
    }
    diff = ImageChops.difference(Image.open(out / '12-anim-a.png').convert('RGB'),
                                 Image.open(out / '12-anim-b.png').convert('RGB'))
    report['screenReflectionDiff'] = [round(value, 3) for value in
        ImageStat.Stat(diff.crop((400, 560, 1100, 860))).mean]
    ripple = ImageChops.difference(Image.open(out / '16-ripple-a.png').convert('RGB'),
                                   Image.open(out / '16-ripple-b.png').convert('RGB'))
    # 右下角只包含橙色楼体倒影，没有动画屏幕。
    report['rippleDiff'] = [round(value, 3) for value in
        ImageStat.Stat(ripple.crop((1100, 620, 1400, 830))).mean]
except Exception as error:
    report.update(status='failed', error=f'{type(error).__name__}: {error}')
    raise
finally:
    (out / 'browser-checks.json').write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
