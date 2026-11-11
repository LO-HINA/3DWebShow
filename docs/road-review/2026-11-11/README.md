# 十字马路标线与全城提亮（2026-11-11）

> 用户指令：“接下来我们先做马路，先尽量让城市亮起来。”  
> 适用布局版本：`lohina-junction-v4-2026-11-11-roads`  
> 证据：本目录 `044211/`（最终版）+ `043412/`、`043836/`（过程稿）  
> 采集后端：Edge + SwiftShader，1440×810，DPR 1，约 1–2 fps；**真实 GPU 与连续行走未验收**。

## 1. 本轮交付

| 内容 | 结果 |
| --- | --- |
| 中央十字马路标线 | 路缘线、中心虚线、人行横道、停止线、减速带、路缘引导点 |
| 动态元素 | 南北青色 / 东西暖金两条流动光带；路灯下暖色光池 |
| 全城亮度 | 路面底色、环境反射、辉光阈值、半球光与环境光整体上调 |
| 布局修正 | LEARNING、AI LAB 与 W4 画框移出东西向马路；`path` 保持 18m 宽 |
| 外围清理 | 虚空程序化塔沿两条主轴让出走廊，不再长在马路上 |

## 2. 为什么 LEARNING 原来在马路上

不是本轮马路画错了，而是 **E-02 的位置早于 18m 东西向主路**：

- 旧布局里 `E-02 前端与算法学习馆` 位于 `[-62, 0, -6]`，`E-03 AI 终端亭` 位于 `[62, 0, -6]`；
- 而 `layout.paths` 的东西向主路是 `z ∈ [-9, 9]`（18m 宽），两栋楼的 8m 进深直接压在路面上；
- `W4` 画框原来在 `[44, 0, 8]`，同样落在路内，且与东侧支路 `x=44` 重叠。

用户指出后，按“建筑不能占马路”的原则把三者移到路缘外：

| 对象 | 原位置 | 新位置 | 说明 |
| --- | --- | --- | --- |
| E-02 LEARNING | `[-62, 0, -6]` | `[-62, 0, -17]` | 北侧人行边线外，yaw 仍朝南 |
| E-03 AI LAB | `[62, 0, -6]` | `[62, 0, -17]` | 同上，yaw 仍朝西 |
| W4 画框 | `[44, 0, 8]` | `[44, 0, 13]` | 锚点同步为 `[42.5, 0, 13]` |

`zones` 的 `learning` / `terminal` 中心已同步到 `[-62,-17]` / `[62,-17]`；互动锚点由布局推导，无需另改。验证截图：`044211/09-learning-off-road.png`、`10-terminal-off-road.png`、`11-west-road-clear.png`、`12-west-road-far.png`、`13-east-road-far.png`。

## 3. 马路标线系统

新增 `src/worlds/cyberpunk/props/roadMarkings.ts`，由 `props/street.ts` 的 `createGround()` 接入。全部为贴地平面 / 点精灵，**不新增实时灯**，亮度来自 Basic 材质、加色混合与选择性辉光。

坐标约定（与 `layout.paths` 一致）：

- 南北向主路：`x ∈ [-9, 9]`，标线起点 `|z| = 10.4`，终点 `|z| = 77.6`；
- 东西向主路：`z ∈ [-9, 9]`，终点 `|x| = 87.6`；
- 贴地高度 `y = 0.024`，流动光带 `y = 0.027`，路缘点 `y = 0.05`。

构成：

| 元素 | 参数 |
| --- | --- |
| 路缘线 | 南北青色 `0x3ee6ff`、东西暖金 `0xffbe7d`，宽 0.14m，加色混合 |
| 中心虚线 | 2.4m 线 + 3.6m 间隔，宽 0.13m，`0xbfefff` |
| 人行横道 | 每侧 9 条 0.62×3.0m 白蓝条纹，位于 `|z|` / `|x| = 11.3` |
| 停止线 | 宽 0.28m、长 16.2m，位于 `±13.4` |
| 减速带 | 0.5×2.0m，位于 `±14.6` |
| 流动光带 | 宽 0.34m 平面，ShaderMaterial 加色；`0.2 + 2.4 * pulse`，`userData.bloom = true` |
| 路缘引导点 | `Points` 点精灵，`materials.glow.map`，size 1.15，opacity 0.9，南北青 / 东西金 |
| 支路弱标线 | `x = ±44`、`z = ±44` 的 4m 支路，0.08m 细线 |

性能处理：静态标线是 `StreetProps`/`Ground` 的顶层 Mesh，按材质被 `mergeStaticGroup` 收拢；两条流动光带设置 `name='RoadFlowLine'` + `userData.noMerge = true`，靠 `onBeforeRender` 更新时间 uniform，避免合并后动画丢失。

## 4. 提亮措施

| 文件 | 改动 |
| --- | --- |
| `theme.ts` `CITY_LOOK` | `groundTint 0x9aa3bd`、`plainGroundTint 0x1e2638`、`plainGroundRoughness 0.4`、`groundEnvironment 0.42`、`bloomStrength 0.38`、`bloomThreshold 0.72`（原 0.85 级别） |
| `src/app/WorldEngine.ts` | `HemisphereLight(0x8baecf, 0x20232a, 0.95)`；`AmbientLight(0x38446a, 0.24)`；保留暮色，不改成白天 |
| `layout.ts` `lamps` | 在主路外段 `±58 / ±72` 补灯，南北与东西两侧连续照度 |
| `props/street.ts` | 每盏灯下 `addGlowPool(..., PALETTE.emissiveGold, 8.5, 8.5, 0.12)`；同材质在静态合并中收成一次绘制 |

路面此前偏暗的直接原因：`CityLook` 会用 `plainGroundTint` 覆盖非纹理地面（马路、步道、广场），且 roughness 很低，车行路面几乎全黑。本轮在覆盖值上提亮，并补上标线自身发光，城市亮度主要由“路面可读 + 霓虹辉光 + 湿地反射”三者叠加。

## 5. 外围虚空街区走廊清理

道路已延伸到 48m 中心清空区之外，程序化黑塔会直接长在路面上。`WorldEngine` 在 `createVoidCity` 的 keep-out 列表追加：

```ts
const roadKeepOut = [
  ...Array.from({ length: 7 }, (_, i) => ({ x: -84 + i * 28, z: 0, radius: 13 })),
  ...Array.from({ length: 7 }, (_, i) => ({ x: 0, z: -84 + i * 28, radius: 13 })),
];
```

每条主轴 7 个半径 13m 的禁建圆，覆盖 `±84` 范围，外段马路两侧不再出现穿路黑塔（见 `12-west-road-far.png`、`13-east-road-far.png`）。

## 6. 文件归属

| 文件 | 归属 | 说明 |
| --- | --- | --- |
| `props/roadMarkings.ts` | 本任务新增 | 仅被 `street.ts` 引用 |
| `props/street.ts` | 共享地面文件 | 只加 `createRoadMarkings` 循环与灯下光池，保留并行改动 |
| `layout.ts` | 共享布局文件 | 只改 E-02/E-03/W4 位置、lamps、zones 与 `LAYOUT_VERSION` |
| `theme.ts` | 共享主题文件 | 只改 `CITY_LOOK` 数值，未动材质结构 |
| `src/app/WorldEngine.ts` | 宿主共享文件 | 只改两盏环境光与 void keep-out |
| `scripts/capture-road-brightening.py` | 本任务新增 | 机位与统计采集脚本 |

## 7. 证据

最终目录 `044211/`（布局版本 v4，含 E-02/E-03/W4 移出与外围走廊清理）：

| 截图 | 内容 |
| --- | --- |
| `01-north-approach.png` | 北侧接近路口，中心虚线、横向斑马线 |
| `02-south-to-plaza.png` | 南侧回望广场（机位贴近 NW 广场屏，画面有遮挡属机位问题） |
| `03-crossing-north.png` | 路口内俯视斑马线与停止线 |
| `04-corners.png` | 四角斜视，路缘青/金分色 |
| `05-east-road.png`、`06-west-road.png` | 东西向暖金路缘与流动光带 |
| `07-flow-a/b.png` | 同一机位间隔约 1.1s，证明光带在移动 |
| `08-bloom-off.png` | 关闭辉光对照，标线本体仍可读 |
| `09-learning-off-road.png`、`10-terminal-off-road.png` | LEARNING / AI LAB 已在路缘外 |
| `11-west-road-clear.png` | 西侧路面无建筑/塔穿入 |
| `12-west-road-far.png`、`13-east-road-far.png` | 外段路灯、引导点连续，走廊清空 |
| `14-flow-line-a/b.png` | 提亮后的流动光带 |
| `15-road-lit-a.png` | 湿路反光 + 流动光带整体亮度 |
| `16-road-outer.png` | 外段暖色灯池、引导点与倒影 |
| `17-east-outer.png` | 东侧外段灯列与清空走廊 |

统计（`044211/capture.json`）：445 meshes，约 142 万三角面，835 draw calls，页面无报错。过程稿 `043412`（标线初版）与 `043836`（加入移楼验证）保留作对照，不作为最终证据。

## 8. 复现

```powershell
npm run dev                 # http://127.0.0.1:5173/world
python scripts/capture-road-brightening.py
npm run typecheck
npm run build
```

本轮 `typecheck` 通过；`build` 通过，`dist/assets/index-CdsDT1PP.js 5,494.12 kB / gzip 1,978.26 kB`，仍有 chunk 体积警告。

## 9. 未验收与已知限制

- SwiftShader 只有约 1–2 fps，**流动光带速度、辉光强度、路面亮度在真实 GPU 上的主观观感未验收**。
- 画质档位（HIGH / SMOOTH）下辉光阈值与反射分辨率的表现未做对照采集。
- 流动光带每帧更新 uniform，数量小（2 条），但未测真实 GPU 的帧耗。
- 支路标线只做了弱线，未做斑马线与停止线；若后续支路升格为主路需同步扩展 `NS_END/EW_END`。
