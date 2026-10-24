"""CPU geometry diagrams with depth buffer; explicitly not browser/WebGL evidence."""
import json
from pathlib import Path
import fitz
import numpy as np
from PIL import Image, ImageDraw, ImageFont

out = Path('docs/plaza-screen-review/proposal')
cover_doc = fitz.open('public/assets/worlds/cyberpunk/media/plaza-cyber-curtain.svg')
cover_doc[0].get_pixmap().save(str(out / 'cover.png'))
texture = np.asarray(Image.open(out / 'cover.png').convert('RGB'))
font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 22)
small = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 15)
for width in [12, 14]:
    data = json.loads(Path(f'.camera-preview/curtain-{width}-triangles.json').read_text())
    pixels = np.empty((900, 1440, 3), dtype=np.uint8)
    pixels[:] = [35, 43, 59]
    for row in range(340):
        pixels[row, :] = np.array([20, 24, 41]) * (1-row/340) + np.array([57, 69, 101]) * row/340
    depth = np.full((900, 1440), np.inf)

    def triangle(vertices, color=None, uv=None):
        p = np.array(vertices)
        x0, x1 = max(0, int(np.floor(p[:, 0].min()))), min(1439, int(np.ceil(p[:, 0].max())))
        y0, y1 = max(0, int(np.floor(p[:, 1].min()))), min(899, int(np.ceil(p[:, 1].max())))
        if x1 < x0 or y1 < y0:
            return
        xx, yy = np.meshgrid(np.arange(x0, x1+1)+0.5, np.arange(y0, y1+1)+0.5)
        denominator = (p[1, 1]-p[2, 1])*(p[0, 0]-p[2, 0])+(p[2, 0]-p[1, 0])*(p[0, 1]-p[2, 1])
        if abs(denominator) < 1e-8:
            return
        a = ((p[1, 1]-p[2, 1])*(xx-p[2, 0])+(p[2, 0]-p[1, 0])*(yy-p[2, 1]))/denominator
        b = ((p[2, 1]-p[0, 1])*(xx-p[2, 0])+(p[0, 0]-p[2, 0])*(yy-p[2, 1]))/denominator
        c = 1-a-b
        z = a*p[0, 2]+b*p[1, 2]+c*p[2, 2]
        target_depth = depth[y0:y1+1, x0:x1+1]
        mask = (a >= -1e-6) & (b >= -1e-6) & (c >= -1e-6) & (z < target_depth)
        target_depth[mask] = z[mask]
        target = pixels[y0:y1+1, x0:x1+1]
        if uv is None:
            target[mask] = [int(color[i:i+2], 16) for i in [0, 2, 4]]
        else:
            inverse_w = a/p[0, 3]+b/p[1, 3]+c/p[2, 3]
            u = (a*uv[0][0]/p[0, 3]+b*uv[1][0]/p[1, 3]+c*uv[2][0]/p[2, 3])/inverse_w
            v = (a*uv[0][1]/p[0, 3]+b*uv[1][1]/p[1, 3]+c*uv[2][1]/p[2, 3])/inverse_w
            tx = np.clip((u*(texture.shape[1]-1)).astype(int), 0, texture.shape[1]-1)
            ty = np.clip((v*(texture.shape[0]-1)).astype(int), 0, texture.shape[0]-1)
            target[mask] = texture[ty[mask], tx[mask]]

    for face in data['triangles']:
        triangle(face['points'], face['color'])
    corners = data['cover']
    triangle([corners[i] for i in [0, 1, 2]], uv=[[0, 0], [1, 0], [1, 1]])
    triangle([corners[i] for i in [0, 2, 3]], uv=[[0, 0], [1, 1], [0, 1]])
    image = Image.fromarray(pixels)
    draw = ImageDraw.Draw(image)
    draw.rectangle((24, 794, 820, 880), fill='#101725')
    draw.text((44, 804), f'{width}m × {width*9/16:g}m / 同出生机位', font=font, fill='#eee0cc')
    draw.text((44, 843), '几何投影方案图 · 非运行截图 · 建筑仅为体量占位，未模拟场景光影', font=small, fill='#b7c6d5')
    image.save(out / f'{width}m.png')
    print(width, 'depth-buffered design diagram saved')
fitz.open(out / 'placement.svg')[0].get_pixmap().save(str(out / 'placement.png'))
comparison = Image.new('RGB', (1440, 450))
for index, width in enumerate([12, 14]):
    comparison.paste(Image.open(out / f'{width}m.png').resize((720, 450), Image.Resampling.LANCZOS), (index*720, 0))
comparison.save(out / 'comparison.png')
