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
  groundTint:0x9aa3bd,plainGroundTint:0x141827,groundRoughness:0.46,plainGroundRoughness:0.44,
  groundEnvironment:0.35,bloomStrength:0.32,bloomRadius:0.42,bloomThreshold:0.78,
  reflectionScale:0.6,reflectionMaxSize:1024,wetMin:0.62,wetMax:0.96,
} as const;

