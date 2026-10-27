import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {buildings,junctionBuildings,legacyBuildings,SPAWN,plazaScreen,landmark,LAYOUT_VERSION,WORLD_BOUNDS,BUILDING_WORKSHOP} from '../src/worlds/cyberpunk/layout';
import {worldColliders} from '../src/worlds/cyberpunk/colliders';
import {isSafeFeet,loadSnapshot} from '../src/worlds/cyberpunk/session';
import {createPhysicsWorld} from '../src/engine/player/controller';
import {curveFront,createCurvedColliders} from '../src/worlds/cyberpunk/buildings/junctionGeometry';
import {NW_NIGHT_STUDY} from '../src/worlds/cyberpunk/buildings/nwNightConfig';
const context=new Proxy({createImageData:(w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)}),measureText:(v:string)=>({width:v.length*24}),
  createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},
  {get:(target,key)=>key in target?target[key as keyof typeof target]:(()=>{})});
Object.assign(globalThis,{document:{createElement:()=>({width:0,height:0,getContext:()=>context,toDataURL:()=>''}),
  createElementNS:()=>({addEventListener(){},removeEventListener(){},src:''})}});
const {exhibits}=await import('../src/worlds/cyberpunk/exhibits');
const {createMaterials}=await import('../src/worlds/cyberpunk/materials');
const {createBuildings}=await import('../src/worlds/cyberpunk/buildings/buildings');
assert.deepEqual(junctionBuildings.map(b=>b.id).sort(),['NE(0)','NW(0)','SE(0)','SW(0)']);
assert.equal(new Set(buildings.map(b=>b.id)).size,buildings.length);
assert.equal(legacyBuildings.length,7,'retain seven source building modules plus the separate T-03');
assert.ok(isSafeFeet(SPAWN.feet));
assert.ok(plazaScreen.position[2]<landmark.position[2]);assert.equal(plazaScreen.width/plazaScreen.height,16/9);
for(const e of exhibits){
  assert.ok(isSafeFeet(e.interaction.anchor),`${e.id} anchor unsafe: ${e.interaction.anchor}`);
  assert.ok(isSafeFeet(e.interaction.returnFeet),`${e.id} return point unsafe`);
}
const workshop=buildings.find(b=>b.id===BUILDING_WORKSHOP.buildingId)!;
assert.ok(isSafeFeet(workshop.position.map((v,i)=>v+BUILDING_WORKSHOP.standingOffset[i]) as [number,number,number]));
// Four connected routes skirt the existing observatory feet/console and north screen.
const routes=[{name:'east',from:[8,0] as const,to:[48,0] as const},{name:'west',from:[-8,0] as const,to:[-48,0] as const},
  {name:'north-bypass',from:[8,-8] as const,to:[8,-48] as const},{name:'south',from:[0,8] as const,to:[0,48] as const}];
for(const route of routes){
  for(let i=0;i<=100;i++){
    const t=i/100,x=THREE.MathUtils.lerp(route.from[0],route.to[0],t),z=THREE.MathUtils.lerp(route.from[1],route.to[1],t);
    assert.ok(isSafeFeet([x,0,z]),`${route.name} blocked at ${x},${z}`);
  }
}
assert.ok(isSafeFeet([-25,0,-18]),'concave forecourt must not be filled by a bounding box');
const generated=createBuildings(junctionBuildings,createMaterials().materials,1).buildings;
const nw=generated.find(b=>b.spec.id==='NW(0)')!;
assert.ok(nw.group.userData.nightStudy);
assert.deepEqual(generated.filter(b=>b.group.userData.nightStudy).map(b=>b.spec.id),['NW(0)'],'night style must not spread to other buildings');
for(const config of NW_NIGHT_STUDY.panels){
  const panel=nw.posterSlots.get(config.id)!;
  assert.ok(panel,'registered exhibition surface');
  const mat=panel.material as THREE.MeshBasicMaterial;
  assert.equal(mat.color.getHex(),0xffffff);assert.equal(mat.toneMapped,false);assert.equal(mat.userData.bloom,false);
  panel.geometry.computeBoundingBox();const size=panel.geometry.boundingBox!.getSize(new THREE.Vector3());
  assert.ok(Math.abs(size.x/size.y-config.aspect)<1e-5,'image aspect unchanged');
  assert.ok(worldColliders.some(c=>c.id===`NW(0):${config.id}`),'screen housing blocks camera');
  for(const y of NW_NIGHT_STUDY.cornices)assert.ok(Math.abs(y-config.y)>size.y/2+.1,'cornices avoid image');
}
assert.ok(isSafeFeet([-25,0,4]),'night-study viewing point safe');
const geometry=generated.map(b=>{
  b.group.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(b.group);
  let meshes=0,rooms=0,comicInstallations=0;
  b.group.traverse(o=>{if(o instanceof THREE.Mesh){meshes++;assert.ok(o.geometry.getAttribute('position'),'valid geometry');}
    if(o.name.endsWith('_RoomBack'))rooms++;if(o.userData.comicInstallation)comicInstallations++;});
  assert.ok(bounds.min.toArray().concat(bounds.max.toArray()).every(Number.isFinite));
  if(b.spec.variant==='curveConcave'||b.spec.variant==='curveConvex'){
    assert.ok(rooms>=100);assert.equal(createCurvedColliders(b.spec).filter(c=>c.id.includes(':curve:')).length,16);
    assert.ok(curveFront(b.spec,0)>0);
  }
  if(b.spec.id==='SE(0)')assert.equal(comicInstallations,1);
  return {id:b.spec.id,variant:b.spec.variant,position:b.spec.position,size:b.spec.size,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},meshes,rooms,comicInstallations};
});
await RAPIER.init();const world=createPhysicsWorld(worldColliders,WORLD_BOUNDS);world.step();
const capsule=new RAPIER.Capsule(.52,.28);
for(const route of routes){
  const [x,z]=route.from,[tx,tz]=route.to,dx=tx-x,dz=tz-z,len=Math.hypot(dx,dz);
  const hit=world.castShape({x,y:.83,z},{x:0,y:0,z:0,w:1},{x:dx/len,y:0,z:dz/len},capsule,0,len,true);
  assert.equal(hit,null,`${route.name} physical capsule sweep must remain clear`);
}
for(const [x,z,dz] of [[-25,-15,-1],[-26,9,1]]){
  const hit=world.castShape({x,y:.83,z},{x:0,y:0,z:0,w:1},{x:0,y:0,z:dz},capsule,0,16,true);
  assert.ok(hit,'curved glass wall must stop the player');
}
world.free();
Object.assign(globalThis,{sessionStorage:{getItem:()=>JSON.stringify({schemaVersion:1,layoutVersion:'lohina-block-v1-2026-10-24-observatory-workshop',player:{feet:[0,0,1],yawRad:0},lastSafeFeet:[0,0,1]})}});
assert.equal(loadSnapshot(),null,'reject old-layout snapshots');
const report={status:'passed',layoutVersion:LAYOUT_VERSION,evidence:'geometry, registration, safe anchors and actual Rapier capsule sweeps; not browser/GPU acceptance',geometry,
  routes:routes.map(r=>r.name),safeAnchors:exhibits.length,legacyPreserved:legacyBuildings.map(b=>b.id),oldSnapshotRejected:true,
  nightStudy:{id:'NW(0)',images:2,imageRatiosAndColorsPreserved:true,imageExitsBloom:true,cornicesAvoidPictures:true,otherBuildingsUnchanged:true}};
mkdirSync('docs/block-plan',{recursive:true});writeFileSync('docs/block-plan/checks.json',JSON.stringify(report,null,2)+'\n');
// Schematic generated from the same configuration; explicitly not a runtime screenshot.
const scale=5,ox=480,oy=450;
const rect=(b:typeof buildings[number])=>`<g transform="translate(${ox+b.position[0]*scale},${oy+b.position[2]*scale}) rotate(${-b.yawRad*180/Math.PI})"><rect x="${-b.size[0]*scale/2}" y="${-b.size[2]*scale/2}" width="${b.size[0]*scale}" height="${b.size[2]*scale}" rx="4" fill="#152a3a" stroke="#78dbe3" stroke-width="2"/><path d="M -20 ${b.size[2]*scale/2+7} h 40" stroke="#ffbb78" stroke-width="3"/></g><text x="${ox+b.position[0]*scale}" y="${oy+b.position[2]*scale}" fill="#e8f5fa" text-anchor="middle">${b.id}</text>`;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="900" viewBox="0 0 960 900"><rect width="960" height="900" fill="#080f19"/><g font-family="Microsoft YaHei, sans-serif" font-size="17"><text x="28" y="38" fill="#e8f5fa">新路口试做 · 配置示意（非运行截图）· 北 ↑</text><rect x="435" y="90" width="90" height="720" fill="#23303a"/><rect x="80" y="405" width="800" height="90" fill="#23303a"/>${junctionBuildings.map(rect).join('')}<circle cx="480" cy="450" r="35" fill="#193846" stroke="#a4eaff"/><text x="480" y="456" text-anchor="middle" fill="#fff">M</text><rect x="450" y="325" width="60" height="7" fill="#b28be8"/><text x="480" y="312" text-anchor="middle" fill="#d2c0ed">SCREEN · 12m</text><text x="28" y="860" fill="#99acbb">矩形为配置包络；弧面以运行模型为准。橙线标示正面。道路与尺寸均可调整。</text></g></svg>`;
writeFileSync('docs/block-plan/layout-trial.svg',svg);
console.log(JSON.stringify(report,null,2));
