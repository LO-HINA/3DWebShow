import * as THREE from 'three/webgpu';
import { pass, color, positionWorld, sin, mix, float, fract, step, reflector } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createZenithStudy } from './building';

const container = document.querySelector<HTMLElement>('#viewport')!;
const status = document.querySelector<HTMLElement>('#status')!;
const errorPanel = document.querySelector<HTMLElement>('#error')!;
const required = <T extends Element>(selector: string) => document.querySelector<T>(selector)!;

async function main(): Promise<void> {
  const renderer = new THREE.WebGPURenderer({ antialias: true,
    forceWebGL: new URLSearchParams(location.search).get('backend') === 'webgl' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;renderer.shadowMap.type = THREE.PCFShadowMap;
  container.appendChild(renderer.domElement);
  await renderer.init();
  const scene = new THREE.Scene();scene.background = new THREE.Color(0x111c2e);
  scene.fog = new THREE.FogExp2(0x111c2e, 0.00085);
  const camera = new THREE.PerspectiveCamera(48, container.clientWidth/container.clientHeight, 0.3, 1800);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;controls.dampingFactor = 0.09;controls.minDistance = 8;controls.maxDistance = 650;
  controls.maxPolarAngle = Math.PI * 0.495;controls.target.set(0,110,0);
  const model = createZenithStudy(23);scene.add(model.group);
  const hemisphere = new THREE.HemisphereLight(0xa1c4e7,0x24222b,1.2);scene.add(hemisphere);
  const moon = new THREE.DirectionalLight(0xa7c7e6,2.3);moon.position.set(-120,250,110);scene.add(moon);
  moon.target.position.set(0,85,0);scene.add(moon.target);moon.castShadow=true;
  moon.shadow.mapSize.set(1024,1024);moon.shadow.normalBias=0.08;
  Object.assign(moon.shadow.camera,{left:-120,right:120,top:180,bottom:-180,near:1,far:700});
  const warm = new THREE.DirectionalLight(0xe1a278,0.8);warm.position.set(100,45,-80);scene.add(warm);

  const reflection = reflector({ resolutionScale: 0.35, bounces: false });
  const groundMaterial = new THREE.MeshBasicNodeMaterial();
  const wetness = sin(positionWorld.x.mul(0.027)).mul(sin(positionWorld.z.mul(0.039))).mul(0.12).add(0.32);
  const joints = step(0.987, fract(positionWorld.x.mul(0.18))).max(step(0.987, fract(positionWorld.z.mul(0.18))));
  groundMaterial.colorNode = color('#0a1520').rgb.add(reflection.rgb.mul(wetness)).mul(mix(float(1),float(0.5),joints));
  const groundGeometry = new THREE.PlaneGeometry(900,900);
  const ground = new THREE.Mesh(groundGeometry,groundMaterial);ground.rotation.x = -Math.PI/2;ground.position.y=-0.04;
  ground.add(reflection.target);scene.add(ground);

  const pipeline = new THREE.RenderPipeline(renderer);
  const scenePass = pass(scene,camera), beauty = scenePass.getTextureNode('output');
  const glow = bloom(beauty,0.32,0.45,0.95);
  pipeline.outputNode = beauty.add(glow);
  let glowing = true, stage = 'night', ready = false;
  const cameraPresets: Record<string,{position:number[];target:number[]}> = {
    overall:{position:[190,130,270],target:[0,112,0]},
    front:{position:[0,118,330],target:[0,112,0]},
    street:{position:[34,5,66],target:[0,26,0]},
    back:{position:[-190,125,-270],target:[0,110,0]},
  };
  const setView = (view: string) => {
    const preset=cameraPresets[view];if(!preset)return;
    camera.position.fromArray(preset.position);controls.target.fromArray(preset.target);controls.update();
    document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===view)));
  };
  setView('overall');
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button=>button.onclick=()=>setView(button.dataset.view!));
  required<HTMLButtonElement>('#glow').onclick = event => {
    glowing=!glowing;(event.currentTarget as HTMLButtonElement).setAttribute('aria-pressed',String(glowing));
  };
  required<HTMLButtonElement>('#light').onclick = event => {
    stage=stage==='night'?'neutral':'night';
    hemisphere.intensity=stage==='night'?1.2:2.0;moon.intensity=stage==='night'?2.3:3;
    renderer.toneMappingExposure=stage==='night'?1.1:1.4;
    scene.background=new THREE.Color(stage==='night'?0x111c2e:0x59697a);
    (event.currentTarget as HTMLButtonElement).textContent=stage==='night'?'夜景 / 检查结构':'结构检查 / 返回夜景';
  };
  required<HTMLButtonElement>('#save').onclick = () => {
    if(glowing)pipeline.render();else renderer.render(scene,camera);
    const a=document.createElement('a');a.download='neon-zenith-building.png';a.href=renderer.domElement.toDataURL('image/png');a.click();
  };
  const resize = new ResizeObserver(()=>{
    const w=container.clientWidth,h=container.clientHeight;
    camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);
  });resize.observe(container);
  let elapsed=0,frames=0,last=performance.now();
  const backend=renderer.backend.constructor.name;
  let frameError=false;
  renderer.setAnimationLoop(()=>{
    if(frameError)return;
    try {
      controls.update();
      if(glowing)pipeline.render();else renderer.render(scene,camera);
      const now=performance.now();elapsed+=now-last;last=now;frames++;
      if(elapsed>800){
        status.textContent=`${backend} · ${Math.round(frames*1000/elapsed)} FPS · ${renderer.info.render.calls} draws · 高 ${model.totalHeight.toFixed(1)}m`;
        elapsed=0;frames=0;
      }
      if(!ready){ready=true;document.documentElement.dataset.ready='true';}
    } catch(error) {
      frameError=true;errorPanel.textContent=`渲染失败：${String(error)}。可以尝试页面中的 WebGL2 后端链接。`;
      console.error(error);
    }
  });
  (window as unknown as {__zenithStudy:unknown}).__zenithStudy={setView,ready:()=>ready,
    diagnostics:()=>({backend,height:model.totalHeight,tiers:model.tiers,glowing,camera:camera.position.toArray(),
      calls:renderer.info.render.calls,triangles:renderer.info.render.triangles})};
  addEventListener('pagehide',()=>{
    renderer.setAnimationLoop(null);resize.disconnect();controls.dispose();model.dispose();
    groundGeometry.dispose();groundMaterial.dispose();reflection.reflector.dispose();scenePass.dispose();glow.dispose();
    moon.shadow.map?.dispose();pipeline.dispose();renderer.dispose();
  },{once:true});
}

void main().catch(error=>{status.textContent='预览初始化失败';errorPanel.textContent=String(error);console.error(error);});
