/**
 * B-01 北岸媒体楼 · 四面立面媒体配置。
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
 * 四面错层：建议中心高度为 35% / 55% / 70% / 45%。
 * 背面让开楼梯核心，保持同一高度层但缩窄并左移。
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
  {
    id: 'b01-comic-right',
    facade: 'right',
    image: 'images/images1.jpg',
    aspect: 447 / 447,
    width: 5.4,
    centerRatio: 0.55,
    centerU: -0.75,
    tint: 0xd8dcda,
    label: '右面 / RIGHT',
  },
  {
    id: 'b01-comic-back',
    facade: 'back',
    image: 'images/w700d1q75cms.jpg',
    aspect: 640 / 576,
    width: 5.6,
    centerRatio: 0.7,
    centerU: 2.45,
    tint: 0xccd1cf,
    label: '背面 / BACK',
  },
  {
    id: 'b01-comic-left',
    facade: 'left',
    image: 'images/images1.jpg',
    aspect: 447 / 447,
    width: 4.9,
    centerRatio: 0.45,
    centerU: -0.5,
    tint: 0xd8dcda,
    label: '左面 / LEFT',
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
