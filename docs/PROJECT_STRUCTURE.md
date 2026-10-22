# LOHINA WORLD 当前文件结构

> 更新日期：2026-10-22 · 对应 AGENTS.md V3.0 的首批目录迁移。
> 本文记录实际文件位置；总规范以根目录 AGENTS.md 为准。

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
      textures.ts                  本世界程序化纹理与 E-01 展示素材
      buildings/buildings.ts       双塔、E-01/E-02/E-03 建筑生成
      props/street.ts              地面、天空、雕塑、画框、道具和外围剪影
      props/plazaScreen.ts          参数化广场大屏、图片适配和资源回收
      props/plazaScreenConfig.ts    大屏尺寸契约、图片适配计算与碰撞生成
  features/
    directory/DirectoryPanel.tsx    展位目录；由 app 注入当前世界数据
    lightbox/Lightbox.tsx           世界图片灯箱；由 app 注入展位查询和顺序
    lightbox/ArtworkModal.tsx       摄影馆内容页作品弹窗
    settings/SettingsPanel.tsx      设置面板
  content/
    artworks/index.ts              独立作品资料与现有演示图生成
  pages/
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
`WorldEngine.ts` 仍是 app 层的过渡装配宿主，尚未拆出完整 `createWorld(context) / WorldHandle` 生命周期。
赛博灯光、环境装配和部分交互调度仍在宿主，后续按行为逐批迁入主题模块或公共服务。
当前内容仍是已有演示作品，没有虚构项目注册数据。

中央世界画框、`features/world-screen`、`features/world-switch`、轻量世界注册表、Manifest、动态加载、
V2 多世界会话属于下一步功能；本轮不创建空模块，不把目录迁移当作已经实现世界切换。
当前 `session.ts` 保持 V1 存储键和兼容逻辑，未来多世界会话另行迁移。

## 根目录与资源

- `AGENTS.md`：唯一总规范；`README.md`：启动命令、阶段状态、入口说明。
- `package.json` / `package-lock.json`：现有 npm 命令和锁定依赖，本轮没有引入新依赖。
- `public/favicon.svg`：当前静态资源；程序化素材仍由代码生成。
- `docs/`：设计规则、历史评审与截图；不是运行资源目录。
- `scripts/`：验证与截图脚本；现有角色/镜头检查已同步新路径。
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

# 相机实际浏览器验收（F3 面板、拖拽、近距淡出、贴墙/墙角、低机位截图）。
node .camera-preview/diag-camera.mjs
```

浏览器检查结果与本轮截图存放在 `docs/structure-review/`；软件渲染和手机视口模拟不代表真机性能与手感验收。
