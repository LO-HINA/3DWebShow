import type { Accent, Vec3 } from '../../engine/contracts/types';

export type BuildingVariant = 'towerA' | 'towerB' | 'gallery' | 'learning' | 'terminal';

export interface BuildingSpec {
  id: string;
  name: string;
  variant: BuildingVariant;
  position: Vec3;
  size: Vec3;
  yawRad: number;
  sign: string;
  subSign: string;
  accent: Accent;
  posters?: Array<{
    slot: 'Poster_Slot_01' | 'Poster_Slot_02';
    artworkId: string;
    localX: number;
    localY: number;
  }>;
}
