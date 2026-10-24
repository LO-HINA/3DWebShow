# 广场大屏接入

`cyberpunk / SCREEN-01`：本轮由当前前端 agent 制作与接入，来源为程序化几何；封面为仓库内原创 SVG。当前状态为已接入、待真实浏览器画面确认。既有雕塑、建筑、角色、镜头实现均保留。

## 配置与交接

配置位置为 `src/worlds/cyberpunk/layout.ts` 的 `plazaScreen`。工厂通过世界公开入口导出的 `createPlazaScreen(spec, anisotropy)` 接收参数，不在组件内固定世界位置和图片地址。有效画面宽高独立传入；当前为 8×4.5m（16:9），外框宽 0.12m，实体厚度 0.34m，画面下沿高 2.6m。

```ts
const spec = {
  id: 'SCREEN-01',
  position: [0, 0, -6.4], // 地面根节点；当前仅为暂定整合位置
  yawRad: 0,             // 正面 +Z，朝南
  width: 8,
  height: 4.5,
  bottom: 2.6,
  frameWidth: 0.12,
  depth: 0.34,
  imageUrl: '/assets/worlds/cyberpunk/media/plaza-screen.svg',
};
```

装置位于雕塑北侧，由两根细支撑和两块低脚座承托，脚座之间净空约 4.91m。整体仍在中央广场范围内，不占用东西两条主路。最终摆放尚待整合时确认；位置/朝向/尺寸修改后，同一配置同步生成碰撞体，无须另改控制器。新增障碍会进入现有安全落点检测。

边框为深色金属，图像采用白色 Basic 材质、sRGB 纹理，关闭该材质的色调映射与雾染，保持图片可读；未加入整圈灯带或额外点光。底边两段灯芯退入真实槽口。非 16:9 图片完整缩放入屏，留暗边，不拉伸或裁切。加载失败保留装置和暗色屏底，并在开发诊断中标记 `imageStatus: error`。

本轮交付实体大屏与图片接入；全视口主题选择和世界切换仍按独立功能任务推进。工厂返回 group 与 dispose，处理异步图片晚到、贴图和几何释放；屏体内部按材质合并，保留异步图片面独立。宿主仅装配、加入合并排除列表和回收，不新增渲染循环。

## 验证证据与限制

- 2026-10-23 补充：在可运行环境重新执行 `npm run typecheck` 与 `npm run build` 均通过；下方“`spawn EPERM` 未完成 Vite 生产构建”只记录当时的受限会话。浏览器运行画面仍未采集。
- 12m / 14m 建筑体量画幕的尺寸与摆放比较见 [proposal/README.md](proposal/README.md)；提案未接入本正式大屏。
- `node scripts/check-dependencies.mjs` 通过。
- 原生 esbuild 浏览器入口打包通过。运行中的 5173 服务返回的大屏模块、布局与宿主源码均与本地一致，图片地址返回 HTTP 200。标准 `npm run build` 在启动 esbuild 子进程时遇到 `spawn EPERM`，未完成 Vite 生产构建。
- `scripts/check-plaza-screen.ts` 使用当前整张地图的真实 Rapier 碰撞查询：中央屏下与左右绕行路线通过，支撑阻挡角色、屏体阻挡相机；另检查了旋转/平移后的碰撞坐标与三种图片宽高比。结果为 `logic-checks.json`，不代表已取得运行画面。
- 已执行 `python scripts/capture-plaza-screen.py`，Playwright 驱动启动阶段出现 `PermissionError: [WinError 5]`，尚未进入浏览器。失败见 `browser-checks.json`。未生成或伪造运行截图。

可运行浏览器驱动时，启动 `npm run dev` 后执行上述截图脚本，采集出生点、正面、侧前方。需继续检查实际亮度、与雕塑的画面重叠、近处壳体厚度、人物跳跃接近屏下的碰撞，以及实际 draw calls。最终位置和视觉验收仍未确认。
