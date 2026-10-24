# 触地后靠近脚边与人物淡出

2026-10-23。本轮授权：镜头下降到地面安全高度后，继续仰视拖拽时沿地面缓慢靠近人物脚边，人物逐渐透明；反向拖拽恢复。

修改范围：`src/engine/camera/follow.ts`、`settings.ts`、`avatarFade.ts` 和 `scripts/check-exploration-camera.ts`。保留工作区已有媒体塔、远裁剪距离和运动模块改动，未调整角色物理、场景布局或大屏。

触地前维持既有轨道；触地后按剩余俯仰行程做 smoothstep 插值，水平距离最终为 0.42m，高度仍由实际支撑面与镜头净空约束决定。用户缩放距离不被改写。反向拖拽沿同一路径退出；原有体积碰撞和帧间扫掠继续生效。

人物到镜头的距离从 3m 到 0.5m 连续驱动透明度，并与原有近距、中心遮挡、仰视构图规则取更低透明度；采用既有逐帧平滑，挂件和接地阴影随角色材质协调处理。这是透明淡出，不是景深模糊。

验证：

- `npm run typecheck`、`npm run build`、`node scripts/check-dependencies.mjs` 通过。构建保留既有大 chunk 警告。
- exploration-camera 逻辑回归通过：0m/2m 地面、30/60/120 帧、连续靠近与淡出、净空、墙角体积碰撞、宽屏近裁剪面和恢复。
- Playwright + 无头 Edge，1440×900，实际鼠标分段拖拽：终点人物透明度为 0，反向拖拽后为 1，俯仰恢复，无页面 JavaScript 异常；详见 `checks.json`。截图为 `initial.png`、`approach-1.png`、`approach-4.png`、`approach-8.png` 和 `restored.png`。

浏览器使用本工作区 Vite 5174 服务；5173 当时提供旧页面，不能据此验证本次修改。自动拖拽和截图不代表用户手感或手机真机验收；尚未录制连续视频。

用户反馈后复查：5173 是 `.camera-preview/serve-local.py` 提供的手动打包预览，读取 `.camera-preview/local-preview/main.js`，不会跟随源码自动更新。已用本地 esbuild 从 `src/main.tsx` 重新打包该预览的 JS/CSS，保留开发诊断入口；HTTP 返回的新 bundle 已包含触地靠近与连续淡出参数。随后直接在 5173 用相同的真实鼠标拖拽流程复测通过，终点 opacity=0，反拖恢复 opacity=1；证据见 `checks-5173.json`。这次纠正了原预览未同步的问题，用户对实际手感的反馈仍待确认。
