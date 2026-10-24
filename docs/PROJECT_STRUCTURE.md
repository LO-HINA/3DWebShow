# LOHINA WORLD 当前文件结构

> 更新日期：2026-10-24 · 对应 AGENTS.md V3.0 的首批目录迁移，并补充 T-02 立面精修、T-03 媒体塔、B-01 北岸媒体楼与四面漫画/光幕、城市实窗/光影管线、广场画幕提案与新街区规划登记。
> 本文记录实际文件位置；总规范以根目录 AGENTS.md 为准。

新 agent 先读 [CURRENT_TASK.md](CURRENT_TASK.md) 确认任务范围、八栋文件归属与证据状态。本文的目标架构/旧路径映射不是要求重新迁移已完成模块的施工单。

## 当前目录

```text
src/
  main.tsx                         React / BrowserRouter / 样式入口
  app/
    App.tsx                        路由表与滚动复位
    WorldPage.tsx                  组合世界界面，注入当前世界的展位数据
    WorldHost.tsx                  React 挂载、引擎创建销毁、页面跳转
    WorldEngine.ts                 过渡宿主：现有场景装配、渲染循环和交互调度
    commands.ts                    HUD / 手机控件到宿主的命令桥
    worldStore.ts                  Zustand 界面模式、焦点、设置与统计
    hud/                           Hud.tsx、TouchControls.tsx、CameraDebugPanel.tsx（F3 相机调试）
    screens/                       LoadingScreen、IntroScreen、FallbackScreen
  engine/
    contracts/types.ts             现有交互、物理、相机、快照等公共类型
    core/quality.ts                通用画质等级
    core/cityLook.ts               共享湿地面反射、选择性辉光、OutputPass 与低画质降级
    player/
      settings.ts                  现有角色与固定步进参数，数值保持不变
      controller.ts                移动、跳跃、物理；地图碰撞与边界由宿主传入
      avatar.ts                    占位角色，接收所需材质接口
      gait.ts                      实际距离驱动步态与腿部求解
    camera/
      settings.ts                  相机参数：拖拽灵敏度、碰撞半径、人物弱化阈值
      follow.ts                    跟随、拖拽旋转、缩放、期望/显示距离、仰望与复位
      collision.ts                 相机球体碰撞、起点探针、帧间扫掠与唯一提交
      avatarFade.ts                近距/中心遮挡/仰视构图的人物材质弱化与恢复
    primitives/merge.ts            通用静态网格合并
  worlds/
    cyberpunk/
      index.ts                     当前赛博世界的公开装配入口
      layout.ts                    建筑/画框/街道位置、边界、出生点、布局版本
      theme.ts                     赛博调色板
      exhibits.ts                  展位、入口与作品绑定、查询
      colliders.ts                 根据本世界布局生成静态碰撞描述
      presentation.ts              本世界展位顺序与位置文案
      session.ts                   当前赛博 V1 快照校验、保存与恢复
      types.ts                     赛博建筑变体与建筑配方类型
      materials.ts                 本世界材质工厂与资源集合
      textures.ts                  本世界程序化纹理、E-01 展示素材与竖向字标
      media.ts                     媒体清单加载、图片轮播与视频通道
      buildings/buildings.ts       双塔、E-01/E-02/E-03 与 hero 分支调度
      buildings/cityStyle.ts       实体窗/室内、三类立面构件、百叶、窗光、实例化与遮挡代理
      buildings/heroBuilding.ts    H-01 母版媒体楼：体量、七个媒体槽与冠顶
      buildings/heroMedia.ts       B-01 北岸媒体楼：入口、媒体洞、退台、钢冠顶、四面漫画安装与流动光幕
      buildings/b01MediaConfig.ts  B-01 四面漫画图、比例、展位尺寸/高度/水平偏移与光幕相位配置
      buildings/mediaTower.ts      T-03 媒体塔：裙房、塔身、视频墙/图片带与待机画面
      buildings/zenithStudy/       Neon Zenith 单栋复现样板；不进入正式世界 index
      props/street.ts              地面、天空、雕塑、画框、道具和外围剪影
      props/orrery.ts              LM-01 公开入口，兼容 createLandmark；实际外观在 orreryVisuals
      props/orreryVisuals.ts       稳定分段光轨、双色柔光/短尾、地月模型位、出生庭与控制台
      props/orreryConfig.ts        LM-01 共用尺寸/支撑曲线、碰撞及控制台 PortalSpec
      props/plazaScreen.ts          参数化广场大屏、图片适配和资源回收
      props/plazaScreenConfig.ts    大屏尺寸契约、图片适配计算与碰撞生成
      props/artCurtainProposal.ts   12m / 14m 画幕提案；未接入正式布局与事件
  features/
    directory/DirectoryPanel.tsx    展位目录；由 app 注入当前世界数据
    lightbox/Lightbox.tsx           世界图片灯箱；由 app 注入展位查询和顺序
    lightbox/ArtworkModal.tsx       摄影馆内容页作品弹窗
    settings/SettingsPanel.tsx      设置面板
  content/
    observatoryDestinations.ts     轨道中枢目的地：已注册路由、独立页面 URL 或待接入槽位
    artworks/index.ts              独立作品资料与现有演示图生成
  pages/
    ObservatoryPage.tsx            LM-01 控制台导航页；样式位于同目录 observatory.css
    GalleryPage.tsx                摄影馆内容页
    ComingSoonPage.tsx             学习/AI 占位页
    NotFoundPage.tsx               404
  ui/
    Icons.tsx                      共用图标
    OverlayPanel.tsx               通用面板与焦点处理
    copy.ts                        应用文案
    usePageTitle.ts                 页面标题
    global.css                     原有样式，保持展示效果
```

## 实际运行关系

`main.tsx → app/App.tsx → app/WorldPage.tsx → app/WorldHost.tsx → app/WorldEngine.ts`。
宿主使用赛博公开入口装配场景，调用公共角色、镜头与网格能力；React 界面通过状态和命令桥协作。
`WorldEngine.init()` 依次装配建筑、天空/虚空街区、地面/道具、雕塑、广场大屏、T-03 媒体塔与画框，再创建共享 `CityLook`（湿地面反射、选择性辉光、OutputPass），最后初始化物理与角色。
`createBuildings()` 先按 variant 生成各栋，再统一经过 `applyCityStyle()` 追加实体窗、窗后室内与分区窗光；`heroBuilding.ts` / `heroMedia.ts` 仍保留各自独立的体量、入口和媒体槽。
B-01 的 `?b01=structure` 在 `heroMedia.ts` 内读取，只切换 B-01 自己的漫画/光幕层、增强光和审阅灯，不改布局、碰撞或其他建筑。四面展位的图片、比例、尺寸、中心高度和光幕相位集中在 `b01MediaConfig.ts`，`heroMedia.ts` 只负责按配置生成安装构造与 shader。
T-03 的素材先由 `media.ts` 读取 `public/assets/worlds/cyberpunk/media/manifest.json`，再交给 `buildings/mediaTower.ts` 建立图片与视频通道。

建筑立面的实际调用关系为 `buildings.ts → 原有建筑工厂 → applyCityStyle()`；其中 `heroBuilding.ts`、`heroMedia.ts` 保留各自体量及内容槽，统一适配在工厂返回之后执行。T-03 由 `mediaTower.ts` 直接调用 `buildDeepFacades()`，不重复套用七栋适配器。两条路径共用 `cityStyle.ts`，修改它会影响八栋建筑，须逐栋检查。

立面细节参数目前在 `cityStyle.ts` 内，尚未迁入独立配置文件；`FacadeProfile` 提供 `vertical`、`horizontal`、`boxed`，`far` 是 T-03 构建时选择的简化参数，不是随相机距离自动切换的 LOD。`theme.ts` 的 `CITY_LOOK` 管地面/辉光/反射参数，宿主环境灯在 `WorldEngine.ts`；不要为调窗框改角色控制器或在每栋建筑内重复建立后期。
摄影馆等内容页由路由单独呈现，保持原有 `/world/gallery`、`/world/learning`、`/world/ai-lab`。

依赖边界：

- `engine` 不导入 `app`、`features`、`worlds`、`content` 或 `pages`。
- `content` 不导入世界、宿主或页面。
- `features` 不导入具体世界，通过宿主注入展位数据；当前仍使用 app 的界面状态与命令桥。
- 每个世界只使用自己的主题实现和公共能力，不反向导入宿主、功能界面或其他主题。
- 世界内部直接导入本地职责模块，跨层装配使用公开入口；不通过自身 index 制造循环依赖。

运行 `node scripts/check-dependencies.mjs` 检查上述源码依赖边界。

## 旧路径对应关系

| 迁移前 | 当前路径 |
| --- | --- |
| `src/App.tsx` | `src/app/App.tsx` |
| `src/pages/WorldPage.tsx` | `src/app/WorldPage.tsx` |
| `src/components/world/WorldCanvas.tsx` | `src/app/WorldHost.tsx`（组件名 WorldHost） |
| `src/world/engine/WorldEngine.ts` | `src/app/WorldEngine.ts` |
| `src/world/bridge.ts`、`src/state/worldStore.ts` | `src/app/commands.ts`、`worldStore.ts` |
| `src/world/engine/controller.ts`、`player.ts`、`gait.ts` | `src/engine/player/controller.ts`、`avatar.ts`、`gait.ts` |
| `src/world/engine/camera.ts`、`cameraCollision.ts`、`avatarFade.ts` | `src/engine/camera/follow.ts`、`collision.ts`、`avatarFade.ts` |
| `src/world/config/types.ts` | `src/engine/contracts/types.ts` 与 `src/worlds/cyberpunk/types.ts` |
| `src/world/config/world.ts` | 赛博 `layout.ts`、`theme.ts`、`exhibits.ts`、`colliders.ts` 与公共角色/相机/画质设置 |
| `src/world/data/artworks.ts` | `src/content/artworks/index.ts` |
| `src/world/snapshot.ts` | `src/worlds/cyberpunk/session.ts` |
| `src/world/procedural/*` | 赛博建筑/道具/材质/纹理；通用 merge 移至 engine |
| `src/components/overlays/*` | `src/features/*`，通用 OverlayPanel 移至 ui |
| `src/components/hud/*`、`screens/*` | `src/app/hud/*`、`screens/*` |
| `src/styles/global.css` | `src/ui/global.css` |

既有评审文档中的旧路径与 SHA256 是历史交付记录，可按此表定位；不将旧文件哈希当作本轮迁移后的哈希。

## 本轮范围和后续边界

本轮完成目录分层、配置拆分和关键依赖解耦，沿用现有布局、素材、角色动作、镜头及页面行为。
2026-10-23 在此基础上完成 T-02 立面重写、T-03 媒体塔、B-01 北岸媒体楼与媒体清单、原有八栋实体窗/光影适配、广场画幕提案；T-02、T-03、B-01 与城市光影已接入正式场景，画幕提案仍只在评审页使用。
`heroMedia.ts`、`heroBuilding.ts`、`cityStyle.ts`、`mediaTower.ts` 与 `cityLook.ts` 都是本轮新增的独立职责模块；布局、碰撞、共享材质与渲染入口仍由整合负责人统一修改。
`WorldEngine.ts` 仍是 app 层的过渡装配宿主，尚未拆出完整 `createWorld(context) / WorldHandle` 生命周期。
赛博灯光、环境装配和部分交互调度仍在宿主，后续按行为逐批迁入主题模块或公共服务。
当前内容仍是已有演示作品，没有虚构项目注册数据。

中央世界画框、`features/world-screen`、`features/world-switch`、轻量世界注册表、Manifest、动态加载、
V2 多世界会话属于下一步功能；本轮不创建空模块，不把目录迁移或 T-03 接入当作已经实现世界切换。
当前 `session.ts` 保持 V1 存储键和兼容逻辑，未来多世界会话另行迁移。

## 根目录与资源

- `AGENTS.md`：唯一总规范；`README.md`：启动命令、阶段状态、入口说明。
- `package.json` / `package-lock.json`：现有 npm 命令和锁定依赖，本轮没有引入新依赖。
- `public/favicon.svg`：站点图标。
- `public/assets/worlds/cyberpunk/media/`：T-03 媒体塔的图片、视频与 `manifest.json`；素材必须显式登记才会显示，说明见同目录 `README.md`。其余建筑、角色与纹理仍由代码生成。
- `docs/README.md`：文档索引、证据分级与维护规则；`docs/CURRENT_TASK.md`：当前任务、agent 交接、文件归属、启动端口与证据状态；`docs/block-plan/README.md`：新街区布局、编号规则与待实施计划。`docs/` 其余内容是设计规则、历史评审与截图，不是运行资源目录。
- `docs/city-style-review/`：八栋实体窗与城市光影接入记录；`docs/zenith-building-review/`：独立单栋样板；`docs/references/buildings/`：用户选定参考图；`docs/screenshots/b01/`：B-01 结构/媒体证据，`screenshots/b01/facades/` 为四面漫画、街区关系与绕楼录屏。
- `scripts/`：验证与截图脚本；现有角色、镜头、T-02、B-01 与 B-01 四面立面检查已同步新路径。`camera-follow-check.mjs` 需先启动开发服务器，默认连接 `127.0.0.1:5173`，可用 `LOHINA_URL` 覆盖；`t02-check.mjs` 与 `b01-*.mjs`（含 `b01-facades.mjs`）当前连接 `127.0.0.1:5174`，运行前确认端口。
- `dist/`：生产构建产物；`node_modules/`：依赖。
- `.camera-preview/`：被忽略的本地临时检查产物；`.idea/`、`.claude/`：本地工具配置。

## 验证命令

```powershell
npm run typecheck
npm run build
node scripts/check-dependencies.mjs

# 三组既有数学/物理回归；在 PowerShell 中逐个打包执行。
foreach ($name in @('camera', 'exploration-camera', 'locomotion')) {
  & '.\node_modules\@esbuild\win32-x64\esbuild.exe' "scripts/check-$name.ts" --bundle --platform=node --format=esm --packages=external "--outfile=.camera-preview/check-$name.mjs"
  if ($LASTEXITCODE -ne 0) { throw '检查打包失败' }
  node ".camera-preview/check-$name.mjs"
  if ($LASTEXITCODE -ne 0) { throw '检查失败' }
}

# 先启动 npm run dev，再运行浏览器冒烟检查。
python scripts/smoke-structure.py

# T-02 固定机位截图与渲染统计（脚本默认连接 127.0.0.1:5174）。
node scripts/t02-check.mjs

# B-01 结构与媒体机位（脚本默认连接 127.0.0.1:5174）。
node scripts/b01-check.mjs
node scripts/b01-facades.mjs
node scripts/b01-structure.mjs
node scripts/b01-full.mjs

# 相机浏览器采集；先检查脚本的端口与浏览器配置。
python scripts/capture-exploration-camera.py

# 移动贴墙跟随：沿 E-03 西墙绕角折返并离开，检查停滞、画面与镜臂恢复。
node scripts/camera-follow-check.mjs
```

浏览器检查结果与本轮截图存放在 `docs/structure-review/`；移动贴墙跟随的截图与采样另存于 `docs/exploration-camera-review/moving-follow/`；软件渲染和手机视口模拟不代表真机性能与手感验收。城市实窗/光影逻辑检查使用 `scripts/check-city-style.ts` 与 `scripts/check-city-look.ts`，需先用 esbuild 打包到 `.camera-preview/` 再执行；它们不编译 GPU 着色器，不能替代运行验收。
