import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import * as THREE from 'three';
import {CityLook} from '../src/engine/core/cityLook';
import {CITY_LOOK} from '../src/worlds/cyberpunk/theme';

// Run actual pass orchestration with a renderer double. This does NOT compile GPU shaders.
let target:THREE.WebGLRenderTarget|null=null,clearAlpha=1;
const clearColor=new THREE.Color(),calls:object[]=[];
const ground=new THREE.MeshStandardMaterial({color:0x283442});
const light=new THREE.MeshStandardMaterial({emissive:0xffcc99,emissiveIntensity:1.5});light.userData.bloom=true;
const geometry=new THREE.BoxGeometry();
const floor=new THREE.Mesh(geometry,ground),window=new THREE.Mesh(geometry,light);
const scene=new THREE.Scene();scene.add(floor,window);scene.background=new THREE.Color(0x141829);scene.fog=new THREE.Fog(0x1b263c,20,200);
const camera=new THREE.PerspectiveCamera(52,16/9,0.1,300);camera.position.set(0,3,8);camera.lookAt(0,1,0);camera.updateMatrixWorld();
const renderer={
  getSize:(v:THREE.Vector2)=>v.set(960,600),getDrawingBufferSize:(v:THREE.Vector2)=>v.set(960,600),getPixelRatio:()=>1,
  getRenderTarget:()=>target,setRenderTarget:(t:THREE.WebGLRenderTarget|null)=>{target=t;},
  getClearColor:(v:THREE.Color)=>v.copy(clearColor),setClearColor:(v:THREE.ColorRepresentation,a=1)=>{clearColor.set(v);clearAlpha=a;},
  getClearAlpha:()=>clearAlpha,setClearAlpha:(a:number)=>{clearAlpha=a;},
  clear:()=>{},clearDepth:()=>{},getContext:()=>({}),autoClear:true,autoClearColor:true,autoClearDepth:true,autoClearStencil:true,
  xr:{enabled:false},shadowMap:{autoUpdate:true},state:{buffers:{depth:{setMask:()=>{}}}},
  outputColorSpace:THREE.SRGBColorSpace,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.1,
  info:{autoReset:true,reset:()=>{}},render:(object:THREE.Object3D)=>{
    if(object===scene){
      if(floor.material===ground)assert.notEqual(shader.uniforms.uCityReflection.value,target?.texture,'reflection feedback loop');
      calls.push({scene:true,masked:floor.material!==ground,windowRetained:window.material===light,target:!!target});
    }else calls.push({fullscreen:true});
  },
} as unknown as THREE.WebGLRenderer;
const look=new CityLook(renderer,scene,[ground],CITY_LOOK);
const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader} as Parameters<THREE.MeshStandardMaterial['onBeforeCompile']>[0];
ground.onBeforeCompile(shader,renderer);
assert.ok(shader.vertexShader.includes('vCityReflectionUv = uCityReflectionMatrix * cityWorld'));
assert.ok(shader.fragmentShader.includes('totalEmissiveRadiance += texture2D(uCityReflection'));
const originalBackground=scene.background,originalFog=scene.fog;
look.render(camera);
assert.equal(floor.material,ground);assert.equal(window.material,light);
assert.equal(scene.background,originalBackground);assert.equal(scene.fog,originalFog);
assert.equal(renderer.shadowMap.autoUpdate,true);assert.equal(target,null);
assert.ok(calls.some(c=>(c as {masked?:boolean}).masked));
assert.ok(calls.every(c=>!(c as {scene?:boolean}).scene||(c as {windowRetained:boolean}).windowRetained));
const highCalls=calls.length;calls.length=0;look.setQuality(false);look.render(camera);
assert.equal(calls.length,1);assert.equal((calls[0] as {target:boolean}).target,false);
const low=look.diagnostics();look.dispose();geometry.dispose();ground.dispose();light.dispose();
mkdirSync('docs/city-style-review',{recursive:true});
writeFileSync('docs/city-style-review/look-state-checks.json',JSON.stringify({status:'passed',evidence:'renderer double, not GPU rendering',
  highCalls,lowCalls:1,low,emissiveSelection:true,materialAndFogRestored:true,noReflectionTextureFeedback:true},null,2));
console.log('City look render-state checks passed; GPU compilation remains unverified.');
