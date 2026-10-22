# LOHINA WORLD 项目结构

> 更新日期：2026-10-22  
> 适用版本：Round 01 可运行初稿  
> 本文说明仓库中每个目录和文件的作用，以及新增代码时应该放在哪里。

## 1. 分层原则

项目按“**页面 → 界面组件 → 状态桥接 → 三维世界**”分层，避免 React 界面与 Three.js 渲染互相直接依赖。

```text
浏览器入口
  index.html
    └─ src/main.tsx
        └─ src/App.tsx（路由）
            ├─ pages/WorldPage.tsx
            │   ├─ components/world/WorldCanvas.tsx → world/engine/WorldEngine.ts
            │   ├─ components/hud/*          读取 state/worldStore.ts
            │   ├─ components/overlays/*     读取 state/worldStore.ts
            │   └─ components/screens/*      读取 state/worldStore.ts
            └─ pages/GalleryPage.tsx 等独立内容页
```

- `src/world/`：Three.js 场景、物理、相机、角色、交互检测与空间配置。**不写 React JSX。**
- `src/components/`：只负责界面呈现和用户输入，按职责分为五类。
- `src/state/`：Zustand 世界 UI 状态机，是三维引擎与 React 之间共享状态的唯一来源。
- `src/pages/`：路由级页面，只做组合，不承载具体实现细节。
- `src/styles/`：全局设计系统和响应式样式。

## 2. 根目录

```text
web/
├─ AGENTS.md                 项目的唯一实施规范（视觉、空间、工程与验收基线）
├─ README.md                 安装、启动、操作、验收结果、截图索引与已知问题
├─ index.html                Vite 页面骨架、SEO 元信息、favicon 与 React 挂载点
├─ package.json              项目名称、npm 脚本、生产与开发依赖
├─ package-lock.json         npm 实际安装版本锁文件
├─ tsconfig.json             TypeScript 严格模式与 Vite 类型配置
├─ vite.config.ts            Vite 开发服务器（127.0.0.1:5173）与构建目标
├─ .gitignore                Git 忽略规则
├─ public/                   原样复制到构建产物的静态资源
│  └─ favicon.svg            站点图标
├─ src/                      全部应用源码
├─ scripts/                  开发期浏览器验收与性能统计脚本
├─ docs/                     项目文档与验收截图
├─ node_modules/             npm 依赖（可再生，不手工修改）
├─ dist/                     生产构建产物（可再生，当前已清理）
├─ .idea/                    JetBrains IDE 本地配置（不属于应用代码）
└─ .claude/                  本地 Claude Code 配置（不属于应用代码）
```

### 根目录文件说明

| 文件 | 作用 |
| --- | --- |
| `AGENTS.md` | 59 KB 的 V2.1 统一规范。规定街区布局、坐标、视觉基线、性能目标、资产契约和验收要求。新增功能前先读它。 |
| `README.md` | 面向使用者的快速入口：环境要求、命令、键位、已完成范围、验证结果、截图和已知限制。 |
| `index.html` | Vite 的唯一 HTML 入口。设置中文语言、移动端 viewport、主题色、描述、Open Graph 信息和 `/src/main.tsx` 模块入口。 |
| `package.json` | 定义 `dev`、`build`、`typecheck`、`preview` 四个脚本，以及 React、Three.js、Rapier、Zustand、React Router 的精确版本。 |
| `package-lock.json` | 锁定依赖树，保证其他机器执行 `npm install` 后得到相同版本。 |
| `tsconfig.json` | 启用 `strict`、`noUnusedLocals`、`noUnusedParameters` 等严格检查；包含 `src` 与 `vite.config.ts`。 |
| `vite.config.ts` | 配置 React 插件、固定开发端口 `5173`（`strictPort`）、ES2022 构建目标和 chunk 警告阈值。 |
| `.gitignore` | 忽略 `node_modules`、`dist`、本地环境文件、系统文件和截图临时目录。 |
| `public/favicon.svg` | 浏览器标签页图标；构建时复制到产物根目录。 |
| `node_modules/` | 依赖安装目录，由 `npm install` 生成，不提交、不手改。 |
| `dist/` | `npm run build` 生成的生产文件。可随时删除并重建；本轮清理时已删除。 |
| `.idea/` | PyCharm / WebStorm 的模块、检查与版本控制配置，保留供本地 IDE 使用。 |
| `.claude/` | 本地 Claude Code 权限配置，保留供本地工具使用。 |

## 3. `src/` 应用入口

| 文件 | 作用 |
| --- | --- |
| `src/main.tsx` | 创建 React 根节点，挂载 `BrowserRouter`，并引入全局样式。 |
| `src/App.tsx` | 路由表：`/` 重定向到 `/world`；`/world` 是三维街区；`/world/gallery` 是 E-01 内容页；`/world/learning` 与 `/world/ai-lab` 是 Coming Soon；其他路径进入 404。另含路由切换时回到页面顶部的逻辑。 |

## 4. `src/pages/` 路由页面

| 文件 | 作用 |
| --- | --- |
| `WorldPage.tsx` | 三维街区页面。组合 `WorldCanvas`、HUD、引导/加载/回退界面、灯箱、目录、设置和移动端控件；负责页面级快捷键、快照保存与从内容页返回后的恢复。 |
| `GalleryPage.tsx` | E-01「视觉与摄影馆」内容页。读取 `world/data/artworks.ts` 中的作品数据，展示网格列表，并用 `ArtworkModal` 打开单幅作品。 |
| `ComingSoonPage.tsx` | E-02 学习馆与 E-03 AI 实验室的占位页，通过 `variant` 复用同一套 Coming Soon 布局。 |
| `NotFoundPage.tsx` | 未匹配路由的 404 页面，提供返回街区的入口。 |

## 5. `src/components/` 界面组件

组件按职责分类；新增组件时应放入对应文件夹，而不是继续堆在 `components/` 根目录。

### 5.1 `common/` 通用视觉元素

| 文件 | 作用 |
| --- | --- |
| `common/Icons.tsx` | 无外部图标库的内联 SVG 图标集：网格、滑杆、关闭、箭头、锁、重置、指南针。统一接收 `size` 与 `className`。 |

### 5.2 `hud/` 探索状态界面

| 文件 | 作用 |
| --- | --- |
| `hud/Hud.tsx` | 探索 HUD：区域名称、操作提示、互动提示、锁定提示、FPS / draw calls / 三角面统计、目录与设置按钮、底部提示。 |
| `hud/TouchControls.tsx` | 移动端虚拟摇杆与互动按钮；通过 `worldBridge` 把触摸输入送进三维引擎，不直接操作 Three.js。 |

### 5.3 `overlays/` 覆盖层与面板

| 文件 | 作用 |
| --- | --- |
| `overlays/OverlayPanel.tsx` | 目录和设置共用的遮罩、面板、标题栏、关闭按钮与键盘焦点处理。 |
| `overlays/Lightbox.tsx` | 展位灯箱：读取展品数据，支持滚轮/加减键缩放、双击放大、拖动查看、复位、上一幅/下一幅和关闭恢复探索。 |
| `overlays/DirectoryPanel.tsx` | 展区目录：列出图片展位和三座展馆，支持点击传送/进入，未开放项显示锁定状态。 |
| `overlays/SettingsPanel.tsx` | 设置面板：HIGH / SMOOTH 画质、视差开关、减少动画、清除位置快照并回到出生点。 |
| `overlays/ArtworkModal.tsx` | E-01 内容页的单幅作品弹窗，支持上一幅、下一幅和关闭；不复用于三维街区的灯箱。 |

### 5.4 `screens/` 全屏页面状态

| 文件 | 作用 |
| --- | --- |
| `screens/LoadingScreen.tsx` | 启动加载界面，显示引导进度与文案。 |
| `screens/IntroScreen.tsx` | 进入街区前的引导页，说明操作方式并提供「进入街区 / 继续探索」按钮。 |
| `screens/FallbackScreen.tsx` | WebGL2 初始化失败时的回退页，说明仍可访问的独立内容页。 |

### 5.5 `world/` 三维画布适配层

| 文件 | 作用 |
| --- | --- |
| `world/WorldCanvas.tsx` | React 与 `WorldEngine` 的边界：创建 `<canvas>`、实例化引擎、注册 `worldBridge`、同步引擎回调到 Zustand，并在卸载时销毁引擎。 |

## 6. `src/state/` 与 `src/ui/`

| 文件 | 作用 |
| --- | --- |
| `state/worldStore.ts` | 全局 UI 状态机。管理 `loading / intro / exploring / lightbox / directory / settings / transitioning / fallback` 模式、焦点、灯箱 ID、区域、HUD 可见性、Toast、渲染统计和画质/视差/减少动画设置。所有覆盖层状态都从这里派生，避免多个面板同时打开。 |
| `ui/copy.ts` | 集中管理界面文案：世界名称、加载语、引导段落、按钮、回退说明、覆盖层提示。 |
| `ui/usePageTitle.ts` | 页面标题 Hook，进入不同路由时更新 `document.title`。 |

## 7. `src/styles/`

| 文件 | 作用 |
| --- | --- |
| `styles/global.css` | 唯一全局样式文件。定义色彩/间距/字体/动效 token，以及加载页、引导页、HUD、灯箱、目录、设置、内容页、404、移动端虚拟摇杆和响应式断点。 |

## 8. `src/world/` 三维世界

### 8.1 根级模块

| 文件 | 作用 |
| --- | --- |
| `world/bridge.ts` | 极简事件桥。React 侧调用 `interact`、`resetToSpawn`、`setTouchMove`，引擎侧注册实现，避免 UI 直接持有 Three.js 对象。 |
| `world/snapshot.ts` | 位置快照。把脚底坐标、朝向、进入过的展馆 ID 写入 `sessionStorage` 的 `lohina-world:snapshot:v1`；读取时校验坐标边界和碰撞体，失效则回到出生点。 |

### 8.2 `world/config/` 空间与类型配置

| 文件 | 作用 |
| --- | --- |
| `config/types.ts` | 全项目共享类型：三维向量、建筑变体、展位/展馆、图片、交互范围、盒体/圆柱碰撞体、区域、画质、设置、快照和焦点信息。 |
| `config/world.ts` | 世界的唯一数据源。包含调色板、世界边界、出生点、相机与角色参数、三座建筑、五个画框展位、三个展馆入口、长椅/花坛/灯柱/道路/导视线、区域定义、全部碰撞体、画质预设，以及展品查询函数。改布局优先改这里，而不是散落到建模代码。 |

### 8.3 `world/data/` 内容数据

| 文件 | 作用 |
| --- | --- |
| `data/artworks.ts` | 五幅演示作品（W1–W5）的标题、说明、尺寸、来源标注和 Canvas 程序化绘制配方。正式作品接入时替换 `previewUrl / width / height`，展位与灯箱接口保持不变。 |

### 8.4 `world/engine/` 运行时

| 文件 | 作用 |
| --- | --- |
| `engine/WorldEngine.ts` | 三维世界总控。创建渲染器、场景、相机、灯光和环境贴图；组装地面、天空、建筑、展位与道具；初始化 Rapier 物理、角色、交互检测、快照与画质切换；运行渲染循环、处理窗口尺寸、输出 `sceneStats` 和 DEV 调试 API。 |
| `engine/controller.ts` | Rapier 物理世界和运动学角色控制器。创建固定步长物理世界与全部碰撞体，把键盘/摇杆输入转换为移动、转向、重力和碰撞结果。 |
| `engine/camera.ts` | `FollowCamera`。实现固定方位角的斜上方跟随、指数阻尼、有限鼠标视差和相机防穿墙。 |
| `engine/player.ts` | 程序化占位角色。生成身体、四肢、背包、接地阴影，提供行走/待机姿态与朝向更新；正式角色模型后续在此替换。 |

### 8.5 `world/procedural/` 程序化美术

| 文件 | 作用 |
| --- | --- |
| `procedural/textures.ts` | 用 Canvas 运行时生成地面噪声、天空渐变、发光贴图、接地阴影、星点、横/竖招牌、屏幕和围挡纹理。项目当前不依赖外部图片或模型。 |
| `procedural/materials.ts` | 材质库。集中创建墙面、砂岩、金属、玻璃、发光、导视、海报、标签等材质，并输出共享的 `MaterialBundle`，便于合并与统一调色。 |
| `procedural/buildings.ts` | 程序化建筑生成器。按 `BuildingSpec` 构建双塔、三座展馆、屋顶设备、立面细节、招牌、入口和遮挡壳。 |
| `procedural/street.ts` | 街区环境生成器。负责地面与道路、天空、远景天际线、中央双环雕塑与灯带、五个画框展位、长椅、花坛、灯柱、导视、道具和空气微粒。 |
| `procedural/merge.ts` | 静态网格合并。按材质、渲染顺序和深度写入策略合并静态网格，降低 draw calls；角色、雕塑、遮挡壳、透明发光体和独立贴图对象保持独立。 |

## 9. `scripts/` 开发期脚本

这两个脚本不属于生产运行时，也不参与打包。

| 文件 | 作用 |
| --- | --- |
| `verify.mjs` | Playwright + Edge + SwiftShader 的端到端验收。走完加载、引导、出生点、中央广场、W1 灯箱、E-01 进入/返回、目录、设置、SMOOTH 画质和移动端流程，并覆盖 `docs/screenshots/` 下的 13 张截图。运行前需先启动 `npm run dev`，并确保本机已安装 Playwright 与 Edge。 |
| `stats.mjs` | 读取页面内 `window.__lohina.sceneStats()`，输出当前场景的 draw calls、三角面、网格数、阴影投射体、透明对象和材质数量，用于性能回归。 |

## 10. `docs/` 文档与证据

| 路径 | 作用 |
| --- | --- |
| `docs/PROJECT_STRUCTURE.md` | 本文档。 |
| `docs/screenshots/01-intro.png` | 桌面端引导页。 |
| `docs/screenshots/02-spawn.png` | 出生点 / 南侧入口。 |
| `docs/screenshots/03-plaza.png` | 中央广场与双环雕塑。 |
| `docs/screenshots/04-frame-west.png` | W1 近景展位与互动提示。 |
| `docs/screenshots/05-lightbox.png` | W1 灯箱。 |
| `docs/screenshots/06-portal.png` | E-01 展馆入口提示。 |
| `docs/screenshots/07-gallery.png` | E-01 内容页。 |
| `docs/screenshots/08-return.png` | 从内容页返回街区。 |
| `docs/screenshots/09-directory.png` | 展区目录。 |
| `docs/screenshots/10-settings.png` | 设置面板。 |
| `docs/screenshots/11-quality-low.png` | SMOOTH 画质。 |
| `docs/screenshots/12-mobile-intro.png` | 移动端引导页。 |
| `docs/screenshots/13-mobile-explore.png` | 移动端探索画面。 |

截图是验收证据，不是运行时资源；应用本身不引用该目录。

## 11. 新增文件放置规则

| 要新增的内容 | 放置位置 |
| --- | --- |
| 新路由页面 | `src/pages/`，并在 `src/App.tsx` 注册 |
| 新 HUD 元素 | `src/components/hud/` |
| 新弹窗、灯箱、面板 | `src/components/overlays/` |
| 新全屏状态页 | `src/components/screens/` |
| 新通用图标 | `src/components/common/Icons.tsx` |
| 新 UI 状态 | `src/state/worldStore.ts` |
| 新文案 | `src/ui/copy.ts` |
| 新建筑/展位/展馆数据 | `src/world/config/world.ts` 与 `types.ts` |
| 新作品数据 | `src/world/data/artworks.ts` |
| 新程序化材质/纹理/建筑 | `src/world/procedural/` |
| 新角色或相机行为 | `src/world/engine/` |
| 验收脚本 | `scripts/`，并在 README 说明前置条件 |
| 设计稿、规范、结构文档 | `docs/` |

## 12. 本轮清理记录

- 将异常命名的 `AGENTS .md` 规范化为 `AGENTS.md`，内容未改动。
- 删除可再生的 `dist/` 构建产物。
- 删除一次性诊断脚本 `probe.mjs`、`w1.mjs`、`mobile-probe.mjs`、`overlay-probe.mjs`；保留可复用的 `verify.mjs` 与 `stats.mjs`。
- 将原本扁平的 `src/components/` 按职责拆分为 `common/`、`hud/`、`overlays/`、`screens/`、`world/`，并同步全部相对导入。
- 保留 `.idea/` 与 `.claude/`，它们是本地开发工具配置，不属于无用构建产物。
