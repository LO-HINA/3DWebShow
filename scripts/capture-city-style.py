"""Real scene review: facade depth, all eight buildings, light-effect comparisons."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

out=Path('docs/city-style-review')
out.mkdir(parents=True,exist_ok=True)
report={'status':'running','errors':[],'captures':[]}
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='msedge',headless=True,args=['--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        try:
            page=browser.new_page(viewport={'width':1440,'height':900},device_scale_factor=1,
                record_video_dir=str(out/'.raw'))
            page.on('pageerror',lambda error:report['errors'].append(str(error)))
            page.add_init_script("sessionStorage.clear();localStorage.setItem('lohina-world:settings:v1',JSON.stringify({quality:'high',reducedMotion:false}))")
            page.goto('http://127.0.0.1:5173/world',wait_until='networkidle')
            page.locator('.intro__actions button').click()
            page.wait_for_function('Boolean(window.__lohina?.buildingStyles)')
            page.wait_for_timeout(1000)
            report['style']=page.evaluate('window.__lohina.buildingStyles()')
            assert len(report['style']['buildings'])==8
            def shot(name):
                page.screenshot(path=str(out/(name+'.png')))
                report['captures'].append(name+'.png')
            shot('01-spawn-high')
            for mode in ['bloom','reflection']:
                page.evaluate('mode=>window.__lohina.lookEffects({[mode]:false})',mode)
                page.wait_for_timeout(500)
                shot('02-'+mode+'-off')
                page.evaluate('mode=>window.__lohina.lookEffects({[mode]:true})',mode)
            for name,x,z,yaw in [('gallery',-10.5,4,1.5708),('tower-a',-10,-14,0.3),('tower-b',10,-14,-0.3),
                ('learning',-15,-3,0.3),('terminal',11,-5,-1.5708),('hero',0,-26,0),('north',-28,-24,0.3),('media',28,-14,-0.7)]:
                page.evaluate('([x,z,yaw])=>window.__lohina.teleport(x,z,yaw)',[x,z,yaw])
                page.evaluate('yaw=>window.__lohina.look(yaw,-0.15,4.5)',yaw)
                page.wait_for_timeout(600)
                shot('building-'+name)
            # Real pointer drags expose window reveals and room occlusion in a continuous recording.
            page.evaluate('window.__lohina.teleport(10,-14,Math.PI)')
            page.evaluate('window.__lohina.look(-0.3,-0.15,4.5)')
            for dx in [-180,180]:
                page.mouse.move(700,430);page.mouse.down();page.mouse.move(700+dx,460,steps=45);page.mouse.up()
                page.wait_for_timeout(450)
            report['stats']=page.evaluate('window.__lohina.sceneStats()')
            assert not report['errors'],report['errors']
            video=page.video;page.close();video.save_as(str(out/'windows-lighting.webm'))
            report['status']='passed'
        finally:
            browser.close()
except Exception as error:
    report.update(status='failed',error=f'{type(error).__name__}: {error}')
    raise
finally:
    (out/'browser-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
