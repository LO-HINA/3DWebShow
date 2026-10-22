# 相机与运动模块接口

本轮会话中只有当前执行 agent，没有可联络的移动控制 agent。以下为已落地的文件边界与交接约定，尚未获得另一 agent 确认。

| 归属 | 文件与职责 |
| --- | --- |
| 相机 | `follow.ts`：锚点、独立观察方向、轨道参数、期望/显示距离分离、复位；`collision.ts`：地面、体积碰撞、起点探针、帧间扫掠与唯一提交；`avatarFade.ts`：角色材质克隆、近距/中心遮挡/仰视构图的弱化与恢复 |
| 相机接入 | `WorldEngine.ts` 标有 CAMERA INTEGRATION 的字段与渲染后接入；`CAMERA` 配置、相机快照、bridge 的相机操作、HUD/快捷键、`F3` 调试快照 |
| 运动 | `controller.ts`：固定步进、碰撞修正速度与位置；`player.ts`：角色层级及外观；`gait.ts`：距离驱动步态。本轮不改写这三个文件 |

每帧调用顺序为：固定物理步进 → `player.render(alpha, delta, reducedMotion)` 一次 → `follow.update(delta, rig.group.position, settings)` → `cameraCollision.update(...)` → `avatarFade.update(...)` → 渲染。相机锚点直接读取已插值的角色根节点，不修改角色 transform，不再次推进动画。

移动输入继续读取 `follow.movementYaw`，计算平面方向并归一化；不得从接近竖直的视线向量归一化求前进方向。相机碰撞只查询 physics world，排除 `player.colliderHandle`，不改写角色 collider。

相机重置用 `worldBridge.resetCamera()`，不调用角色传送或清空位置。V 的辅助观赏模式仍暂停移动；普通拖拽仰视不暂停移动。快照 `orientationVersion: 2` 的 pitch 向下为正，范围 ±85°；不得恢复旧轨道角的语义。

相机位置和观察方向只在 `collision.ts` 调用 `follow.commit()` 时写入一次；`follow.update()` 只计算期望臂长，`resolveLength()` 只计算碰撞后的显示臂长，不修改用户目标。`F3` 调试面板读取 `CameraDebugSnapshot`，角度统一为水平向上为正，真实视线由最终 `camera.getWorldDirection()` 反算。调试快照只发布到 Zustand 供界面读取，不参与相机求解。

淡出适配器挂在角色根节点，克隆角色材质，不改变与建筑共享的材质。运动模块对原接地阴影 opacity 的更新会同步到克隆材质；dispose 时恢复原材质与 castShadow。当前遮挡检测适配 1.6m 程序化角色；替换正式模型时需同步身高/体积，模型加载后重建适配器，避免新部件漏掉。

本轮结束核对 SHA256，与开始一致：

```text
controller.ts 89dc23ae058d37f3a46f73ee070ccf26e411d6cbcfe6da4f37a7c6cd1a39a68f
player.ts     08a14489822782eae5fc81b86e6e5441e68ffd99dc470b388a7543a923569f6a
gait.ts       89a3f1ae86e896aeea78af883698b17bcee4a4a9695a13d34cbe0343adf2e66a
```
