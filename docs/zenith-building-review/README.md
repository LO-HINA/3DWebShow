# Neon Zenith 单栋建筑复现样板

用户要求复现参考项目中的一栋建筑，以实际观看决定下一轮风格。选用 [billpwchan/neon-zenith](https://github.com/billpwchan/neon-zenith) 的程序化办公塔类别；本轮只新增独立样板，不改广场、现有建筑、布局、角色或正式渲染器。

## 预览入口

当前本地预览：`http://127.0.0.1:5173/__preview/zenith.html`。

默认使用 WebGPURenderer 自动选择后端；页面可切 WebGL2 后端（`?backend=webgl`）。左键拖拽环绕、滚轮缩放、右键平移；按钮包含整体、正面、街道近景、背面、辉光开关和结构照明检查。页面显示实际后端类名和当前帧率，不写死 WebGPU 或性能数值。渲染失败会显示错误，不伪造已加载状态。

开发服务下的源码入口为 `docs/zenith-building-review/index.html`。本地静态预览使用原生 esbuild 打包该页的 preview.ts，不替换主站路由。

## 复现了什么

- **体量公式**：基于原项目 [`src/city/massing.js`](https://github.com/billpwchan/neon-zenith/blob/main/src/city/massing.js) 的 corporate 退台分支与开放冠顶分支，保留主体收缩比例、偏移、设备层、檐口、四角立柱与 LED 环梁的公式。
- **固定样板输入**：52×40m 地块，主体高度 224m，裙房高 12m，seed=23。明确选择上述两种分支，没有运行原城市生成器随机选择整个城市。这是同类程序化建筑的独立复现，不声称对应原站某个坐标的成品资产。
- **幕墙适配**：参照原项目 [`src/city/buildings.js`](https://github.com/billpwchan/neon-zenith/blob/main/src/city/buildings.js) 的开间/层高、租户分区亮灯、暖冷室内光和视线与室内盒子相交逻辑，改为适合单栋、非实例化城市属性的 TSL 材质。
- **近景**：实体竖梃与楼层边、门厅、雨棚、橱窗、设备百叶和冠顶结构。窗框使用 InstancedMesh，避免每根单独 draw call。
- **观看环境**：独立阴影、低分辨率平面反射和可关闭辉光，用于检查样板；它们没有接入正式世界。

适配差异：没有移植原站完整的立面纹理数组、城市光图、雨、交通、广告系统和整套调色。入口和两块文字牌是本项目评审适配，文字纹理由 Canvas 原创绘制；未使用外部模型、广告图、照片贴图或字体。原建筑城市实例化 shader 不作为一个可以原封不动调用的组件。

## 所有权与资源

- 实体：`cyberpunk / NZ-SETBACK-STUDY`，当前执行 agent 负责，来源为程序化代码与上游 MIT 代码分支适配；未注册为正式地图实体。
- 模块：`src/worlds/cyberpunk/buildings/zenithStudy/`，不被正式世界 index 导入。
- 上游源码著作权：Copyright (c) 2026 Bill Chan，MIT 许可证全文保存在 `vendor/LICENSE`。上游 `main` 内容经网页读取并适配，本轮没有固定 upstream commit，不宣称逐字或逐像素一致。
- 版权说明与适配说明必须随本模块保留；上游素材各有许可，本轮没有导入它们。
- 模型返回 group、tiers、totalHeight、dispose。预览页拥有自己的渲染器、相机、控制器及资源回收；不创建角色物理世界，也不共享主站逐帧状态。

## 验证状态

类型检查与原生 esbuild 打包完成后，可在当前本地预览打开。`scripts/capture-zenith-study.py` 用真实浏览器采集四个视角及辉光关闭状态；若浏览器驱动被环境权限拒绝，`browser-checks.json` 明确记录失败。

类型/打包与 HTTP 成功不能证明 GPU 着色器已编译、画面已验收或性能达标。最终以预览页实际加载和用户观看为准；当前没有伪造的浏览器截图。首轮只供风格选择，整合进地图前仍需另定尺寸、位置、碰撞和媒体内容。

本轮浏览器采集实际在 Playwright 驱动启动阶段遇到 `PermissionError: [WinError 5]`，没有进入渲染页面，详见 `browser-checks.json`。类型检查、原生打包与页面/脚本 HTTP 已通过；几何检查见 `geometry-checks.json`，只验证有限顶点、包围体及实例化结构，不代表 GPU 或主观视觉通过。
