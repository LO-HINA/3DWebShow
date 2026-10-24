# LOHINA 媒体塔素材

把图片放进 `images/`，把视频放进 `videos/`，然后编辑同目录的 `manifest.json`。
浏览器不能自动列目录，所以**新增文件必须写进清单**才会显示。

## 目录

```
media/
├─ manifest.json      # 播放清单
├─ images/            # 图片，建议 1920×1080 或更高，JPG / PNG / WebP / SVG
└─ videos/            # 视频，建议 H.264 MP4 或 WebM，静音自动播放
```

## manifest.json

```json
{
  "images": ["images/我的图片.jpg", "images/第二张.png"],
  "videos": ["videos/我的视频.mp4"],
  "imageDuration": 8,
  "videoFit": "cover"
}
```

| 字段 | 说明 |
| --- | --- |
| `images` | 图片路径，按顺序轮播；最多加载 10 张 |
| `videos` | 视频路径，按顺序播放，播完接下一个 |
| `imageDuration` | 每张图片停留秒数，默认 8 |
| `videoFit` | `cover` 裁切填满屏幕；`contain` 完整显示、上下留黑边 |

路径相对于本目录，不要写开头的 `/`。

## 显示位置

- **上半部分视频墙**：播放 `videos`；没有视频时显示待机画面。
- **视频墙上方图片带**：轮播 `images`。
- **下半部分**：程序化流动霓虹光束，不需要素材。

## 视频编码建议

- 容器：MP4（H.264 + AAC）兼容性最好，WebM（VP9）次之。
- 分辨率：1920×1080 足够；竖屏视频也可以。
- 时长：10–30 秒，单个文件建议小于 20 MB。
- 声音会被静音，浏览器只允许静音自动播放。
- 文件改完后刷新页面即可，若浏览器缓存了旧清单，请强制刷新（Ctrl+F5）。
