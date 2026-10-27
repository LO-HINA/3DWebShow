import * as THREE from 'three';
import type { BuildingSpec } from '../types';
import type { BuildContext, BuiltBuilding } from './buildings';
import { createLabelMaterial } from '../materials';
import { createSignTexture } from '../textures';
import { curveFront, CURVE_SEGMENTS } from './junctionGeometry';
import { buildDeepFacades } from './cityStyle';

/** Authored curved envelopes: physical frames, inset glazing and rooms, no window texture. */
export function createCurvedBuilding(ctx:BuildContext,spec:BuildingSpec):BuiltBuilding {
  const group=new THREE.Group();group.name=spec.id;
  const [w,h,d]=spec.size, warm=spec.variant==='curveConvex';
  const shell=new THREE.MeshStandardMaterial({color:warm?0x25232b:0x16212b,roughness:0.55,metalness:0.4});
  const frame=new THREE.MeshStandardMaterial({color:warm?0x6b5540:0x425865,roughness:0.34,metalness:0.76});
  const glass=new THREE.MeshStandardMaterial({color:warm?0x534c4a:0x365866,roughness:0.17,metalness:0.42,transparent:true,opacity:0.42,depthWrite:false});
  const room=new THREE.MeshStandardMaterial({color:0x262a32,roughness:0.9});
  const dark=new THREE.MeshStandardMaterial({color:0x121923,roughness:0.8});
  const lamp=new THREE.MeshStandardMaterial({color:0x96928a,emissive:warm?0xffbd73:0x90dae7,emissiveIntensity:2.1});
  lamp.userData.bloom=true;
  const materials:THREE.Material[]=[shell,frame,glass,room,dark,lamp];
  const occluders:THREE.Mesh[]=[],fadeMeshes:THREE.Mesh[]=[];
  const unit=ctx.geometryCache.get('junction-unit')??new THREE.BoxGeometry(1,1,1);
  ctx.geometryCache.set('junction-unit',unit);
  const box=(parent:THREE.Object3D,m:THREE.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number,name:string)=>{
    const mesh=new THREE.Mesh(unit,m);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.name=`${spec.id}_${name}`;
    mesh.castShadow=m!==glass&&m!==lamp;mesh.receiveShadow=true;parent.add(mesh);fadeMeshes.push(mesh);return mesh;
  };
  const step=w/CURVE_SEGMENTS;
  // Thick floor plates trace the curve; side and rear walls remain fully modeled.
  const footprint=new THREE.Shape();footprint.moveTo(-w/2,d/2);footprint.lineTo(w/2,d/2);
  for(let i=CURVE_SEGMENTS;i>=0;i--){const x=-w/2+i*step;footprint.lineTo(x,-curveFront(spec,x));}
  footprint.closePath();
  const slabGeometry=new THREE.ExtrudeGeometry(footprint,{depth:0.24,bevelEnabled:false,steps:1});
  slabGeometry.rotateX(-Math.PI/2);
  const floorH=3.8,floors=Math.floor((h-2)/floorH);
  for(let floor=0;floor<=floors;floor++){
    const slab=new THREE.Mesh(slabGeometry,shell);slab.position.y=0.1+floor*floorH;slab.name=`${spec.id}_CurvedSlab`;slab.castShadow=true;slab.receiveShadow=true;
    group.add(slab);fadeMeshes.push(slab);
  }
  for(let i=0;i<CURVE_SEGMENTS;i++){
    const x=-w/2+(i+0.5)*step,z=curveFront(spec,x);
    const z0=curveFront(spec,x-step/2),z1=curveFront(spec,x+step/2);
    const bay=new THREE.Group();bay.position.set(x,0,z);bay.rotation.y=-Math.atan2(z1-z0,step);group.add(bay);
    const bw=Math.hypot(step,z1-z0);
    // Solid volume starts behind the actual room; collision uses the same curve profile.
    const coreFront=Math.min(z0,z1)-1.55;
    occluders.push(box(group,shell,x,h/2,(coreFront-d/2)/2,step+0.01,h,coreFront+d/2,'Core'));
    box(bay,frame,-bw/2, h/2,0,0.14,h,0.42,'Mullion');
    for(let floor=0;floor<floors;floor++){
      const y=floor*floorH+2.0,lit=(i*7+floor*11)%9<3;
      box(bay,lit?room:dark,0,y,-1.36,bw-0.12,3.42,0.16,'RoomBack');
      box(bay,room,0,y-1.6,-0.72,bw-0.12,0.12,1.35,'RoomFloor');
      box(bay,room,-bw/2+0.1,y,-0.7,0.08,3.25,1.3,'RoomPartition');
      box(bay,glass,0,y,-0.3,bw-0.2,3.16,0.05,'InsetGlass');
      box(bay,frame,0,y-1.67,0,bw,0.22,0.58,'Sill');
      if(lit){
        box(bay,lamp,0,y+1.38,-0.86,bw*0.52,0.045,0.24,'CeilingLamp');
        box(bay,dark,0.12,y-1.15,-0.91,bw*0.42,0.48,0.38,'Desk');
      }
      if(warm)box(bay,frame,0,y+1.72,0.2,bw,0.16,0.84,'Sunshade');
    }
  }
  // Rear glazing, thick piers and service panels are visible while walking around.
  for(let i=0;i<Math.floor(w/2.4);i++){
    const x=-w/2+1.2+i*2.4;
    box(group,frame,x,h/2,-d/2-0.12,0.16,h,0.32,'RearPier');
    for(let floor=0;floor<floors;floor++){
      box(group,dark,x+1.0,floor*floorH+2,-d/2-0.04,1.7,2.65,0.12,'RearWindowRecess');
      box(group,glass,x+1.0,floor*floorH+2,-d/2-0.13,1.5,2.4,0.04,'RearGlass');
    }
  }
  for(const side of [-1,1]){
    box(group,frame,side*w/2,h/2,0,0.22,h,d,'SideWall');
    for(let floor=1;floor<floors;floor++){
      box(group,shell,side*(w/2+0.24),floor*floorH,-d*0.15,0.5,0.2,d*0.55,'SideLedge');
      box(group,dark,side*(w/2+0.14),floor*floorH+1.4,0,0.1,1.6,2.8,'SideService');
    }
  }
  const entranceZ=curveFront(spec,0);
  box(group,frame,0,3.5,entranceZ+0.75,5.2,0.3,2.0,'EntryCanopy');
  box(group,lamp,0,3.31,entranceZ+1.0,3.3,0.035,0.2,'EntryLight');
  // Exterior threshold, not a promise of an enterable interior.
  const labelMaterial=createLabelMaterial(createSignTexture(spec.sign,spec.subSign,{width:1024,height:256}));
  materials.push(labelMaterial);
  const label=new THREE.Mesh(new THREE.PlaneGeometry(4.8,0.68),labelMaterial);
  label.position.set(0,4.35,entranceZ+0.12);group.add(label);
  box(group,frame,0,h-0.5,-1,w*0.6,1.1,d*0.45,'RoofPlant');
  for(const side of [-1,1])box(group,lamp,side*w*0.28,h+0.1,-1,0.08,0.07,d*0.42,'CrownLight');
  group.userData.junction={id:spec.id,variant:spec.variant,curveSegments:CURVE_SEGMENTS,roomDepth:1.36,floors};
  group.position.fromArray(spec.position);group.rotation.y=spec.yawRad;
  return {spec,group,posterSlots:new Map(),occluders,fadeMaterials:materials,fadeMeshes};
}

/** NE: stepped masonry, exposed frame and one recessed portrait comic panel. */
export function createComicCorner(ctx:BuildContext,spec:BuildingSpec):BuiltBuilding {
  const group=new THREE.Group();group.name=spec.id;
  const shell=new THREE.MeshStandardMaterial({color:0x202030,roughness:0.64,metalness:0.26});
  const metal=new THREE.MeshStandardMaterial({color:0x3d3650,roughness:0.42,metalness:0.66});
  const neon=new THREE.MeshStandardMaterial({color:0x6e2f66,emissive:0xe069c2,emissiveIntensity:2});neon.userData.bloom=true;
  const cyan=new THREE.MeshStandardMaterial({color:0x386774,emissive:0x74d3e6,emissiveIntensity:1.8});cyan.userData.bloom=true;
  const fadeMaterials:THREE.Material[]=[shell,metal,neon,cyan],occluders:THREE.Mesh[]=[],fadeMeshes:THREE.Mesh[]=[];
  const unit=ctx.geometryCache.get('junction-unit')??new THREE.BoxGeometry(1,1,1);
  ctx.geometryCache.set('junction-unit',unit);
  const box=(m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number,name:string)=>{
    const mesh=new THREE.Mesh(unit,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.name=`${spec.id}_${name}`;
    mesh.castShadow=m===shell||m===metal;mesh.receiveShadow=true;group.add(mesh);fadeMeshes.push(mesh);return mesh;
  };
  const [w,h,d]=spec.size;
  const volumes=[{x:0,y:3,z:0,w,h:6,d},{x:-w*.08,y:(h+6)/2,z:-1,w:w*.68,h:h-6,d:d-3},{x:w*.34,y:h*.29,z:-2,w:w*.26,h:h*.58,d:d-4}];
  for(const v of volumes)occluders.push(box(shell,v.x,v.y,v.z,v.w-2.8,v.h,v.d-2.8,'InsetCore'));
  buildDeepFacades(group,volumes,731,{profile:'boxed',reserved:[{x:-1.6,y:17,w:8.6,h:13}],fade:fadeMaterials,occluders});
  const z=(d-3)/2-1;
  box(metal,-1.6,17,z+0.3,8.7,13.2,0.7,'ComicRecess');
  const texture=new THREE.TextureLoader().load('/assets/worlds/cyberpunk/media/images/images1.jpg');texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=ctx.anisotropy;
  const imageMaterial=new THREE.MeshBasicMaterial({map:texture,color:0xd5d2da,toneMapped:false});fadeMaterials.push(imageMaterial);
  // Original image is square: never stretch it to the taller architectural opening.
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(7.8,7.8),imageMaterial);panel.position.set(-1.6,17.8,z+0.68);panel.name=`${spec.id}_Comic`;group.add(panel);fadeMeshes.push(panel);
  const labelMaterial=createLabelMaterial(createSignTexture('NE(0)','COMIC · NEON',{width:1024,height:256}));fadeMaterials.push(labelMaterial);
  const label=new THREE.Mesh(new THREE.PlaneGeometry(7.6,1.0),labelMaterial);label.position.set(-1.6,12.3,z+0.68);group.add(label);
  for(const side of [-1,1]){
    box(metal,-1.6+side*4.4,17,z+0.7,0.26,14,0.7,'ScreenPier');
    box(neon,-1.6+side*4.23,17,z+1.08,0.055,12.6,0.055,'NeonTrim');
    box(cyan,side*(w/2-.3),4.7,d/2+.1,0.08,0.08,0.2,'PodiumMarker');
    box(metal,side*(w/2-.4),3,0,0.5,6,d,'PodiumPier');
  }
  box(metal,0,3.6,d/2+.5,5.6,0.3,2.0,'Canopy');
  box(neon,0,3.4,d/2+1.2,4.4,0.04,0.08,'EntryLight');
  box(metal,-w*.08,h+.8,-1,w*.68,1.6,d-3,'Crown');
  box(cyan,-w*.08,h+1.65,-1,w*.62,.07,d-3.4,'CrownLight');
  group.userData.junction={id:spec.id,variant:spec.variant,comicAspect:1};
  group.position.fromArray(spec.position);group.rotation.y=spec.yawRad;
  return {spec,group,posterSlots:new Map([['mainScreen',panel]]),occluders,fadeMaterials,fadeMeshes};
}
