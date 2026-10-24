import type { ColliderSpec, Vec3, PortalSpec } from '../../../engine/contracts/types';
import * as THREE from 'three';

export interface OrrerySpec {
  id: string;
  position: Vec3;
  width: number;
  height: number;
}

/** Dimensions shared by the visible instrument and its conservative collision envelope. */
export function orreryDimensions(spec: OrrerySpec) {
  if (![...spec.position,spec.width,spec.height].every(Number.isFinite) ||
    spec.width<8 || spec.width>18 || spec.height<6 || spec.height>16) {
    throw new Error('Invalid LM-01 dimensions: width 8–18m, height 6–16m');
  }
  const outerBallRadius=spec.width/18,innerBallRadius=outerBallRadius*0.44;
  const outerRadius=spec.width/2-outerBallRadius,innerRadius=outerRadius*0.73;
  // Adapt inclination at the wide/low corner of the trial range so ground
  // clearance is maintained instead of stretching the spheres into ellipsoids.
  const inclinationLimit=(value:number)=>Math.asin(Math.max(-1,Math.min(1,value)));
  const outerTilt=Math.min(28*Math.PI/180,inclinationLimit((spec.height-3.6-2*outerBallRadius-0.05)/(2*outerRadius)));
  const centerY=spec.height-outerRadius*Math.sin(outerTilt)-outerBallRadius-0.05;
  const innerTilt=Math.min(39*Math.PI/180,inclinationLimit((centerY-innerBallRadius-3.6)/innerRadius));
  const sweptBottom=Math.min(centerY-outerRadius*Math.sin(outerTilt)-outerBallRadius,
    centerY-innerRadius*Math.sin(innerTilt)-innerBallRadius)-0.08;
  return {outerRadius,innerRadius,outerBallRadius,innerBallRadius,outerTilt,innerTilt,centerY,sweptBottom,
    baseRadius:spec.width*0.35,baseHeight:0.28,supportRadius:spec.width*0.27,
    sweptRadius:spec.width/2+0.08,sweptTop:spec.height+0.03};
}

export function createOrreryColliders(spec: OrrerySpec): ColliderSpec[] {
  const d=orreryDimensions(spec),[x,y,z]=spec.position;
  return [
    ...[-1,1].flatMap(side=>[-1,1].flatMap(front=>{
      const bounds=new THREE.Box3();
      for(const p of orrerySupportCurve(spec,side,front).getPoints(80))if(p.y<d.sweptBottom+0.18)bounds.expandByPoint(p);
      bounds.expandByScalar(0.15*spec.width/14+0.06);
      const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
      return [
        {kind:'cylinder' as const,id:`${spec.id}:foot-${side}-${front}`,radius:0.6*spec.width/14,
          center:[x+side*spec.width*0.27,y+d.baseHeight/2,z+front*spec.width*0.17] as Vec3,halfHeight:d.baseHeight/2},
        {kind:'box' as const,id:`${spec.id}:support-${side}-${front}`,
          center:[x+center.x,y+center.y,z+center.z] as Vec3,size:size.toArray() as Vec3,yawRad:0},
      ];
    })),
    {kind:'box',id:`${spec.id}:console`,center:[x,y+0.68,z-1.8],size:[1.9,1.36,1.0],yawRad:0},
    // Static swept envelope: protects both player jumps and camera without
    // introducing moving physics bodies or an invisible wall at ground level.
    {kind:'cylinder',id:`${spec.id}:orbital-envelope`,radius:d.sweptRadius,
      center:[x,y+(d.sweptTop+d.sweptBottom)/2,z],halfHeight:(d.sweptTop-d.sweptBottom)/2},
  ];
}

export function orrerySupportCurve(spec:OrrerySpec,side:number,front:number):THREE.CatmullRomCurve3 {
  const d=orreryDimensions(spec),s=spec.width/14,x=side*spec.width*0.27,z=front*spec.width*0.17;
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(x,d.baseHeight,z),new THREE.Vector3(x,d.centerY*0.40,z),
    new THREE.Vector3(side*spec.width*0.17,d.centerY*0.82,front*spec.width*0.10),
    new THREE.Vector3(side*0.65*s,d.centerY,front*0.35*s),
  ]);
}

export function orreryConsoleAnchor(spec:OrrerySpec):Vec3 {
  return [spec.position[0],spec.position[1],spec.position[2]-0.5];
}

export function createOrreryPortal(spec:OrrerySpec):PortalSpec {
  return {
    id:`${spec.id}-CONSOLE`,kind:'portal',title:'轨道中枢仪表盘',shortTitle:'Observatory',
    description:'天体仪下方的导航控制台。打开仪表盘，选择项目页面；返回后回到出生庭。',
    enabled:true,targetRoute:'/world/observatory',buildingId:spec.id,accent:'cyan',
    interaction:{anchor:orreryConsoleAnchor(spec),enterRadius:1.9,exitRadius:2.35,priority:30,
      maxHeightDelta:1,facingNormal:[0,0,1],returnFeet:orreryConsoleAnchor(spec),returnYawRad:Math.PI},
  };
}
