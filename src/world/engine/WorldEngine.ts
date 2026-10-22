import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  CAMERA,
  LAYOUT_VERSION,
  PALETTE,
  PLAYER,
  QUALITY,
  SPAWN,
  buildings,
  zones,
} from '../config/world';
import type {
  ExhibitSpec,
  FocusInfo,
  PortalSpec,
  QualityLevel,
  WorldSettings,
} from '../config/types';
import { createMaterials, type MaterialBundle } from '../procedural/materials';
import { mergeStaticGroup, mergeStaticScene } from '../procedural/merge';
import { createBuildings } from '../procedural/buildings';
import {
  createDistantSkyline,
  createFrames,
  createGround,
  createLandmark,
  createMotes,
  createProps,
  createSky,
  type LandmarkHandle,
} from '../procedural/street';
import { enabledExhibits, portals } from '../config/world';
import { createPhysicsWorld, PlayerController, type MoveInput } from './controller';
import { createPlayerRig, type PlayerRig } from './player';
import { FollowCamera } from './camera';
import { loadSnapshot, saveSnapshot, isSafeFeet, clearSnapshot } from '../snapshot';
import { useWorldStore } from '../../state/worldStore';
import { worldBridge } from '../bridge';

export interface EngineCallbacks {
  onFocus: (focus: FocusInfo | null) => void;
  onLockedHint: (hint: string | null) => void;
  onZone: (zone: string) => void;
  onStats: (stats: { fps: number; drawCalls: number; triangles: number }) => void;
  onPortal: (portal: PortalSpec) => void;
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
  private readonly pointerParallax = { x: 0, y: 0 };
  private readonly settings: WorldSettings = {
    quality: 'high',
    parallax: true,
    reducedMotion: false,
  };

  private materialBundle!: MaterialBundle;
  private landmark!: LandmarkHandle;
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
  private lastSnapshotPosition = new THREE.Vector3(Number.POSITIVE_INFINITY, 0, 0);
  private accumulator = 0;
  private occlusionBuildingId: string | null = null;
  private readonly stats: RenderStats = { frames: 0, elapsed: 0, lastFps: 0 };
  private started = false;
  private disposed = false;
  private storageUnsubscribe: (() => void) | null = null;
  private touchActive = false;
  private environmentRT: THREE.WebGLRenderTarget | null = null;
  private readonly scratchDir = new THREE.Vector3();
  private readonly scratchLook = new THREE.Vector3();

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
    this.settings.parallax = persisted.parallax;
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
    this.scene.add(createSky(this.materialBundle.materials));
    this.scene.add(createDistantSkyline(this.materialBundle.materials));
    const ground = createGround(this.materialBundle.materials);
    mergeStaticGroup(ground);
    this.scene.add(ground);
    const props = createProps(this.materialBundle.materials);
    mergeStaticGroup(props);
    this.scene.add(props);
    this.scene.add(createMotes(this.materialBundle.materials));
    this.landmark = createLandmark(this.materialBundle.materials);
    this.scene.add(this.landmark.group);
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
    this.physics = createPhysicsWorld();
    this.rig = createPlayerRig(this.materialBundle.materials);
    this.scene.add(this.rig.group);

    // 场景级静态合并：跨建筑/道具复用材质，进一步压缩 draw call。
    // 雕塑旋转环、角色与建筑遮挡壳必须保留独立节点。
    const staticExclusions = new Set<THREE.Object3D>([this.landmark.group, this.rig.group]);
    for (const mesh of this.occluderMeshes) staticExclusions.add(mesh);
    mergeStaticScene(this.scene, staticExclusions);

    const snapshot = loadSnapshot();
    const spawnFeet = snapshot?.player.feet ?? SPAWN.feet;
    const spawnYaw = snapshot?.player.yawRad ?? SPAWN.yawRad;
    const safeSpawn = isSafeFeet(spawnFeet) ? spawnFeet : SPAWN.feet;
    this.player = new PlayerController(this.physics, this.rig, safeSpawn, spawnYaw);
    this.follow.reset(this.player.position);

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
    this.follow.camera.position.set(SPAWN.feet[0], CAMERA.offset[1] + 1.1, SPAWN.feet[2] + CAMERA.offset[2]);
    this.follow.camera.lookAt(SPAWN.feet[0], 1.05, SPAWN.feet[2]);
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

    const galleryWarm = new THREE.PointLight(0xffc483, 20, 11, 2);
    galleryWarm.position.set(-12.8, 3.4, 4);
    this.scene.add(galleryWarm);

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
        if (event.target instanceof HTMLElement && /input|textarea|select/i.test(event.target.tagName)) {
          return;
        }
        if (MOVE_KEYS.has(event.code)) {
          if (useWorldStore.getState().mode === 'exploring') {
            event.preventDefault();
            this.keys.add(event.code);
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

    window.addEventListener(
      'blur',
      () => {
        this.keys.clear();
        this.touch.x = 0;
        this.touch.z = 0;
      },
      { signal },
    );

    const canvas = this.renderer.domElement;
    canvas.addEventListener(
      'pointermove',
      (event) => {
        if (event.pointerType !== 'mouse') return;
        const rect = canvas.getBoundingClientRect();
        this.pointerParallax.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        this.pointerParallax.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      },
      { signal },
    );
    canvas.addEventListener(
      'pointerleave',
      () => {
        this.pointerParallax.x = 0;
        this.pointerParallax.y = 0;
      },
      { signal },
    );

    const resizeObserver = new ResizeObserver(() => this.resize());
    resizeObserver.observe(this.container);
    signal.addEventListener('abort', () => resizeObserver.disconnect());

    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.visibilityState === 'hidden') this.persistSnapshot();
      },
      { signal },
    );

    const bridgeHandlers = {
      interact: () => this.interact(),
      resetToSpawn: () => {
        this.player.teleport(SPAWN.feet, SPAWN.yawRad);
        this.follow.reset(this.player.position);
        clearSnapshot();
        useWorldStore.getState().showToast('已回到出生点');
      },
      setTouchMove: (x: number, z: number) => {
        this.touch.x = x;
        this.touch.z = z;
        this.touchActive = Math.hypot(x, z) > 0.02;
      },
    };
    worldBridge.register(bridgeHandlers);
    signal.addEventListener('abort', () => worldBridge.unregister(bridgeHandlers));

    this.storageUnsubscribe = useWorldStore.subscribe((state, previous) => {
      if (
        state.quality !== previous.quality ||
        state.parallax !== previous.parallax ||
        state.reducedMotion !== previous.reducedMotion
      ) {
        this.settings.quality = state.quality;
        this.settings.parallax = state.parallax;
        this.settings.reducedMotion = state.reducedMotion;
        writeSettings(state);
        if (state.quality !== previous.quality) {
          this.applyQuality(state.quality);
        }
      }
      if (state.mode !== previous.mode) this.keys.clear();
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
  }

  start(): void {
    if (this.started || this.disposed) return;
    this.started = true;
    if (import.meta.env.DEV) {
      (window as unknown as { __lohina?: unknown }).__lohina = {
        feet: () => [this.player.position.x, this.player.position.y, this.player.position.z],
        keys: () => [...this.keys],
        teleport: (x: number, z: number, yaw: number) => {
          this.player.teleport([x, 0, z], yaw);
          this.follow.reset(this.player.position);
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
    const delta = Math.min(PLAYER.maxFrameDelta, Math.max(0.0005, rawDelta));
    this.update(delta);
    this.renderer.render(this.scene, this.follow.camera);
    this.measure(rawDelta);
  }

  private update(delta: number): void {
    const store = useWorldStore.getState();
    const mode = store.mode;
    const intro = mode === 'intro' || mode === 'loading';
    const canMove = mode === 'exploring';

    const input = this.readInput(canMove);
    this.accumulator = Math.min(this.accumulator + delta, PLAYER.physicsStep * PLAYER.maxPhysicsSubSteps);
    let steps = 0;
    while (this.accumulator >= PLAYER.physicsStep && steps < PLAYER.maxPhysicsSubSteps) {
      this.player.update(PLAYER.physicsStep, input, this.settings.reducedMotion);
      this.physics.step();
      this.accumulator -= PLAYER.physicsStep;
      steps += 1;
    }
    if (steps === 0) {
      this.player.update(delta, input, this.settings.reducedMotion);
    }

    const targetParallax = this.settings.parallax && !this.touchActive;
    this.follow.setParallax(this.pointerParallax.x, this.pointerParallax.y, targetParallax);

    const cameraState = this.follow.update(
      delta,
      this.player.position,
      this.player.moving,
      this.settings,
      intro,
    );
    this.scratchLook.copy(cameraState.lookAt);

    const offset = this.scratchDir.copy(this.follow.camera.position).sub(this.scratchLook);
    const distance = offset.length();
    if (distance > 0.5) {
      offset.multiplyScalar(1 / distance);
      const hit = this.physics.castRay(
        new RAPIER.Ray(this.scratchLook, offset),
        distance,
        true,
        undefined,
        undefined,
        this.player.colliderHandle,
      );
      if (hit) this.follow.clampToObstacle(hit.timeOfImpact);
    }
    this.follow.ensureAboveGround();
    this.follow.camera.lookAt(this.scratchLook);

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
    if (this.lastSnapshotSave > 2 && canMove) {
      this.lastSnapshotSave = 0;
      this.persistSnapshot();
    }
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
    const length = Math.hypot(x, z);
    if (length > 1) {
      x /= length;
      z /= length;
    }
    return { x, z };
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
    let label = '探索环路';
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
    const direction = this.scratchDir
      .copy(this.scratchLook)
      .sub(this.follow.camera.position);
    const distance = direction.length();
    if (distance < 1) return;
    direction.multiplyScalar(1 / distance);
    this.raycaster.set(this.follow.camera.position, direction);
    this.raycaster.far = distance - 0.35;
    const hits = this.raycaster.intersectObjects(this.occluderMeshes, false);
    const hitId = (hits[0]?.object.userData.buildingId as string | undefined) ?? null;
    if (hitId === this.occlusionBuildingId) return;
    this.occlusionBuildingId = hitId;
    for (const [id, state] of this.fadeStates) {
      state.target = id === hitId ? 0.16 : 1;
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
      if (fps !== this.stats.lastFps) {
        this.stats.lastFps = fps;
        this.callbacks.onStats({
          fps,
          drawCalls: this.renderer.info.render.calls,
          triangles: this.renderer.info.render.triangles,
        });
      }
    }
  }

  interact(): void {
    const store = useWorldStore.getState();
    if (store.mode !== 'exploring') return;
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
    if (this.lastSnapshotPosition.distanceTo(feet) < 0.18) return;
    this.lastSnapshotPosition.copy(feet);
    saveSnapshot([feet.x, 0, feet.z], this.player.yawRad);
  }

  saveNow(): void {
    if (!this.player) return;
    const feet = this.player.position;
    saveSnapshot([feet.x, 0, feet.z], this.player.yawRad);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.listenerController.abort();
    this.storageUnsubscribe?.();
    this.storageUnsubscribe = null;
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
  parallax: boolean;
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
        parallax: parsed.parallax !== false,
        reducedMotion: parsed.reducedMotion ?? prefersReduced,
      };
    }
  } catch {
    // 忽略读取失败，使用系统偏好。
  }
  return { quality: 'high', parallax: true, reducedMotion: prefersReduced };
}

export function writeSettings(settings: PersistedSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // 忽略写入失败。
  }
}
