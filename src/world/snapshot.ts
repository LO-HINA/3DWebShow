import type { ColliderSpec, Vec3, WorldSnapshotV1 } from './config/types';
import {
  LAYOUT_VERSION,
  PLAYER,
  SNAPSHOT_KEY,
  SPAWN,
  WORLD_BOUNDS,
  worldColliders,
} from './config/world';

const SCHEMA_VERSION = 1 as const;

function isFiniteVec3(value: unknown): value is Vec3 {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((item) => typeof item === 'number' && Number.isFinite(item))
  );
}

function colliderBlocksPoint(collider: ColliderSpec, feet: Vec3): boolean {
  const radius = PLAYER.radius;
  if (collider.kind === 'cylinder') {
    const [cx, cy, cz] = collider.center;
    const top = cy + collider.halfHeight;
    const bottom = cy - collider.halfHeight;
    if (top < feet[1] - 0.05 || bottom > feet[1] + PLAYER.height) return false;
    return Math.hypot(feet[0] - cx, feet[2] - cz) < collider.radius + radius;
  }

  const [cx, cy, cz] = collider.center;
  const [sx, sy, sz] = collider.size;
  const top = cy + sy / 2;
  const bottom = cy - sy / 2;
  if (top < feet[1] - 0.05 || bottom > feet[1] + PLAYER.height) return false;

  const dx = feet[0] - cx;
  const dz = feet[2] - cz;
  const cos = Math.cos(collider.yawRad);
  const sin = Math.sin(collider.yawRad);
  const localX = dx * cos - dz * sin;
  const localZ = dx * sin + dz * cos;
  return Math.abs(localX) < sx / 2 + radius && Math.abs(localZ) < sz / 2 + radius;
}

export function isSafeFeet(feet: Vec3): boolean {
  const margin = PLAYER.radius + 0.35;
  if (
    feet[0] < WORLD_BOUNDS.min + margin ||
    feet[0] > WORLD_BOUNDS.max - margin ||
    feet[2] < WORLD_BOUNDS.min + margin ||
    feet[2] > WORLD_BOUNDS.max - margin
  ) {
    return false;
  }
  if (Math.abs(feet[1]) > 0.6) return false;
  return !worldColliders.some((collider) => colliderBlocksPoint(collider, feet));
}

export function createSnapshot(feet: Vec3, yawRad: number, lastEnteredPortalId?: string): WorldSnapshotV1 {
  return {
    schemaVersion: SCHEMA_VERSION,
    layoutVersion: LAYOUT_VERSION,
    savedAt: Date.now(),
    player: { feet: [feet[0], 0, feet[2]], yawRad },
    camera: { mode: 'follow', offset: [0, 11, 14] },
    lastSafeFeet: [feet[0], 0, feet[2]],
    lastEnteredPortalId,
    returnAnchorId: lastEnteredPortalId ? `RETURN:${lastEnteredPortalId}` : SPAWN.returnAnchorId,
  };
}

export function saveSnapshot(feet: Vec3, yawRad: number, lastEnteredPortalId?: string): void {
  if (!isSafeFeet(feet)) return;
  try {
    const snapshot = createSnapshot(feet, yawRad, lastEnteredPortalId);
    sessionStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // 隐私模式或存储被禁用时静默降级，不影响行走。
  }
}

function validateSnapshot(value: unknown): WorldSnapshotV1 | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<WorldSnapshotV1>;
  if (candidate.schemaVersion !== SCHEMA_VERSION) return null;
  if (candidate.layoutVersion !== LAYOUT_VERSION) return null;
  if (!candidate.player || !isFiniteVec3(candidate.player.feet)) return null;
  if (typeof candidate.player.yawRad !== 'number' || !Number.isFinite(candidate.player.yawRad)) return null;
  if (!isFiniteVec3(candidate.lastSafeFeet)) return null;
  if (!isSafeFeet(candidate.player.feet)) return null;
  if (!isSafeFeet(candidate.lastSafeFeet)) return null;
  return {
    schemaVersion: SCHEMA_VERSION,
    layoutVersion: LAYOUT_VERSION,
    savedAt: typeof candidate.savedAt === 'number' ? candidate.savedAt : Date.now(),
    player: {
      feet: [candidate.player.feet[0], 0, candidate.player.feet[2]],
      yawRad: candidate.player.yawRad,
    },
    camera: { mode: 'follow', offset: [0, 11, 14] },
    lastSafeFeet: [candidate.lastSafeFeet[0], 0, candidate.lastSafeFeet[2]],
    lastEnteredPortalId:
      typeof candidate.lastEnteredPortalId === 'string' ? candidate.lastEnteredPortalId : undefined,
    returnAnchorId:
      typeof candidate.returnAnchorId === 'string' ? candidate.returnAnchorId : undefined,
  };
}

export function loadSnapshot(): WorldSnapshotV1 | null {
  try {
    const raw = sessionStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    return validateSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearSnapshot(): void {
  try {
    sessionStorage.removeItem(SNAPSHOT_KEY);
  } catch {
    // 忽略存储异常。
  }
}
