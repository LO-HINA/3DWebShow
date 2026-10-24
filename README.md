# LOHINA WORLD · Round 01 + E-01 / T-02 / T-03 / B-01

**首次接手先读 [当前任务与 agent 交接说明](docs/CURRENT_TASK.md)**：当前工作范围、必须保留的功能、文件归属、启动端口和证据状态集中在那里。本 README 后半部分保留历史模块记录，不能把每个“本轮”当成同一次构建。

暮光新野兽派风格的 3D 学习成果街区。当前版本在 Round 01 可运行初稿基础上，完成 E-01「视觉与摄影馆」与 T-02 品牌塔的建筑美术精修，接入 T-03 媒体塔，并完成 B-01「北岸媒体楼」的结构模式、四面错层漫画与流动光幕第一轮；已按 `AGENTS.md` V3.0 核对当前进度。本 README 是并行 agent 的进度总览；模块细节以各自评审文档为准，文档导航见 [`docs/README.md`](docs/README.md)。

> 最后更新：2026-10-24  
> 当前阶段：AGENTS V3.0 的 P0（E-01 样板、镜头、角色、原有建筑实体窗与光影）收尾；T-02 立面、T-03 媒体塔与 B-01 媒体楼已进入工作区；P1 目录迁移首批完成；中央大屏 `HUB-SCREEN` 与世界切换尚未实现。真实 GPU 视觉、连续手感与性能验收仍未完成。

## 本轮八栋建筑与光影改造

当前B-01已按用户选择整体挪到广场西侧空地，方便同世界打磨。开发服务直达 `/world?workshop=B-01`；位置和检查见 [建筑打磨区](docs/building-workshop/README.md)。

新街区规划（2026-10-24，待实施）：用户已按手绘俯视图重新规划建筑群，目前只确认 `M`、`SCREEN`、`NW(0)`、`SW(0)`、`NE(0)`、`SE(0)`，媒体楼是 `SE(0)` 而非 `SW(0)`。该规划尚未替换当前运行布局，不据此移动或删除现有建筑；编号规则、待定项、工程影响与分阶段计划见 [新街区规划](docs/block-plan/README.md)。

最新 LM-01 试做（2026-10-24）：候选扩大为14m×11.8m，人物在光轨下方出生，四角拱架让出中央通路。固定倾角的分段白芯光轨外带青色/蓝紫柔光，流光短尾与双球独立运行；地球/月亮保留模型位。出生庭按E打开轨道中枢 `/world/observatory`，页面接入配置在 `src/content/observatoryDestinations.ts`。构建、通路、Rapier和页面服务端渲染检查通过，实际三视角、连续录屏与完整浏览器往返仍未验收。详见 [最新记录](docs/orrery-review/2026-10-24.md)。

现有八栋已接入实体窗框、内凹玻璃和窗后空间，保留原位置、入口与媒体内容。精细画质开启分区窗光辉光及统一湿地面反射，流畅画质保留实窗、关闭增强。主场景仍为 WebGL2。实现、调参、检查和未完成的 GPU/运行视觉验收见 [本轮记录](docs/city-style-review/README.md)。

第二轮已补足厚窗台、楼板边、遮阳板/支架、竖肋和实体百叶；普通楼后墙相对原立面内退目标约 1.35m，玻璃后退约 0.46m。塔楼与展馆分别使用竖向、横向、盒式构件，降低整片亮窗背板的发光。正视/斜视射线检查通过，当前仍不能宣称“贴图感已通过视觉验收”。参数位置、逐栋覆盖与操作验收清单见同一记录。

城市光影这一轮仍没有逐栋浏览器截图、真实性能或主观视觉验收结论；较早的自动采集受 `WinError 5` 限制。B-01 已单独用 Playwright + Edge + SwiftShader 补齐固定机位，见后文与 `docs/screenshots/b01/`。各模块旧截图与旧统计不能替代本轮证据。

## 当前进度（多 agent 交接）

| 模块 | 状态 | 主要文件 | 证据 / 限制 |
| --- | --- | --- | --- |
| 街区基础与中心区 | 可运行 | `src/worlds/cyberpunk/layout.ts`、`src/worlds/cyberpunk/props/street.ts`、`src/worlds/cyberpunk/buildings/buildings.ts` | 双塔、三馆、广场、环路、虚空街区与 5 个画框展位已接入 |
| E-01 建筑美术样板 | 完成第一轮 | `src/worlds/cyberpunk/buildings/buildings.ts` 的 `gallery()`、`src/worlds/cyberpunk/textures.ts`、`WorldEngine.ts` 的 E-01 灯光 | 01–06 截图与前后性能已记录；05/06 宽景 160/192 calls，超过 150 目标 |
| T-02 品牌塔立面精修 | 完成第一轮（工作区） | `buildings.ts` 的 `towerB()`、`textures.ts` 的竖向字标选项 | 截图见 `docs/screenshots/t02/after/`；未单独记录 draw calls，宽景统计待复测 |
| T-03 媒体塔 | 已接入，素材待补齐 | `buildings/mediaTower.ts`、`media.ts`、`layout.ts` 的 `MEDIA_TOWER`、`colliders.ts` | 图片 2 张、暂无视频；素材清单与操作说明见 `public/assets/worlds/cyberpunk/media/README.md` |
| B-01 北岸媒体楼 | 四面错层漫画与流动光幕第一轮完成（工作区） | `buildings/heroMedia.ts`、`buildings/b01MediaConfig.ts`、`layout.ts` 的 `B-01`、`buildings/buildings.ts` 的 `heroMedia` 分支 | 四立面截图、街区关系图与 33.48s 绕楼录屏见 `docs/screenshots/b01/facades/`；结构模式 7 张见 `structure/`；typecheck/build 通过；真实 GPU、连续操作与性能未验收 |
| H-01 母版媒体楼 | 已接入（工作区） | `buildings/heroBuilding.ts`、`layout.ts` 的 `H-01` | 保留 7 个媒体槽；截图见 `docs/screenshots/hero/after/`；未单独验收性能 |
| 广场大屏 SCREEN-01 | 静态 8m 屏已接入；画幕改版提案未应用 | `props/plazaScreen.ts`、`plazaScreenConfig.ts`、`props/artCurtainProposal.ts` | 正式场景仍是 8m 屏；12m / 14m 画幕仅有几何投影方案图，非运行截图 |
| 近地探索镜头与人物淡出 | 静态关键状态与移动贴墙跟随已通过；运行效果待验收 | `src/engine/camera/follow.ts`、`collision.ts`、`avatarFade.ts`、`WorldEngine.ts` 的 CAMERA INTEGRATION | Playwright + Edge 实机截图：俯视到仰视 85°、近距材质 α=0 与恢复、直墙/墙角旋转恢复、低机位 T-01；2026-10-23 增加移动中沿墙/绕角/折返的浏览器采样，镜头停滞 0 帧。`F3` 调试面板可复核；连续录屏、真实 GPU 透明排序与手感仍未验收 |
| 角色运动与步态 | 已有，暂不再改 | `src/engine/player/controller.ts`、`avatar.ts`、`gait.ts` | 原运动评审已有记录；本轮迁移路径与注入地图边界，保留动作与步态参数 |
| E-01 内容页 | 可用 | `pages/GalleryPage.tsx`、`src/content/artworks/index.ts` | `/world/gallery` 可进入并返回原位置；E-02/E-03 仍为 Coming Soon |
| 中央大屏与世界切换 | 未开始（P1） | 目标为 `features/world-screen`、`worlds/*` | 广场现有 SCREEN-01 只是静态封面屏，没有 `HUB-SCREEN`、主题滑条和跨世界快照 |
| 世界模块架构迁移 | 首批完成（P1） | `src/app`、`src/engine`、`src/worlds/cyberpunk`、`src/features`、`src/content` | 角色/镜头解耦，赛博配置拆分；完整 WorldHandle 与多世界切换待后续实现 |

当前建筑细化与 B-01 的检查结果（2026-10-24）：`npx tsc --noEmit`、依赖边界（177 个本地 import）与当前工作区的 `npm run build` 通过；生产构建主 JS 5,451.67 kB / gzip 1,963.11 kB。八栋几何/媒体槽/射线遮挡检查为 2026-10-23 记录，早于本轮 B-01 四面媒体改动，需重跑后再引用。较早的受限会话曾在 Vite 启动子进程时遇到 `spawn EPERM`、在浏览器驱动启动时遇到 `WinError 5`；B-01 已改用 Playwright + Edge + SwiftShader 完成固定机位与绕楼录屏采集，城市光影的逐栋采集仍未完成。固定机位截图、calls / 三角面与软件渲染录屏不能替代真实 GPU、连续操作与主观视觉验收。

以下命令保留各模块最近一次结果；历史包体积、截图与通过记录只在注明适用构建时使用：

```bash
npm run dev             # 开发服务器 127.0.0.1:5173
npm run typecheck       # 通过
npm run build           # 通过；主 JS 5,451.67 kB / gzip 1,963.11 kB，仍有 chunk 体积警告
node scripts/check-dependencies.mjs # 177 个本地 import（2026-10-24）
node .camera-preview/check-exploration-camera.mjs # 通过：地面、俯仰、墙角、移动贴墙跟随、淡出、快照
node .camera-preview/check-camera.mjs # 通过：移动、跳跃、镜头碰撞与快照
node scripts/camera-follow-check.mjs # 需先 npm run dev；沿墙/绕角/恢复的浏览器采样
node scripts/verify.mjs # 通过：W1 灯箱、E-01 进入/返回、目录、设置、移动端模拟
node scripts/e01-check.mjs after  # E-01 01–06 截图与渲染统计
node scripts/b01-check.mjs        # 需先 npm run dev；脚本连接 127.0.0.1:5174
node scripts/b01-facades.mjs      # 同上；四立面、街区关系与绕楼录屏
node scripts/b01-structure.mjs    # 同上；?b01=structure 的 7 张结构图
node scripts/b01-full.mjs         # 同上；B-01 全高与转角
```

## 给并行 agent 的交接约定

- **E-01 现有成果不要回退**：`gallery()` 的体量、真实门洞、分层橱窗、背面服务套件、主视觉纹理和 `street.ts` 的导视位置均为本轮成果；截图见 `docs/screenshots/e01/after/`。
- **`WorldEngine.ts` 是共享文件**：相机代理负责标有 `CAMERA INTEGRATION` 的字段与渲染顺序；E-01 灯光接入位于同一文件。修改时保留双方代码，并在交付说明中写明影响范围。
- **不要改写运动三文件**：`controller.ts`、`avatar.ts`、`gait.ts` 由运动代理维护；相机只读插值后的角色根节点，不改角色 transform。
- **截图与坐标联动**：若调整 E-01、画框或导视布局，需同步碰撞体、交互点、返回点和 `e01-check.mjs` 机位，并重跑 01–06。
- **验收证据分层**：静态截图只证明可见表现；镜头手感、角色动作和移动端体验需要连续录屏或实际操作，不能拿模型查看器或概念图代替。


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
| 行走 | `W` `A` `S` `D` / 方向键，最大速度 10m/s，无冲刺档位 |
| 跳跃 | `空格`，落地后可再次跳跃 |
| 视角 | 按住鼠标左键拖动；触屏直接拖动画面 |
| 距离 | 滚轮缩放，0.35–16m |
| 仰望高楼 / 返回跟随 | `V`，仰望时也可用 `Esc` 返回 |
| 跟随取景 | 设置 → 低位 / 中位 / 高位 |
| 互动 | `E` |
| 目录 | `C` |
| 设置 | 右上角「设置」按钮 |
| 隐藏 HUD | `H` |
| 关闭灯箱 / 覆盖层 | `Esc` |

移动端：左下角虚拟摇杆移动，轻推慢走、推满达到 10m/s；右侧点击「跳跃」起跳，靠近展位后显示互动按钮。

## 已实现

- 完整街区基础体量：双塔 T-01 / T-02、H-01 母版媒体楼、B-01 北岸媒体楼、三座展馆 E-01 / E-02 / E-03、媒体塔 T-03、中央广场、东南装置小院，以及环路和岔路。
- 程序化建筑、地面、导视、长椅、灯柱、绿植与演示图片，无外部美术素材依赖（媒体塔图片来自本地 `public/assets` 清单）。
- 原有八栋接入实体窗框、窗洞侧壁、窗后室内与分区窗光；精细画质启用选择性辉光和共享湿地面反射，流畅画质保留实体窗、关闭增强。实现与限制见 [`docs/city-style-review/README.md`](docs/city-style-review/README.md)。
- B-01 结构审阅模式：`/world?b01=structure` 隐藏四面漫画、流动光幕、`LOHINA` 标识、霓虹与增强光，只保留建筑、入口、设备层、媒体洞、安装框体与钢冠顶，并用仅该模式可见的中性审阅灯检查体量；最终模式再加回漫画、光幕与泛光。
- 占位角色：按相机地面朝向行走、斜向归一化、独立转向响应、Rapier 运动学碰撞、固定物理步长与渲染插值。
- 普通移动最大速度 10m/s，已按最新要求移除冲刺功能、Shift 加速和手机冲刺按钮；保留空格跳跃。跳跃包含重力、落地、头顶碰撞与起跳缓冲，空中不能二段跳。修复原先每帧截断为 0.05s 导致低帧率移动变慢的问题。
- 第三人称可旋转跟随：上身与前方空间构图、拖动旋转和俯仰、滚轮距离、三档取景、镜头球扫掠防穿墙与胸部/头部遮挡检测。
- 独立仰望模式：主动按 V 进入，暂停移动、观察目标上移；退出恢复普通跟随的方位、俯角与距离。
- 占位角色的行走 / 待机动画、缩短动画选项、真实阴影与接地阴影。
- 角色运动本轮改为髋／膝／踝／脚趾关节与距离驱动步态：物理记录碰撞后的实际速度和路程，动画每个渲染帧更新一次，支撑脚保持世界位置，包含起停、转向、跑步及简化腾空／落地姿态。实现与未完成的连续录屏见 [角色运动评审记录](docs/locomotion-review/README.md)。
- 中央广场重点细化：双环雕塑、环形灯带、暖色灯槽、青色导视、暮光照明、南向暖色补光、屋顶细节。
- 广场静态大屏 `SCREEN-01`：`(0, 0, -6.4)`、8×4.5m、双支撑，展示本地赛博封面；图片失败时保留外壳与暗色屏底。
- 5 个近景图片展位（W1–W5），其中 W1–W3 位于西侧图片街，W4–W5 位于东南小院。
- 靠近展位显示提示，`E` 打开灯箱；灯箱支持滚轮 / 加减键缩放、双击放大、拖动查看、复位，关闭后恢复探索状态。
- E-01 展馆入口可进入 `/world/gallery` 内容页，并通过「返回街区」回到原位置。
- E-02、E-03 保留清晰入口标识，对应页面暂为 Coming Soon。
- 目录、设置面板、画质切换（HIGH / SMOOTH）、减少动画、三档取景、清除快照。
- 位置与镜头快照：`sessionStorage`，每 2 秒自动保存，刷新或从内容页返回后恢复；兼容旧位置快照，清除后回到出生点。
- 响应式 HUD 与移动端虚拟摇杆。
- 静态网格合并优化：建筑遮挡壳、雕塑、角色、透明发光体与贴图铭牌保留独立节点，其余按材质跨组合并。
- 中心街区不设可见围栏或边界碰撞体：64×64 中心地面边缘用渐变沉入虚空，玩家可以直接走进外围。
- 无垠黑色街区：以玩家为中心、覆盖 23×23 个世界格子、共 2,116 个实例的黑色建筑，按世界坐标确定性生成并合并为单个 `InstancedMesh`；跨格时只补新格、复用旧格，天空与虚空地面跟随玩家，因此常驻实例数量、draw calls 与行走距离无关。媒体塔周围半径 34m 作为 `keepOut` 区域，不生成虚空建筑。
- 虚空地面为 2400×2400 的大平面，天空球半径 700、星空半径约 520–560，雾在 90–580m 收敛，避免地平线露出球体或平面边缘；虚空建筑不参与阴影，也不阻挡角色，作为不可进入的剪影层。

## E-01 展馆精修（2026-10-22）

以现有 E-01 为基础完成的美术样板轮，保留建筑 ID、世界坐标 `(-19, 0, 4)`、占地 `9×12`、`yaw=90°`、门朝东、入口交互点 `(-12, 0, 4)` 与返回点 `(-10.5, 0, 4)`。程序化生成入口仍是 `src/worlds/cyberpunk/buildings/buildings.ts` 的 `gallery()`，没有另建 Blender 版本。

本轮改动：

- **形体**：基座压低到 0.30m，主体 8.5×4.05×11.2m，屋顶灯笼体偏心 1.6m，增加深色压顶、女儿墙、空调机组、排气管与天线，形成“基座 + 采光体 + 压顶”的主次关系。
- **入口**：东立面拆成墙垛，留出 2.36m 宽真实门洞；背板后退 0.5m，双层玻璃门、铜门套、侧壁灯槽、门槛、雨棚、拉杆与低亮度门头铜牌逐层叠出厚度。
- **门窗**：主橱窗与竖向海报窗均有凹槽、铜框、玻璃、遮光盒、灯带和窗台；侧立面与灯笼体高窗补齐窗框和退进，不再是贴墙发光块。
- **主视觉**：新增 1024×720 的暮光建筑主图，重排城市剪影、砂岩层与日盘的绘制顺序，保证日盘完整；玻璃透明度降到 0.06，画面在正常游玩距离可读。
- **信息层级**：门头 `GALLERY / 视觉与摄影` 为一级，主视觉与 `暮光构造` 说明为二级，窄窗海报与青色编号为三级；画框展位向两侧让开入口。
- **背面与侧面**：新增服务门、把手、门头灯槽、背标、百叶、检修口、落水管、墙缝与基座带；背面服务灯移到墙外，避免被墙体遮挡。
- **导视**：西侧图片街导视牌移到 `(-7.7, 0, 15.4)`，退出 E-01 正面、侧前方和入口机位，不再切断建筑轮廓。
- **材质与灯光**：铜框 `#6b523b`、深铜 `#2a241f`、凹槽 `#06070b`、玻璃 `#6f8a9e / 0.06`；主光、门洞补光、背面服务灯分层，关闭 Bloom 与反射时仍可读。

建筑风格、材质角色、倒角尺度、门窗构造、招牌排版、灯光用法与可复用构件已整理到 [`docs/E01_STYLE_GUIDE.md`](docs/E01_STYLE_GUIDE.md)，对应 AGENTS V3.0 第 1.7 节；后续建筑应先继承这些规则，再发展自己的轮廓与用途。

### 同机位对比

截图位于 `docs/screenshots/e01/`。01、02、03、05 的前后机位一致；04 本轮改为近景机位，旧 04 不与新 04 直接对比；06 为本轮新增的背面检查。

| 机位 | 修改前 | 修改后 |
| --- | --- | --- |
| 01 正面全景 | `before/01-front.png` | `after/01-front.png` |
| 02 侧前方体量 | `before/02-side-front.png` | `after/02-side-front.png` |
| 03 正常距离入口 | `before/03-entry.png` | `after/03-entry.png` |
| 04 门窗与画框近景 | `before/04-window.png`（旧机位，不直接对比） | `after/04-window.png` |
| 05 广场整体关系 | `before/05-context.png` | `after/05-context.png` |
| 06 背面 | 本轮新增 | `after/06-back.png` |

主视觉纹理单独检查图：`docs/screenshots/e01/feature-texture.png`。

### 渲染统计

验证环境：Windows 11、Edge + SwiftShader（Playwright headless）、1440×900。draw calls 与三角面来自 `window.__lohina.sceneStats()`，包含当帧阴影 pass；SwiftShader 帧率只用于回归，不代表真实 GPU 性能。下表记录 2026-10-22 的 E-01 精修构建，早于 T-02 立面重写、T-03 媒体塔和虚空街区 23×23 扩展；当前构建需重新采集。

| 机位 | 修改前 calls | 修改前三角面 | 修改后 calls | 修改后三角面 | 网格数 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 01 正面全景 | 112 | 31,530 | 137 | 39,806 | 137 |
| 02 侧前方 | 119 | 32,140 | 146 | 40,420 | 137 |
| 03 入口 | 111 | 31,528 | 128 | 39,314 | 137 |
| 04 近景 | 105（旧机位） | 31,042（旧机位） | 127 | 39,312 | 137 |
| 05 广场宽景 | 125 | 36,102 | 160 | 47,908 | 137 |
| 06 背面 | — | — | 192 | 50,116 | 137 |

结论与限制：

- 正面近景增加约 25 个 draw calls、8.3k 三角面，主要来自真实门洞、双层窗框、玻璃、主视觉/海报贴图、雨棚灯槽和背面细节；01–04 仍在 150 目标内。
- 05 广场宽景达到 160 calls，06 背面宽景达到 192 calls，超过 `AGENTS.md` 的桌面目标 150。原因是宽景同时纳入外围建筑、五个画框展位和 E-01 阴影 pass；尚未进一步合并，不能把这两个视角报告为达标。
- 本轮未在真实显卡上测量帧率，也没有可用的 GPU 时间线；无法给出真实 FPS、GPU ms 或显存占用。

### 交互与运行验证

- `node scripts/verify.mjs`：加载、引导、出生点、广场、W1 灯箱、E-01 进入 `/world/gallery` 并返回原位置、目录、设置、SMOOTH 画质、移动端摇杆与 HUD 全部通过。
- `node scripts/e01-check.mjs after`：重拍 01–06，并输出上述 calls / 三角面 / 网格数。
- 入口交互提示为「E 进入 E-01 视觉与摄影馆」，触发半径 1.8m；画框与入口的碰撞体、返回点未改动。
- `npm run typecheck`、`npm run build` 通过。

## T-02 立面精修与 T-03 媒体塔（2026-10-23，工作区改动）

这两项目前尚未提交，以下描述对应当前工作区代码；性能数字尚未重新采集。

### T-02 品牌塔

`buildings.ts` 的 `towerB()` 已重写立面，保留原建筑 ID、坐标 `(14, 0, -21)`、占地 `[11, 26, 8]`、`yaw=-15°` 与 P3/P4 海报插槽：

- 塔身改为深色玻璃壳体，用竖向幕墙框与约 3.9m 的楼层压带切分；窗格明暗由确定性种子按楼层成片生成，避免整面墙均匀发光。
- 正面新增 0.6m 深的海报媒体舱，双幅海报嵌在金属框内，舱内带极暗冷色洗墙；裙房上沿为横向字标，高层品牌由西侧竖招承担。
- 冠顶改为开放框架 + 金色 LED 环梁，与 T-03 同族但更紧凑；屋面设备压在四角，不穿透中心体块。
- 四角保留 LED 轮廓（正面青、背面金），不依赖 Bloom 或地面反射也能读出体块。
- 验收截图：`docs/screenshots/t02/after/`（01-plaza、02-front、02-west、03-facade、03-side、04-entry 等）。`scripts/t02-check.mjs` 可重拍，但脚本默认连接 `127.0.0.1:5174`，且当前未把统计写入 JSON。

### T-03 媒体塔

新增 `src/worlds/cyberpunk/buildings/mediaTower.ts` 与 `src/worlds/cyberpunk/media.ts`：

- 位置 `(44, 0, -38)`、`yaw=-49°`；裙房 40×16×32、塔身 30×112×22、塔身基座 16m。广场东北侧的主视觉高楼，正面对向广场中心。
- 立面分三段：下部为程序化流动霓虹 shader（暖金/青双色彗星光束）；中部为 26×30m 视频墙；上部为 26×18m 图片带；背面另有一条 18×10m 图片带。
- 没有素材时显示程序化待机画面；图片与视频各自独立轮播，没有视频时只有视频墙退回待机画面，不影响图片带。
- 图片通道最多加载 10 张，默认每 8 秒切换；视频通道按清单顺序播放、静音、循环到下一段。
- `layout.ts` 的 `MEDIA_TOWER` 负责尺寸与位置；`colliders.ts` 为裙房与塔身分别生成碰撞体；`WorldEngine` 在城市 `keepOut` 中为塔周围半径 34m 留空。
- 媒体塔独立成组，不参与场景级静态合并；`dispose()` 会释放自有材质、纹理、几何、视频元素和监听器。
- **限制**：当前只有 2 张图片、没有视频；未单独测量媒体塔视角的 draw calls / 三角面，也未在真实 GPU 上测量视频解码与帧率。

### 媒体素材清单

浏览器无法列目录，所有素材必须在 `public/assets/worlds/cyberpunk/media/manifest.json` 中登记：

```json
{
  "images": ["images/图片1.jpg", "images/图片2.jpg"],
  "videos": ["videos/视频1.mp4"],
  "imageDuration": 8,
  "videoFit": "cover"
}
```

把文件放进同目录的 `images/` 或 `videos/`，路径相对于 `media/`，不要写开头的 `/`。视频建议 H.264 MP4 或 WebM、1080p、静音；`videoFit` 可选 `cover` 或 `contain`。详细说明见 `public/assets/worlds/cyberpunk/media/README.md`。

## B-01 北岸媒体楼：四面错层漫画与流动光幕（2026-10-24，工作区改动）

B-01 位于 `(-32, 0, -34)`、`yaw=0`、占地 `14 × 40 × 12`，`variant: 'heroMedia'`，生成器为 `src/worlds/cyberpunk/buildings/heroMedia.ts`。本轮只优化四面立面媒体层：先把裙楼、塔身、退台和钢冠顶做成独立可读的结构，再把四面漫画、流动光幕与 `LOHINA` 标识作为立面层装入；最终模式与结构模式共用同一几何，不维护两个版本。建筑位置、入口、相机与其他建筑未改，共享文件未改。

### 结构审阅模式

打开 `/world?b01=structure` 后：

- 隐藏四幅漫画、四面光幕、入口与冠顶 `LOHINA` 标识、霓虹收口、媒体点光、湿地面反射与地面辉光。
- 保留建筑本体、入口门厅、东侧门廊、设备百叶、窗洞、媒体洞回壁、检修马道、爬梯、开放钢冠顶，以及漫画的凹入背板、内衬、细框、支撑臂与遮光檐。
- 只在该模式加入中性三向审阅光（冷色主光、冷色补光、暖色轮廓光）与门厅补光，避免夜间结构变成黑剪影。
- 审阅灯和隐藏逻辑只作用于 B-01，不改变最终媒体模式，也不影响其他建筑。

### 裙楼与入口

- 裙楼 `14 × 7.2 × 12m`，基座外扩 0.5m；主入口净宽 5.4m，前墙厚 3.45m。
- 玻璃门退入 1.65m，门后保留约 1.8m 门厅进深；门厅内有半透明门扇、金属接待台、暖色内壁、顶面和地面衬材。
- 东侧在 `x=4.95–6.85` 让出转角门廊，形成两面临街的深凹口，保留角柱、吊顶、地面衬材与服务门。
- 入口外侧保留雨棚、门头牌、侧壁灯槽和门前铺装；正常距离能看见门洞侧壁、雨棚底面与窗框厚度。

### 塔身、退台与冠顶

- 塔身 `11.2 × 25.2 × 9.2m`，基座 7.2m、顶面 32.4m；左右各 1.4m 结构墙垛夹住 `8.4 × 16m` 媒体洞。
- 媒体洞内有回壁、幕墙龙骨、检修马道与爬梯；屏幕最后才装入，结构模式仍能读出洞口深度。
- 正立面媒体洞下方与上方是实体墙和窗带；东立面布置五道竖鳍、七道层间板、`6 × 4` 深窗、外挑设备板与服务管井。
- 塔身顶部退台 `8.8 × 3.8 × 7.2m`；其上为四柱开放钢架与交叉斜撑，冠顶到 40m，预留屋顶广告牌框架。

### 四面错层漫画与流动光幕

- 配置集中在 `src/worlds/cyberpunk/buildings/b01MediaConfig.ts`：图片、原图比例、展位宽度、中心高度比例、水平偏移、tint 与光幕相位都在这里调整；`heroMedia.ts` 只负责生成安装构造和 shader。
- 可用塔身高度为裙房顶 `7.2m` 到冠顶起点 `32.4m`，共 `25.2m`。四面展位中心分别落在 35% / 55% / 70% / 45%，即 `16.02 / 21.06 / 24.84 / 18.54m`。

| 立面 | 图片 | 原图比例 | 展位尺寸 | 水平偏移 |
| --- | --- | --- | --- | --- |
| 正面 | `images/w700d1q75cms.jpg` | 640 × 576 | 6.80 × 6.12m | +0.45m |
| 右面 | `images/images1.jpg` | 447 × 447 | 5.40 × 5.40m | −0.75m |
| 背面 | `images/w700d1q75cms.jpg` | 640 × 576 | 5.60 × 5.04m | +2.45m |
| 左面 | `images/images1.jpg` | 447 × 447 | 4.90 × 4.90m | −0.50m |

- 高度由 `width / aspect` 计算，不拉伸、不裁切；背面横向偏移避开楼梯核心竖带，东立面竖鳍在漫画洞口处断开，层间板、窗与设备板按矩形避让。
- 每个展位由深色凹入背板、金属内衬、四边细框、上下支撑臂、顶部遮光檐与底部暖金收边组成；背板先封住原立面窗格，避免窗、梁或文字穿过漫画。
- 漫画使用 `MeshBasicMaterial`、`toneMapped: false` 与暖灰 tint，保留白底线稿并压低纸面亮度；它不满足 `CityLook` 的选择性辉光规则，不会被 bloom 放大成白色发光板。
- 四个面板按各自立面 yaw 朝外；截图确认背面与左面的文字、线稿方向正确，没有镜像或反向。
- 光幕使用 `ShaderMaterial` + `AdditiveBlending` + `depthWrite: false`，每面 4 道宽束、7 道窄束、2 道暖金束，沿 Y 缓慢上流，单循环约 16–21 秒，有亮头、拖尾、局部熄灭和极暗底光。
- 四面相位为 `0.05 / 0.33 / 0.61 / 0.82`，速度 `0.052 / 0.061 / 0.047 / 0.057`；漫画矩形在 shader 中清空并留 0.34m 羽化，光幕不会压过漫画。
- 四角有 `0.06 × 24.8 × 0.06m` 青蓝光带跨转角连续；光幕在立面左右 0.9m、上下 1m 内淡出，保留暗部。
- 入口上方与冠顶保留 `LOHINA` 标识，正立面旧品牌墙牌已移除；裙房、转角框、退台与顶部结构层次不变。
- 最终模式为 B-01 单独增加立面泛光 `FacadeWash`、基座暖光 `BaseFill`、媒体洗光与门厅灯，并保留湿地面镜面与地面辉光；这些是 B-01 局部灯光，没有新增全场景后处理或修改其他建筑。
- 精细 / HIGH 画质下，共享的 `CityLook` 管线负责选择性辉光与湿地面反射；流畅 / SMOOTH 保留实体窗和媒体内容，关闭增强。

### 验收证据与限制

- 四立面、街区关系与绕楼录屏：`docs/screenshots/b01/facades/01-front.png`、`02-right.png`、`03-back.png`、`04-left.png`、`05-block.png`、`b01-orbit.webm`（33.48s，1280×720）与 `orbit-frames/`。
- 结构模式 7 张：`docs/screenshots/b01/structure/01-front-full.png` – `07-crown.png`。
- 旧 `01-spawn.png`、`02-corridor.png`、`03-front.png`、`04-three-quarter.png`、`05-pair.png` 与 `diag/` 属于上一版“主屏 + 竖幅 + ticker”方案，不能作为本轮四面漫画的证据。
- 机位、检查点、四面配置与证据边界见 [`docs/screenshots/b01/README.md`](docs/screenshots/b01/README.md)。
- 2026-10-24 当前工作区 `npx tsc --noEmit`、`npm run build` 与依赖边界检查通过；构建为主 JS 5,451.67 kB / gzip 1,963.11 kB，仍提示 chunk 体积警告。该构建包含其他并行 agent 的工作区改动。
- 截图与录屏来自 Edge + SwiftShader（约 1–2 FPS），只证明固定机位可见表现；没有真实 GPU 帧率、连续操作、视频解码或透明排序验收。
- 右面机位受相邻 H-01 阻挡，实际相机臂长约 4.2m；绕楼视频东侧段会被 H-01 占据较大画面。这是街区现状，不是 B-01 面板消失。
- `group.userData.mediaFacade.podium` 的诊断字符串仍写着旧的“2.3m 深入口”，实际几何为 3.45m 前墙厚 / 1.65m 门扇退入；本文按几何记录，诊断字符串待后续代码任务修正。
- 本轮未执行 `git commit` 或推送。

## 广场画幕改版提案（未应用）

`docs/plaza-screen-review/proposal/README.md` 比较了 12m 与 14m 两档建筑体量画幕，提案根节点 `(0, 0, -9.7)`、yaw=0，并建议把雕塑移到 `(-6.5, 0, 3)`。代码在 `src/worlds/cyberpunk/props/artCurtainProposal.ts`，与正式大屏保持相同的 `group / dispose` 交接，但没有接入正式布局、碰撞、快照或打开关闭事件。

现有图片 `12m.png` / `14m.png` 是 CPU 深度缓冲生成的几何投影方案图，不是浏览器运行截图；WebGL 同机位验收因 Playwright 权限错误尚未完成。正式场景仍是 8m 的 `SCREEN-01`。

## 尚未完成 / 后续里程碑（按 AGENTS V3.0）

### P0：当前体验与建筑样板收尾

- 近地镜头的连续录屏、真实 GPU 透明排序与主观拖拽手感验收；关键静态状态已用 Playwright + Edge 实机截图，但仍不能替代连续动作验收。
- E-01 宽景性能：05 广场 160 calls、06 背面 192 calls，需要继续合并或接受明确豁免。
- T-02 / T-03 接入后的宽景 draw calls 尚未复测；T-03 的视频解码与图片轮播也未在真实 GPU 上验证。
- T-03 还缺正式视频素材与至少一组固定机位验收图；广场画幕 12m / 14m 尺寸仍待用户选定。
- B-01 四面漫画、流动光幕与结构模式还缺真实 GPU、连续操作与性能验收；`?b01=structure` 只是审阅模式，不能作为最终画面交付。
- 原有八栋的实体窗、选择性辉光与湿地面反射仍缺逐栋运行视觉验收；`docs/city-style-review/` 的几何/逻辑检查不能替代。
- V3 要求的固定验收图仍缺：东侧小院、北塔海报观察点、手机真机竖屏。
- 正式角色模型（当前为程序化占位小人）及其动画、身体体积和淡出适配。

### P1：目录边界与中央大屏

- 中央大屏 `HUB-SCREEN`：3D 屏幕 → 全视口艺术封面 → 主题滑条 → 关闭即提交并揭示。
- `/world?world=<worldId>`、世界注册表、按世界隔离的 V2 会话快照与旧快照迁移。
- 首批目录分层已完成；后续继续从 app 的过渡宿主提取完整世界生命周期与加载注册，保持现有入口可用。
- E-02、E-03 的正式内容页（目前为 Coming Soon）。
- P1–P4 高楼海报的检查模式与完整内容。

### P2：最小双世界揭示验证

- 第二主题美术与一栋样板建筑、一种展示载体、一片可达区域。
- 跨世界准备、失败回滚、资源释放与安全落点验证。

### P3：内容与发布

- Bloom、动态反射、景深等后处理逐项验证；基础场景继续不依赖它们。
- 完整音效、更多展品、正式作品素材与版权信息。
- 更细的移动端真机适配、无障碍、性能分级与生产发布验证。


## 近地探索镜头（当前迭代）

普通拖拽支持 ±85° 自由俯仰，触地后仍可继续抬头；真实视线由最终 `camera.getWorldDirection()` 反算，而不是只检查内部参数。滚轮调整距离，R / HUD「复位镜头」恢复默认视角；V 保留为暂停行走的辅助观赏模式。移动仍沿相机水平朝向计算。建筑、地图及角色运动文件本轮未改。

镜头求解把用户期望角度/距离、碰撞后的显示臂长和最终位置分开：碰撞只缩短显示臂长，不改写用户目标；起点重叠时用 0.08m 探针沿当前方向重查；每帧只在 `commit()` 写入一次相机位置与观察方向。人物弱化保留近距与中心遮挡规则，并新增大幅仰视构图规则（50° 开始、70° 全量、最低材质透明度 0.24）。`F3` 调试面板显示目标/平滑/真实仰角、相机高度、期望/碰撞距离、碰撞对象与命中、起点重叠、人物目标/实际/材质透明度和触发原因。

2026-10-22 使用 Playwright + Edge（SwiftShader，1440×900）实际运行并完成真实鼠标/滚轮操作：

- 广场普通拖拽从最大俯视 -85° 连续经过水平到 85°；目标采样 -47.2°、-9.4°、28.4°、66.3°（66.3° 时真实视线 64.6°，阻尼仍在追赶），settled 目标与真实视线均为 85°，模式始终 `follow`。
- 近距 0.98m 时目标/实际/材质 α 0.06；0.48m 与 0.35m 时为 0；拉远到 6.23m 恢复为 1，身体、背包和发光附件完整恢复。
- 大幅仰视 64.6° 时目标 0.38、实际 0.5；85° 时目标、实际、材质 α 均为 0.24，原因「仰视构图」。
- 贴 E-01 北墙与东北角时镜头臂可压缩到 0，但水平拖拽后 boom 均恢复 8.5m；低机位 T-01 验收图为镜头高度 0.50m、仰视 20°、完整塔身与塔顶。
- 截图和逐项数据见 [探索镜头评审](docs/exploration-camera-review/README.md) 与 `browser-checks.json`；复现步骤、调试面板字段和已知限制也在该文档。

2026-10-23 修复“碰撞后镜头停在世界固定位置、角色继续走并离开画面”的问题。根因在 `collision.ts` 的帧间扫掠：旧实现把上一帧相机的世界坐标当作固定端点；角色贴墙移动时，扫掠修正可能反复落在旧位置，`commit()` 又把该点写回相机，导致镜头冻结。现在扫掠起点随当前角色锚点平移，命中点只允许沿当前“角色→期望机位”镜臂缩短；主臂起点重叠时跳过帧间扫掠，由探针沿当前方向重新求解。离开障碍后仍由 `recoveryLambda=6` 平滑恢复，不改写用户设定的角度和距离。`reviewCamera` 只由 DEV 的 `window.__lohina.review()` 显式启用，浏览器采样中 0 帧为非 `follow`。

浏览器验收使用 `scripts/camera-follow-check.mjs`（Edge headless，1440×900）：角色在 E-03 西墙外侧出发，沿墙向北绕过西北墙角，沿北墙向东再折返，回到墙角后沿西墙向南、最后向西离开建筑。72 个 100ms 采样中镜头停滞 0 帧，初始镜臂被建筑压缩到 1.79m，绕角后恢复并在离开时回到 8.5m；人物屏幕锚点 x=0.5、y=0.677–0.86，`reviewCamera` 始终未启用。截图与完整采样见 [moving-follow](docs/exploration-camera-review/moving-follow/)；逻辑回归另在合成方形建筑上逐帧绕行一周，断言 720 帧内 0 次停滞。

本轮 `npm run typecheck`、`npm run build`、`node scripts/check-dependencies.mjs` 与相机逻辑回归均通过（逻辑回归含移动贴墙跟随、85° 仰视构图及角色克隆材质实际 `opacity` 断言）。**静态关键状态与移动中沿墙/绕角跟随已通过真实浏览器验收；连续录屏、真实 GPU 下的透明排序和主观拖拽手感仍标记为「运行效果待验收」**，没有用类型检查或孤立数学测试替代视觉验收。

## 相机与角色上一轮验证

可旋转第三人称跟随、三档取景与独立仰望模式已接入。默认中位取景已通过 Playwright + Edge 实际渲染（见 `02-spawn.png`、`03-plaza.png`）；三档对比截图、操作录像与主观参数选择仍未采集。

`npm run typecheck` 与 `npm run build` 均已通过；相机/角色逻辑检查见 [相机评审记录](docs/camera-review/README.md)。`docs/camera-review/README.md` 中“`npm run build` 因权限失败”的描述仅指当时受限会话，后续已在可运行环境重新验证。

候选参数、实测逻辑数据、采集方式见 [相机评审记录](docs/camera-review/README.md)。具备普通浏览器运行权限后，启动 `npm run dev`，执行：

```bash
python scripts/capture-camera.py
```

脚本使用真实键鼠操作，生成三档截图和三段包含起步、急停、连续转弯、绕馆行走的视频，同时检查仰望退出和内容页返回恢复。依赖 Python Playwright 与 Edge；此采集脚本在本会话受限环境内尚未完整执行。

## 虚空街区验证（2026-10-22，历史构建）

> 本节记录 7×7 格 / 196 实例的旧构建。当前代码已改为 23×23 格 / 2,116 实例，并加入媒体塔 `keepOut` 与扩大后的天空和雾；下表**不能代表当前构建**，需重新运行 `void-check.mjs` 后更新。

验证环境：Windows 11、Edge + SwiftShader（Playwright headless）、1440×900。

已执行：

```bash
npm run typecheck          # 通过
npm run build              # 通过
node scripts/verify.mjs    # 中心街区 13 张截图与移动端流程通过
node scripts/void-check.mjs # 外围 3 张截图与渲染统计
```

渲染统计（headless SwiftShader，非真实 GPU 性能）：

| 场景 | Draw calls | 三角面 |
| --- | --- | --- |
| 出生点（中心） | 140 | 40,478 |
| 中心边缘朝外看 | 75 | 27,384 |
| 深入虚空街区 | 53 | 21,058 |
| 远处虚空街区 | 52 | 21,056 |
| 中心边缘回望广场 | 167 | 42,138 |

结论（仅适用于该旧构建）：外围街区使用单个 `InstancedMesh`，当时 196 栋建筑只占 1 个 draw call；玩家位置只影响实例矩阵，不增加实例数量。离开中心后中心细节被视锥剔除，draw calls 反而降到 52–75。唯一超过 Round 01 目标（150）的是站在中心边缘回望完整广场的 167，因为此时视野同时包含整个中心街区；真实 GPU 帧率尚未测量。当前 23×23 构建的实例数变为 2,116，但仍是单个 `InstancedMesh`，draw call 结构不变。

## Round 01 原始验证（相机改动前）

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
| `14-void-edge.png` | 中心边缘朝外，第一排黑色建筑 |
| `15-void-deep.png` | 深入虚空街区的塔群与通道 |
| `16-void-far.png` | 远离中心后的重复黑色街区 |

E-01 精修专用截图位于 `docs/screenshots/e01/`：

| 路径 | 内容 |
| --- | --- |
| `before/01-front.png` – `before/05-context.png` | 修改前正面、侧前方、入口、旧近景与广场关系 |
| `after/01-front.png` – `after/06-back.png` | 修改后同机位正面、侧前方、入口、新近景、广场关系与背面 |
| `feature-texture.png` | 主视觉 Canvas 纹理单独检查图 |

T-02 品牌塔精修截图位于 `docs/screenshots/t02/after/`：`01-plaza`、`02-front`、`02-west`、`02-full`、`03-facade`、`03-side`、`04-entry`。这些是同机位外观检查图，未附带逐机位渲染统计。

H-01 母版媒体楼截图位于 `docs/screenshots/hero/after/`：`01-spawn`、`02-front`、`03-entry`、`04-three-quarter`、`05-west-three-quarter`、`06-back`。同样只作外观检查。

B-01 截图位于 `docs/screenshots/b01/`：

| 路径 | 内容 |
| --- | --- |
| `facades/01-front.png`、`facades/02-right.png`、`facades/03-back.png`、`facades/04-left.png` | 本轮四面错层漫画与流动光幕 |
| `facades/05-block.png` | 西侧远景：B-01 左立面与街区体量关系 |
| `facades/b01-orbit.webm`、`facades/orbit-frames/` | 33.48s 绕楼一周录屏与 8 张抽帧 |
| `structure/01-front-full.png` – `07-crown.png` | `?b01=structure` 全高、东南转角、东立面、入口、门廊、三分之四、冠顶 |
| `01-spawn.png`、`02-corridor.png`、`03-front.png`、`04-three-quarter.png`、`05-pair.png`、`diag/` | 上一版“主屏 + 竖幅 + ticker”媒体方案的历史截图，不作为本轮证据 |
| `README.md` | 四面配置、构造、机位、复现命令与证据边界 |

## 已知问题与限制

- **旧截图的画框视角**：Round 01 固定方位导致西侧画框斜视。本轮已允许拖动旋转，更新后的实际取景仍待采集。
- **W5 文档偏差**：配置表标注 `yaw=180°`，为让地面交互点位于画框南侧并朝向观众，实现为 `yaw=0`，详见 `src/worlds/cyberpunk/layout.ts` 注释。
- **headless 帧率不代表真机**：SwiftShader 下约 1–3 FPS，角色移动因 `delta` 上限显得慢；未在真实 GPU 上测量帧率。
- **冷加载目标未实测**：本地 dev 约 1.4 秒进入 intro，但未按「10 Mbps / 150 ms RTT」条件验证 8 秒冷加载目标。
- **构建体积警告**：主 JS 约 5.43 MB（gzip 约 1.96 MB），主要来自 Rapier WASM；构建提示 chunk 超过 1600 kB，尚未做代码分割。
- **控制台警告**：`THREE.Clock` 弃用提示；headless 环境不支持 `KHR_parallel_shader_compile`。均不影响运行。
- **移动端仅模拟验证**：使用 Playwright 触摸模拟，未在真实手机 / 平板上验证手势与性能。
- **缩略图与互动对象**：灯箱与画框共用程序化演示图，正式作品素材待接入。
- **虚空街区是剪影层**：外围建筑不参与阴影、没有碰撞体，角色可以穿过；它们用于营造重复的城市轮廓，不是可进入的建筑。
- **虚空地面缺少速度参照**：地面是均匀暗色，长距离行走时主要靠两侧塔楼判断移动；暂未加入网格或纹理。
- **边缘回望的峰值 draw calls（历史数据）**：2026-10-22 的 7×7 虚空街区版本中，站在中心边缘回望完整广场为 167，朝外行走时降到 52–75。当前代码已扩展为 23×23 格（2,116 实例）并接入 T-02 / T-03，**这组数字不能代表当前构建**，需重新运行 `void-check.mjs`。
- **E-01 宽景 draw calls**：05 广场宽景 160、06 背面宽景 192，超过 150 目标；01–04 为 127–146。该数据早于 T-02 立面重写、T-03 媒体塔与虚空街区扩展，当前构建尚未复测。
- **T-02 / T-03 性能未测**：T-02 的逐窗幕墙和 T-03 的视频墙、图片带与背面图片带都会增加 draw calls 与透明/视频开销；MediaTower 与广场大屏均被排除在场景级静态合并之外。没有当前构建的固定机位 calls / 三角面与真实 GPU 帧率。
- **B-01 性能与运行未验收**：四面漫画截图、街区关系图与 33.48s 绕楼录屏来自 Edge + SwiftShader，没有真实 GPU 帧率、连续操作、透明排序或湿地面反射开销记录；`docs/screenshots/b01/` 中的 calls / 三角面只作回归参考。
- **B-01 结构模式不是最终画面**：`?b01=structure` 会关闭漫画、光幕、标识、点光与湿地面，并加入仅审阅可见的中性灯；它用于检查结构和安装框体，不能作为最终媒体模式的截图证据。
- **B-01 右面机位受限**：相邻 H-01 位于 B-01 东侧，`02-right.png` 的实际相机臂长约 4.2m；绕楼录屏东侧段会被 H-01 占据较大画面。需要独立右面全景时须另设不经过 H-01 的机位。
- **B-01 诊断字符串偏差**：`group.userData.mediaFacade.podium` 仍写“2.3m 深入口”，实际几何是 3.45m 前墙厚、1.65m 门扇退入；文档按几何记录，诊断字符串待代码任务修正。
- **媒体 Tower 视频未验证**：当前清单没有视频，`createVideoChannel` 的自动播放、循环、失败重试和资源释放只在代码层实现，尚未在浏览器与真实 GPU 上验证。
- **E-01 背面完成度低于正面**：背面以服务门、百叶、背标和落水管建立可读性，按“次要立面”控制细节和照明；近看仍比正面简化，没有室内空间。
- **E-01 展品仍为程序化演示图**：主视觉、海报与门牌均为 Canvas 生成，正式摄影作品接入时需替换 `src/worlds/cyberpunk/textures.ts` 中的对应生成函数，并重新校准玻璃后的亮度。
- **与 AGENTS V3.0 的差异（待决）**：V3 的 3.2 / 3.4 仍写“外围可见边界与物理边界”“EXT-01 北侧地面围挡”，当前工程按用户先前要求已移除围栏，改为无限黑色虚空街区。按 V3 第 0 节“用户新指示高于本文件”，暂保留现状；若要恢复边界，需要单独任务并同步碰撞、安全点与截图。
- **V3.0 功能缺口**：中央大屏 `HUB-SCREEN`、主题滑条、世界注册表、`/world?world=<worldId>`、按世界隔离的 V2 快照均未实现；当前仍是单世界宿主和单世界快照。它们属于 P1，不应在 E-01 美术任务中顺手改掉。
- **V3.0 验收图缺口**：现有截图覆盖出生点、广场、西侧图片街、T-02 精修角度和移动端模拟，但东侧小院、北塔海报观察点、手机真机竖屏尚未专门采集；现有截图数量增加也不等于 V3 全套验收完成。

## 验收脚本说明

`scripts/verify.mjs`、`scripts/void-check.mjs`、`scripts/e01-check.mjs`、`scripts/t02-check.mjs`、`scripts/hero-check.mjs`、`scripts/b01-check.mjs`、`scripts/b01-facades.mjs`、`scripts/b01-structure.mjs`、`scripts/b01-full.mjs`、`scripts/b01-console.mjs` 与 `scripts/stats.mjs` 为开发期验收脚本，不属于生产依赖，也不参与打包。运行前需要：

1. 已启动 `npm run dev`（默认 `http://127.0.0.1:5173`；`t02-check.mjs` 与 `b01-*.mjs` 当前写死 `127.0.0.1:5174`，运行前需确认端口或修改脚本）。
2. 本机安装 Playwright 与 Edge。脚本使用 `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` 与 SwiftShader，路径不同需自行调整。

`void-check.mjs` 会依次传送到中心、边缘、虚空深处与远处，输出 draw calls / 三角面并更新 `14-void-edge.png`、`15-void-deep.png`、`16-void-far.png`。`e01-check.mjs` 使用 `node scripts/e01-check.mjs after` 重拍 E-01 的 01–06 机位，并输出每个机位的 calls / 三角面 / 网格数；`before` 参数用于保留旧版对照，不应覆盖现有 `before/` 目录。`t02-check.mjs` 重拍 T-02 的 01–04 机位并打印相机状态、calls / 三角面与塔身材质/投影名单，但当前未把结果写入 JSON。`b01-check.mjs` 重拍 B-01 最终模式 5 张；`b01-facades.mjs` 重拍四立面、街区关系图、绕楼抽帧并录制 `b01-orbit` 原始视频；`b01-structure.mjs` 在 `?b01=structure` 下重拍 7 张结构图；`b01-full.mjs` 补全高远景与转角；`b01-console.mjs` 收集页面与控制台错误。它们都会打印 calls / 三角面，但没有真实 GPU 帧耗。相机评审脚本（`check-camera.ts`、`capture-camera.py`）的用法见 [相机评审记录](docs/camera-review/README.md)；近地镜头的逻辑检查使用 `scripts/check-exploration-camera.ts`，移动中沿墙/绕角的浏览器验收使用 `scripts/camera-follow-check.mjs`（需先启动开发服务器，可用 `LOHINA_URL` 指定端口），记录、截图与手动复现步骤见 [探索镜头评审](docs/exploration-camera-review/README.md)；步态、移动与大屏检查分别使用 `check-locomotion.ts`、`check-plaza-screen.ts`。连续视频与真实 GPU 手感仍未验收，不能据此宣称镜头体验全部通过。

## 目录结构

逐文件说明见 [`docs/PROJECT_STRUCTURE.md`](docs/PROJECT_STRUCTURE.md)。

```text
src/
  main.tsx            React / BrowserRouter / 样式入口
  app/                路由、WorldPage/WorldHost、WorldEngine、命令桥、Zustand 世界状态
    hud/              桌面 HUD、移动端摇杆与 F3 相机调试面板
    screens/          加载、引导与 WebGL 回退页
  engine/             公共能力，不导入具体世界或界面
    contracts/        交互、物理、相机、快照等公共类型
    core/             画质等级、CityLook 选择性辉光与共享湿地面反射
    player/           角色设置、控制器、占位角色与步态
    camera/           跟随、碰撞、人物淡出与相机设置
    primitives/       通用静态网格合并
  worlds/
    cyberpunk/        当前赛博世界：公开入口、布局、主题、展位、碰撞、会话、材质、纹理
      buildings/      双塔/展馆生成器、H-01、B-01、T-03 与 cityStyle 实窗适配
      props/          街道、地面、天空、雕塑、画框、广场大屏与画幕提案
  features/           灯箱、目录、设置等完整功能
  content/            作品数据与演示图
  pages/              摄影馆内容页、Coming Soon、404
  ui/                 通用图标、面板、文案、样式与页面标题 Hook
public/assets/worlds/cyberpunk/media/   媒体塔图片、视频与 manifest.json
scripts/              浏览器验收、B-01/相机/运动/大屏检查与渲染统计脚本
docs/
  README.md             文档索引、证据分级与维护规则
  CURRENT_TASK.md       当前任务、agent 交接、文件归属、端口与证据状态
  PROJECT_STRUCTURE.md  逐文件项目结构说明与旧路径映射
  E01_STYLE_GUIDE.md    E-01 建筑美术样板与可复用构件
  STYLE_REFERENCES.md   参考站分析、可迁移机制与建筑改进建议
  CAMERA_MOVEMENT_INTERFACE.md  相机与运动模块的文件归属和调用顺序
  city-style-review/    八栋实体窗、分区窗光、选择性辉光与共享反射记录
  camera-review/        上一轮相机与角色评审记录
  exploration-camera-review/  近地镜头、人物淡出、浏览器截图与未完成录屏记录
  locomotion-review/    角色步态逻辑检查记录
  movement-review/      移动参数变更的检查记录
  plaza-screen-review/  广场大屏与 12m/14m 画幕提案
  structure-review/     目录迁移验证记录
  zenith-building-review/  Neon Zenith 单栋复现样板
  references/buildings/ 用户选定的建筑参考截图与简报
  screenshots/          验收截图（e01/、t02/、hero/、b01/）
```

可再生产物与本地工具目录：`node_modules/`（依赖）、`dist/`（构建产物，可随时重建）、`.idea/`（IDE 配置）、`.claude/`（本地工具配置）、`.camera-preview/`（相机评审与浏览器临时产物，已忽略）。


## 目录迁移与后续

2026-10-22 完成首批目录分层、配置拆分和关键依赖解耦，旧路径映射见 [PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)。2026-10-23 在此结构上新增 T-02 立面精修、T-03 媒体塔、B-01 北岸媒体楼、媒体清单与广场画幕提案；2026-10-24 完成 B-01 四面错层漫画与流动光幕第一轮，未改变世界生命周期或引入多世界切换。B-01 记录见 [`docs/screenshots/b01/README.md`](docs/screenshots/b01/README.md)，城市光影记录见 [`docs/city-style-review/README.md`](docs/city-style-review/README.md)，验证记录见 [结构迁移验证](docs/structure-review/README.md)。
