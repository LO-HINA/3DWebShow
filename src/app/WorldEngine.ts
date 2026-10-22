import { PLAYER } from '../engine/player/settings';
import { QUALITY } from '../engine/core/quality';
import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  LAYOUT_VERSION,
  PALETTE,
  WORLD_BOUNDS,
  worldColliders,
  SPAWN,
  buildings,
  zones,
} from '../worlds/cyberpunk';
import type {
  CameraDebugSnapshot,
  ExhibitSpec,
  FocusInfo,
  PortalSpec,
  QualityLevel,
  WorldSettings,
} from '../engine/contracts/types';
import { createMaterials, type MaterialBundle } from '../worlds/cyberpunk';
import { mergeStaticGroup, mergeStaticScene } from '../engine/primitives/merge';
import { createBuildings } from '../worlds/cyberpunk';
import {
  createFrames,
  createGround,
  createLandmark,
  createPlazaScreen,
  plazaScreen,
  type PlazaScreenHandle,
  createMotes,
  createProps,
  createSky,
  createVoidCity,
  type LandmarkHandle,
  type VoidCityHandle,
} from '../worlds/cyberpunk';
import { enabledExhibits, portals } from '../worlds/cyberpunk';
import { cameraRelativeInput, createPhysicsWorld, PhysicsStepper, PlayerController, type MoveInput } from '../engine/player/controller';
import { createPlayerRig, type PlayerRig } from '../engine/player/avatar';
import { FollowCamera } from '../engine/camera/follow';
import { CameraCollision } from '../engine/camera/collision';
import { AvatarFade } from '../engine/camera/avatarFade';
import { loadSnapshot, saveSnapshot, isSafeFeet, clearSnapshot } from '../worlds/cyberpunk/session';
import { useWorldStore } from './worldStore';
import { worldBridge } from './commands';

export interface EngineCallbacks {
  onFocus: (focus: FocusInfo | null) => void;
  onLockedHint: (hint: string | null) => void;
  onZone: (zone: string) => void;
  onStats: (stats: { fps: number; drawCalls: number; triangles: number }) => void;
  onPortal: (portal: PortalSpec) => void;
  onCameraDebug: (debug: CameraDebugSnapshot) => void;
}

interface FadeState {
  materials: THREE.MeshStandardMaterial[];
  opacity: number;
  target: number;
}

interface RenderStats {
  frames: number;
  elapsed: number;
  lastFps: number;
  lastDrawCalls: number;
  lastTriangles: number;
}

const MOVE_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

const INTRO_ZONE = '中央广场';

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export class WorldEngine {
  private readonly container: HTMLElement;
  private readonly callbacks: EngineCallbacks;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly follow: FollowCamera;
  private readonly raycaster = new THREE.Raycaster();
  private readonly clock = new THREE.Clock();
  private readonly keys = new Set<string>();
  private readonly touch: MoveInput = { x: 0, z: 0 };
  private drag: { id: number; x: number; y: number } | null = null;
  // CAMERA INTEGRATION: camera agent owns these; controller / gait / player belong to movement agent.
  private readonly colliderLabels = new Map<number, string>();
  private readonly cameraCollision = new CameraCollision(
    (handle) => this.colliderLabels.get(handle) ?? `collider#${handle}`,
  );
  private avatarFade!: AvatarFade;
  private readonly settings: WorldSettings = {
    quality: 'high',
    reducedMotion: false,
  };

  private materialBundle!: MaterialBundle;
  private landmark!: LandmarkHandle;
  private plazaScreen?: PlazaScreenHandle;
  private sky!: THREE.Group;
  private voidCity!: VoidCityHandle;
  private rig!: PlayerRig;
  private player!: PlayerController;
  private physics!: RAPIER.World;
  private moonLight!: THREE.DirectionalLight;
  private readonly interactables: ExhibitSpec[] = [];
  private readonly lockedPortals: PortalSpec[] = [];
  private readonly fadeStates = new Map<string, FadeState>();
  private readonly occluderMeshes: THREE.Mesh[] = [];
  private readonly listenerController = new AbortController();

  private currentFocusId: string | null = null;
  private lockedHint: string | null = null;
  private currentZone = '';
  private lastFocusCheck = 0;
  private lastZoneCheck = 0;
  private lastOcclusionCheck = 0;
  private lastSnapshotSave = 0;
  private lastCameraDebugCheck = 0;
  private readonly physicsStepper = new PhysicsStepper();
  private touchSprint = false;
  private readonly stats: RenderStats = {
    frames: 0,
    elapsed: 0,
    lastFps: 0,
    lastDrawCalls: -1,
    lastTriangles: -1,
  };
  private started = false;
  private disposed = false;
  private storageUnsubscribe: (() => void) | null = null;
  private environmentRT: THREE.WebGLRenderTarget | null = null;
  private readonly scratchDir = new THREE.Vector3();
  private reviewCamera: THREE.PerspectiveCamera | null = null;
  private reviewInputScale = 1;

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALITY.high.dprCap));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.domElement.className = 'world-canvas';
    this.renderer.domElement.setAttribute('aria-label', 'LOHINA WORLD 三维街区');
    container.appendChild(this.renderer.domElement);

    this.follow = new FollowCamera(width / height);
    this.setupSettings();
  }

  private setupSettings(): void {
    const persisted = readSettings();
    this.settings.quality = persisted.quality;
    this.settings.reducedMotion = persisted.reducedMotion;
    useWorldStore.getState().hydrateSettings(persisted);
  }

  get hasRestoredSnapshot(): boolean {
    return loadSnapshot() !== null;
  }

  async init(onProgress: (progress: number) => void): Promise<void> {
    onProgress(6);
    this.scene.background = new THREE.Color(PALETTE.skyTop);
    this.scene.fog = new THREE.Fog(PALETTE.fogColor, 34, 112);

    this.setupCamera();

    onProgress(14);
    await nextFrame();
    this.materialBundle = createMaterials();
    this.setupEnvironment();

    onProgress(30);
    await nextFrame();
    const built = createBuildings(
      buildings,
      this.materialBundle.materials,
      QUALITY[this.settings.quality].anisotropy,
    );
    for (const building of built.buildings) {
      mergeStaticGroup(building.group, new Set(building.occluders));
      this.scene.add(building.group);
      for (const mesh of building.occluders) {
        mesh.userData.buildingId = building.spec.id;
        this.occluderMeshes.push(mesh);
      }
      this.fadeStates.set(building.spec.id, {
        materials: building.fadeMaterials,
        opacity: 1,
        target: 1,
      });
    }

    onProgress(50);
    await nextFrame();
    // 天空球与星空跟随玩家，离开中心很远时不会看到天空球外侧的空白。
    this.sky = createSky(this.materialBundle.materials);
    this.scene.add(this.sky);
    this.voidCity = createVoidCity();
    this.scene.add(this.voidCity.group);
    const ground = createGround(this.materialBundle.materials);
    mergeStaticGroup(ground);
    this.scene.add(ground);
    const props = createProps(this.materialBundle.materials);
    mergeStaticGroup(props);
    this.scene.add(props);
    this.scene.add(createMotes(this.materialBundle.materials));
    this.landmark = createLandmark(this.materialBundle.materials);
    this.scene.add(this.landmark.group);
    this.plazaScreen = createPlazaScreen(plazaScreen, QUALITY[this.settings.quality].anisotropy);
    this.scene.add(this.plazaScreen.group);
    const frames = createFrames(
      this.materialBundle.materials,
      QUALITY[this.settings.quality].anisotropy,
    );
    for (const group of frames.groups.values()) {
      mergeStaticGroup(group);
      this.scene.add(group);
    }

    onProgress(64);
    this.setupLights();
    this.setupInteractables();

    onProgress(74);
    await nextFrame();
    await RAPIER.init();
    this.physics = createPhysicsWorld(worldColliders, WORLD_BOUNDS);
    this.rig = createPlayerRig(this.materialBundle.materials);
    this.scene.add(this.rig.group);
    this.avatarFade = new AvatarFade(this.rig.group);

    // 场景级静态合并：跨建筑/道具复用材质，进一步压缩 draw call。
    // 雕塑旋转环、角色与建筑遮挡壳必须保留独立节点。
    const staticExclusions = new Set<THREE.Object3D>([
      this.landmark.group,
      this.plazaScreen.group,
      this.rig.group,
      this.sky,
      this.voidCity.group,
    ]);
    for (const mesh of this.occluderMeshes) staticExclusions.add(mesh);
    mergeStaticScene(this.scene, staticExclusions);

    const snapshot = loadSnapshot();
    const spawnFeet = snapshot?.player.feet ?? SPAWN.feet;
    const spawnYaw = snapshot?.player.yawRad ?? SPAWN.yawRad;
    const safeSpawn = isSafeFeet(spawnFeet) ? spawnFeet : SPAWN.feet;
    this.player = new PlayerController(this.physics, this.rig, safeSpawn, spawnYaw, WORLD_BOUNDS);
    this.buildColliderLabels();
    this.follow.reset(this.player.position, snapshot?.camera);
    this.syncCameraUI();

    onProgress(86);
    await nextFrame();
    this.bindEvents();
    this.applyQuality(this.settings.quality);

    onProgress(94);
    await nextFrame();
    await this.renderer.compileAsync(this.scene, this.follow.camera);

    onProgress(100);
    useWorldStore.getState().setLayoutVersion(LAYOUT_VERSION);
  }

  private setupCamera(): void {
    this.follow.reset(new THREE.Vector3(...SPAWN.feet));
  }

  cameraSnapshot() { return this.follow.snapshot(); }

  private syncCameraUI(): void {
    const state = this.follow.snapshot();
    useWorldStore.getState().setCamera(state.mode, state.framing);
  }

  /** 调试面板用的碰撞体名称映射；只读 Rapier 查询，不改动物理世界。 */
  private buildColliderLabels(): void {
    this.colliderLabels.clear();
    this.physics.forEachCollider((collider) => {
      if (collider.handle === this.player.colliderHandle.handle) {
        this.colliderLabels.set(collider.handle, 'Player');
        return;
      }
      const translation = collider.translation();
      let label = translation.y < -0.1 ? 'Ground' : `collider#${collider.handle}`;
      let best = 0.05;
      for (const spec of worldColliders) {
        const [x, y, z] = spec.center;
        const distance = Math.hypot(translation.x - x, translation.y - y, translation.z - z);
        if (distance < best) {
          best = distance;
          label = spec.id;
        }
      }
      this.colliderLabels.set(collider.handle, label);
    });
  }

  private clearInput(): void {
    this.keys.clear();
    this.player?.stop();
    this.touch.x = this.touch.z = 0;
    if (this.drag && this.renderer.domElement.hasPointerCapture(this.drag.id)) {
      this.renderer.domElement.releasePointerCapture(this.drag.id);
    }
    this.drag = null;
    this.physicsStepper.reset();
    this.touchSprint = false;
  }

  private setupEnvironment(): void {
    const skyTexture = this.materialBundle.materials.sky.map;
    if (!skyTexture) return;
    const source = skyTexture.clone();
    source.mapping = THREE.EquirectangularReflectionMapping;
    source.colorSpace = THREE.SRGBColorSpace;
    source.needsUpdate = true;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environmentRT = pmrem.fromEquirectangular(source);
    this.scene.environment = this.environmentRT.texture;
    this.scene.environmentIntensity = 0.9;
    source.dispose();
    pmrem.dispose();
  }

  private setupLights(): void {
    const hemisphere = new THREE.HemisphereLight(0x677fb5, 0x2a211d, 1.35);
    this.scene.add(hemisphere);

    const ambient = new THREE.AmbientLight(0x38446a, 0.72);
    this.scene.add(ambient);

    // 南侧暖色补光：让面向出生点的立面在暮色里仍然可读。
    const fill = new THREE.DirectionalLight(0xffd8b0, 0.42);
    fill.position.set(18, 20, 36);
    fill.target.position.set(0, 4, 0);
    this.scene.add(fill);
    this.scene.add(fill.target);

    const moon = new THREE.DirectionalLight(0xa9c2ff, 2.0);
    moon.position.set(-26, 38, -30);
    moon.target.position.set(0, 0, 0);
    moon.castShadow = true;
    moon.shadow.mapSize.set(QUALITY.high.shadowMapSize, QUALITY.high.shadowMapSize);
    moon.shadow.camera.left = -36;
    moon.shadow.camera.right = 36;
    moon.shadow.camera.top = 36;
    moon.shadow.camera.bottom = -36;
    moon.shadow.camera.near = 2;
    moon.shadow.camera.far = 96;
    moon.shadow.bias = -0.0004;
    moon.shadow.normalBias = 0.035;
    this.scene.add(moon);
    this.scene.add(moon.target);
    this.moonLight = moon;

    const plazaWarm = new THREE.PointLight(PALETTE.emissiveGold, 46, 24, 2);
    plazaWarm.position.set(0, 6.6, 0.5);
    this.scene.add(plazaWarm);

    const monumentCyan = new THREE.PointLight(PALETTE.emissiveCyan, 14, 13, 2);
    monumentCyan.position.set(0, 3.2, 0);
    this.scene.add(monumentCyan);

    const galleryWarm = new THREE.PointLight(0xffc483, 22, 12, 2);
    galleryWarm.position.set(-10.1, 4.8, 4);
    this.scene.add(galleryWarm);

    // 门洞局部补光：照亮门槛、侧壁与雨棚底面，避免入口成为一块死黑。
    const galleryDoor = new THREE.PointLight(0xffc07a, 5, 4.5, 2);
    galleryDoor.position.set(-12.25, 2.55, 4);
    this.scene.add(galleryDoor);

    // 背面服务门的小范围暖光，让绕行到背面的玩家也能读到门与标示。
    const galleryService = new THREE.PointLight(0xffb877, 3.5, 4.2, 2);
    galleryService.position.set(-25.05, 2.6, 6.1);
    this.scene.add(galleryService);

    const terminalCyan = new THREE.PointLight(0x63e9ff, 16, 10, 2);
    terminalCyan.position.set(13.2, 3.0, -5);
    this.scene.add(terminalCyan);

    const learningWarm = new THREE.PointLight(0xffd0a0, 12, 9, 2);
    learningWarm.position.set(-18.5, 3.0, -2.6);
    this.scene.add(learningWarm);
  }

  private setupInteractables(): void {
    for (const exhibit of enabledExhibits) this.interactables.push(exhibit);
    for (const portal of portals) {
      if (!portal.enabled) this.lockedPortals.push(portal);
    }
  }

  private bindEvents(): void {
    const signal = this.listenerController.signal;

    window.addEventListener(
      'keydown',
      (event) => {
        if (event.isComposing || (event.target instanceof HTMLElement && (/input|textarea|select/i.test(event.target.tagName) || event.target.isContentEditable))) {
          return;
        }
        if (event.code === 'Space' && useWorldStore.getState().mode === 'exploring') {
          event.preventDefault();
          if (!event.repeat && !this.follow.inspecting) this.player.requestJump();
          return;
        }
        if ((event.code === 'ShiftLeft' || event.code === 'ShiftRight') &&
            useWorldStore.getState().mode === 'exploring' && !this.follow.inspecting) {
          this.keys.add(event.code);
        }
        if (MOVE_KEYS.has(event.code)) {
          if (useWorldStore.getState().mode === 'exploring') {
            event.preventDefault();
            if (!this.follow.inspecting) this.keys.add(event.code);
          }
        }
      },
      { signal },
    );

    window.addEventListener(
      'keyup',
      (event) => {
        this.keys.delete(event.code);
      },
      { signal },
    );

    window.addEventListener('blur', () => this.clearInput(), { signal });
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', (event) => {
      if (useWorldStore.getState().mode !== 'exploring' || event.button !== 0) return;
      this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
      event.preventDefault();
    }, { signal });
    canvas.addEventListener('pointermove', (event) => {
      if (!this.drag || this.drag.id !== event.pointerId) return;
      this.follow.orbit(event.clientX - this.drag.x, event.clientY - this.drag.y);
      this.drag.x = event.clientX;
      this.drag.y = event.clientY;
    }, { signal });
    const release = (event: PointerEvent): void => {
      if (this.drag?.id !== event.pointerId) return;
      this.drag = null;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    canvas.addEventListener('pointerup', release, { signal });
    canvas.addEventListener('pointercancel', () => this.clearInput(), { signal });
    canvas.addEventListener('lostpointercapture', () => { this.drag = null; }, { signal });
    canvas.addEventListener('wheel', (event) => {
      if (useWorldStore.getState().mode !== 'exploring') return;
      event.preventDefault();
      const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1;
      this.follow.zoom(event.deltaY * scale);
    }, { signal, passive: false });

    const resizeObserver = new ResizeObserver(() => this.resize());
    resizeObserver.observe(this.container);
    signal.addEventListener('abort', () => resizeObserver.disconnect());

    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.visibilityState === 'hidden') this.saveNow();
        this.clearInput();
        this.clock.getDelta();
      },
      { signal },
    );

    const bridgeHandlers = {
      resetCamera: () => {
        this.follow.reset(this.rig.group.position);
        this.reviewCamera = null;
        this.syncCameraUI();
      },
      jump: () => {
        if (useWorldStore.getState().mode === 'exploring' && !this.follow.inspecting) this.player.requestJump();
      },
      setSprint: (enabled: boolean) => { this.touchSprint = enabled; },
      toggleLookUp: () => {
        this.clearInput();
        this.follow.toggleLookUp();
        this.syncCameraUI();
      },
      setFraming: (framing: import('../engine/contracts/types').FollowFraming) => {
        this.follow.setFraming(framing);
        this.syncCameraUI();
      },
      interact: () => this.interact(),
      resetToSpawn: () => {
        this.player.teleport(SPAWN.feet, SPAWN.yawRad);
        this.follow.reset(this.player.position);
        this.syncCameraUI();
        this.clearInput();
        clearSnapshot();
        useWorldStore.getState().showToast('已回到出生点');
      },
      setTouchMove: (x: number, z: number) => {
        this.touch.x = x;
        this.touch.z = z;
      },
    };
    worldBridge.register(bridgeHandlers);
    signal.addEventListener('abort', () => worldBridge.unregister(bridgeHandlers));

    this.storageUnsubscribe = useWorldStore.subscribe((state, previous) => {
      if (
        state.quality !== previous.quality ||
        state.reducedMotion !== previous.reducedMotion
      ) {
        this.settings.quality = state.quality;
        this.settings.reducedMotion = state.reducedMotion;
        writeSettings(state);
        if (state.quality !== previous.quality) {
          this.applyQuality(state.quality);
        }
      }
      if (state.mode !== previous.mode) this.clearInput();
    });
  }

  private applyQuality(quality: QualityLevel): void {
    const config = QUALITY[quality];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, config.dprCap));
    this.renderer.shadowMap.enabled = config.shadows;
    this.moonLight.castShadow = config.shadows;
    if (quality === 'low') {
      this.renderer.shadowMap.needsUpdate = true;
    }
    const size = config.shadowMapSize;
    if (this.moonLight.shadow.mapSize.x !== size) {
      this.moonLight.shadow.mapSize.set(size, size);
      this.moonLight.shadow.map?.dispose();
      this.moonLight.shadow.map = null;
    }
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) {
          if (material instanceof THREE.MeshStandardMaterial) material.needsUpdate = true;
        }
      }
    });
    this.resize();
  }

  private resize(): void {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height);
    this.follow.resize(width / height);
    if (this.reviewCamera) {
      this.reviewCamera.aspect = width / height;
      this.reviewCamera.updateProjectionMatrix();
    }
  }

  start(): void {
    if (this.started || this.disposed) return;
    this.started = true;
    if (import.meta.env.DEV) {
      (window as unknown as { __lohina?: unknown }).__lohina = {
        feet: () => [this.player.position.x, this.player.position.y, this.player.position.z],
        keys: () => [...this.keys],
        review: (view: 'side' | 'follow', analogScale = 1) => {
          this.clearInput();
          this.reviewInputScale = THREE.MathUtils.clamp(analogScale, 0.05, 1);
          this.reviewCamera = null;
          if (view === 'side') {
            const root = this.player.position;
            this.reviewCamera = new THREE.PerspectiveCamera(52, this.follow.camera.aspect, 0.1, 200);
            // 固定世界坐标，不追随角色或身体摆动；只供开发录屏复核。
            this.reviewCamera.position.copy(root).add(new THREE.Vector3(7.5, 2.0, 1.5));
            this.reviewCamera.lookAt(root.x - 1.2, root.y + 0.85, root.z - 0.8);
          }
        },
        diagnostics: () => ({ player: this.player.diagnostics(), gait: this.rig.diagnostics?.(), camera: this.follow.diagnostics(this.rig.group.position),
          cameraCollision: this.cameraCollision.diagnostics(), avatarFade: this.avatarFade.diagnostics(),
          plazaScreen: { imageStatus: this.plazaScreen?.group.userData.imageStatus },
          review: { view: this.reviewCamera ? 'side' : 'follow', inputScale: this.reviewInputScale,
            position: this.reviewCamera?.position.toArray() },
          occluded: [...this.fadeStates].filter(([, state]) => state.opacity < 0.99).map(([id]) => id),
          fps: this.stats.lastFps }),
        teleport: (x: number, z: number, yaw: number) => {
          this.player.teleport([x, 0, z], yaw);
          this.follow.reset(this.player.position);
          this.syncCameraUI();
          this.clearInput();
        },
        look: (yaw: number, pitch: number, distance = 8.5) => {
          this.follow.snapTo(yaw, pitch, distance, this.player.position);
        },
        interact: () => this.interact(),
        sceneStats: () => {
          const buckets = new Map<string, { meshes: number; transparent: boolean }>();
          let meshes = 0;
          const casters = new Map<string, number>();
          const transparentDetails: string[] = [];
          this.scene.traverseVisible((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            meshes += 1;
            const material = Array.isArray(object.material) ? object.material[0] : object.material;
            if (object.castShadow) {
              const key = `${object.name || '(unnamed)'} [${material?.name || material?.type || 'none'}]`;
              casters.set(key, (casters.get(key) ?? 0) + 1);
            }
            if (material?.transparent) {
              transparentDetails.push(
                `${object.name || '(unnamed)'} | parent=${object.parent?.name || '(none)'} | ${object.geometry.type} | opacity=${material.opacity} | depthWrite=${material.depthWrite} | map=${Boolean(material.map)}`,
              );
            }
            const key = `${material?.type ?? 'none'}:${material?.name || 'unnamed'}`;
            const entry = buckets.get(key) ?? { meshes: 0, transparent: Boolean(material?.transparent) };
            entry.meshes += 1;
            buckets.set(key, entry);
          });
          return {
            calls: this.renderer.info.render.calls,
            triangles: this.renderer.info.render.triangles,
            meshes,
            casters: [...casters.entries()].map(([key, value]) => `${key} ×${value}`),
            transparentDetails,
            materials: [...buckets.entries()]
              .sort((a, b) => b[1].meshes - a[1].meshes)
              .map(([key, value]) => `${key} ×${value.meshes}${value.transparent ? ' [T]' : ''}`),
          };
        },
      };
    }
    this.clock.start();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  private frame(): void {
    if (this.disposed) return;
    const rawDelta = this.clock.getDelta();
    const delta = Math.min(PLAYER.maxSimulationDelta, Math.max(0, rawDelta));
    this.update(delta);
    this.renderer.render(this.scene, this.reviewCamera ?? this.follow.camera);
    this.measure(rawDelta);
  }

  private update(delta: number): void {
    const store = useWorldStore.getState();
    const mode = store.mode;
    const canMove = mode === 'exploring' && !this.follow.inspecting;

    const input = this.readInput(canMove);
    const alpha = this.physicsStepper.advance(delta, () => {
      this.player.update(PLAYER.physicsStep, input, this.settings.reducedMotion);
      this.physics.step();
    });
    this.player.render(alpha, delta, this.settings.reducedMotion);
    this.follow.update(delta, this.rig.group.position, this.settings);
    this.sky.position.set(this.rig.group.position.x, 0, this.rig.group.position.z);
    this.voidCity.update(this.rig.group.position);
    // CAMERA INTEGRATION: independent volume collision and avatar-only fading.
    this.cameraCollision.update(this.physics, this.follow, this.player.colliderHandle, delta, this.settings.reducedMotion);
    this.avatarFade.update(delta, this.reviewCamera ?? this.follow.camera, this.rig.group.position);

    this.landmark.update(performance.now() / 1000, this.settings.reducedMotion);

    this.lastFocusCheck += delta;
    if (this.lastFocusCheck > 0.1) {
      this.lastFocusCheck = 0;
      if (canMove) this.evaluateFocus();
      else if (!this.currentFocusId) this.callbacks.onFocus(null);
    }

    this.lastZoneCheck += delta;
    if (this.lastZoneCheck > 0.25) {
      this.lastZoneCheck = 0;
      this.evaluateZone();
    }

    this.lastOcclusionCheck += delta;
    if (this.lastOcclusionCheck > 0.085) {
      this.lastOcclusionCheck = 0;
      this.updateOcclusion();
    }
    this.updateFades(delta);

    this.lastSnapshotSave += delta;
    if (this.lastSnapshotSave > 2 && mode === 'exploring') {
      this.lastSnapshotSave = 0;
      this.persistSnapshot();
    }

    this.lastCameraDebugCheck += delta;
    if (this.lastCameraDebugCheck > 0.1) {
      this.lastCameraDebugCheck = 0;
      if (store.cameraDebugVisible) this.callbacks.onCameraDebug(this.cameraDebugSnapshot());
    }
  }

  private cameraDebugSnapshot(): CameraDebugSnapshot {
    const camera = this.follow.diagnostics(this.rig.group.position) as {
      mode: 'follow' | 'lookUp';
      targetPitchUpDeg: number;
      actualPitchUpDeg: number;
      viewPitchUpDeg: number;
      yawDeg: number;
      cameraHeight: number;
      desiredDistance: number;
      targetDistance: number;
      boomLength: number;
      desiredLength: number;
      groundHeight: number;
      sweepRadius: number;
    };
    const collision = this.cameraCollision.diagnostics() as {
      primaryObject: string;
      primaryHit: number | null;
      primaryRawHit: number | null;
      primaryStartOverlap: boolean;
      probeUsed: boolean;
      temporalHit: number | null;
    };
    const fade = this.avatarFade.diagnostics() as {
      targetOpacity: number;
      opacity: number;
      materialOpacity: number;
      reason: string;
      nearDistance: number;
      centerDistance: number;
      screenHeight: number;
      upLookFactor: number;
    };
    return {
      runtime: 'follow.ts > collision.ts > avatarFade.ts',
      mode: camera.mode,
      targetPitchUpDeg: camera.targetPitchUpDeg,
      actualPitchUpDeg: camera.actualPitchUpDeg,
      viewPitchUpDeg: camera.viewPitchUpDeg,
      yawDeg: camera.yawDeg,
      cameraHeight: camera.cameraHeight,
      desiredDistance: camera.desiredDistance,
      targetDistance: camera.targetDistance,
      boomLength: camera.boomLength,
      desiredLength: camera.desiredLength,
      groundHeight: camera.groundHeight,
      collisionObject: collision.primaryObject,
      collisionHitDistance: collision.primaryHit,
      collisionRawHitDistance: collision.primaryRawHit,
      collisionStartOverlap: collision.primaryStartOverlap,
      collisionProbeUsed: collision.probeUsed,
      temporalHitDistance: collision.temporalHit,
      sweepRadius: camera.sweepRadius,
      avatarTargetOpacity: fade.targetOpacity,
      avatarOpacity: fade.opacity,
      avatarMaterialOpacity: fade.materialOpacity,
      avatarTrigger: fade.reason,
      avatarNearDistance: fade.nearDistance,
      avatarCenterDistance: fade.centerDistance,
      avatarScreenHeight: fade.screenHeight,
      avatarUpLookFactor: fade.upLookFactor,
      fps: this.stats.lastFps,
    };
  }

  private readInput(active: boolean): MoveInput {
    if (!active) return { x: 0, z: 0 };
    let x = 0;
    let z = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;
    x += this.touch.x;
    z += this.touch.z;
    return { ...cameraRelativeInput(x * this.reviewInputScale, z * this.reviewInputScale, this.follow.movementYaw),
      sprint: this.touchSprint || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') };
  }

  private evaluateFocus(): void {
    const feet = this.player.position;
    let current: ExhibitSpec | null = null;
    for (const exhibit of this.interactables) {
      if (exhibit.id === this.currentFocusId) {
        current = exhibit;
        break;
      }
    }

    let chosen: ExhibitSpec | null = null;
    if (current && this.isWithin(current, current.interaction.exitRadius, true)) {
      chosen = current;
    } else {
      let bestScore = Number.NEGATIVE_INFINITY;
      for (const exhibit of this.interactables) {
        if (!this.isWithin(exhibit, exhibit.interaction.enterRadius, true)) continue;
        const distance = Math.hypot(
          feet.x - exhibit.interaction.anchor[0],
          feet.z - exhibit.interaction.anchor[2],
        );
        const score = exhibit.interaction.priority * 100 - distance;
        if (score > bestScore) {
          bestScore = score;
          chosen = exhibit;
        }
      }
    }

    const nextId = chosen?.id ?? null;
    if (nextId !== this.currentFocusId) {
      this.currentFocusId = nextId;
      if (chosen) {
        this.callbacks.onFocus({
          exhibitId: chosen.id,
          title: chosen.title,
          verb: chosen.kind === 'image' ? '打开灯箱' : '进入',
          action: chosen.kind === 'image' ? 'lightbox' : 'portal',
        });
      } else {
        this.callbacks.onFocus(null);
      }
    }

    let hint: string | null = null;
    for (const portal of this.lockedPortals) {
      if (this.isWithin(portal, portal.interaction.enterRadius, true)) {
        hint = `${portal.id} · ${portal.title} · 下一轮开放`;
        break;
      }
    }
    if (hint !== this.lockedHint) {
      this.lockedHint = hint;
      this.callbacks.onLockedHint(hint);
    }
  }

  private isWithin(exhibit: ExhibitSpec, radius: number, requireFacing: boolean): boolean {
    const feet = this.player.position;
    const anchor = exhibit.interaction.anchor;
    if (Math.abs(feet.y - anchor[1]) > exhibit.interaction.maxHeightDelta) return false;
    const dx = feet.x - anchor[0];
    const dz = feet.z - anchor[2];
    if (Math.hypot(dx, dz) > radius) return false;
    if (requireFacing && exhibit.interaction.facingNormal) {
      const normal = exhibit.interaction.facingNormal;
      const normalLength = Math.hypot(normal[0], normal[2]) || 1;
      const dot = (dx * normal[0] + dz * normal[2]) / normalLength;
      if (dot < -0.05) return false;
    }
    return true;
  }

  private evaluateZone(): void {
    const feet = this.player.position;
    const inVoid = Math.max(Math.abs(feet.x), Math.abs(feet.z)) > 34;
    let label = inVoid ? '无垠街区' : '探索环路';
    let best = Number.POSITIVE_INFINITY;
    for (const zone of zones) {
      const distance = Math.hypot(feet.x - zone.center[0], feet.z - zone.center[1]);
      if (distance <= zone.radius && distance < best) {
        best = distance;
        label = zone.label;
      }
    }
    if (useWorldStore.getState().mode === 'intro') label = INTRO_ZONE;
    if (label !== this.currentZone) {
      this.currentZone = label;
      this.callbacks.onZone(label);
    }
  }

  private updateOcclusion(): void {
    if (this.occluderMeshes.length === 0) return;
    const hitIds = new Set<string>();
    for (const height of [0.9, 1.5]) {
      const direction = this.scratchDir.copy(this.rig.group.position);
      direction.y += height;
      direction.sub(this.follow.camera.position);
      const distance = direction.length();
      if (distance < 0.1) continue;
      direction.multiplyScalar(1 / distance);
      this.raycaster.set(this.follow.camera.position, direction);
      this.raycaster.far = Math.max(0, distance - 0.1);
      const hits = this.raycaster.intersectObjects(this.occluderMeshes, false);
      for (const hit of hits) hitIds.add(hit.object.userData.buildingId as string);
    }
    for (const [id, state] of this.fadeStates) {
      state.target = hitIds.has(id) ? 0.22 : 1;
    }
  }

  private updateFades(delta: number): void {
    for (const state of this.fadeStates.values()) {
      if (Math.abs(state.opacity - state.target) < 0.005) continue;
      state.opacity = THREE.MathUtils.damp(state.opacity, state.target, 7, delta);
      for (const material of state.materials) {
        const shouldBeTransparent = state.opacity < 0.985;
        if (material.transparent !== shouldBeTransparent) {
          material.transparent = shouldBeTransparent;
          material.depthWrite = !shouldBeTransparent;
          material.needsUpdate = true;
        }
        material.opacity = state.opacity;
      }
    }
  }

  private measure(delta: number): void {
    this.stats.frames += 1;
    this.stats.elapsed += delta;
    if (this.stats.elapsed >= 0.5) {
      const fps = Math.round(this.stats.frames / this.stats.elapsed);
      this.stats.frames = 0;
      this.stats.elapsed = 0;
      const drawCalls = this.renderer.info.render.calls;
      const triangles = this.renderer.info.render.triangles;
      if (
        fps !== this.stats.lastFps ||
        drawCalls !== this.stats.lastDrawCalls ||
        triangles !== this.stats.lastTriangles
      ) {
        this.stats.lastFps = fps;
        this.stats.lastDrawCalls = drawCalls;
        this.stats.lastTriangles = triangles;
        this.callbacks.onStats({ fps, drawCalls, triangles });
      }
    }
  }

  interact(): void {
    const store = useWorldStore.getState();
    if (store.mode !== 'exploring' || this.follow.inspecting) return;
    const exhibit = this.interactables.find((item) => item.id === this.currentFocusId);
    if (!exhibit) return;
    if (exhibit.kind === 'image') {
      store.openLightbox(exhibit.id);
    } else {
      this.callbacks.onPortal(exhibit);
    }
  }

  private persistSnapshot(): void {
    const feet = this.player?.position;
    if (!feet) return;
    saveSnapshot([feet.x, 0, feet.z], this.player.yawRad, undefined, this.follow.snapshot());
  }

  saveNow(): void {
    if (!this.player) return;
    const feet = this.player.position;
    saveSnapshot([feet.x, 0, feet.z], this.player.yawRad, undefined, this.follow.snapshot());
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.listenerController.abort();
    this.storageUnsubscribe?.();
    this.storageUnsubscribe = null;
    this.avatarFade?.dispose();
    this.plazaScreen?.dispose();
    this.player?.dispose();
    this.physics?.free();
    this.rig?.dispose();

    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    const textures = new Set<THREE.Texture>();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
        geometries.add(object.geometry);
        const list = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of list) materials.add(material);
      }
    });
    for (const texture of this.materialBundle?.textures ?? []) textures.add(texture);
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) textures.add(value);
      }
      material.dispose();
    }
    for (const geometry of geometries) geometry.dispose();
    for (const texture of textures) texture.dispose();
    this.environmentRT?.dispose();
    this.environmentRT = null;
    this.scene.environment = null;
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

interface PersistedSettings {
  quality: QualityLevel;
  reducedMotion: boolean;
}

const SETTINGS_KEY = 'lohina-world:settings:v1';

function readSettings(): PersistedSettings {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedSettings>;
      return {
        quality: parsed.quality === 'low' ? 'low' : 'high',
        reducedMotion: parsed.reducedMotion ?? prefersReduced,
      };
    }
  } catch {
    // 忽略读取失败，使用系统偏好。
  }
  return { quality: 'high', reducedMotion: prefersReduced };
}

export function writeSettings(settings: PersistedSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // 忽略写入失败。
  }
}
