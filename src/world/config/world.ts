import { getArtwork } from '../data/artworks';
import type {
  BuildingSpec,
  ColliderSpec,
  CylinderColliderSpec,
  ExhibitSpec,
  FrameExhibitSpec,
  ImageSpec,
  PortalSpec,
  Vec3,
  ZoneSpec,
} from './types';

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

export const WORLD_NAME = 'LOHINA WORLD';
export const LAYOUT_VERSION = 'lohina-block-v1-2026-10-22';
export const SNAPSHOT_KEY = 'lohina-world:snapshot:v1';

export const WORLD_BOUNDS = { min: -28, max: 28 } as const;

export const SPAWN = {
  feet: [0, 0, 6.5] as Vec3,
  yawRad: Math.PI,
  returnAnchorId: 'SPAWN',
};

export const CAMERA = {
  fov: 45,
  near: 0.1,
  far: 200,
  offset: [0, 11, 14] as Vec3,
  followLambda: 5,
  lookAheadMax: 1.5,
  parallaxYaw: (12 * Math.PI) / 180,
  parallaxPitch: (4 * Math.PI) / 180,
};

export const PLAYER = {
  speed: 3.2,
  height: 1.6,
  radius: 0.28,
  halfHeight: 0.52,
  centerHeight: 0.8,
  physicsStep: 1 / 60,
  maxPhysicsSubSteps: 5,
  maxFrameDelta: 0.05,
};

export const deg = (value: number): number => (value * Math.PI) / 180;

const frontNormal = (yawRad: number): Vec3 => [Math.sin(yawRad), 0, Math.cos(yawRad)];

export const buildings: BuildingSpec[] = [
  {
    id: 'T-01',
    name: '西北塔',
    variant: 'towerA',
    position: [-14, 0, -21],
    size: [10, 24, 8],
    yawRad: deg(15),
    sign: 'ARCHIVE',
    subSign: '视觉档案 · T-01',
    accent: 'gold',
    posters: [
      { slot: 'Poster_Slot_01', artworkId: 'P1', localX: -2.4, localY: 13 },
      { slot: 'Poster_Slot_02', artworkId: 'P2', localX: 2.4, localY: 13 },
    ],
  },
  {
    id: 'T-02',
    name: '东北品牌塔',
    variant: 'towerB',
    position: [14, 0, -21],
    size: [11, 26, 8],
    yawRad: deg(-15),
    sign: 'LOHINA',
    subSign: '品牌塔 · T-02',
    accent: 'cyan',
    posters: [
      { slot: 'Poster_Slot_01', artworkId: 'P3', localX: -2.4, localY: 15 },
      { slot: 'Poster_Slot_02', artworkId: 'P4', localX: 2.4, localY: 15 },
    ],
  },
  {
    id: 'E-01',
    name: '视觉与摄影馆',
    variant: 'gallery',
    position: [-19, 0, 4],
    size: [9, 6, 12],
    yawRad: deg(90),
    sign: 'GALLERY',
    subSign: '视觉与摄影',
    accent: 'gold',
  },
  {
    id: 'E-02',
    name: '前端与算法学习馆',
    variant: 'learning',
    position: [-19, 0, -9],
    size: [8, 9.5, 8],
    yawRad: 0,
    sign: 'LEARNING',
    subSign: '前端与算法',
    accent: 'cyan',
  },
  {
    id: 'E-03',
    name: 'AI 终端亭',
    variant: 'terminal',
    position: [18, 0, -5],
    size: [7, 5, 8],
    yawRad: deg(-90),
    sign: 'AI LAB',
    subSign: 'AI 与工具',
    accent: 'cyan',
  },
];

export const frames = [
  {
    exhibitId: 'W1',
    position: [-12, 0, 8] as Vec3,
    yawRad: deg(90),
    anchor: [-10.5, 0, 8] as Vec3,
    lit: true,
  },
  {
    exhibitId: 'W2',
    position: [-11, 0, 1] as Vec3,
    yawRad: deg(90),
    anchor: [-9.5, 0, 1] as Vec3,
    lit: true,
  },
  {
    exhibitId: 'W3',
    position: [-12, 0, -4] as Vec3,
    yawRad: deg(90),
    anchor: [-10.5, 0, -4] as Vec3,
    lit: true,
  },
  {
    exhibitId: 'W4',
    position: [16, 0, 7] as Vec3,
    yawRad: deg(-90),
    anchor: [14.5, 0, 7] as Vec3,
    lit: false,
  },
  {
    // 配置表 W5 标注 yaw=180° 朝北，但地面交互点在其南侧；为保证观看方向一致，
    // 这里按“朝向观众”实现为 yaw=0（朝南），已登记为文档偏差。
    exhibitId: 'W5',
    position: [21, 0, 12] as Vec3,
    yawRad: 0,
    anchor: [21, 0, 10.5] as Vec3,
    lit: true,
  },
] as const;

const frameTitles: Record<string, { title: string; description: string }> = {
  W1: {
    title: '暮光折线',
    description:
      '西侧图片街的第一幅近景演示。靠近画框后按 E 打开灯箱，检查暖色光带与深色边框在夜色中的阅读层次。',
  },
  W2: {
    title: '砂岩回声',
    description:
      '横向色层把建筑的粗粝表面压成可读的时间切片。灯箱内可缩放、拖动并复位，关闭后回到原来的行走状态。',
  },
  W3: {
    title: '青色导视',
    description:
      '以网格和微光节点讨论方向感。它位于图片街北端，作为走向北侧公共通道之前的最后一个近景展位。',
  },
  W4: {
    title: '夜行剖面',
    description:
      '东南小院中的环形轨道。未点亮的边框刻意降低亮度，让视线在小院里的两幅画之间停留更久。',
  },
  W5: {
    title: '环路之光',
    description:
      '探索环路的收束点。画面中的垂直脉冲与远处广场的青色导视形成呼应，完成从南入口到小院的视觉闭环。',
  },
};

function buildFrameExhibits(): FrameExhibitSpec[] {
  return frames.map((frame) => {
    const meta = frameTitles[frame.exhibitId];
    const normal = frontNormal(frame.yawRad);
    return {
      id: frame.exhibitId,
      kind: 'image',
      title: meta.title,
      description: meta.description,
      enabled: true,
      artworkId: frame.exhibitId,
      frame: {
        position: frame.position,
        yawRad: frame.yawRad,
        lit: frame.lit,
      },
      interaction: {
        anchor: frame.anchor,
        enterRadius: 2.1,
        exitRadius: 2.55,
        priority: 10,
        maxHeightDelta: 1,
        facingNormal: normal,
        returnFeet: frame.anchor,
        returnYawRad:
          frame.exhibitId === 'W4' ? deg(90) : frame.exhibitId === 'W5' ? Math.PI : deg(-90),
      },
    };
  });
}

export const portals: PortalSpec[] = [
  {
    id: 'E-01',
    kind: 'portal',
    title: '视觉与摄影馆',
    shortTitle: 'Gallery',
    description: '进入独立的图片页面，浏览同一套演示图并查看说明。关闭页面后回到进入前的街区位置。',
    enabled: true,
    targetRoute: '/world/gallery',
    buildingId: 'E-01',
    accent: 'gold',
    interaction: {
      anchor: [-12, 0, 4],
      enterRadius: 1.8,
      exitRadius: 2.2,
      priority: 20,
      maxHeightDelta: 1,
      facingNormal: [1, 0, 0],
      returnFeet: [-10.5, 0, 4],
      returnYawRad: deg(90),
    },
  },
  {
    id: 'E-02',
    kind: 'portal',
    title: '前端与算法学习馆',
    shortTitle: 'Learning',
    description: '排序可视化与学习卡片将在下一轮接入。入口保留清晰标识，本轮不提供传送。',
    enabled: false,
    targetRoute: '/world/learning',
    buildingId: 'E-02',
    accent: 'cyan',
    interaction: {
      anchor: [-19, 0, -3.5],
      enterRadius: 1.8,
      exitRadius: 2.2,
      priority: 20,
      maxHeightDelta: 1,
      facingNormal: [0, 0, 1],
      returnFeet: [-19, 0, -2.8],
      returnYawRad: 0,
    },
  },
  {
    id: 'E-03',
    kind: 'portal',
    title: 'AI 终端亭',
    shortTitle: 'AI Lab',
    description: '无需密钥的注意力矩阵教学模拟将在下一轮接入。终端屏幕亮起，但入口暂不开放。',
    enabled: false,
    targetRoute: '/world/ai-lab',
    buildingId: 'E-03',
    accent: 'cyan',
    interaction: {
      anchor: [12.5, 0, -5],
      enterRadius: 1.8,
      exitRadius: 2.2,
      priority: 20,
      maxHeightDelta: 1,
      facingNormal: [-1, 0, 0],
      returnFeet: [11.5, 0, -5],
      returnYawRad: deg(-90),
    },
  },
];

export const exhibits: ExhibitSpec[] = [...buildFrameExhibits(), ...portals];
export const enabledExhibits = exhibits.filter((exhibit) => exhibit.enabled);

export function getExhibit(id: string): ExhibitSpec | undefined {
  return exhibits.find((exhibit) => exhibit.id === id);
}

export function getFrameExhibit(id: string): FrameExhibitSpec | undefined {
  return exhibits.find(
    (exhibit): exhibit is FrameExhibitSpec => exhibit.kind === 'image' && exhibit.id === id,
  );
}

export function getPortalForRoute(route: string): PortalSpec | undefined {
  return portals.find((portal) => portal.targetRoute === route);
}

export function getExhibitImage(exhibitId: string): ImageSpec {
  const artwork = getArtwork(exhibitId);
  return {
    id: artwork.id,
    previewUrl: artwork.previewUrl,
    width: artwork.width,
    height: artwork.height,
    alt: artwork.alt,
    fit: 'contain',
    attribution: artwork.attribution,
  };
}

export const benches = [
  { position: [-5.5, 0, 6.2] as Vec3, yawRad: Math.PI },
  { position: [5.5, 0, 6.2] as Vec3, yawRad: Math.PI },
  { position: [17.2, 0, 8.4] as Vec3, yawRad: deg(-90) },
];

export const planters = [
  { position: [-8.2, 0, 9.6] as Vec3, yawRad: 0 },
  { position: [8.2, 0, 9.6] as Vec3, yawRad: 0 },
  { position: [-8.4, 0, -10.8] as Vec3, yawRad: 0 },
  { position: [8.4, 0, -10.8] as Vec3, yawRad: 0 },
  { position: [13.2, 0, 13.4] as Vec3, yawRad: 0 },
  { position: [19.6, 0, 5.8] as Vec3, yawRad: 0 },
];

export const lamps = [
  { position: [-12.2, 0, 11.2] as Vec3 },
  { position: [12.2, 0, 11.2] as Vec3 },
  { position: [-13.2, 0, 0.2] as Vec3 },
  { position: [13.2, 0, 0.2] as Vec3 },
  { position: [-13.2, 0, -12.2] as Vec3 },
  { position: [13.2, 0, -12.2] as Vec3 },
  { position: [18.6, 0, 14.2] as Vec3 },
];

export const paths = [
  { center: [-10.5, 0, -2] as Vec3, size: [3.6, 24] as [number, number] },
  { center: [10.5, 0, -2] as Vec3, size: [3.6, 24] as [number, number] },
  { center: [0, 0, 10] as Vec3, size: [24.6, 3.6] as [number, number] },
  { center: [0, 0, -14] as Vec3, size: [24.6, 3.6] as [number, number] },
  { center: [-8, 0, 4] as Vec3, size: [8, 3.4] as [number, number] },
  { center: [-14.5, 0, -3.5] as Vec3, size: [7, 3.4] as [number, number] },
  { center: [12, 0, -5] as Vec3, size: [7, 3.4] as [number, number] },
  { center: [17, 0, 10] as Vec3, size: [10.4, 10.4] as [number, number] },
];

export const guideLines = [
  { from: [-10.5, 9.4] as [number, number], to: [-10.5, -6.4] as [number, number], accent: 'cyan' as const },
  { from: [-8.9, 4] as [number, number], to: [-11.85, 4] as [number, number], accent: 'gold' as const },
  { from: [0, 6.7] as [number, number], to: [0, 2.4] as [number, number], accent: 'cyan' as const },
];

export const zones: ZoneSpec[] = [
  { id: 'plaza', label: '中央广场', center: [0, 0], radius: 9 },
  { id: 'south', label: '南侧入口', center: [0, 10.5], radius: 6.5 },
  { id: 'west', label: '西侧图片街', center: [-10.5, 2], radius: 7.5 },
  { id: 'north', label: '北侧公共通道', center: [0, -14], radius: 9 },
  { id: 'learning', label: '学习馆前', center: [-18, -2], radius: 5 },
  { id: 'terminal', label: '东侧终端街', center: [12, -3], radius: 6 },
  { id: 'alley', label: '东南装置小院', center: [17, 10], radius: 7 },
];

function colliders(): ColliderSpec[] {
  const list: ColliderSpec[] = [];

  for (const building of buildings) {
    list.push({
      kind: 'box',
      id: `${building.id}:footprint`,
      center: [building.position[0], building.size[1] / 2, building.position[2]],
      size: [building.size[0], building.size[1], building.size[2]],
      yawRad: building.yawRad,
    });
  }

  for (const frame of frames) {
    list.push({
      kind: 'box',
      id: `${frame.exhibitId}:frame`,
      center: [frame.position[0], 1.24, frame.position[2]],
      size: [3.6, 2.48, 0.34],
      yawRad: frame.yawRad,
    });
  }

  const sculpture: CylinderColliderSpec = {
    kind: 'cylinder',
    id: 'LM-01:base',
    center: [0, 0.52, 0],
    radius: 1.9,
    halfHeight: 0.52,
  };
  list.push(sculpture);

  for (const bench of benches) {
    list.push({
      kind: 'box',
      id: 'bench',
      center: [bench.position[0], 0.4, bench.position[2]],
      size: [2.5, 0.8, 0.9],
      yawRad: bench.yawRad,
    });
  }

  for (const planter of planters) {
    list.push({
      kind: 'box',
      id: 'planter',
      center: [planter.position[0], 0.46, planter.position[2]],
      size: [1.7, 0.92, 1.7],
      yawRad: planter.yawRad,
    });
  }

  for (const lamp of lamps) {
    list.push({
      kind: 'box',
      id: 'lamp',
      center: [lamp.position[0], 2, lamp.position[2]],
      size: [0.34, 4, 0.34],
      yawRad: 0,
    });
  }

  // 北侧扩建预留围挡。
  list.push({
    kind: 'box',
    id: 'EXT-01:hoarding',
    center: [0, 1.2, -25.6],
    size: [8.8, 2.4, 0.5],
    yawRad: 0,
  });

  // 物理边界：视觉围边在 ±29，玩家安全范围 ±28。
  list.push(
    { kind: 'box', id: 'boundary:north', center: [0, 1.4, -29], size: [60, 2.8, 1], yawRad: 0 },
    { kind: 'box', id: 'boundary:south', center: [0, 1.4, 29], size: [60, 2.8, 1], yawRad: 0 },
    { kind: 'box', id: 'boundary:west', center: [-29, 1.4, 0], size: [1, 2.8, 60], yawRad: 0 },
    { kind: 'box', id: 'boundary:east', center: [29, 1.4, 0], size: [1, 2.8, 60], yawRad: 0 },
  );

  return list;
}

export const worldColliders: ColliderSpec[] = colliders();

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
