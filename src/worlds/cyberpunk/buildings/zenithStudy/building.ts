import * as THREE from 'three/webgpu';
import { uv, float, vec2, vec3, color, floor, fract, sin, dot, step, smoothstep, mix, fwidth,
  min, select, positionWorld, normalWorld, cameraPosition, normalize } from 'three/tsl';
import { createStudyTiers, seeded, type StudyTier } from './massing';

/**
 * Procedural glass/office study of Neon Zenith. Facade grid, per-tenant lighting
 * and room-box intersection adapted from src/city/buildings.js (MIT, Bill Chan).
 * Single-mesh uniforms replace the upstream city's per-instance attributes.
 * No external models, facade photos, ad art or fonts are imported.
 */
function facade(width: number, height: number, seed: number): THREE.MeshStandardNodeMaterial {
  const m = new THREE.MeshStandardNodeMaterial();
  const rand = (v: ReturnType<typeof vec2>) => fract(sin(dot(v, vec2(127.1, 311.7))).mul(43758.5453));
  const bay = 1.65, floorH = 3.85, roomDepth = 4.8;
  const cu = uv().x.mul(width / bay), cv = uv().y.mul(height / floorH);
  const fu = fract(cu), fv = fract(cv), cell = floor(vec2(cu, cv));
  const aaX = fwidth(cu).max(0.002), aaY = fwidth(cv).max(0.002);
  const wx = smoothstep(float(0.045).sub(aaX), float(0.045).add(aaX), fu)
    .mul(float(1).sub(smoothstep(float(0.955).sub(aaX), float(0.955).add(aaX), fu)));
  const wy = smoothstep(float(0.21).sub(aaY), float(0.21).add(aaY), fv)
    .mul(float(1).sub(smoothstep(float(0.95).sub(aaY), float(0.95).add(aaY), fv)));
  const aperture = wx.mul(wy);
  const zone = floor(cell.x.div(6));
  const tenant = rand(vec2(cell.y, zone.add(seed)));
  const lit = step(tenant, 0.44);
  const tone = rand(vec2(zone.add(seed * 0.31), cell.y.add(11)));
  const roomColor = mix(color('#b9ddf5'), color('#ffd49c'), step(0.52, tone));

  // Interior ray/box intersection: the glass has a room behind it, not a flat square.
  const rd = normalize(positionWorld.sub(cameraPosition));
  const tangent = vec3(normalWorld.z, 0, normalWorld.x.negate());
  const du = dot(rd, tangent), dv = rd.y, dn = dot(rd, normalWorld.negate()).max(0.02);
  const safeU = select(du.greaterThanEqual(0), du.max(0.0001), du.min(-0.0001));
  const safeV = select(dv.greaterThanEqual(0), dv.max(0.0001), dv.min(-0.0001));
  const x0 = fu.mul(bay), y0 = fv.mul(floorH);
  const tx = select(safeU.greaterThan(0), float(bay).sub(x0).div(safeU), x0.negate().div(safeU));
  const ty = select(safeV.greaterThan(0), float(floorH).sub(y0).div(safeV), y0.negate().div(safeV));
  const tz = float(roomDepth).div(dn), t = min(min(tx, ty), tz);
  const hx = x0.add(safeU.mul(t)), hy = y0.add(safeV.mul(t));
  const back = step(tz, min(tx, ty));
  const ceiling = step(ty, min(tx, tz)).mul(step(0, safeV));
  const desk = step(0.26, hx.div(bay)).mul(step(hx.div(bay), 0.8))
    .mul(step(0.16, hy.div(floorH))).mul(step(hy.div(floorH), 0.27)).mul(back);
  const interior = float(0.38).add(back.mul(0.3)).add(ceiling.mul(0.2)).sub(desk.mul(0.38));
  const reflection = smoothstep(-0.25, 0.8, normalWorld.y.add(rd.y).negate()).mul(0.15);
  m.colorNode = mix(color('#202934'), color('#15293c').add(reflection), aperture);
  m.emissiveNode = roomColor.mul(aperture).mul(lit).mul(interior).mul(1.4);
  m.roughnessNode = mix(float(0.78), float(0.28), aperture);
  m.metalnessNode = mix(float(0.18), float(0.55), aperture);
  // These nodes remain deterministic when the camera moves; no flickering random windows.
  return m;
}

function label(text: string, subtitle: string, ink: string, background: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');canvas.width = 1024;canvas.height = 512;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas 2D unavailable');
  ctx.fillStyle = background;ctx.fillRect(0, 0, 1024, 512);
  ctx.strokeStyle = ink;ctx.lineWidth = 3;ctx.strokeRect(30, 30, 964, 452);
  ctx.fillStyle = ink;ctx.font = '600 104px sans-serif';ctx.fillText(text, 65, 248);
  ctx.font = '26px sans-serif';ctx.fillText(subtitle, 70, 316);
  for (let i = 0; i < 22; i++) ctx.fillRect(70 + i * 40, 394, i % 3 ? 12 : 24, 34);
  const texture = new THREE.CanvasTexture(canvas);texture.colorSpace = THREE.SRGBColorSpace;return texture;
}

export interface ZenithStudyHandle {
  group: THREE.Group;
  tiers: StudyTier[];
  totalHeight: number;
  dispose(): void;
}

export function createZenithStudy(seed = 23): ZenithStudyHandle {
  const group = new THREE.Group();group.name = 'NZ-SETBACK-STUDY';
  const tiers = createStudyTiers(seed);
  const materials = new Set<THREE.Material>(), geometries = new Set<THREE.BufferGeometry>(), textures = new Set<THREE.Texture>();
  const own = <T extends THREE.Material>(m: T): T => { materials.add(m);return m; };
  const metal = own(new THREE.MeshStandardNodeMaterial({ color: 0x29333e, metalness: 0.7, roughness: 0.42 }));
  const concrete = own(new THREE.MeshStandardNodeMaterial({ color: 0x3c414a, roughness: 0.88 }));
  const glass = own(new THREE.MeshStandardNodeMaterial({ color: 0x122b39, roughness: 0.19, metalness: 0.7 }));
  const cyan = own(new THREE.MeshStandardNodeMaterial({ color: 0x192a31, emissive: 0x34cce0, emissiveIntensity: 2.5 }));
  const amber = own(new THREE.MeshStandardNodeMaterial({ color: 0x493b25, emissive: 0xffb36a, emissiveIntensity: 2.0 }));
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);geometries.add(boxGeometry);
  const box = (name: string, x: number, y: number, z: number, w: number, h: number, d: number,
    material: THREE.Material | THREE.Material[] = metal) => {
    const mesh = new THREE.Mesh(boxGeometry, material);mesh.name = name;mesh.position.set(x, y, z);mesh.scale.set(w, h, d);
    mesh.castShadow = true;mesh.receiveShadow = true;group.add(mesh);return mesh;
  };
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i], h = t.y1 - t.y0;
    if (t.kind) {
      box(t.kind, t.x, (t.y0 + t.y1) / 2, t.z, t.w, h, t.d,
        t.kind === 'led' ? cyan : t.kind === 'plant' ? concrete : metal);
      if (t.kind === 'louvre') for (let y = t.y0 + 0.25; y < t.y1; y += 0.5)
        box('MechanicalLouvre', t.x, y, t.z, t.w + 0.06, 0.12, t.d + 0.06, concrete);
    } else {
      const side = own(facade(t.d, h, seed + i * 13)), front = own(facade(t.w, h, seed + i * 13));
      box('OfficeShaft', t.x, (t.y0 + t.y1) / 2, t.z, t.w, h, t.d, [side, side, metal, metal, front, front]);
      // Physical mullions and floor edges remain visible in the close street view.
      const frames: THREE.Matrix4[] = [];
      const dummy = new THREE.Object3D();
      const frame = (x: number, y: number, z: number, w: number, h: number, d: number) => {
        dummy.position.set(x, y, z);dummy.scale.set(w, h, d);dummy.updateMatrix();frames.push(dummy.matrix.clone());
      };
      for (const sign of [-1, 1]) {
        for (let y = t.y0 + 0.05; y < t.y1; y += 3.85) {
          frame(t.x, y, t.z + sign * (t.d / 2 + 0.055), t.w, 0.10, 0.14);
          frame(t.x + sign * (t.w / 2 + 0.055), y, t.z, 0.14, 0.10, t.d);
        }
        for (let x = -t.w/2; x <= t.w/2; x += 1.65) frame(t.x+x, t.y0+h/2, t.z+sign*(t.d/2+0.05),0.06,h,0.12);
        for (let z = -t.d/2; z <= t.d/2; z += 1.65) frame(t.x+sign*(t.w/2+0.05),t.y0+h/2,t.z+z,0.12,h,0.06);
      }
      const mullions = new THREE.InstancedMesh(boxGeometry, metal, frames.length);
      frames.forEach((matrix, n) => mullions.setMatrixAt(n, matrix));mullions.computeBoundingSphere();group.add(mullions);
    }
  }
  // Review adaptation: an accessible entrance band, custom signage and shopfronts.
  box('EntranceRecess', 0, 2.8, 20.08, 15, 5.6, 0.14, glass);
  box('Canopy', 0, 5.65, 22.3, 18, 0.45, 6.0);
  box('EntryLight', 0, 5.36, 24.8, 16.5, 0.06, 0.12, amber);
  for (const x of [-5, 0, 5]) box('DoorMullion', x, 2.5, 20.25, 0.10, 5, 0.16);
  const random = seeded(seed + 100);
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const x = side * (11 + i * 5.0);
    box('ShopWindow', x, 2.15, 20.15, 4.1, 3.3, 0.20, i === 1 ? amber : glass);
    box('ShopSill', x, 0.5, 20.5, 4.5, 0.5, 0.7, concrete);
    box('ShopAwning', x, 4.3, 21.0, 4.7, 0.18, 2.0);
    if (random() > 0.35) box('ShopSign', x, 4.85, 20.5, 3.5, 0.45, 0.2, cyan);
  }
  for (const [text, subtitle, x, y, ink, bg] of [
    ['ZENITH', 'OFFICE / SKY LOBBY', 0, 8.2, '#a5edf3', '#152536'],
    ['NIGHT SHIFT', 'LOHINA / ORIGINAL SIGN ART', 12, 40, '#ffc38e', '#241c2f'],
  ] as const) {
    const texture = label(text, subtitle, ink, bg);textures.add(texture);
    const m = own(new THREE.MeshStandardNodeMaterial({ map: texture, emissiveMap: texture, emissive: 0xffffff,
      emissiveIntensity: 0.6, roughness: 0.5 }));
    const g = new THREE.PlaneGeometry(text === 'ZENITH' ? 15 : 9, text === 'ZENITH' ? 3.2 : 4.5);geometries.add(g);
    const plaque = new THREE.Mesh(g, m);plaque.position.set(x,y,text==='ZENITH'?20.37:tiers[1].z+tiers[1].d/2+0.13);
    group.add(plaque);
  }
  return { group, tiers, totalHeight: Math.max(...tiers.map(t=>t.y1)), dispose: () => {
    group.removeFromParent();group.traverse(object => { if (object instanceof THREE.InstancedMesh) object.dispose(); });
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
  } };
}
