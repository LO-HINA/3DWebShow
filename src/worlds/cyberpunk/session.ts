import { worldColliders } from './colliders';
import { CAMERA } from '../../engine/camera/settings';
import { PLAYER } from '../../engine/player/settings';
import type { CameraSnapshot, ColliderSpec, Vec3, WorldSnapshotV1 } from '../../engine/contracts/types';
import {
  LAYOUT_VERSION,
  SNAPSHOT_KEY,
  SPAWN,
  WORLD_BOUNDS,
} from './layout';

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

export function validateCamera(value: unknown): CameraSnapshot {
  const source = (value && typeof value === 'object' ? value : {}) as Partial<CameraSnapshot>;
  const bounded = (v: unknown, fallback: number, min: number, max: number): number =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
  const distance = bounded(source.distance, CAMERA.framings.medium.distance, CAMERA.minDistance, CAMERA.maxDistance);
  let pitch = bounded(source.pitch, CAMERA.framings.medium.pitch, CAMERA.minPitch, CAMERA.maxPitch);
  // 旧快照的 pitch 是相机臂角度；新快照保存独立观察方向。
  if (source.orientationVersion !== 2 && typeof source.pitch === 'number' && Number.isFinite(source.pitch)) {
    pitch = Math.atan2(Math.sin(pitch) * distance - 0.55, Math.cos(pitch) * distance + 2);
  }
  return {
    orientationVersion: 2,
    mode: source.mode === 'lookUp' ? 'lookUp' : 'follow',
    yaw: bounded(source.yaw, 0, -Math.PI * 1000, Math.PI * 1000),
    pitch: bounded(pitch, CAMERA.framings.medium.pitch, CAMERA.minPitch, CAMERA.maxPitch),
    distance,
    framing: source.framing === 'low' || source.framing === 'high' ? source.framing : 'medium',
    lookUpPitch: bounded(source.lookUpPitch, -0.42, CAMERA.minPitch, CAMERA.maxPitch),
    lookUpHeight: bounded(source.lookUpHeight, 6, 2.5, 18),
    lookUpYaw: bounded(source.lookUpYaw, bounded(source.yaw, 0, -Math.PI * 1000, Math.PI * 1000), -Math.PI * 1000, Math.PI * 1000),
    lookUpDistance: bounded(source.lookUpDistance, CAMERA.framings.medium.distance, CAMERA.minDistance, CAMERA.maxDistance),
  };
}

export function createSnapshot(feet: Vec3, yawRad: number, lastEnteredPortalId?: string, camera?: CameraSnapshot): WorldSnapshotV1 {
  return {
    schemaVersion: SCHEMA_VERSION,
    layoutVersion: LAYOUT_VERSION,
    savedAt: Date.now(),
    player: { feet: [feet[0], 0, feet[2]], yawRad },
    camera: validateCamera(camera),
    lastSafeFeet: [feet[0], 0, feet[2]],
    lastEnteredPortalId,
    returnAnchorId: lastEnteredPortalId ? `RETURN:${lastEnteredPortalId}` : SPAWN.returnAnchorId,
  };
}

export function saveSnapshot(feet: Vec3, yawRad: number, lastEnteredPortalId?: string, camera?: CameraSnapshot): void {
  if (!isSafeFeet(feet)) return;
  try {
    const snapshot = createSnapshot(feet, yawRad, lastEnteredPortalId, camera);
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
    camera: validateCamera(candidate.camera),
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
