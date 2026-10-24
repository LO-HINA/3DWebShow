# LOHINA WORLD 文档索引

> 更新日期：2026-10-24  
> 本文只负责导航和证据分级，不替代技术规范、实施记录或验收结论。  
> 规范以根目录 [`AGENTS.md`](../AGENTS.md) 为准；运行命令与当前进度以根目录 [`README.md`](../README.md) 为准。

## 1. 接手阅读顺序

| 文档 | 作用 | 什么时候读 |
| --- | --- | --- |
| [`CURRENT_TASK.md`](CURRENT_TASK.md) | 当前用户任务、保留内容、文件归属、端口与证据状态 | 新 agent 首次接手先读，再按其顺序核对总规范与源码 |
| [`AGENTS.md`](../AGENTS.md) | 唯一项目规范：视觉基线、建筑语法、镜头角色、性能预算、协作边界 | 接任务、改共享文件、评审方案之前 |
| [`README.md`](../README.md) | 当前工作区进度、启动命令、已知限制、截图与脚本入口 | 启动项目、交接、判断“现在做到哪” |
| [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md) | 实际文件职责、运行关系、旧路径映射 | 找代码、迁移路径、确认模块归属 |

## 2. 视觉与建筑

当前规划依据：[新街区布局与编号规划](block-plan/README.md)。用户手绘布局只确认 `M`、`SCREEN`、`NW(0)`、`SW(0)`、`NE(0)`、`SE(0)`，尚未替换当前运行布局，也未授权移动现有建筑。

并行实现记录：[LM-01 光轨出生庭与页面入口](orrery-review/2026-10-24.md)。14m×11.8m候选、下方出生与可交互仪表盘已接入，入口配置和模型位已明确；截图/录屏及完整浏览器往返待验收，不按大屏遮挡提前移动建筑。

| 文档 / 目录 | 内容 | 当前状态 |
| --- | --- | --- |
| [`block-plan/README.md`](block-plan/README.md) | 新街区布局、M/SCREEN 与 NW/SW/NE/SE 编号、待定项、工程影响与分阶段计划 | 规划登记，未实施；不替换当前八栋布局 |
| [`STYLE_REFERENCES.md`](STYLE_REFERENCES.md) | Neon Zenith、Threejs-Punk、Samsy 逆向研究、V4 夜景报告的拆解与可迁移原则 | 改造前诊断 + 第二轮实施状态；不把历史诊断当作当前缺失 |
| [`building-workshop/README.md`](building-workshop/README.md) | B-01 同世界搬迁到西侧空地的打磨区、直达入口与检查 | 已搬迁；无搬迁后运行截图 |
| [`orrery-review/2026-10-24.md`](orrery-review/2026-10-24.md) | LM-01 光轨出生庭、双轨双球、控制台与 `/world/observatory` | 构建/几何/物理/页面检查通过；浏览器往返待验收 |
| [`references/buildings/README.md`](references/buildings/README.md) | 用户选定的三张建筑参考截图与下一轮改造简报 | 风格参考，不是运行截图或性能证据 |
| [`city-style-review/README.md`](city-style-review/README.md) | 八栋实体窗与第二轮构造细化、调参表、复现命令、连续操作验收清单 | 几何/射线检查通过；真实 GPU 与主观视觉仍待验收 |
| [`screenshots/b01/README.md`](screenshots/b01/README.md) | B-01 北岸媒体楼：四面错层漫画、流动光幕、结构审阅模式与证据边界 | 四面布局/材质第一轮完成；截图与录屏来自 Edge + SwiftShader，真实 GPU 未验收 |
| [`E01_STYLE_GUIDE.md`](E01_STYLE_GUIDE.md) | E-01 视觉与摄影馆的体量、门窗、招牌、灯光与可复用构件 | E-01 专用样板规则；E-01 在媒体立面策略中保持暗面留白 |
| [`zenith-building-review/README.md`](zenith-building-review/README.md) | Neon Zenith 单栋退台办公塔复现样板、许可与预览方式 | 独立 WebGPU/TSL 预览，不进入正式主场景 |
| [`plaza-screen-review/README.md`](plaza-screen-review/README.md) | 广场 SCREEN-01 与 12m / 14m 画幕提案 | 正式场景仍是 8m 屏；提案未接入布局、碰撞和事件 |
| [`screenshots/hero/after/`](screenshots/hero/after/) | H-01 母版媒体楼机位截图 | 外观检查图；未单独记录性能 |
| [`screenshots/t02/after/`](screenshots/t02/after/) | T-02 品牌塔立面精修机位截图 | 外观检查图；未单独记录性能 |
| [`screenshots/e01/`](screenshots/e01/) | E-01 精修前后同机位对比与主视觉纹理 | 2026-10-22 历史构建；早于 T-02/T-03/B-01 后续改动 |

## 3. 镜头、角色与交互

| 文档 | 内容 | 状态 |
| --- | --- | --- |
| [`CAMERA_MOVEMENT_INTERFACE.md`](CAMERA_MOVEMENT_INTERFACE.md) | 相机与运动模块的文件归属、调用顺序和输入输出 | 接口约定 |
| [`camera-review/README.md`](camera-review/README.md) | 第三人称跟随、三档取景、仰望模式与镜头碰撞 | 静态逻辑与浏览器检查记录 |
| [`exploration-camera-review/README.md`](exploration-camera-review/README.md) | 近地仰视、人物淡出、贴墙/绕角跟随、F3 调试面板 | 关键状态与移动贴墙已采样；连续录屏与真实 GPU 透明排序未验收 |
| [`locomotion-review/README.md`](locomotion-review/README.md) | 距离驱动步态、起停、转向与腾空/落地 | 逻辑回归；连续录屏未验收 |
| [`movement-review/`](movement-review/) | 10m/s 普通移动、移除冲刺、保留跳跃的参数检查 | 回归记录 |
| [`structure-review/README.md`](structure-review/README.md) | 首批目录迁移的冒烟检查与截图 | 历史迁移记录 |

## 4. 截图目录

| 目录 | 内容 | 证据级别 |
| --- | --- | --- |
| `screenshots/01-*.png` – `16-*.png` | Round 01 出生点、广场、灯箱、目录、设置、移动端与虚空街区 | 浏览器运行截图（早期构建） |
| `screenshots/e01/before/`、`after/` | E-01 精修前后同机位对比 | 浏览器运行截图（2026-10-22） |
| `screenshots/t02/after/` | T-02 品牌塔精修 | 浏览器运行截图 |
| `screenshots/hero/after/` | H-01 母版媒体楼 | 浏览器运行截图 |
| `screenshots/b01/` | B-01 旧媒体方案：出生、走廊、正面、三分之四、双楼关系 | 历史截图；早于四面漫画与光幕，不作为本轮证据 |
| `screenshots/b01/facades/` | B-01 四面错层漫画、街区关系、绕楼逐帧与连续录屏 | 浏览器运行截图 + 33.48s 录屏；SwiftShader |
| `screenshots/b01/structure/` | B-01 结构模式 01–07：全高、转角、东立面、入口、门廊、三分之四、冠顶 | 浏览器运行截图，审阅灯开启 |
| `screenshots/b01/diag/` | B-01 全高、俯仰与地面机位诊断图 | 浏览器运行截图 |
| `references/buildings/` | 用户选定参考图与简报 | 设计参考，不是本项目运行画面 |
| `city-style-review/` | 八栋实体窗与光影接入记录 | 本轮没有真实浏览器截图；只有逻辑/几何检查 |
| `zenith-building-review/` | 单栋样板说明与几何检查 | 独立预览；浏览器采集曾受权限限制 |

## 5. 验证脚本

运行浏览器脚本前先启动 `npm run dev`。多数脚本写死 Edge 路径与端口，换机器时需要调整；`t02-check.mjs`、`b01-*.mjs` 当前连接 `127.0.0.1:5174`。

| 脚本 | 用途 | 备注 |
| --- | --- | --- |
| `npm run typecheck` | TypeScript 类型检查 | 所有改动的底线 |
| `npm run build` | 类型检查 + Vite 生产构建 | 2026-10-24 当前工作区通过；主 JS 5,451.67 kB / gzip 1,963.11 kB，仍有 chunk 体积警告 |
| `node scripts/check-dependencies.mjs` | 源码分层依赖边界 | 不启动浏览器 |
| `node scripts/verify.mjs` | 引导、出生点、灯箱、E-01 进入/返回、目录、设置、移动端 | 需开发服务器 |
| `node scripts/e01-check.mjs after` | E-01 01–06 机位与渲染统计 | 会覆盖 `after/` 截图 |
| `node scripts/t02-check.mjs` | T-02 固定机位与统计 | 默认 5174 |
| `node scripts/hero-check.mjs` | H-01 机位截图 | 需开发服务器 |
| `node scripts/b01-check.mjs` | B-01 最终媒体模式 5 张 | 默认 5174 |
| `node scripts/b01-structure.mjs` | B-01 `?b01=structure` 7 张 | 默认 5174 |
| `node scripts/b01-full.mjs` | B-01 全高与转角 | 默认 5174 |
| `node scripts/b01-facades.mjs` | B-01 四立面、街区关系与绕楼录屏 | 默认 5174；输出 `docs/screenshots/b01/facades/` |
| `node scripts/b01-console.mjs` | B-01 页面/控制台错误检查 | 记录 WebGL sampler 警告 |
| `node scripts/void-check.mjs` | 虚空街区截图与统计 | 历史数字不能代表当前构建 |
| `node scripts/camera-follow-check.mjs` | 移动贴墙/绕角跟随采样 | 可用 `LOHINA_URL` 指定端口 |
| `scripts/check-city-style.ts` | 八栋几何/媒体槽/实例矩阵与正视/斜视射线检查 | 先用 esbuild 打包，再执行生成的 mjs；命令见城市建筑记录 |
| `scripts/check-city-look.ts` | 选择性辉光、反射与画质降级逻辑检查 | 先用 esbuild 打包到 `.camera-preview/` 再执行 |
| `python scripts/capture-city-style.py` | 城市光影浏览器采集 | 本机曾遇 Playwright 驱动权限错误，未完成 |
| `python scripts/capture-zenith-study.py` | 单栋样板四视角采集 | 本机曾遇驱动权限错误，未完成 |

脚本的完整命令、端口和已知失败见根 [`README.md`](../README.md) 与对应评审目录。

## 6. 证据分级

文档中的“完成”必须能对应到下列某一级，不能混写：

| 级别 | 含义 | 例子 |
| --- | --- | --- |
| A. 规范 / 设计目标 | 希望达到的效果，尚未代表已实现 | `AGENTS.md` §1.1a 的媒体立面尺度表、12m/14m 画幕提案 |
| B. 工作区实现 | 源码已接入，类型/构建/几何检查通过 | `cityStyle.ts`、`heroMedia.ts` + `b01MediaConfig.ts`、`CityLook` 管线、`?b01=structure` |
| C. 浏览器运行截图 | 固定机位在真实浏览器中渲染，可证明可见表现 | `docs/screenshots/b01/structure/`、`t02/after/` |
| D. 真实 GPU / 连续操作验收 | 真实显卡帧率、透明排序、视频解码、连续录屏、主观手感 | 目前多数项目仍缺；SwiftShader 截图不能替代 |

维护规则：

- 不把 B 级写成 C 级；`typecheck`、`build`、HTTP 200 和几何检查都不能证明画面通过。
- 不拿旧构建截图覆盖新功能；E-01、T-02、T-03、B-01 的改动时间不同，历史统计已注明适用构建。
- 截图只证明该机位、该画质、该后端的可见表现；性能与手感必须另测。
- 文档更新不自动授权代码修改、向远程仓库推送或发布。
- 共享文件包括世界的 `layout.ts`、`colliders.ts`、`materials.ts`、`theme.ts`、`index.ts`、`buildings/buildings.ts`、`buildings/cityStyle.ts`，以及宿主 `WorldEngine.ts` 和公共后期 `cityLook.ts`。由整合负责人协调；`cityStyle.ts` 影响八栋，不是单栋的私有文件。具体路径与交接方式见 `CURRENT_TASK.md`。

## 7. 新增内容时更新哪里

1. 新建筑或新模块：更新 [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md) 的文件职责与运行关系。
2. 新视觉决策：先写进 `AGENTS.md` 对应章节，再在 `STYLE_REFERENCES.md` 或独立评审目录记录依据；设计目标与实施状态分开写。
3. 新截图或脚本：更新根 `README.md` 的截图/脚本表，并在对应评审目录写清机位、端口、构建时间和限制。
4. 新素材：在 `public/assets/.../README.md`、`CREDITS` 或资产清单登记来源与许可；没有许可的参考站素材只可阅读，不可复制。

5. 用户任务、已完成阶段或阻塞发生变化：更新 `CURRENT_TASK.md`，写清适用会话、模块和证据；不要把一次环境失败泛化成整个项目不可运行，或把一次单栋截图泛化成全城通过。
