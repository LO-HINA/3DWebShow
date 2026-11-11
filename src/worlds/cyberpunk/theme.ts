export const PALETTE = {
  skyTop: 0x141829,
  skyHorizon: 0x2a3560,
  fogColor: 0x1a2035,
  groundSlate: 0x1e2230,
  groundWalk: 0x262b3a,
  concreteWarm: 0x8c7a6b,
  concreteWarmLight: 0x9d8977,
  concreteDark: 0x4a4548,
  metalCharcoal: 0x2b2d38,
  emissiveGold: 0xffb366,
  emissiveCyan: 0x00f0ff,
  rimWarm: 0xffd6a8,
  skyGlow: 0x33406e,
} as const;

/** Shared by the city lighting pipeline; geometry/contents keep their own materials. */
export const CITY_LOOK = {
  // 2026-11-11 用户指令“尽量让城市亮起来”：路面底色提亮，环境反射略增，
  // 辉光阈值下调，让霓虹与马路标线更早进入光晕。
  groundTint:0x9aa3bd,plainGroundTint:0x1e2638,groundRoughness:0.46,plainGroundRoughness:0.4,
  groundEnvironment:0.42,bloomStrength:0.38,bloomRadius:0.44,bloomThreshold:0.72,
  reflectionScale:0.6,reflectionMaxSize:1024,wetMin:0.62,wetMax:0.96,
} as const;

