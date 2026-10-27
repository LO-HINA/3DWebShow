/**
 * B-01 北岸媒体楼 · 单一主展示面与四面建筑装饰配置。
 *
 * 只改这个文件即可替换漫画、调整展位尺寸/位置和光幕相位：
 * - image 相对 public/assets/worlds/cyberpunk/media/，也可写绝对 URL；
 * - aspect 是原图宽高比，面板高度 = width / aspect，不做裁切或拉伸；
 * - centerRatio 是“去掉裙房与冠顶后的可用塔身高度”比例，0 = 7.2m，1 = 32.4m；
 * - centerU 是立面局部水平偏移，正值朝向立面观察者的右手边；
 * - tint 用于压低白底纸面亮度，避免漫画变成发光白板。
 */

export type B01FacadeKey = 'front' | 'right' | 'back' | 'left';

export interface B01ComicPanelConfig {
  id: string;
  facade: B01FacadeKey;
  image: string;
  aspect: number;
  width: number;
  centerRatio: number;
  centerU: number;
  tint: number;
  label: string;
}

export interface B01FacadeLightConfig {
  facade: B01FacadeKey;
  phase: number;
  speed: number;
  goldBias: number;
  opacity: number;
}

/** 裙房顶面到冠顶起点的塔身可用高度。 */
export const B01_USABLE_BOTTOM = 7.2;
export const B01_USABLE_TOP = 32.4;

/**
 * 最新要求：只保留正面一块主屏。侧背面不生成屏体、背板或专用支架，
 * 其窗带、竖鳍、设备及转角构造继续完整制作。未来朝路口方向由整合布局确定。
 */
export const B01_COMIC_PANELS: readonly B01ComicPanelConfig[] = [
  {
    id: 'b01-comic-front',
    facade: 'front',
    image: 'images/w700d1q75cms.jpg',
    aspect: 640 / 576,
    width: 6.8,
    centerRatio: 0.35,
    centerU: 0.45,
    tint: 0xd2d6d3,
    label: '正面 / FRONT',
  },
];

/**
 * 同一套光幕语言，四面用不同相位和速度错开。
 * 相位取 0–1；goldBias 只控制少量暖金束，不改变青色主调。
 */
export const B01_LIGHT_CURTAINS: readonly B01FacadeLightConfig[] = [
  { facade: 'front', phase: 0.05, speed: 0.052, goldBias: 0.3, opacity: 0.72 },
  { facade: 'right', phase: 0.33, speed: 0.061, goldBias: 0.2, opacity: 0.66 },
  { facade: 'back', phase: 0.61, speed: 0.047, goldBias: 0.36, opacity: 0.62 },
  { facade: 'left', phase: 0.82, speed: 0.057, goldBias: 0.16, opacity: 0.68 },
];
