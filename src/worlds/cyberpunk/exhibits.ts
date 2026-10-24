import { getArtwork } from '../../content/artworks';
import type { ExhibitSpec, FrameExhibitSpec, ImageSpec, PortalSpec, Vec3 } from '../../engine/contracts/types';
import { deg, frames, landmark } from './layout';
import {createOrreryPortal} from './props/orreryConfig';

const frontNormal = (yawRad: number): Vec3 => [Math.sin(yawRad), 0, Math.cos(yawRad)];

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
  createOrreryPortal(landmark),
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

