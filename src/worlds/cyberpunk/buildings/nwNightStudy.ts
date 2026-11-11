import * as THREE from 'three';
import type { BuildContext, BuiltBuilding } from './buildings';
import { curveFront } from './junctionGeometry';
import {createLabelMaterial} from '../materials';
import {createSignTexture} from '../textures';
import { NW_NIGHT_STUDY } from './nwNightConfig';
import { createNwMediaScreen } from './nwMediaScreen';

/** Only NW(0) opts into this first night study. SW and the street palette stay unchanged. */

export function addNwNightStudy(built:BuiltBuilding,ctx:BuildContext):BuiltBuilding {
  if(built.spec.id!=='NW(0)')return built;
  const {group,spec,fadeMaterials,fadeMeshes}=built;
  const details=new THREE.Group();details.name='NW(0)_NightStudy';group.add(details);
  const unique=new Set<THREE.Material>();
  group.traverse(o=>{if(o instanceof THREE.Mesh){for(const m of Array.isArray(o.material)?o.material:[o.material])unique.add(m);}});
  for(const m of unique){
    if(!(m instanceof THREE.MeshStandardMaterial))continue;
    if(m.transparent){m.color.setHex(0x48637a);m.opacity=.32;m.roughness=.14;m.metalness=.32;m.envMapIntensity=1.45;}
  }
  const metal=new THREE.MeshStandardMaterial({color:0x314257,roughness:.38,metalness:.74});
  const recess=new THREE.MeshStandardMaterial({color:0x080d18,roughness:.66,metalness:.35});
  const cyan=new THREE.MeshStandardMaterial({color:0x6babbc,emissive:0x66dce9,emissiveIntensity:3.1});
  const violet=new THREE.MeshStandardMaterial({color:0x734566,emissive:0xdc79bf,emissiveIntensity:2.2});
  const gold=new THREE.MeshStandardMaterial({color:0xbba082,emissive:0xffcb8c,emissiveIntensity:2.15});
  for(const m of [cyan,violet,gold])m.userData.bloom=true;
  const warmRoom=new THREE.MeshStandardMaterial({color:0x5d5146,emissive:0xa77543,emissiveIntensity:.26,roughness:.88});
  const coolRoom=new THREE.MeshStandardMaterial({color:0x394b63,emissive:0x507999,emissiveIntensity:.22,roughness:.85});
  fadeMaterials.push(metal,recess,cyan,violet,gold,warmRoom,coolRoom);
  // Contiguous lit zones are quieter than identical/random glowing rectangles.
  let bayIndex=0;
  for(const bay of group.children.filter(o=>o.type==='Group'&&o.children.some(c=>c.name.endsWith('_RoomBack')))){
    let row=0;const column=bayIndex++;
    for(const o of bay.children){
      if(o instanceof THREE.Mesh&&o.name.endsWith('_RoomBack')){
        if((column>=2&&column<=6&&row>=1&&row<=3)||(column>=10&&row>=5&&row<=7))o.material=warmRoom;
        else if((column+Math.floor(row/3))%4===0)o.material=coolRoom;
        row++;
      }
    }
  }
  const unit=ctx.geometryCache.get('junction-unit')!;
  const box=(parent:THREE.Object3D,m:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number,name:string)=>{
    const mesh=new THREE.Mesh(unit,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.name=`NW(0)_${name}`;
    mesh.castShadow=m===metal;mesh.receiveShadow=true;parent.add(mesh);fadeMeshes.push(mesh);return mesh;
  };
  const tangent=(x:number,y:number)=>{
    const node=new THREE.Group();node.position.set(x,y,curveFront(spec,x));
    node.rotation.y=-Math.atan2(curveFront(spec,x+.01)-curveFront(spec,x-.01),.02);details.add(node);return node;
  };
  // Recessed, continuous curved cornices: thick dark groove, restrained luminous core.
  for(const [level,y] of NW_NIGHT_STUDY.cornices.entries()){
    const points=Array.from({length:65},(_,i)=>{const x=-spec.size[0]/2+i*spec.size[0]/64;return new THREE.Vector3(x,y,curveFront(spec,x)+.17);});
    const path=new THREE.CatmullRomCurve3(points);
    const groove=new THREE.Mesh(new THREE.TubeGeometry(path,64,.105,5,false),metal);
    groove.name='NW(0)_CorniceGroove';details.add(groove);fadeMeshes.push(groove);
    // Core is tucked below the groove, visible from street level.
    const corePath=new THREE.CatmullRomCurve3(points.map(p=>p.clone().add(new THREE.Vector3(0,-.055,.055))));
    const core=new THREE.Mesh(new THREE.TubeGeometry(corePath,64,level===4?.035:.023,5,false),level===1?gold:cyan);
    core.name='NW(0)_CorniceCore';details.add(core);fadeMeshes.push(core);
  }
  // Full-height embedded rails occupy structural end bays, away from exhibition images.
  for(const x of [-11.7,11.7]){
    const rail=tangent(x,0);box(rail,recess,0,22,.1,.22,36,.18,'RailRecess');
    box(rail,cyan,0,22,.205,.045,35.7,.035,'EmbeddedRail');
  }
  // 2026-11-11：原两幅小画作已由面向中心 LM-01 的整幅巨幕取代。
  const screen=createNwMediaScreen(spec,ctx.anisotropy);
  details.add(screen.group);
  fadeMaterials.push(screen.material);
  fadeMeshes.push(screen.mesh);
  built.mediaSlots=new Map([['nw-giant-screen',screen.mesh]]);
  // Smaller signs establish different reading distances without filling every bay.
  const sign=(text:string,sub:string,x:number,y:number,w:number,h:number,m:THREE.Material)=>{
    const node=tangent(x,y);box(node,metal,0,0,.28,w+.22,h+.22,.45,'SignHousing');
    const mat=createLabelMaterial(createSignTexture(text,sub,{width:1024,height:256,background:'#0a1324',color:'#c9f5ff',subColor:'#d9bda0'}));
    fadeMaterials.push(mat);const face=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);face.position.z=.512;node.add(face);fadeMeshes.push(face);
    box(node,m,0,-h/2-.14,.32,w*.65,.035,.04,'SignLight');
  };
  sign('LOHINA','NIGHT ATELIER',4.5,28.1,5.4,1.35,violet);
  sign('NW(0)','VISUAL ARTS',0,4.55,4.8,.78,gold);
  // Side-wall ribs, back-wall bands and service recesses remain readable while orbiting.
  for(const side of [-1,1]){
    for(const z of [-7,-2,3]){
      box(details,recess,side*12.13,19,z,.09,29,.25,'SideLightRecess');
      box(details,side<0?violet:cyan,side*12.19,19,z,.035,28.7,.06,'SideLight');
    }
    for(const y of [7.8,19.2,30.6])box(details,metal,side*12.24,y,-2,.28,.24,13,'SideBelt');
  }
  for(const y of [11.42,30.42,41.45])box(details,cyan,0,y,-10.2,23.6,.035,.035,'RearBelt');
  const wash=new THREE.SpotLight(0x76b9ed,110,43,.84,.9,2);wash.position.set(-9,2.6,15);wash.target.position.set(-2,15,5);
  wash.name='NW(0)_CurveWash';details.add(wash,wash.target);
  const entry=new THREE.PointLight(0xffc381,16,11,2);entry.position.set(0,3.05,curveFront(spec,0)+1.1);entry.name='NW(0)_EntryFill';details.add(entry);
  const sideFill=new THREE.PointLight(0x9a86da,14,21,2);sideFill.position.set(-15,7,-1);sideFill.name='NW(0)_CornerFill';details.add(sideFill);
  // Reuse the single city mirror. Only this surface opts into softened/perturbed sampling.
  const wet=ctx.materials.ground.clone();wet.name='NW(0)_WetForecourt';wet.userData.nwStudyWet=true;wet.userData.noBloom=true;
  // 建筑转 45° 面向中心后，前庭收在本地入口前，避免越过中路铺装。
  const paving=new THREE.Mesh(new THREE.PlaneGeometry(18,7),wet);paving.rotation.x=-Math.PI/2;paving.position.set(0,.026,8.5);
  paving.name='NW(0)_WetForecourt';paving.receiveShadow=true;details.add(paving);
  group.userData.nightStudy={id:spec.id,revision:NW_NIGHT_STUDY.revision,panels:0,screen:'nw-giant-screen',cornices:5,localLights:3};
  return built;
}

