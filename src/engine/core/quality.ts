export const QUALITY = {
  high: {
    dprCap: 1.5,
    shadowMapSize: 2048,
    shadows: true,
    anisotropy: 8,
  },
  low: {
    dprCap: 1.2,
    shadowMapSize: 1024,
    shadows: false,
    anisotropy: 4,
  },
} as const;
