import type { BuildingSpec } from '../types';
import type { ColliderSpec, Vec3 } from '../../../engine/contracts/types';

export const CURVE_SEGMENTS = 16;
export const isCurvedBuilding = (spec: BuildingSpec): boolean =>
  spec.variant === 'curveConcave' || spec.variant === 'curveConvex';

/** Shared facade profile for geometry AND collision. Local front is +Z. */
export function curveFront(spec: BuildingSpec, x: number): number {
  const [width,,depth] = spec.size;
  const sag = depth * 0.28;
  const radius = ((width / 2) ** 2 + sag ** 2) / (2 * sag);
  const rise = Math.sqrt(Math.max(0, radius ** 2 - x ** 2)) - (radius - sag);
  return spec.variant === 'curveConcave' ? depth / 2 - rise : depth / 2 - sag + rise;
}

/** Narrow solid strips follow the facade, leaving the concave forecourt walkable. */
export function createCurvedColliders(spec: BuildingSpec): ColliderSpec[] {
  const [width,height,depth] = spec.size;
  const step = width / CURVE_SEGMENTS;
  const strips:ColliderSpec[] = Array.from({length:CURVE_SEGMENTS},(_,i) => {
    const sampleX = -width / 2 + (i + 0.5) * step;
    // End rooms extend behind the tangent: include them without filling the concave bay.
    const end=i===0?-1:i===CURVE_SEGMENTS-1?1:0;
    const x=sampleX+end*0.6;
    const front = Math.max(curveFront(spec,sampleX-step/2),curveFront(spec,sampleX+step/2))+0.18;
    const z = (front-depth/2)/2;
    const c=Math.cos(spec.yawRad),s=Math.sin(spec.yawRad);
    const center:Vec3=[spec.position[0]+c*x+s*z,spec.position[1]+height/2,spec.position[2]-s*x+c*z];
    return {kind:'box',id:`${spec.id}:curve:${i}`,center,size:[step+(end?1.2:0),height+0.3,front+depth/2],yawRad:spec.yawRad};
  });
  const canopyZ=curveFront(spec,0)+0.75;
  strips.push({kind:'box',id:`${spec.id}:canopy`,center:[spec.position[0]+Math.sin(spec.yawRad)*canopyZ,spec.position[1]+3.5,spec.position[2]+Math.cos(spec.yawRad)*canopyZ],size:[5.2,0.3,2],yawRad:spec.yawRad});
  return strips;
}
