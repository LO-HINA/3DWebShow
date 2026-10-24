import * as THREE from 'three';
import {mergeStaticGroup} from '../../../engine/primitives/merge';
import type {WorldMaterials} from '../materials';
import {orreryDimensions,orrerySupportCurve,type OrrerySpec} from './orreryConfig';

export interface OrreryHandle {group:THREE.Group;update:(time:number,reducedMotion:boolean)=>void}

function dashboardTexture():THREE.Texture {
  if(typeof document==='undefined'){
    const fallback=new THREE.DataTexture(new Uint8Array([16,35,48,255]),1,1);fallback.needsUpdate=true;return fallback;
  }
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=448;
  const ctx=canvas.getContext('2d');if(!ctx)return new THREE.CanvasTexture(canvas);
  ctx.fillStyle='#07151d';ctx.fillRect(0,0,1024,448);
  ctx.strokeStyle='#1b5260';ctx.lineWidth=2;
  for(let x=32;x<1024;x+=64){ctx.beginPath();ctx.moveTo(x,92);ctx.lineTo(x,352);ctx.stroke();}
  for(let y=96;y<360;y+=64){ctx.beginPath();ctx.moveTo(32,y);ctx.lineTo(992,y);ctx.stroke();}
  ctx.fillStyle='#c6fcff';ctx.font='bold 36px monospace';ctx.fillText('LOHINA / ORBITAL TERMINAL',36,58);
  ctx.strokeStyle='#66e4f0';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(242,218,172,70,-0.3,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle='#a19bff';ctx.beginPath();ctx.ellipse(242,218,116,96,0.6,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#77b7da';ctx.beginPath();ctx.arc(176,234,21,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#e6e8ef';ctx.beginPath();ctx.arc(340,176,9,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#e9f7ff';ctx.font='25px monospace';ctx.fillText('EARTH / MOON',490,145);
  ctx.fillStyle='#77c6d1';ctx.font='20px monospace';ctx.fillText('OBSERVATORY  //  LM-01',490,194);ctx.fillText('PROJECT NAVIGATION',490,236);
  ctx.fillStyle='#adb1f8';ctx.fillText('TWO ORBITS / ONE WORLD',490,291);
  ctx.fillStyle='#15343f';ctx.fillRect(24,370,976,60);ctx.fillStyle='#d8fdff';ctx.font='bold 25px monospace';ctx.fillText('[ E ]  OPEN NAVIGATION',48,410);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}

/** Stable holographic arcs above an open spawn court; future Earth/Moon model mounts. */
export function createOrrery(materials:WorldMaterials,spec:OrrerySpec):OrreryHandle {
  const d=orreryDimensions(spec),s=spec.width/14;
  const group=new THREE.Group();group.name=spec.id;group.position.fromArray(spec.position);
  const steel=materials.metal.clone();steel.color.setHex(0x263846);steel.roughness=0.4;
  const dark=materials.concreteDark.clone();dark.color.setHex(0x202b36);dark.roughness=0.8;
  const trim=materials.metalSoft.clone();trim.color.setHex(0x526071);trim.roughness=0.35;
  const glow=(color:number,opacity:number)=>{
    const m=new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,
      blending:THREE.AdditiveBlending,toneMapped:false});m.userData.bloom=true;return m;
  };
  const cyan=glow(0x53e4f7,0.8),violet=glow(0x8d8aff,0.8);
  const add=(parent:THREE.Object3D,name:string,geometry:THREE.BufferGeometry,material:THREE.Material,
    p:[number,number,number]=[0,0,0])=>{
    const mesh=new THREE.Mesh(geometry,material);mesh.name=`${spec.id}_${name}`;mesh.position.fromArray(p);
    mesh.castShadow=!material.transparent;mesh.receiveShadow=!material.transparent;parent.add(mesh);return mesh;
  };
  // Ground remains at Y=0: no central plinth, pillar, or spawn-blocking cylinder.
  const court=add(group,'SpawnCourt',new THREE.CircleGeometry(2.45,80),dark,[0,0.024,0]);court.rotation.x=-Math.PI/2;
  const inlay=add(group,'SpawnOutline',new THREE.RingGeometry(2.44,2.465,80),cyan,[0,0.03,0]);inlay.rotation.x=-Math.PI/2;
  for(const side of [-1,1])for(const front of [-1,1]){
    const x=side*spec.width*0.27,z=front*spec.width*0.17;
    add(group,`Foot_${side}_${front}`,new THREE.CylinderGeometry(0.48*s,0.6*s,d.baseHeight,24),dark,[x,d.baseHeight/2,z]);
    add(group,`Arch_${side}_${front}`,new THREE.TubeGeometry(orrerySupportCurve(spec,side,front),40,0.15*s,8,false),steel);
    const emitter=add(group,`Projector_${side}_${front}`,new THREE.TorusGeometry(0.28*s,0.025*s,6,32),front<0?violet:cyan,[x,d.baseHeight+0.02,z]);
    emitter.rotation.x=Math.PI/2;
  }
  const bearing=add(group,'UpperBearing',new THREE.CylinderGeometry(0.26*s,0.26*s,1.5*s,28),trim,[0,d.centerY,0]);bearing.rotation.z=Math.PI/2;
  // A low, upward-facing instrument surface, reachable from the spawn court.
  add(group,'ConsoleBase',new THREE.BoxGeometry(1.8,0.14,0.9),dark,[0,0.07,-1.8]);
  add(group,'ConsolePedestal',new THREE.BoxGeometry(0.65,0.79,0.5),steel,[0,0.52,-1.9]);
  const housing=add(group,'ConsoleHousing',new THREE.BoxGeometry(1.78,0.76,0.10),steel,[0,1.01,-1.8]);housing.rotation.x=-0.55;
  const displayMaterial=new THREE.MeshBasicMaterial({map:dashboardTexture(),toneMapped:false});
  const display=add(group,'ConsoleDisplay',new THREE.PlaneGeometry(1.62,0.66),displayMaterial,[0,1.04,-1.75]);display.rotation.x=-0.55;
  display.userData.interactionId='LM-01-CONSOLE';
  const status=add(group,'ConsoleStatus',new THREE.BoxGeometry(1.3,0.015,0.02),cyan,[0,0.55,-1.63]);status.userData.noMerge=true;

  const tracks:Array<{mount:THREE.Group;radius:number;phase:number;speed:number;signals:THREE.InstancedMesh;signalSpeed:number}>=[];
  const arcDegrees=[[4,51],[67,68],[151,59],[223,62],[302,44]];
  for(const [index,def]of [
    {role:'Earth',r:d.outerRadius,ball:d.outerBallRadius,tilt:d.outerTilt,color:0x53e4f7,phase:0.32,speed:0.28},
    {role:'Moon',r:d.innerRadius,ball:d.innerBallRadius,tilt:-d.innerTilt,color:0x8d8aff,phase:2.25,speed:-0.39},
  ].entries()){
    const axis=new THREE.Group();axis.name=`${spec.id}_${def.role}Axis`;axis.position.y=d.centerY;axis.rotation.y=index===0?0.25:1.35;group.add(axis);
    const plane=new THREE.Group();plane.name=`${spec.id}_${def.role}Plane`;plane.rotation.x=Math.PI/2-def.tilt;axis.add(plane);
    const core=glow(0xf4fcff,0.96),innerHalo=glow(def.color,0.21),outerHalo=glow(def.color,0.045);
    for(const [start,length]of arcDegrees)for(const [layer,tube,mat]of [
      ['Core',0.015*s,core],['InnerHalo',0.045*s,innerHalo],['OuterHalo',0.11*s,outerHalo],
    ] as const){
      const arc=add(plane,`${def.role}_${layer}`,new THREE.TorusGeometry(def.r,tube,6,Math.ceil(length/1.3),length*Math.PI/180),mat);
      arc.rotation.z=(start+index*9)*Math.PI/180;
    }
    // Merge static arc pieces by material; moving mounts/signals are added after.
    mergeStaticGroup(plane);
    const mount=new THREE.Group();mount.name=`${spec.id}_${def.role}Mount`;
    mount.userData={orbitingStar:true,bodyRole:def.role.toLowerCase(),targetRadius:def.ball};plane.add(mount);
    const placeholder=new THREE.Group();placeholder.name=`${spec.id}_${def.role}Placeholder`;placeholder.userData.bodyPlaceholder=true;mount.add(placeholder);
    const bodyMat=new THREE.MeshStandardMaterial({color:index===0?0x3d7795:0xb9c1ce,roughness:index===0?0.36:0.78,metalness:index===0?0.2:0.05});
    add(placeholder,`${def.role}Body`,new THREE.SphereGeometry(def.ball,40,24),bodyMat);
    const equator=add(placeholder,`${def.role}Datum`,new THREE.TorusGeometry(def.ball*1.005,0.009*s,5,64),index===0?cyan:violet);equator.rotation.x=0.3;
    const signals=new THREE.InstancedMesh(new THREE.SphereGeometry(1,8,6),glow(0xffffff,0.9),20);
    signals.name=`${spec.id}_${def.role}FlowSignals`;signals.userData.noMerge=true;
    for(let i=0;i<20;i++)signals.setColorAt(i,new THREE.Color(i%10===0?0xf7fdff:def.color).multiplyScalar(Math.pow(1-(i%10)/10,1.7)));
    signals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);signals.frustumCulled=false;plane.add(signals);
    tracks.push({mount,radius:def.r,phase:def.phase,speed:def.speed,signals,signalSpeed:index===0?0.33:-0.47});
  }
  const marker=new THREE.Object3D();
  const update=(time:number,reducedMotion:boolean)=>{
    const t=reducedMotion?0:time;
    for(const track of tracks){
      const angle=track.phase+t*track.speed;
      track.mount.position.set(Math.cos(angle)*track.radius,Math.sin(angle)*track.radius,0);
      track.mount.rotation.set(t*0.07,t*0.12,0.18);
      for(let i=0;i<20;i++){
        const tail=i%10,head=Math.floor(i/10);
        const a=track.phase+head*2.8+t*track.signalSpeed-Math.sign(track.signalSpeed)*tail*0.019;
        marker.position.set(Math.cos(a)*track.radius,Math.sin(a)*track.radius,0);
        marker.scale.setScalar((tail===0?0.055:0.034*(1-tail/12))*s);marker.updateMatrix();track.signals.setMatrixAt(i,marker.matrix);
      }
      track.signals.instanceMatrix.needsUpdate=true;
    }
  };
  group.userData.orrery={spec:{...spec,position:[...spec.position]},dimensions:d,trial:true,
    visual:'segmented-holographic-arcs',stablePlanes:true,bodySlots:['LM-01_EarthMount','LM-01_MoonMount'],
    console:{id:'LM-01-CONSOLE',route:'/world/observatory'}};
  update(0,false);return {group,update};
}
