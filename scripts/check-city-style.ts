import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';

// Canvas is stubbed only for geometry checks; these are not rendered-image tests.
function canvas(){
  const context=new Proxy({
    createImageData:(w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)}),
    measureText:(text:string)=>({width:text.length*24}),
    createLinearGradient:()=>({addColorStop:()=>{}}),createRadialGradient:()=>({addColorStop:()=>{}}),
  },{get:(target,key)=>key in target?target[key as keyof typeof target]:(()=>{})});
  return {width:0,height:0,getContext:()=>context,toDataURL:()=>''};
}
Object.assign(globalThis,{document:{createElement:canvas}});
const {createMaterials}=await import('../src/worlds/cyberpunk/materials');
const {buildings}=await import('../src/worlds/cyberpunk/layout');
const {createBuildings}=await import('../src/worlds/cyberpunk/buildings/buildings');
const {createMediaTower}=await import('../src/worlds/cyberpunk/buildings/mediaTower');
const {buildDeepFacades}=await import('../src/worlds/cyberpunk/buildings/cityStyle');
const {mergeStaticGroup,mergeStaticScene}=await import('../src/engine/primitives/merge');
const bundle=createMaterials(),built=createBuildings(buildings,bundle.materials,4);
const scene=new THREE.Scene(),excluded=new Set<THREE.Object3D>();
const records:object[]=[];
for(const building of built.buildings){
  assert.deepEqual(building.group.position.toArray(),building.spec.position);
  assert.equal(building.group.rotation.y,building.spec.yawRad);
  const meta=building.group.userData.cityStyle;
  assert.ok(meta.rooms>0,`${building.spec.id} has no physical windows`);
  assert.ok(meta.depth>=0.7);
  assert.ok(meta.litRooms>0);
  assert.ok(meta.floorEdges>0);
  assert.ok(meta.hoods+meta.fins>0,'architectural shading must have physical geometry');
  const glass=building.group.children.find(o=>o instanceof THREE.InstancedMesh&&o.material instanceof THREE.Material&&o.material.name==='City_RecessedGlass') as THREE.InstancedMesh;
  assert.ok(glass&&glass.count>0);
  assert.equal((glass.material as THREE.MeshStandardMaterial).map,null,'windows must not be facade images');
  for(const poster of building.spec.posters??[])assert.ok(building.posterSlots.has(poster.slot));
  if(building.spec.id==='H-01')assert.ok(building.mediaSlots?.has('media-main'));
  if(building.spec.id==='B-01')assert.ok(building.posterSlots.has('mainScreen'));
  records.push({id:building.spec.id,...meta,posters:building.posterSlots.size,media:building.mediaSlots?.size??0});
  mergeStaticGroup(building.group,new Set(building.occluders));scene.add(building.group);
  building.occluders.forEach(mesh=>excluded.add(mesh));
}
const tower=createMediaTower(bundle.materials,4,{images:[],videos:[],imageDuration:8,videoFit:'contain'});
assert.ok(tower.group.userData.cityStyle.rooms>0);
records.push({id:'T-03',...tower.group.userData.cityStyle,photoAndVideoChannels:'existing implementation retained'});
scene.add(tower.group);excluded.add(tower.group);mergeStaticScene(scene,excluded);scene.updateMatrixWorld(true);
let instances=0,triangles=0,invalid=0;
scene.traverse(object=>{
  if(!(object instanceof THREE.Mesh))return;
  const position=object.geometry.getAttribute('position');
  for(const n of position.array)if(!Number.isFinite(n))invalid++;
  const count=object instanceof THREE.InstancedMesh?object.count:1;
  if(object instanceof THREE.InstancedMesh)instances+=count;
  if(object instanceof THREE.InstancedMesh){
    for(const n of object.instanceMatrix.array)if(!Number.isFinite(n))invalid++;
  }
  triangles+=(object.geometry.index?.count??position.count)/3*count;
});
assert.equal(invalid,0);
assert.equal(records.length,buildings.length+1);

// Ray checks on a real facade fixture: a front view can see the room back wall;
// an oblique view is occluded by the physical reveal/frame rather than a flat panel.
const fixture=new THREE.Group();
buildDeepFacades(fixture,[{x:0,y:3,z:0,w:6,h:6,d:6}],42,{profile:'horizontal'});
fixture.updateMatrixWorld(true);
const opaque=fixture.children.filter((o):o is THREE.Mesh=>o instanceof THREE.Mesh&&
  o.material instanceof THREE.Material&&!o.material.transparent);
const target=new THREE.Vector3(0.32,1.7,1.65);
const ray=new THREE.Raycaster();
function firstHit(origin:THREE.Vector3){
  ray.set(origin,target.clone().sub(origin).normalize());
  const hit=ray.intersectObjects(opaque,false)[0];assert.ok(hit);
  return {material:((hit.object as THREE.Mesh).material as THREE.Material).name,distance:hit.distance};
}
const normalView=firstHit(new THREE.Vector3(target.x,target.y,7));
const obliqueView=firstHit(new THREE.Vector3(target.x+4,target.y,7));
assert.match(normalView.material,/City_(WarmRoom|CoolRoom|UnlitRoom)/);
assert.match(obliqueView.material,/City_(WindowFrame|WindowSpandrel|RoomFloor)/);
const backMaterial=fixture.children.find(o=>o instanceof THREE.Mesh&&
  o.material instanceof THREE.Material&&o.material.name==='City_WarmRoom') as THREE.Mesh;
assert.ok(backMaterial);
assert.equal((backMaterial.material as THREE.Material).userData.bloom,undefined);
assert.ok((backMaterial.material as THREE.MeshStandardMaterial).emissiveIntensity<0.5);
const report={status:'passed',evidence:'scene geometry only; no GPU rendering or performance claim',
  buildings:records,instances,triangles,invalid,rayOcclusion:{normalView,obliqueView},notes:['positions and yaw preserved','original tower poster slots retained','hero and north media surfaces retained','physical room and recessed glazing geometry present','oblique ray hits physical reveal or frame before the room back wall','room back walls excluded from bloom']};
mkdirSync('docs/city-style-review',{recursive:true});writeFileSync('docs/city-style-review/geometry-checks.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));tower.dispose();
