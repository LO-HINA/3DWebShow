import type { BuildingSpec } from './types';
import type { Vec3, ZoneSpec } from '../../engine/contracts/types';
import type { PlazaScreenSpec } from './props/plazaScreenConfig';
import type { OrrerySpec } from './props/orreryConfig';

// LM-01 trial size; position intentionally retained until the user's layout pass.
export const landmark: OrrerySpec = {id:'LM-01',position:[0,0,0],width:14,height:11.8};

// 新路口试做：M 北侧，沿中央视线留出独立屏幕；尺寸仍为可调初值。
export const plazaScreen: PlazaScreenSpec = {
  id: 'SCREEN-01', position: [0, 0, -24], yawRad: 0,
  width: 12, height: 6.75, bottom: 3.2,
  frameWidth: 0.12, depth: 0.34,
  imageUrl: '/assets/worlds/cyberpunk/media/plaza-screen.svg',
};

export const WORLD_NAME = 'LOHINA WORLD';
export const LAYOUT_VERSION = 'lohina-junction-v4-2026-11-11-roads';
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
  buildingId:'B-01',position:[-94,0,18] as Vec3,backgroundClearRadius:28,
  standingOffset:[0,0,14] as Vec3,
};

/** Trial dimensions, not final architecture approvals; +Z south, +X east. */
export const junctionBuildings: BuildingSpec[] = [
  {id:'NW(0)',name:'西北弧面玻璃楼',variant:'curveConcave',position:[-25,0,-25],size:[24,42,20],yawRad:Math.PI/4,sign:'NW(0)',subSign:'弧面玻璃 · 虚拟巨幕',accent:'cyan'},
  {id:'SW(0)',name:'西南外凸曲面楼',variant:'curveConvex',position:[-26,0,25],size:[26,30,22],yawRad:Math.PI,sign:'SW(0)',subSign:'外凸曲面 · 用途待定',accent:'gold'},
  {id:'NE(0)',name:'东北霓虹漫画楼',variant:'comicCorner',position:[25,0,-25],size:[20,36,18],yawRad:0,sign:'NE(0)',subSign:'霓虹漫画 · 用途待定',accent:'cyan'},
  {id:'SE(0)',name:'东南媒体楼',variant:'heroMedia',position:[24,0,25],size:[14,40,12],yawRad:Math.PI,sign:'SE(0)',subSign:'媒体楼 · 单面主屏试做',accent:'cyan'},
];

/** Legacy content is retained outside the junction; old IDs do not rename into new IDs. */
export const legacyBuildings: BuildingSpec[] = [
  {
    id: 'T-01',
    name: '西北塔',
    variant: 'towerA',
    position: [-62, 0, -62],
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
    position: [62, 0, -62],
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
    position: [0, 0, -76],
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
    position: [-62, 0, 20],
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
    // 2026-11-11：原 z=-6 落在 18m 东西向马路中间，移至北侧人行边线外。
    position: [-62, 0, -17],
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
    // 2026-11-11：同上，从东西向马路中移出。
    position: [62, 0, -17],
    size: [7, 5, 8],
    yawRad: deg(-90),
    sign: 'AI LAB',
    subSign: 'AI 与工具',
    accent: 'cyan',
  },
];

export const buildings: BuildingSpec[] = [...junctionBuildings,...legacyBuildings];

/**
 * 媒体塔：广场东北侧的主视觉高楼。
 * 正面朝向广场中心（yaw 由朝向反推），下半部为程序化霓虹流光，
 * 上半部为视频墙与图片带。塔基不占用人行与展位。
 */
export const MEDIA_TOWER = {
  id: 'T-03',
  name: 'LOHINA 媒体塔',
  position: [96, 0, -84] as Vec3,
  yawRad: deg(-49),
  podium: { width: 40, height: 16, depth: 32 },
  shaft: { width: 30, height: 112, depth: 22, base: 16 },
} as const;

export const frames = [
  {
    exhibitId: 'W1',
    position: [-44, 0, 12] as Vec3,
    yawRad: deg(90),
    anchor: [-42.5, 0, 12] as Vec3,
    lit: true,
  },
  {
    exhibitId: 'W2',
    position: [-44, 0, -12] as Vec3,
    yawRad: deg(90),
    anchor: [-42.5, 0, -12] as Vec3,
    lit: true,
  },
  {
    exhibitId: 'W3',
    position: [-44, 0, -26] as Vec3,
    yawRad: deg(90),
    anchor: [-42.5, 0, -26] as Vec3,
    lit: true,
  },
  {
    exhibitId: 'W4',
    // 2026-11-11：原 z=8 落在东西向马路内，随学习馆一起移到路缘外。
    position: [44, 0, 13] as Vec3,
    yawRad: deg(-90),
    anchor: [42.5, 0, 13] as Vec3,
    lit: false,
  },
  {
    // 配置表 W5 标注 yaw=180° 朝北，但地面交互点在其南侧；为保证观看方向一致，
    // 这里按“朝向观众”实现为 yaw=0（朝南），已登记为文档偏差。
    exhibitId: 'W5',
    position: [46, 0, 42] as Vec3,
    yawRad: 0,
    anchor: [46, 0, 43.5] as Vec3,
    lit: true,
  },
] as const;

export const benches = [
  { position: [-10, 0, 10] as Vec3, yawRad: Math.PI },
  { position: [10, 0, 10] as Vec3, yawRad: Math.PI },
  { position: [42, 0, 34] as Vec3, yawRad: deg(-90) },
];

export const planters = [
  { position: [-10, 0, 13] as Vec3, yawRad: 0 },
  { position: [10, 0, 13] as Vec3, yawRad: 0 },
  { position: [-10, 0, -13] as Vec3, yawRad: 0 },
  { position: [10, 0, -13] as Vec3, yawRad: 0 },
  { position: [40, 0, 36] as Vec3, yawRad: 0 },
  { position: [50, 0, 36] as Vec3, yawRad: 0 },
];

export const lamps = [
  ...[-42,42].flatMap(z=>[-10,10].map(x=>({position:[x,0,z] as Vec3}))),
  ...[-42,42].map(x=>({position:[x,0,10] as Vec3})),
  // 2026-11-11：主路向外延伸后补灯，保持两侧连续照度。
  ...[-58,-72,58,72].flatMap(z=>[-10,10].map(x=>({position:[x,0,z] as Vec3}))),
  ...[-58,-72,58,72].flatMap(x=>[-10,10].map(z=>({position:[x,0,z] as Vec3}))),
];

export const paths = [
  {center:[0,0,0] as Vec3,size:[18,156] as [number,number]},
  {center:[0,0,0] as Vec3,size:[176,18] as [number,number]},
  {center:[-44,0,0] as Vec3,size:[4,94] as [number,number]},
  {center:[44,0,0] as Vec3,size:[4,94] as [number,number]},
  {center:[0,0,-44] as Vec3,size:[92,4] as [number,number]},
  {center:[0,0,44] as Vec3,size:[92,4] as [number,number]},
];

export const guideLines = [
  ...[-8,8].map(x=>({from:[x,-42] as [number,number],to:[x,42] as [number,number],accent:'cyan' as const})),
  ...[-8,8].map(z=>({from:[-42,z] as [number,number],to:[42,z] as [number,number],accent:'gold' as const})),
];

export const zones: ZoneSpec[] = [
  {id:'building-workshop',label:'B-01 建筑打磨区',center:[BUILDING_WORKSHOP.position[0],BUILDING_WORKSHOP.position[2]],radius:21},
  { id: 'plaza', label: '中央广场', center: [0, 0], radius: 9 },
  { id: 'south', label: '南侧入口', center: [0, 10.5], radius: 6.5 },
  {id:'nw',label:'NW(0) · 弧面玻璃',center:[-25,-25],radius:20},
  {id:'sw',label:'SW(0) · 外凸曲面',center:[-26,25],radius:20},
  {id:'ne',label:'NE(0) · 霓虹漫画',center:[25,-25],radius:19},
  {id:'se',label:'SE(0) · 媒体楼',center:[24,25],radius:18},
  { id: 'west', label: '西侧图片步道', center: [-43, 0], radius: 13 },
  { id: 'north', label: '北侧画幕', center: [0, -24], radius: 10 },
  { id: 'learning', label: '旧学习馆', center: [-62, -17], radius: 5 },
  { id: 'terminal', label: '旧终端亭', center: [62, -17], radius: 6 },
  { id: 'alley', label: '东侧展位', center: [44, 34], radius: 10 },
];

