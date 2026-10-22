# 首批目录迁移验证

日期：2026-10-22。范围：V3.0 的公共引擎、赛博主题、独立内容、功能界面和宿主分层。
实际路径与后续边界见 [项目结构](../PROJECT_STRUCTURE.md)。

## 已执行

- `npm run typecheck`：通过。
- `npm run build`：通过。沙箱首次阻止 esbuild 子进程；获准后在沙箱外完成标准生产构建。
- `node scripts/check-dependencies.mjs`：通过，检查 121 条本地导入；公共引擎无主题/宿主依赖，功能界面不直接导入主题。
- `scripts/check-camera.ts`：经本地 esbuild 打包并执行，通过相机相对移动、步进、冲刺、跳跃、碰撞、快照等既有检查。
- `scripts/check-exploration-camera.ts`：打包执行通过，覆盖近地仰视、近裁剪面、碰撞、角色淡出、快照与复位。
- `scripts/check-locomotion.ts`：打包执行通过，覆盖步态、转向、跑跳、不同模拟帧率、实际地图碰撞路线。
- `scripts/smoke-structure.py`：通过。浏览器驱动首次被沙箱的管道权限阻止，获准在沙箱外重新执行后完成。

浏览器检查使用无头 Edge / SwiftShader：1440×900 桌面视口和 390×844 手机模拟视口。
检查桌面探索及单 canvas、W1 灯箱图片与关闭、八处展位目录、设置、E-01 内容页进入与返回、
摄影馆直接访问、手机摇杆可见；未捕获到页面 JavaScript 异常。
详见 [browser-checks.json](browser-checks.json)，截图为 [desktop.png](desktop.png) 与 [mobile.png](mobile.png)。

## 保留与限制

以迁移开始时的工作区为源，保留既有未提交的角色、相机和建筑成果；未用 Git HEAD 回退文件。
地图坐标、动作参数、镜头参数、V1 快照键和路由保持原值。
迁移脚本曾漏写 CSS 目标文件，已从迁移前本地构建的源码映射恢复；生产 CSS 仍为
`index-4fsYITB_.css`，与迁移前产物哈希一致。

本轮生产 JS 约 5,304.14 kB，gzip 约 1,916.08 kB，仍有既有大 chunk 警告。
本轮不以构建结果宣称达到加载、帧率或视觉预算；软件渲染和模拟手机也不代表真机性能与手感验收。
中央世界画框、世界注册、动态加载、WorldHandle 生命周期和多世界会话尚未实现。
`app/WorldEngine.ts` 仍是过渡装配宿主，部分主题环境与灯光留待后续按行为提取。

本轮未推送、发布或提交远程仓库。
