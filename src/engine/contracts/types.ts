export type Vec3 = [number, number, number];

export type RoutePath = '/world/gallery' | '/world/learning' | '/world/ai-lab' | '/world/observatory';


export type Accent = 'gold' | 'cyan';

export interface InteractionSpec {
  /** 世界坐标、可达站立点；不是建筑中心，也不是高空贴图位置。 */
  anchor: Vec3;
  enterRadius: number;
  exitRadius: number;
  priority: number;
  maxHeightDelta: number;
  /** 世界空间正面；用于排除从展位背后触发的误操作。 */
  facingNormal?: Vec3;
  returnFeet: Vec3;
  returnYawRad: number;
}

export interface ImageSpec {
  id: string;
  previewUrl: string;
  fullUrl?: string;
  width: number;
  height: number;
  alt: string;
  fit: 'contain' | 'cover';
  attribution?: string;
}

export interface FrameExhibitSpec {
  id: string;
  kind: 'image';
  title: string;
  description: string;
  enabled: boolean;
  artworkId: string;
  frame: {
    position: Vec3;
    yawRad: number;
    lit: boolean;
  };
  interaction: InteractionSpec;
}

export interface PortalSpec {
  id: string;
  kind: 'portal';
  title: string;
  shortTitle: string;
  description: string;
  enabled: boolean;
  targetRoute: RoutePath;
  buildingId: string;
  accent: Accent;
  interaction: InteractionSpec;
}

export type ExhibitSpec = FrameExhibitSpec | PortalSpec;


export interface BoxColliderSpec {
  kind: 'box';
  id: string;
  /** 世界坐标体心。 */
  center: Vec3;
  /** 旋转前的局部世界尺寸。 */
  size: Vec3;
  yawRad: number;
}

export interface CylinderColliderSpec {
  kind: 'cylinder';
  id: string;
  center: Vec3;
  radius: number;
  halfHeight: number;
}

export type ColliderSpec = BoxColliderSpec | CylinderColliderSpec;

export interface ZoneSpec {
  id: string;
  label: string;
  center: [number, number];
  radius: number;
}

export type QualityLevel = 'high' | 'low';

export type FollowFraming = 'low' | 'medium' | 'high';
export interface CameraSnapshot {
  orientationVersion: 2;
  mode: 'follow' | 'lookUp';
  yaw: number;
  pitch: number;
  distance: number;
  framing: FollowFraming;
  lookUpPitch: number;
  lookUpHeight: number;
  lookUpYaw: number;
  lookUpDistance: number;
}

export interface WorldSettings {
  quality: QualityLevel;
  reducedMotion: boolean;
}

/** 相机调试面板只读快照；角度统一为水平向上为正。 */
export interface CameraDebugSnapshot {
  runtime: string;
  mode: 'follow' | 'lookUp';
  targetPitchUpDeg: number;
  actualPitchUpDeg: number;
  viewPitchUpDeg: number;
  yawDeg: number;
  cameraHeight: number;
  desiredDistance: number;
  targetDistance: number;
  boomLength: number;
  desiredLength: number;
  groundHeight: number;
  collisionObject: string;
  collisionHitDistance: number | null;
  collisionRawHitDistance: number | null;
  collisionStartOverlap: boolean;
  collisionProbeUsed: boolean;
  temporalHitDistance: number | null;
  sweepRadius: number;
  avatarTargetOpacity: number;
  avatarOpacity: number;
  avatarMaterialOpacity: number;
  avatarTrigger: string;
  avatarNearDistance: number;
  avatarCenterDistance: number;
  avatarScreenHeight: number;
  avatarUpLookFactor: number;
  fps: number;
}

export interface WorldSnapshotV1 {
  schemaVersion: 1;
  layoutVersion: string;
  savedAt: number;
  player: { feet: Vec3; yawRad: number };
  camera: CameraSnapshot;
  lastSafeFeet: Vec3;
  lastEnteredPortalId?: string;
  returnAnchorId?: string;
}

export type FocusAction = 'lightbox' | 'portal';

export interface FocusInfo {
  exhibitId: string;
  title: string;
  verb: string;
  action: FocusAction;
}
