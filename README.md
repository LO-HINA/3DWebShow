# LOHINA WORLD · Round 01

暮光新野兽派风格的 3D 学习成果街区。当前版本是第一轮可运行初稿，目标是验证街区布局、角色探索手感，以及中央广场一带的视觉完成度。

## 环境要求

- Node.js 20.19+ 或 22.12+（Vite 7 要求）
- 支持 WebGL 2 的现代浏览器
- 推荐桌面端体验；移动端提供虚拟摇杆与触摸交互

## 安装与启动

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev
```

打开 `http://localhost:5173/world`。根路径 `/` 会重定向到 `/world`。

生产构建与本地预览：

```bash
npm run build
npm run preview
```

类型检查：

```bash
npm run typecheck
```

## 操作

| 操作 | 键位 |
| --- | --- |
| 行走 | `W` `A` `S` `D` / 方向键 |
| 视角 | 鼠标移动（有限视差，不改变固定方位角） |
| 互动 | `E` / `Enter` |
| 目录 | `C` |
| 设置 | 右上角「设置」按钮 |
| 隐藏 HUD | `H` |
| 关闭灯箱 / 覆盖层 | `Esc` |

移动端：左下角虚拟摇杆移动，靠近展位后点击右下角互动按钮。

## 已实现（Round 01）

- 完整街区基础体量：双塔 T-01 / T-02、三座展馆 E-01 / E-02 / E-03、中央广场、东南装置小院，以及环路和岔路。
- 程序化建筑、地面、导视、长椅、灯柱、绿植与演示图片，无外部美术素材依赖。
- 占位角色：移动、平滑转向、Rapier 运动学碰撞、地面胶囊、斜上方固定方位角跟随相机、相机防穿墙。
- 占位角色的行走 / 待机动画、缩短动画选项、真实阴影与接地阴影。
- 中央广场重点细化：双环雕塑、环形灯带、暖色灯槽、青色导视、暮光照明、南向暖色补光、屋顶细节。
- 5 个近景图片展位（W1–W5），其中 W1–W3 位于西侧图片街，W4–W5 位于东南小院。
- 靠近展位显示提示，`E` 打开灯箱；灯箱支持滚轮 / 加减键缩放、双击放大、拖动查看、复位，关闭后恢复探索状态。
- E-01 展馆入口可进入 `/world/gallery` 内容页，并通过「返回街区」回到原位置。
- E-02、E-03 保留清晰入口标识，对应页面暂为 Coming Soon。
- 目录、设置面板、画质切换（HIGH / SMOOTH）、减少动画、视差开关、清除快照。
- 位置快照：`sessionStorage`，每 2 秒自动保存，刷新或从内容页返回后恢复；清除快照可回到出生点。
- 响应式 HUD 与移动端虚拟摇杆。
- 静态网格合并优化：建筑遮挡壳、雕塑、角色、透明发光体与贴图铭牌保留独立节点，其余按材质跨组合并。

## 尚未完成 / 后续里程碑

- E-02、E-03 的正式内容页（目前为 Coming Soon）。
- P1–P4 高楼海报的检查模式与完整内容。
- 正式角色模型（当前为程序化占位小人）。
- Bloom、动态反射、景深等后处理；当前基础场景不依赖它们。
- 完整音效、更多展品、正式作品素材与版权信息。
- 更细的移动端真机适配与性能分级。

## 本轮验证

验证环境：Windows 11、Edge + SwiftShader（Playwright headless）、1440×900 与 390×844。

已执行：

```bash
npm run typecheck   # 通过
npm run build       # 通过
node scripts/verify.mjs  # 浏览器流程验收 + 截图
```

浏览器流程验证结果：

- `/world` 加载后进入 intro，点击「进入街区」进入探索状态。
- 出生点、中央广场、W1 展位、E-01 入口均有对应 HUD 区域与互动提示。
- W1 灯箱可打开、关闭，关闭后探索状态恢复。
- E-01 可进入 `/world/gallery`，点击返回后回到街区入口位置。
- 目录、设置、画质切换可用。
- 移动端 390×844 下虚拟摇杆与 HUD 存在，intro 与探索画面正常渲染。

渲染统计（headless SwiftShader，非真实 GPU 性能）：

| 场景 | Draw calls | 三角面 |
| --- | --- | --- |
| 出生点 | 150 | 约 40k |
| 中央广场 | 150 | 约 40k |
| W1 展位 | 150 | 约 40k |
| SMOOTH 画质 | 109 | 约 40k |

均满足 `AGENTS.md` 的桌面目标：可见三角面 ≤150k、draw calls ≤150。此数据来自 SwiftShader 软件渲染，不代表真实显卡帧率。

## 截图

截图位于 `docs/screenshots/`：

| 文件 | 内容 |
| --- | --- |
| `01-intro.png` | 桌面端引导页 |
| `02-spawn.png` | 出生点 / 南侧入口 |
| `03-plaza.png` | 中央广场与双环雕塑 |
| `04-frame-west.png` | W1 近景展位与互动提示 |
| `05-lightbox.png` | W1 灯箱 |
| `06-portal.png` | E-01 展馆入口提示 |
| `07-gallery.png` | E-01 内容页 |
| `08-return.png` | 从内容页返回街区 |
| `09-directory.png` | 展区目录 |
| `10-settings.png` | 设置面板 |
| `11-quality-low.png` | SMOOTH 画质 |
| `12-mobile-intro.png` | 移动端引导页 |
| `13-mobile-explore.png` | 移动端探索画面 |

## 已知问题与限制

- **W1–W3 画框视角偏斜**：规范要求西侧画框 `yaw=90°`（面向东），而跟随相机固定从南向北看，因此靠近时画框呈明显斜视。当前主要通过灯箱完整查看；已在代码与验收记录中登记为布局 / 相机组合的视觉限制。
- **W5 文档偏差**：配置表标注 `yaw=180°`，为让地面交互点位于画框南侧并朝向观众，实现为 `yaw=0`，详见 `src/world/config/world.ts` 注释。
- **headless 帧率不代表真机**：SwiftShader 下约 1–3 FPS，角色移动因 `delta` 上限显得慢；未在真实 GPU 上测量帧率。
- **冷加载目标未实测**：本地 dev 约 1.4 秒进入 intro，但未按「10 Mbps / 150 ms RTT」条件验证 8 秒冷加载目标。
- **构建体积警告**：主 JS 约 5.27 MB（gzip 约 1.9 MB），主要来自 Rapier WASM；构建提示 chunk 超过 1600 kB，尚未做代码分割。
- **控制台警告**：`THREE.Clock` 弃用提示；headless 环境不支持 `KHR_parallel_shader_compile`。均不影响运行。
- **移动端仅模拟验证**：使用 Playwright 触摸模拟，未在真实手机 / 平板上验证手势与性能。
- **缩略图与互动对象**：灯箱与画框共用程序化演示图，正式作品素材待接入。

## 验收脚本说明

`scripts/verify.mjs` 与 `scripts/stats.mjs` 为开发期验收脚本，不属于生产依赖，也不参与打包。运行前需要：

1. 已启动 `npm run dev`（默认 `http://127.0.0.1:5173`）。
2. 本机安装 Playwright 与 Edge。脚本使用 `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` 与 SwiftShader，路径不同需自行调整。

## 目录结构

逐文件说明见 [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md)。

```text
src/
  components/
    common/          通用图标等基础视觉元素
    hud/             探索 HUD 与移动端虚拟摇杆
    overlays/        灯箱、目录、设置与作品弹窗
    screens/         加载、引导与 WebGL 回退页
    world/           三维画布与 React 的适配层
  pages/             街区、E-01 内容页、Coming Soon、404
  state/             Zustand 世界状态机
  styles/            全局设计系统与响应式样式
  ui/                界面文案与页面标题 Hook
  world/
    config/          街区、展位、区域、碰撞与出生点配置
    data/            展品与程序化演示图数据
    engine/          渲染、输入、相机、角色、物理、交互与快照
    procedural/      建筑、街道、材质、纹理与静态合并
scripts/             浏览器验收与渲染统计脚本
docs/
  PROJECT_STRUCTURE.md  逐文件项目结构说明
  screenshots/          验收截图
```

可再生产物与本地工具目录：`node_modules/`（依赖）、`dist/`（构建产物，已清理）、`.idea/`（IDE 配置）、`.claude/`（本地工具配置）。

