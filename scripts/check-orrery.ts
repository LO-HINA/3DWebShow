import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {createOrrery} from '../src/worlds/cyberpunk/props/orrery';
import {createOrreryColliders,orreryDimensions,createOrreryPortal} from '../src/worlds/cyberpunk/props/orreryConfig';
import type {WorldMaterials} from '../src/worlds/cyberpunk/materials';
import type {ColliderSpec} from '../src/engine/contracts/types';
import {landmark,plazaScreen,SPAWN} from '../src/worlds/cyberpunk/layout';
import {worldColliders} from '../src/worlds/cyberpunk/colliders';
import {PLAYER} from '../src/engine/player/settings';
import {createPhysicsWorld} from '../src/engine/player/controller';
import {isSafeFeet,createSnapshot} from '../src/worlds/cyberpunk/session';
import {observatoryDestinations,observatoryHref} from '../src/content/observatoryDestinations';

// Real prop geometry; plain materials avoid requiring a DOM/Canvas in this check.
const materials={metal:new THREE.MeshStandardMaterial(),metalSoft:new THREE.MeshStandardMaterial(),concreteDark:new THREE.MeshStandardMaterial()} as unknown as WorldMaterials;
const records:object[]=[];
function preciseBounds(root:THREE.Object3D){
  const bounds=new THREE.Box3(),point=new THREE.Vector3(),instance=new THREE.Matrix4(),world=new THREE.Matrix4();
  root.traverse(object=>{
    if(!(object instanceof THREE.Mesh))return;
    const positions=object.geometry.getAttribute('position');
    const count=object instanceof THREE.InstancedMesh?object.count:1;
    for(let instanceIndex=0;instanceIndex<count;instanceIndex++){
      if(object instanceof THREE.InstancedMesh){object.getMatrixAt(instanceIndex,instance);world.multiplyMatrices(object.matrixWorld,instance);}
      else world.copy(object.matrixWorld);
      for(let vertex=0;vertex<positions.count;vertex++)bounds.expandByPoint(point.fromBufferAttribute(positions,vertex).applyMatrix4(world));
    }
  });
  return bounds;
}
for(const width of [10,14,16])for(const height of [9,11.8,13]){
  const spec={...landmark,width,height},d=orreryDimensions(spec),handle=createOrrery(materials,spec);
  const stars:THREE.Object3D[]=[];
  handle.group.traverse(o=>{if(o.userData.orbitingStar)stars.push(o);});
  assert.equal(stars.length,2);
  const bounds=new THREE.Box3();
  for(let frame=0;frame<120;frame++){
    handle.update(frame*2,false);handle.group.updateMatrixWorld(true);
    // Transform actual instance vertices, not a rotated batch AABB: the latter
    // overestimates the circular index marks as a spinning square.
    bounds.union(preciseBounds(handle.group));
    for(const [i,star]of stars.entries()){
      const radius=i===0?d.outerBallRadius:d.innerBallRadius;
      const center=star.getWorldPosition(new THREE.Vector3()).sub(handle.group.position);
      assert.ok(Math.abs(center.distanceTo(new THREE.Vector3(0,d.centerY,0))-(i===0?d.outerRadius:d.innerRadius))<1e-6);
      assert.ok(Math.hypot(center.x,center.z)+radius<d.sweptRadius);
      assert.ok(center.y-radius>d.sweptBottom&&center.y+radius<d.sweptTop,
        JSON.stringify({width,height,frame,star:i,low:center.y-radius,high:center.y+radius,bottom:d.sweptBottom,top:d.sweptTop}));
    }
    assert.ok(stars[0].getWorldPosition(new THREE.Vector3()).distanceTo(stars[1].getWorldPosition(new THREE.Vector3()))>
      d.outerBallRadius+d.innerBallRadius+0.1,'two stars must not intersect');
  }
  assert.ok(bounds.min.y>=-0.001);
  assert.ok(bounds.max.y<=height+0.03);
  assert.ok(bounds.max.x-bounds.min.x<=width+0.10,'star markings may add at most 10cm');
  assert.ok(d.sweptBottom>PLAYER.height+0.25,'ground walking clearance');
  const sample=(t:number,reduced=false)=>{handle.update(t,reduced);handle.group.updateMatrixWorld(true);return stars.map(s=>s.getWorldPosition(new THREE.Vector3()).toArray());};
  const start=sample(0),next=sample(1);
  for(let i=0;i<2;i++)assert.notDeepEqual(start[i],next[i],`star ${i} must move`);
  assert.deepEqual(sample(0,true),sample(500,true),'reduced motion must freeze both orbital systems');
  const before=sample(23);handle.update(999,false);assert.deepEqual(before,sample(23),'absolute-time animation must not depend on render frame count');
  const earthAxis=handle.group.getObjectByName('LM-01_EarthAxis')!;
  const fixedOrientation=earthAxis.quaternion.toArray();handle.update(600,false);
  assert.deepEqual(earthAxis.quaternion.toArray(),fixedOrientation,'light tracks retain stable silhouettes');
  const signals=handle.group.getObjectByName('LM-01_EarthFlowSignals') as THREE.InstancedMesh;
  const signalBefore=Array.from(signals.instanceMatrix.array);handle.update(601,false);
  assert.notDeepEqual(Array.from(signals.instanceMatrix.array),signalBefore,'flow lights move independently');
  records.push({width,height,measuredBounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},groundClearance:d.sweptBottom});
}

const d=orreryDimensions(landmark),colliders=createOrreryColliders(landmark);
assert.equal(colliders.length,10);assert.ok(worldColliders.some(c=>c.id==='LM-01:orbital-envelope'));
assert.ok(isSafeFeet(SPAWN.feet),'new spawn must be clear of every world collider');
const consolePortal=createOrreryPortal(landmark);
assert.ok(consolePortal?.enabled);assert.ok(isSafeFeet(consolePortal.interaction.returnFeet));
assert.equal(consolePortal.targetRoute,'/world/observatory');
assert.ok(Math.hypot(SPAWN.feet[0]-consolePortal.interaction.anchor[0],SPAWN.feet[2]-consolePortal.interaction.anchor[2])<consolePortal.interaction.enterRadius);
const saved=createSnapshot(consolePortal.interaction.returnFeet,consolePortal.interaction.returnYawRad,consolePortal.id);
assert.equal(saved.lastEnteredPortalId,consolePortal.id);
assert.deepEqual(saved.lastSafeFeet,consolePortal.interaction.returnFeet);
assert.ok(observatoryDestinations.some(entry=>entry.target&&observatoryHref(entry.target)==='/world/gallery'));
assert.equal(observatoryHref({kind:'url',href:'javascript:alert(1)'}),null);
assert.equal(observatoryHref({kind:'url',href:'/apps/example/'}),'/apps/example/');
function blocked(x:number,z:number,c:ColliderSpec){
  const bottom=c.kind==='cylinder'?c.center[1]-c.halfHeight:c.center[1]-c.size[1]/2;
  const top=c.kind==='cylinder'?c.center[1]+c.halfHeight:c.center[1]+c.size[1]/2;
  if(bottom>PLAYER.height||top<0)return false;
  if(c.kind==='cylinder')return Math.hypot(x-c.center[0],z-c.center[2])<c.radius+PLAYER.radius+0.04;
  const dx=x-c.center[0],dz=z-c.center[2],cs=Math.cos(c.yawRad),sn=Math.sin(c.yawRad);
  const lx=cs*dx-sn*dz,lz=sn*dx+cs*dz;
  return Math.hypot(Math.max(0,Math.abs(lx)-c.size[0]/2),Math.max(0,Math.abs(lz)-c.size[2]/2))<PLAYER.radius+0.04;
}
// Ground-level capsule-width clearance graph, including existing screen feet,
// exhibits and buildings. This does not replace a continuous physics walk test.
const step=0.25,nx=97,nz=81,minX=-12,minZ=-9;
const free=Array.from({length:nx*nz},(_,i)=>!worldColliders.some(c=>blocked(minX+(i%nx)*step,minZ+Math.floor(i/nx)*step,c)));
const key=(x:number,z:number)=>Math.round((z-minZ)/step)*nx+Math.round((x-minX)/step);
const queue=[key(SPAWN.feet[0],SPAWN.feet[2])],seen=new Set(queue);
assert.ok(free[queue[0]],'spawn must remain outside blockers');
for(let i=0;i<queue.length;i++){
  const at=queue[i],x=at%nx,z=Math.floor(at/nx);
  for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){
    const xx=x+dx,zz=z+dz,next=zz*nx+xx;
    if(xx<0||zz<0||xx>=nx||zz>=nz||!free[next]||seen.has(next))continue;
    seen.add(next);queue.push(next);
  }
}
const destinations=[[-4,0],[4,0],[0,-4],[-4,-4],[4,-4]];
destinations.forEach(([x,z])=>assert.ok(seen.has(key(x,z)),`plaza path unreachable: ${x},${z}`));
await RAPIER.init();
const physics=createPhysicsWorld(worldColliders,{min:-30,max:30});physics.step();
const identity={x:0,y:0,z:0,w:1},capsule=new RAPIER.Capsule(PLAYER.halfHeight,PLAYER.radius);
assert.equal(physics.castShape({x:-5,y:0.83,z:0},identity,{x:1,y:0,z:0},capsule,0,10,true),null,
  'open spawn court can be crossed east to west');
assert.equal(physics.castShape({x:0,y:0.83,z:1},identity,{x:0,y:0,z:1},capsule,0,5,true),null,'spawn exit is open');
assert.ok(physics.castShape({x:0,y:0.83,z:1},identity,{x:0,y:0,z:-1},capsule,0,5,true),'console body blocks capsule');
assert.ok(physics.castShape({x:0,y:1.7,z:0},identity,{x:0,y:1,z:0},new RAPIER.Ball(0.18),0,10,true),'overhead envelope blocks upward probes');
assert.ok(physics.castShape({x:9,y:d.centerY,z:0},identity,{x:-1,y:0,z:0},new RAPIER.Ball(0.28),0,8,true),'orbital envelope blocks camera');
physics.free();
const report={status:'passed',evidence:'geometry, deterministic motion, ground-clearance graph and Rapier shape casts; no browser/GPU claim',
  candidate:landmark,dimensions:d,rangeChecks:records,colliders,passages:{capsuleRadius:PLAYER.radius,gridStep:step,destinations,allReachable:true},
  screen:{spec:plazaScreen,occlusion:'expected from spawn; retained per latest user instruction, layout deferred'},
  physics:{openSpawn:true,walkAcrossCourt:true,consoleBlocksCapsule:true,overheadProtected:true,cameraVolumeBlocks:true},
  console:{route:consolePortal.targetRoute,returnFeet:consolePortal.interaction.returnFeet,spawnInInteractionRange:true},
  visual:{stablePlanes:true,flowLightsMove:true,bodySlots:['earth','moon']},
  limits:['orbital envelope is a conservative static cylinder, not exact moving-body physics','no actual screenshot, continuous walk, camera or GPU acceptance in this check']};
mkdirSync('docs/orrery-review',{recursive:true});writeFileSync('docs/orrery-review/logic-checks.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({status:report.status,candidate:landmark,clearance:d.sweptBottom,trialSizes:records.length,passages:report.passages},null,2));
