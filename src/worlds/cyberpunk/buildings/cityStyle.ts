import * as THREE from 'three';
import type { BuildContext, BuiltBuilding } from './buildings';

interface Volume { x: number; y: number; z: number; w: number; h: number; d: number; front?: boolean }
interface Region { x: number; y: number; w: number; h: number }
export type FacadeProfile = 'vertical' | 'horizontal' | 'boxed';
export interface FacadeStats {
  volumes: number; rooms: number; litRooms: number; depth: number; instances: number;
  profile: FacadeProfile; serviceBays: number; hoods: number; fins: number; floorEdges: number;
}
const random = (a: number,b: number,c=0) => {const n=Math.sin(a*127.1+b*311.7+c*74.7)*43758.5453;return n-Math.floor(n);};

/** World-space-sized physical window cells. No window image or interior mapping shader. */
export function buildDeepFacades(group: THREE.Group, volumes: Volume[], seed: number,
  options: { far?: boolean; profile?: FacadeProfile; reserved?: Region[]; fade?: THREE.Material[]; occluders?: THREE.Mesh[] } = {}): FacadeStats {
  const profile=options.profile??'horizontal';
  const stats: FacadeStats = {volumes:volumes.length,rooms:0,litRooms:0,depth:options.far?1.1:1.35,instances:0,
    profile,serviceBays:0,hoods:0,fins:0,floorEdges:0};
  const shell = new THREE.MeshStandardMaterial({color:0x303c49,roughness:0.66,metalness:0.28,envMapIntensity:0.95});
  shell.name='City_WindowSpandrel';
  const frame = new THREE.MeshStandardMaterial({color:0x29343e,roughness:0.40,metalness:0.68,envMapIntensity:1.1});frame.name='City_WindowFrame';
  const interior = new THREE.MeshStandardMaterial({color:0x38414c,roughness:0.88,metalness:0});interior.name='City_RoomFloor';
  const dark = new THREE.MeshStandardMaterial({color:0x0b1420,roughness:0.83});dark.name='City_UnlitRoom';
  const furniture = new THREE.MeshStandardMaterial({color:0x31343b,roughness:0.74});furniture.name='City_RoomFurniture';
  // The room is softly lit; the small ceiling fixture supplies the bright accent.
  // A uniformly blooming back wall makes even genuine geometry read as a flat decal.
  const warm = new THREE.MeshStandardMaterial({color:0x665440,emissive:0xffce9c,emissiveIntensity:0.32,roughness:0.9});warm.name='City_WarmRoom';
  const cool = new THREE.MeshStandardMaterial({color:0x425463,emissive:0xb3deef,emissiveIntensity:0.28,roughness:0.85});cool.name='City_CoolRoom';
  const lamp = new THREE.MeshStandardMaterial({color:0xe7dec7,emissive:0xffdcad,emissiveIntensity:1.9});lamp.name='City_CeilingLamp';
  const glass = new THREE.MeshStandardMaterial({color:0x628995,roughness:0.17,metalness:0.13,transparent:true,
    opacity:0.09,depthWrite:false,envMapIntensity:1.25});glass.name='City_RecessedGlass';
  lamp.userData.bloom=true;
  const materials=[shell,frame,interior,dark,furniture,warm,cool,lamp,glass];
  const frameOcclusionNeeded=options.occluders?.length===0;
  const matrices=materials.map(()=>[] as THREE.Matrix4[]);
  const dummy=new THREE.Object3D();
  const put=(index:number,v:Volume,yaw:number,u:number,y:number,z:number,w:number,h:number,d:number,tilt=0)=>{
    dummy.position.set(v.x+u*Math.cos(yaw)+z*Math.sin(yaw),y,v.z-u*Math.sin(yaw)+z*Math.cos(yaw));
    dummy.rotation.set(tilt,yaw,0,'YXZ');dummy.scale.set(w,h,d);dummy.updateMatrix();matrices[index].push(dummy.matrix.clone());
  };
  volumes.forEach((v,volumeIndex)=>{
    const rows=Math.max(1,Math.round(v.h/(options.far?5.5:3.15)));
    const rowH=v.h/rows;
    for(let face=0;face<4;face++){
      if(face===0&&v.front===false)continue;
      const yaw=[0,Math.PI,Math.PI/2,-Math.PI/2][face];
      const width=face<2?v.w:v.d, distance=(face<2?v.d:v.w)/2;
      const bays=Math.max(1,Math.round(width/(options.far?3.8:2.15))),pitch=width/bays;
      for(let row=0;row<rows;row++)for(let col=0;col<bays;col++){
        const u=-width/2+(col+0.5)*pitch,cy=v.y-v.h/2+(row+0.5)*rowH;
        const windowH=Math.max(0.36,rowH-0.90),windowW=pitch-0.34;
        const reserved=face===0&&options.reserved?.some(r=>Math.abs(v.x+u-r.x)<(pitch+r.w)/2&&Math.abs(cy-r.y)<(rowH+r.h)/2);
        if(reserved){put(0,v,yaw,u,cy,distance-0.08,pitch,rowH,0.16);continue;}
        const zone=Math.floor(col/3),lit=random(row+seed,zone+face*13,volumeIndex)<0.48;
        const warmRoom=random(row,zone+seed,face)>0.43;
        const depth=Math.min(stats.depth,Math.min(v.w,v.d)/2-0.12);
        // Inset room, thick piers and a projecting slab edge are separate layers.
        // All exterior pieces stop within 5 cm of the existing envelope.
        put(0,v,yaw,u,cy-rowH/2+0.22,distance-0.23,pitch,0.44,0.50);
        put(0,v,yaw,u,cy+rowH/2-0.22,distance-0.23,pitch,0.44,0.50);
        put(1,v,yaw,u,cy-rowH/2+0.025,distance-0.10,pitch,0.05,0.30);
        stats.floorEdges++;
        for(const side of [-1,1]){
          put(0,v,yaw,u+side*(pitch/2-0.08),cy,distance-0.21,0.16,windowH+0.1,0.50);
          put(1,v,yaw,u+side*(windowW/2+0.02),cy,distance-0.32,0.07,windowH+0.10,0.24);
          put(2,v,yaw,u+side*(windowW/2+0.035),cy,distance-(depth+0.33)/2,0.07,windowH,depth-0.33);
        }
        for(const side of [-1,1]){
          put(1,v,yaw,u,cy+side*(windowH/2+0.025),distance-0.32,windowW+0.12,0.075,0.24);
          put(2,v,yaw,u,cy+side*(windowH/2-0.025),distance-(depth+0.33)/2,windowW,0.05,depth-0.33);
        }
        // Drainage lip and head flashing: thick enough to read while walking past.
        put(1,v,yaw,u,cy-windowH/2-0.035,distance-0.29,windowW+0.18,0.12,0.66);
        const hood=profile==='horizontal'||profile==='boxed'&&row%2===0;
        if(hood){
          put(0,v,yaw,u,cy+windowH/2+0.07,distance-0.29,pitch-0.07,0.17,0.66);
          // Two brackets sit behind the head, not as floating luminous stripes.
          if(!options.far)for(const side of [-1,1])put(1,v,yaw,u+side*windowW*0.32,cy+windowH/2-0.09,distance-0.31,0.07,0.24,0.30);
          stats.hoods++;
        }
        if(profile==='vertical'||profile==='boxed'&&col%3===0){
          put(1,v,yaw,u-pitch/2+0.07,cy,distance-0.29,0.14,rowH,0.68);
          stats.fins++;
        }
        // Occasional non-glazed service bays break the all-over office grid.
        // Louvres have real air gaps and tilted blades rather than a stripe map.
        const service=face!==0&&col%4===1&&(row+seed+face)%3===0;
        if(service){
          put(3,v,yaw,u,cy,distance-0.76,windowW,windowH,0.06);
          const count=options.far?6:9;
          for(let slat=0;slat<count;slat++)put(1,v,yaw,u,cy-windowH/2+(slat+0.5)*windowH/count,
            distance-0.40,windowW-0.06,0.055,0.34,-0.42);
          stats.serviceBays++;continue;
        }
        put(lit?(warmRoom?5:6):3,v,yaw,u,cy,distance-depth,windowW,windowH,0.045);
        put(8,v,yaw,u,cy,distance-0.46,windowW-0.04,windowH-0.04,0.025);
        put(1,v,yaw,u,cy,distance-0.43,0.055,windowH,0.10);
        if(lit){
          put(7,v,yaw,u,cy+windowH/2-0.06,distance-depth*0.58,windowW*0.54,0.025,depth*0.23);
          if(!options.far){
            put(4,v,yaw,u+windowW*0.06,cy-windowH*0.25,distance-depth*0.64,windowW*0.62,0.06,depth*0.40);
            put(4,v,yaw,u+windowW*0.06,cy-windowH*0.15,distance-depth*0.72,windowW*0.22,0.19,0.055);
            // A partition and a partially drawn curtain provide unequal silhouettes.
            if((row+col+face)%3===0){
              put(2,v,yaw,u+windowW*0.23,cy,distance-depth*0.76,0.07,windowH,depth*0.38);
              put(warmRoom?5:6,v,yaw,u-windowW*0.32,cy+windowH*0.04,distance-0.58,
                windowW*0.28,windowH*0.86,0.045);
            }
          }
          stats.litRooms++;
        }
        stats.rooms++;
      }
    }
  });
  const geometry=new THREE.BoxGeometry(1,1,1);
  matrices.forEach((list,index)=>{
    if(!list.length){materials[index].dispose();return;}
    const mesh=new THREE.InstancedMesh(geometry,materials[index],list.length);
    options.fade?.push(materials[index]);
    mesh.name=materials[index].name;list.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
    mesh.computeBoundingSphere();mesh.castShadow=index<5;mesh.receiveShadow=index<5;
    mesh.userData.noMerge=true;mesh.userData.deepFacade=true;group.add(mesh);
    if(frameOcclusionNeeded&&(index===0||index===1))options.occluders?.push(mesh);
    stats.instances+=list.length;
  });
  return stats;
}

/** Upgrade legacy envelopes while retaining the exact content/entrance nodes. */
export function applyCityStyle(building: BuiltBuilding, ctx: BuildContext): BuiltBuilding {
  const {group,spec}=building;
  const shared=new Set<THREE.Material>(Object.values(ctx.materials));
  const replacements=new Map<THREE.Material,THREE.Material>();
  group.traverse(object=>{
    if(!(object instanceof THREE.Mesh))return;
    if('isReflector' in object){object.visible=false;object.userData.noMerge=true;return;}
    const remap=(source:THREE.Material)=>{
      if(replacements.has(source))return replacements.get(source)!;
      if(!(source instanceof THREE.MeshStandardMaterial)||source.map)return source;
      const clone=source.clone();
      if(clone.emissive.getHex()===0||clone.emissiveIntensity<0.1){
        const name=source.name.toLowerCase();
        if(name.includes('glass')||name.includes('pane')){clone.color.setHex(0x183040);clone.roughness=0.23;clone.envMapIntensity=1.2;}
        else if(!name.includes('bronze')){clone.color.setHex(clone.metalness>0.5?0x273440:0x323e4d);clone.roughness=clone.metalness>0.5?0.42:0.68;clone.envMapIntensity=0.9;}
      }
      replacements.set(source,clone);return clone;
    };
    object.material=Array.isArray(object.material)?object.material.map(remap):remap(object.material);
  });
  building.fadeMaterials=building.fadeMaterials.map(m=>replacements.get(m)??m);
  const volumeMeshes=building.occluders.filter(mesh=>{
    mesh.geometry.computeBoundingBox();const s=mesh.geometry.boundingBox!.getSize(new THREE.Vector3()).multiply(mesh.scale);
    return s.x>2.1&&s.z>2.1&&s.y>1.15;
  });
  const volumes:Volume[]=volumeMeshes.map(mesh=>{
    const size=mesh.geometry.boundingBox!.getSize(new THREE.Vector3()).multiply(mesh.scale);
    const localCenter=mesh.geometry.boundingBox!.getCenter(new THREE.Vector3()).multiply(mesh.scale).add(mesh.position);
    return {x:localCenter.x,y:localCenter.y,z:localCenter.z,w:size.x,h:size.y,d:size.z};
  });
  const oldFlatWindows:THREE.Mesh[]=[];
  group.traverse(object=>{
    if(!(object instanceof THREE.Mesh)||object instanceof THREE.InstancedMesh||volumeMeshes.includes(object))return;
    const m=object.material;if(Array.isArray(m)||!(m instanceof THREE.MeshStandardMaterial)||m.map)return;
    object.geometry.computeBoundingBox();const s=object.geometry.boundingBox!.getSize(new THREE.Vector3());
    const frontDoor=object.position.y<3.5&&Math.abs(object.position.x-(spec.variant==='hero'?2:0))<1.8&&
      volumes.some(v=>Math.abs(object.position.z-(v.z+v.d/2))<0.3);
    const galleryDisplay=spec.variant==='gallery'&&object.position.y<3.7&&object.position.z>5.4;
    if(frontDoor||galleryDisplay)return;
    if(object.position.y>1&&((s.z<0.075&&s.x>0.45&&s.y>0.45)||(s.x<0.075&&s.z>0.45&&s.y>0.45)))
      if(volumes.some(v=>Math.abs(object.position.y-v.y)<v.h/2+0.1&&
        (Math.abs(Math.abs(object.position.z-v.z)-v.d/2)<0.19||Math.abs(Math.abs(object.position.x-v.x)-v.w/2)<0.19)))oldFlatWindows.push(object);
  });
  oldFlatWindows.forEach(mesh=>mesh.removeFromParent());
  const occlusionMaterial=new THREE.MeshBasicMaterial({color:0,colorWrite:false,depthWrite:false});
  volumeMeshes.forEach(mesh=>{
    // Keep the old envelope as a ray-only proxy. Thousands of frame instances
    // do not need to enter the character-occlusion ray tests each update.
    const proxy=new THREE.Mesh(mesh.geometry,occlusionMaterial);
    proxy.name=mesh.name+'_OcclusionProxy';proxy.position.copy(mesh.position);proxy.rotation.copy(mesh.rotation);proxy.scale.copy(mesh.scale);
    proxy.visible=false;proxy.userData.noMerge=true;group.add(proxy);
    const index=building.occluders.indexOf(mesh);if(index>=0)building.occluders[index]=proxy;
    const s=mesh.geometry.boundingBox!.getSize(new THREE.Vector3()).multiply(mesh.scale);
    // Keep the core behind the deeper room back walls, not inside the rooms.
    const geometry=mesh.geometry.clone();geometry.scale(Math.max(0.08,(s.x-3.0)/s.x),1,Math.max(0.08,(s.z-3.0)/s.z));
    mesh.geometry=geometry;mesh.name+= '_InsetCore';
  });
  if(!volumeMeshes.length)occlusionMaterial.dispose();
  if(!volumes.length&&spec.variant==='terminal'){
    building.occluders.forEach(mesh=>mesh.removeFromParent());building.occluders=[];
    volumes.push({x:0,y:2.3,z:0,w:spec.size[0]-0.6,h:3.4,d:spec.size[2]-0.6,front:false});
  }
  const reserved:Region[]=[{x:0,y:1.65,w:3.4,h:3.3}];
  if(spec.variant==='hero')reserved.push({x:2,y:1.6,w:2.3,h:3.2});
  for(const mesh of [...building.posterSlots.values(),...(building.mediaSlots?.values()??[])]){
    mesh.geometry.computeBoundingBox();const size=mesh.geometry.boundingBox!.getSize(new THREE.Vector3()).multiply(mesh.scale);
    reserved.push({x:mesh.position.x,y:mesh.position.y,w:size.x+0.25,h:size.y+0.25});
  }
  // The gallery's authored display windows and door keep their original facade band.
  if(spec.variant==='gallery')reserved.push({x:0,y:1.85,w:spec.size[0],h:3.7});
  const seed=[...spec.id].reduce((n,c)=>n+c.charCodeAt(0),0);
  const profile:FacadeProfile=spec.variant==='towerA'||spec.variant==='heroMedia'?'vertical':
    spec.variant==='gallery'||spec.variant==='learning'||spec.variant==='terminal'?'boxed':'horizontal';
  const stats=buildDeepFacades(group,volumes,seed,{profile,reserved,fade:building.fadeMaterials,occluders:building.occluders});
  building.fadeMeshes.push(...group.children.filter((o):o is THREE.InstancedMesh=>o instanceof THREE.InstancedMesh));
  group.userData.cityStyle={style:'zenith-physical-windows',revision:'layered-facade-2',...stats,oldFlatWindowsRemoved:oldFlatWindows.length};
  // Preserve existing crowns on media buildings; give the two older towers an open frame.
  if(spec.variant==='towerA'||spec.variant==='towerB'){
    const frame=new THREE.MeshStandardMaterial({color:0x2e3e49,roughness:0.42,metalness:0.65});
    const led=new THREE.MeshStandardMaterial({color:0x1a2932,emissive:spec.accent==='gold'?0xffbf7e:0x81d7e6,emissiveIntensity:1.7});
    led.userData.bloom=true;building.fadeMaterials.push(frame,led);
    const g=new THREE.BoxGeometry(1,1,1),w=spec.size[0]*0.62,d=spec.size[2]*0.61,h=1.9,top=spec.size[1];
    const add=(x:number,y:number,z:number,sx:number,sy:number,sz:number,m:THREE.Material)=>{
      const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;group.add(mesh);
    };
    for(const x of [-1,1])for(const z of [-1,1])add(x*w/2,top-h/2,z*d/2,0.13,h,0.13,frame);
    for(const s of [-1,1]){add(0,top-0.09,s*d/2,w,0.18,0.18,frame);add(s*w/2,top-0.09,0,0.18,0.18,d,frame);
      add(0,top-0.19,s*d/2,w-0.12,0.035,0.035,led);}
  }
  for(const [source]of replacements)if(!shared.has(source))source.dispose();
  return building;
}
