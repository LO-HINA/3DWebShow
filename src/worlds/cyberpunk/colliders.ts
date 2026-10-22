import type { ColliderSpec, CylinderColliderSpec } from '../../engine/contracts/types';
import { buildings, frames, benches, planters, lamps, plazaScreen } from './layout';
import { createPlazaScreenColliders } from './props/plazaScreenConfig';

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
  list.push(...createPlazaScreenColliders(plazaScreen));

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

