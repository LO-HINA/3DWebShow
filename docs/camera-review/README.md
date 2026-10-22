# 相机与角色评审记录

本轮实现了可旋转第三人称跟随、相机相对移动、三档取景、独立仰望、镜头球扫掠、人物遮挡检测和镜头快照恢复。三档仍为候选，中位仅为暂定默认值。

| 档位 | 轨道臂俯角 | 轨道距离 | 1440×900 人物中心投影高度 |
| --- | --- | --- | --- |
| 低位 | 12° | 7m | 67.54% |
| 中位 | 20° | 8.5m | 67.19% |
| 高位 | 29° | 10m | 66.98% |

以上投影由 Three.js 相机矩阵计算，没有场景遮挡，不是实际运行截图。轨道臂俯角也不是最终视线俯角。实际构图、建筑遮挡与舒适度尚未据视频定案。

## 已执行验证

- `npm run typecheck` 通过。
- 原生 esbuild CLI 能完成应用打包，但 `npm run build` 因宿主权限限制报 `spawn EPERM`，标准 Vite 构建未通过。
- [logic-checks.json](logic-checks.json) 是实际执行的 Three.js 数学与 Rapier 物理检查结果：相机相对方向、对角速度、摇杆幅值、角色响应、撞墙与沿墙滑动、镜头球体收缩与恢复、独立仰望恢复、新旧快照兼容。
- 用户反馈移动慢后，默认速度由 3.2m/s 调为 6m/s，Shift 冲刺 10m/s；起步 0.1s 内达到默认速度，松键 5 个物理步内停止，附加距离约 0.18m。此为逻辑测量，不能当作键盘到屏幕的实际输入延迟。
- 修复 0.05s 帧时间截断造成的低帧率慢动作。真实 Rapier 物理检查在 1、2、5、10、20、30、60、144FPS 下，两秒前进距离均为约 11.75m（含起步加速）；单帧最多补算 1s，切回后台不追赶离开期间的时间。
- 新增空格跳跃：实测最高约 1.27m。已通过起跳、空中方向控制、禁止二段跳、落地后再次起跳、头顶碰撞的物理检查；添加起跳缓冲和短暂离地宽限。手机端提供冲刺与跳跃按钮，实际触控手感仍待验证。
- 本会话尝试了 Playwright、Edge 和 Chromium CDP。Playwright 驱动因 Windows 命名管道 `WinError 5` 失败；Chromium 调试端口可启动，但加载页面时因 Mojo 命名管道权限退出，无法得到真实画面。未生成本轮截图、视频，也未确认浏览器帧率。

## 复现逻辑检查

Windows PowerShell，在项目根目录执行（使用已安装依赖，无需下载）：

```powershell
& '.\node_modules\@esbuild\win32-x64\esbuild.exe' scripts/check-camera.ts --bundle --platform=node --format=esm --packages=external --outfile=.camera-preview/check-camera.mjs
node .camera-preview/check-camera.mjs
```

## 实际浏览器采集

普通终端中先运行 `npm run dev`，另一个终端执行：

```powershell
python scripts/capture-camera.py
```

依赖 Python Playwright 和已安装的 Edge。可以通过 `--channel chrome` 改用 Chrome；`--framing medium` 只采集中位。此脚本已做语法检查，完整流程仍待能启动浏览器的环境执行。

预计输出（当前尚不存在）：

- `follow-low.png` / `follow-medium.png` / `follow-high.png`：同一出生点、同一画质的三档实际取景。
- `movement-low.webm` / `movement-medium.webm` / `movement-high.webm`：每段包含起步、急停、连续转弯、绕 AI 馆四边行走、仰望与返回。视频保留加载过程与段落标题，不加速、不插帧。
- `look-up-*.png`：对应仰望画面。
- `browser-checks.json`：实际渲染器、人物投影、运动采样、浏览器错误与镜头恢复断言。只有完整运行通过才标为 passed。

绕馆段仅在开始前定位到场景检查点，段内通过真实键盘行走与鼠标拖动绕行；截图不由静态渲染或概念图代替。每段视频还会检查进入内容页再返回时的镜头恢复。

## 待视频评审的问题

对比三档的前方视野、人物可读性、连续转弯时的晕动感、绕建筑时收镜速度和离墙恢复速度。完成实际采集后再选默认档位，必要时只调整 `CAMERA` 与 `PLAYER` 的独立响应参数。移动端触控、窄屏 HUD 与真实 GPU 表现也尚需运行确认。
