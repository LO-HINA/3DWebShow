/**
 * Selected setback/crown branches adapted from Neon Zenith src/city/massing.js.
 * Copyright (c) 2026 Bill Chan — MIT. See vendor/LICENSE and README.md.
 * The other building families and city generator are intentionally not imported.
 */
export interface StudyTier {
  x: number; z: number; w: number; d: number; y0: number; y1: number;
  kind?: 'clad' | 'louvre' | 'led' | 'plant';
}
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const range = (rng: () => number, lo: number, hi: number) => lo + rng() * (hi - lo);
const tier = (x: number, z: number, w: number, d: number, y0: number, y1: number,
  kind?: StudyTier['kind']): StudyTier => ({ x, z, w, d, y0, y1, kind });

export function createStudyTiers(seed = 23, H = 224): StudyTier[] {
  const rng = seeded(seed), lw = 52, ld = 40, podium = 12;
  // Select the upstream setback family, retaining its dimensional formulae.
  const out: StudyTier[] = [tier(0, 0, lw, ld, 0, podium)];
  const sw0 = Math.min(lw, ld) * range(rng, 0.55, 0.8);
  let w = Math.min(lw - 4, sw0 * range(rng, 0.9, 1.3)), d = Math.min(ld - 4, sw0), y = podium;
  const ox = range(rng, -0.12, 0.12) * (lw - w), oz = range(rng, -0.12, 0.12) * (ld - d);
  const steps = H > 400 ? 3 : H > 200 ? 2 : 1;
  for (let i = 0; i < steps; i++) {
    const y1 = i === steps - 1 ? H : y + (H - y) * range(rng, 0.45, 0.65);
    const t = tier(ox, oz, w, d, y, y1); out.push(t);
    if (i < steps - 1) {
      if (rng() < 0.6) {
        t.y1 = y1 - range(rng, 4, 7);
        out.push(tier(ox, oz, w - 0.8, d - 0.8, t.y1, y1, 'louvre'));
      }
      out.push(tier(ox, oz, w + 1.6, d + 1.6, y1 - 0.9, y1, 'clad'));
    } else {
      // Select the original open-frame crown variant (not its random selection).
      const h = range(rng, 9, 16), p = Math.min(1.6, w * 0.08);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
        out.push(tier(ox + sx * (w / 2 - p / 2), oz + sz * (d / 2 - p / 2), p, p, H, H + h, 'clad'));
      for (const s of [-1, 1]) {
        out.push(tier(ox, oz + s * (d / 2 - p / 2), w, p, H + h - 1.4, H + h, 'led'));
        out.push(tier(ox + s * (w / 2 - p / 2), oz, p, d - 2 * p, H + h - 1.4, H + h, 'led'));
      }
      out.push(tier(ox, oz, w * 0.45, d * 0.45, H, H + range(rng, 4, 7), 'plant'));
    }
    y = y1; w *= range(rng, 0.7, 0.86); d *= range(rng, 0.7, 0.86);
  }
  return out;
}
