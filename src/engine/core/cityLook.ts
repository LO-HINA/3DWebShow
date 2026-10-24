import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export interface CityLookOptions {
  groundTint:number;plainGroundTint:number;groundRoughness:number;plainGroundRoughness:number;
  groundEnvironment:number;bloomStrength:number;bloomRadius:number;bloomThreshold:number;
  reflectionScale:number;reflectionMaxSize:number;wetMin:number;wetMax:number;
}

/** A single shared reflection, explicit emissive selection and one output conversion. */
export class CityLook {
  private readonly black = new THREE.Color(0);
  private readonly dummy = new THREE.DataTexture(new Uint8Array([0,0,0,255]),1,1);
  private readonly mirror = new Reflector(new THREE.PlaneGeometry(1,1),{textureWidth:512,textureHeight:320,clipBias:0.003,multisample:0});
  private readonly reflectionMatrix = new THREE.Matrix4();
  private readonly reflectionTexture:THREE.IUniform<THREE.Texture>;
  private readonly reflectionStrength = {value:0};
  private readonly strength = {value:1};
  private readonly bloomComposer:EffectComposer;
  private readonly finalComposer:EffectComposer;
  private readonly bloomRender:RenderPass;
  private readonly beautyRender:RenderPass;
  private readonly bloomPass:UnrealBloomPass;
  private readonly mixPass:ShaderPass;
  private readonly outputPass = new OutputPass();
  private readonly darkMaterials = new Map<THREE.Material,THREE.Material>();
  private readonly restoreHooks:Array<()=>void>=[];
  private readonly oldMirrors:Reflector[]=[];
  private high=true;
  private bloomEnabled=true;
  private reflectionEnabled=true;

  constructor(private renderer:THREE.WebGLRenderer,private scene:THREE.Scene,groundMaterials:THREE.MeshStandardMaterial[],
    private options:CityLookOptions){
    this.dummy.needsUpdate=true;this.reflectionTexture={value:this.dummy};
    this.mirror.rotation.x=-Math.PI/2;this.mirror.position.y=0.035;this.mirror.updateMatrixWorld(true);
    scene.traverse(object=>{if(object instanceof Reflector){object.visible=false;object.userData.noMerge=true;this.oldMirrors.push(object);}});
    for(const material of groundMaterials){
      material.roughness=material.map?options.groundRoughness:options.plainGroundRoughness;material.envMapIntensity=options.groundEnvironment;
      material.color.setHex(material.map?options.groundTint:options.plainGroundTint);
      const original=material.onBeforeCompile,cacheKey=material.customProgramCacheKey;
      material.onBeforeCompile=(shader,renderer)=>{
        original.call(material,shader,renderer);
        shader.uniforms.uCityReflection=this.reflectionTexture;
        shader.uniforms.uCityReflectionMatrix={value:this.reflectionMatrix};
        shader.uniforms.uCityReflectionStrength=this.reflectionStrength;
        shader.uniforms.uCityWetRange={value:new THREE.Vector2(options.wetMin,options.wetMax)};
        shader.vertexShader='uniform mat4 uCityReflectionMatrix; varying vec4 vCityReflectionUv; varying vec2 vCityWorldXZ;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
          vec4 cityWorld = modelMatrix * vec4(transformed, 1.0);
          vCityReflectionUv = uCityReflectionMatrix * cityWorld;
          vCityWorldXZ = cityWorld.xz;`);
        shader.fragmentShader='uniform sampler2D uCityReflection; uniform float uCityReflectionStrength; uniform vec2 uCityWetRange; varying vec4 vCityReflectionUv; varying vec2 vCityWorldXZ;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
          vec2 cityUV = vCityReflectionUv.xy / max(vCityReflectionUv.w, 0.0001);
          float cityBounds = step(0.0, cityUV.x) * step(cityUV.x,1.0) * step(0.0,cityUV.y) * step(cityUV.y,1.0) * step(0.0,vCityReflectionUv.w);
          float cityWet = mix(uCityWetRange.x,uCityWetRange.y, smoothstep(-0.4,0.65,sin(vCityWorldXZ.x*0.62)*sin(vCityWorldXZ.y*0.47)));
          float cityFresnel = pow(1.0-max(dot(normalize(vViewPosition),normal),0.0),2.0);
          totalEmissiveRadiance += texture2D(uCityReflection,cityUV).rgb * cityWet * (0.32+0.68*cityFresnel) * uCityReflectionStrength * cityBounds;`);
      };
      material.customProgramCacheKey=()=>cacheKey.call(material)+':city-reflection-v1';material.needsUpdate=true;
      this.restoreHooks.push(()=>{material.onBeforeCompile=original;material.customProgramCacheKey=cacheKey;});
    }
    const camera=new THREE.PerspectiveCamera();
    this.bloomComposer=new EffectComposer(renderer);this.bloomComposer.renderToScreen=false;
    this.bloomRender=new RenderPass(scene,camera);this.bloomComposer.addPass(this.bloomRender);
    this.bloomPass=new UnrealBloomPass(new THREE.Vector2(512,320),options.bloomStrength,options.bloomRadius,options.bloomThreshold);
    this.bloomComposer.addPass(this.bloomPass);
    this.finalComposer=new EffectComposer(renderer);this.beautyRender=new RenderPass(scene,camera);this.finalComposer.addPass(this.beautyRender);
    this.mixPass=new ShaderPass({
      uniforms:{tDiffuse:{value:null},bloomTexture:{value:null},strength:this.strength},
      vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:'uniform sampler2D tDiffuse;uniform sampler2D bloomTexture;uniform float strength;varying vec2 vUv;void main(){vec4 b=texture2D(tDiffuse,vUv);gl_FragColor=vec4(b.rgb+texture2D(bloomTexture,vUv).rgb*strength,b.a);}',
    });
    this.mixPass.uniforms.strength=this.strength;this.finalComposer.addPass(this.mixPass);this.finalComposer.addPass(this.outputPass);
    this.resize();
  }

  setQuality(high:boolean):void{this.high=high;this.resize();}
  setEffects(options:{bloom?:boolean;reflection?:boolean}):void{
    if(options.bloom!==undefined)this.bloomEnabled=options.bloom;
    if(options.reflection!==undefined)this.reflectionEnabled=options.reflection;
  }
  resize():void{
    if(!this.high){this.finalComposer.setSize(1,1);this.bloomComposer.setSize(1,1);this.mirror.getRenderTarget().setSize(1,1);return;}
    const size=this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.finalComposer.setPixelRatio(1);this.finalComposer.setSize(size.x,size.y);
    this.bloomComposer.setPixelRatio(1);this.bloomComposer.setSize(Math.max(1,Math.round(size.x*0.5)),Math.max(1,Math.round(size.y*0.5)));
    const scale=Math.min(this.options.reflectionScale,this.options.reflectionMaxSize/Math.max(size.x,size.y));
    this.mirror.getRenderTarget().setSize(Math.max(1,Math.round(size.x*scale)),Math.max(1,Math.round(size.y*scale)));
  }
  private bloomMaterial(source:THREE.Material):THREE.Material{
    const emitting=source.userData.bloom===true||
      (source instanceof THREE.MeshStandardMaterial&&source.emissive.getHex()!==0&&source.emissiveIntensity>0.85)||
      (source instanceof THREE.ShaderMaterial&&!!source.uniforms.uGold&&!!source.uniforms.uCyan);
    if(emitting)return source;
    let dark=this.darkMaterials.get(source);
    if(!dark){
      dark=source instanceof THREE.PointsMaterial?new THREE.PointsMaterial({color:0,size:source.size}):
        new THREE.MeshBasicMaterial({color:0,side:source.side,transparent:source.transparent,opacity:source.opacity,
          depthWrite:source.depthWrite,depthTest:source.depthTest,alphaTest:source.alphaTest});
      this.darkMaterials.set(source,dark);
    }
    const changed=dark.transparent!==source.transparent||dark.depthWrite!==source.depthWrite;
    dark.opacity=source.opacity;dark.transparent=source.transparent;dark.depthWrite=source.depthWrite;
    if(changed)dark.needsUpdate=true;
    return dark;
  }
  render(camera:THREE.Camera):void{
    this.scene.updateMatrixWorld();camera.updateMatrixWorld();
    this.renderer.info.autoReset=false;this.renderer.info.reset();
    const shadowUpdate=this.renderer.shadowMap.autoUpdate;
    if(this.high&&this.reflectionEnabled){
      this.reflectionTexture.value=this.dummy;this.reflectionStrength.value=0;
      this.renderer.shadowMap.autoUpdate=false;
      try{
        (this.mirror.onBeforeRender as (renderer:THREE.WebGLRenderer,scene:THREE.Scene,camera:THREE.Camera)=>void)
          .call(this.mirror,this.renderer,this.scene,camera);
        const m=this.mirror.material as THREE.ShaderMaterial;
        this.reflectionMatrix.copy(m.uniforms.textureMatrix.value as THREE.Matrix4).multiply(this.mirror.matrixWorld.clone().invert());
        this.reflectionTexture.value=this.mirror.getRenderTarget().texture;this.reflectionStrength.value=1;
      }finally{this.renderer.shadowMap.autoUpdate=shadowUpdate;}
    }else{this.reflectionTexture.value=this.dummy;this.reflectionStrength.value=0;}
    if(!this.high||!this.bloomEnabled){this.renderer.render(this.scene,camera);return;}
    const originals=new Map<THREE.Mesh|THREE.Points,THREE.Material|THREE.Material[]>();
    const hidden:THREE.Object3D[]=[];
    const background=this.scene.background,fog=this.scene.fog;
    this.scene.background=this.black;
    if(fog)this.scene.fog=fog instanceof THREE.Fog?new THREE.Fog(0,fog.near,fog.far):new THREE.FogExp2(0,fog.density);
    this.scene.traverse(object=>{
      if(object instanceof THREE.Sprite&&object.visible){hidden.push(object);object.visible=false;return;}
      if(!(object instanceof THREE.Mesh||object instanceof THREE.Points))return;
      originals.set(object,object.material);
      object.material=Array.isArray(object.material)?object.material.map(m=>this.bloomMaterial(m)):this.bloomMaterial(object.material);
    });
    this.renderer.shadowMap.autoUpdate=false;
    try{this.bloomRender.camera=camera;this.bloomComposer.render();}
    finally{
      originals.forEach((material,object)=>{object.material=material;});hidden.forEach(object=>{object.visible=true;});
      this.scene.background=background;this.scene.fog=fog;this.renderer.shadowMap.autoUpdate=shadowUpdate;
    }
    this.beautyRender.camera=camera;this.mixPass.uniforms.bloomTexture.value=this.bloomComposer.readBuffer.texture;
    this.finalComposer.render();
  }
  diagnostics():object{return {bloom:this.high&&this.bloomEnabled,reflection:this.high&&this.reflectionEnabled,
    reflectionSize:[this.mirror.getRenderTarget().width,this.mirror.getRenderTarget().height],backend:'WebGL2'};}
  dispose():void{
    this.restoreHooks.forEach(restore=>restore());this.dummy.dispose();this.mirror.geometry.dispose();this.mirror.dispose();
    this.oldMirrors.forEach(mirror=>mirror.dispose());this.darkMaterials.forEach(material=>material.dispose());
    this.bloomPass.dispose();this.mixPass.dispose();this.outputPass.dispose();this.bloomComposer.dispose();this.finalComposer.dispose();
  }
}
