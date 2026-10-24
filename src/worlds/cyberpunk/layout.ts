import type { BuildingSpec } from './types';
import type { Vec3, ZoneSpec } from '../../engine/contracts/types';
import type { PlazaScreenSpec } from './props/plazaScreenConfig';
import type { OrrerySpec } from './props/orreryConfig';

// LM-01 trial size; position intentionally retained until the user's layout pass.
export const landmark: OrrerySpec = {id:'LM-01',position:[0,0,0],width:14,height:11.8};

// 暂定整合位置：雕塑北侧，正面朝南；两支撑间保留约 4.9m 的通行空间。
export const plazaScreen: PlazaScreenSpec = {
  id: 'SCREEN-01', position: [0, 0, -6.4], yawRad: 0,
  width: 8, height: 4.5, bottom: 2.6,
  frameWidth: 0.12, depth: 0.34,
  imageUrl: '/assets/worlds/cyberpunk/media/plaza-screen.svg',
};

export const WORLD_NAME = 'LOHINA WORLD';
export const LAYOUT_VERSION = 'lohina-block-v1-2026-10-24-observatory-workshop';
export const SNAPSHOT_KEY = 'lohina-world:snapshot:v1';

export const WORLD_BOUNDS = { min: -900, max: 900 } as const;

export const SPAWN = {
  feet: [0, 0, 1] as Vec3,
  yawRad: Math.PI,
  returnAnchorId: 'SPAWN',
};

export const deg = (value: number): number => (value * Math.PI) / 180;

/** Temporary same-world polishing yard. The original B-01 instance moves here. */
export const BUILDING_WORKSHOP = {
  buildingId:'B-01',position:[-55,0,3] as Vec3,backgroundClearRadius:32,
  standingOffset:[0,0,14] as Vec3,
};

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
    id: 'H-01',
    name: 'LOHINA 母版媒体楼',
    variant: 'hero',
    position: [0, 0, -34],
    size: [19, 24, 7.2],
    yawRad: 0,
    sign: 'LOHINA',
    subSign: '母版媒体楼 · H-01',
    accent: 'cyan',
  },
  {
    id: 'B-01',
    name: '北岸媒体楼',
    variant: 'heroMedia',
    position: BUILDING_WORKSHOP.position,
    size: [14, 40, 12],
    yawRad: 0,
    sign: 'NORTH',
    subSign: '北岸媒体楼 · B-01',
    accent: 'cyan',
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

/**
 * 媒体塔：广场东北侧的主视觉高楼。
 * 正面朝向广场中心（yaw 由朝向反推），下半部为程序化霓虹流光，
 * 上半部为视频墙与图片带。塔基不占用人行与展位。
 */
export const MEDIA_TOWER = {
  id: 'T-03',
  name: 'LOHINA 媒体塔',
  position: [44, 0, -38] as Vec3,
  yawRad: deg(-49),
  podium: { width: 40, height: 16, depth: 32 },
  shaft: { width: 30, height: 112, depth: 22, base: 16 },
} as const;

export const frames = [
  {
    exhibitId: 'W1',
    position: [-12, 0, 9.5] as Vec3,
    yawRad: deg(90),
    anchor: [-10.5, 0, 9.5] as Vec3,
    lit: true,
  },
  {
    exhibitId: 'W2',
    position: [-11, 0, -2.05] as Vec3,
    yawRad: deg(90),
    anchor: [-9.5, 0, -2.05] as Vec3,
    lit: true,
  },
  {
    exhibitId: 'W3',
    position: [-12, 0, -6] as Vec3,
    yawRad: deg(90),
    anchor: [-10.5, 0, -6] as Vec3,
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
  {id:'building-workshop',label:'B-01 建筑打磨区',center:[BUILDING_WORKSHOP.position[0],BUILDING_WORKSHOP.position[2]],radius:21},
  { id: 'plaza', label: '中央广场', center: [0, 0], radius: 9 },
  { id: 'south', label: '南侧入口', center: [0, 10.5], radius: 6.5 },
  { id: 'west', label: '西侧图片街', center: [-10.5, 2], radius: 7.5 },
  { id: 'north', label: '北侧公共通道', center: [0, -14], radius: 9 },
  { id: 'learning', label: '学习馆前', center: [-18, -2], radius: 5 },
  { id: 'terminal', label: '东侧终端街', center: [12, -3], radius: 6 },
  { id: 'alley', label: '东南装置小院', center: [17, 10], radius: 7 },
];

