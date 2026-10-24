import type { ColliderSpec } from '../../engine/contracts/types';
import { buildings, frames, benches, planters, lamps, landmark, plazaScreen, MEDIA_TOWER } from './layout';
import { createPlazaScreenColliders } from './props/plazaScreenConfig';
import { createOrreryColliders } from './props/orreryConfig';

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

  list.push(...createOrreryColliders(landmark));
  list.push(...createPlazaScreenColliders(plazaScreen));

  // 媒体塔：裙房与塔身分别给碰撞体，塔身高出街区但仍可绕行。
  list.push({
    kind: 'box',
    id: `${MEDIA_TOWER.id}:podium`,
    center: [MEDIA_TOWER.position[0], MEDIA_TOWER.podium.height / 2, MEDIA_TOWER.position[2]],
    size: [MEDIA_TOWER.podium.width, MEDIA_TOWER.podium.height, MEDIA_TOWER.podium.depth],
    yawRad: MEDIA_TOWER.yawRad,
  });
  list.push({
    kind: 'box',
    id: `${MEDIA_TOWER.id}:shaft`,
    center: [
      MEDIA_TOWER.position[0],
      MEDIA_TOWER.shaft.base + MEDIA_TOWER.shaft.height / 2,
      MEDIA_TOWER.position[2],
    ],
    size: [MEDIA_TOWER.shaft.width, MEDIA_TOWER.shaft.height, MEDIA_TOWER.shaft.depth],
    yawRad: MEDIA_TOWER.yawRad,
  });

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

  // 中心街区之外不设可见或物理围栏，玩家可走入重复的黑色建筑群。
  return list;
}

export const worldColliders: ColliderSpec[] = colliders();

