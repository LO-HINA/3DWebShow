export const CAMERA = {
  fov: 52,
  near: 0.1,
  far: 200,
  orbitLambda: 18,
  recoveryLambda: 6,
  // 水平旋转保持细腻；垂直拖拽略快，普通屏幕行程内可从俯视连续抬到 85°。
  dragYawSensitivity: 0.004,
  dragPitchSensitivity: 0.0055,
  minDistance: 0.35,
  maxDistance: 16,
  collisionRadius: 0.28,
  collisionSkin: 0.04,
  collisionProbeRadius: 0.08,
  groundClearance: 0.4,
  minPitch: -85 * Math.PI / 180,
  maxPitch: 85 * Math.PI / 180,
  compositionTilt: 7 * Math.PI / 180,
  chestHeight: 1.25,
  framings: {
    low: { pitch: 6 * Math.PI / 180, distance: 7 },
    medium: { pitch: 13 * Math.PI / 180, distance: 8.5 },
    high: { pitch: 22 * Math.PI / 180, distance: 10 },
  },
  avatarFade: {
    // 近镜头 / 身体轴遮挡的进入、退出阈值，滞回避免边缘抖动。
    nearEnter: 0.7,
    nearExit: 1.02,
    centerEnter: 0.34,
    centerExit: 0.46,
    screenEnter: 0.32,
    screenExit: 0.24,
    closeOpacity: 0.06,
    insideOpacity: 0,
    // 独立构图规则：大幅仰视建筑时只弱化，不隐藏人物。
    upLookStart: 50 * Math.PI / 180,
    upLookFull: 70 * Math.PI / 180,
    upLookOpacity: 0.24,
    fadeRate: 14,
    recoverRate: 9,
  },
};

