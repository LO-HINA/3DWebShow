import type { BuildingSpec } from '../types';
import type { ColliderSpec } from '../../../engine/contracts/types';

export const NW_NIGHT_STUDY = {
  revision:'nw-night-2-giant-screen',
  cornices:[3.82,11.42,22.82,37.98,41.45],
  // 2026-11-11 用户指令：原 5.6m / 3.2m 画作太小，改为面向中心 LM-01 的 17×20m 巨幕虚拟屏。
  panels:[],
  screen:{width:17,height:20,bottom:5.4},
} as const;

/** 巨幕下沿 5.4m，位于行人头顶以上；行人碰撞继续由曲面立面承担。 */
export function createNwNightColliders(spec:BuildingSpec):ColliderSpec[]{
  if(spec.id!=='NW(0)')return [];
  return [];
}
