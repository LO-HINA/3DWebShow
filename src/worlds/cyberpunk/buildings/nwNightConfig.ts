import type { BuildingSpec } from '../types';
import type { ColliderSpec } from '../../../engine/contracts/types';
import { curveFront } from './junctionGeometry';

export const NW_NIGHT_STUDY = {
  revision:'nw-night-1',
  cornices:[3.82,11.42,22.82,37.98,41.45],
  panels:[
    {id:'nw-main-art',x:-6.5,y:16.8,width:5.6,aspect:640/576,image:'w700d1q75cms.jpg'},
    {id:'nw-street-art',x:6.6,y:6.5,width:3.2,aspect:1,image:'images1.jpg'},
  ],
} as const;

/** High facade housings are camera obstacles; they never close pedestrian routes. */
export function createNwNightColliders(spec:BuildingSpec):ColliderSpec[]{
  if(spec.id!=='NW(0)')return [];
  return NW_NIGHT_STUDY.panels.map(p=>{
    const z=curveFront(spec,p.x),yaw=-Math.atan2(curveFront(spec,p.x+.01)-curveFront(spec,p.x-.01),.02);
    const lx=p.x+Math.sin(yaw)*.3,lz=z+Math.cos(yaw)*.3,c=Math.cos(spec.yawRad),s=Math.sin(spec.yawRad);
    return {kind:'box',id:`NW(0):${p.id}`,center:[spec.position[0]+c*lx+s*lz,spec.position[1]+p.y,spec.position[2]-s*lx+c*lz],size:[p.width+.38,p.width/p.aspect+.38,.7],yawRad:spec.yawRad+yaw};
  });
}
