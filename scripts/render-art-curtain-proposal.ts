/** 几何投影方案图，不是 WebGL 截图；两档共用当前出生相机。 */
import * as THREE from 'three';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { ART_CURTAIN_CANDIDATES, PROPOSED_SCULPTURE_POSITION, createArtCurtainProposal } from '../src/worlds/cyberpunk/props/artCurtainProposal';
import { buildings, paths, SPAWN } from '../src/worlds/cyberpunk/layout';
import { FollowCamera } from '../src/engine/camera/follow';
Object.assign(globalThis, { document: { createElement: () => ({ width: 0, height: 0, getContext: () => null, toDataURL: () => '' }) } });
const { createLandmark } = await import('../src/worlds/cyberpunk/props/street');
const { TextureLoader } = THREE;
// 离线绘图不加载图片；封面通过同一资产的 SVG 数据贴入投影。
TextureLoader.prototype.load = function () { return new THREE.Texture(); };
const out = 'docs/plaza-screen-review/proposal';
mkdirSync(out, { recursive: true });
const follow = new FollowCamera(1440 / 900); follow.reset(new THREE.Vector3(...SPAWN.feet));
const camera = follow.camera;
const project = (v: THREE.Vector3) => { const p = v.clone().project(camera); return [720 * (1 + p.x), 450 * (1 - p.y), p.z]; };
const point = (p: number[]) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
const report: object[] = [];
for (const spec of ART_CURTAIN_CANDIDATES) {
  const scene = new THREE.Scene();
  const curtain = createArtCurtainProposal(spec); scene.add(curtain.group);
  const material = new THREE.MeshStandardMaterial({ color: 0x84796f });
  const mats = new Proxy({ glow: new THREE.SpriteMaterial(), emissiveGold: new THREE.MeshBasicMaterial({ color: 0xffbd87 }),
    emissiveCyan: new THREE.MeshBasicMaterial({ color: 0x71d4de }) }, {
    get(target, key) { return key in target ? target[key as keyof typeof target] : material; },
  });
  const sculpture = createLandmark(mats as never); sculpture.update(0, true);
  sculpture.group.position.fromArray(PROPOSED_SCULPTURE_POSITION); scene.add(sculpture.group);
  for (const b of buildings) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...b.size), material);
    mesh.position.set(b.position[0], b.size[1] / 2, b.position[2]);mesh.rotation.y = b.yawRad;scene.add(mesh);
  }
  const road = new THREE.MeshBasicMaterial({ color: 0x333d50 });
  for (const path of paths) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(path.size[0], 0.02, path.size[1]), road);
    mesh.position.fromArray(path.center);scene.add(mesh);
  }
  const avatar = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.04, 4, 8), new THREE.MeshBasicMaterial({ color: 0x98c9cc }));
  avatar.position.set(SPAWN.feet[0], 0.8, SPAWN.feet[2]);scene.add(avatar);
  scene.updateMatrixWorld(true);
  const faces: { z: number; svg: string }[] = [];
  scene.traverse(object => {
    if (!(object instanceof THREE.Mesh) || !object.visible) return;
    const material = object.material as THREE.MeshStandardMaterial;
    if (material.transparent || !material.color) return;
    const p = object.geometry.getAttribute('position'), index = object.geometry.index;
    const count = index ? index.count : p.count;
    for (let i = 0; i < count; i += 3) {
      const v = [0, 1, 2].map(k => new THREE.Vector3().fromBufferAttribute(p, index ? index.getX(i + k) : i + k).applyMatrix4(object.matrixWorld));
      const normal = v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();
      if (normal.dot(camera.position.clone().sub(v[0])) <= 0) continue;
      const ps = v.map(project); if (ps.some(p => p[2] < -1 || p[2] > 1)) continue;
      if (ps.every(p => p[0] < 0 || p[0] > 1440 || p[1] < 0 || p[1] > 900)) continue;
      const lit = material instanceof THREE.MeshBasicMaterial ? 1 : 0.48 + 0.5 * Math.max(0, normal.dot(new THREE.Vector3(-0.4, 0.8, 0.6).normalize()));
      const color = material.color.clone().multiplyScalar(lit).getHexString();
      faces.push({ z: ps.reduce((a, p) => a + p[2], 0) / 3, svg: `<path d="M${ps.map(point).join('L')}Z" fill="#${color}" stroke="#${color}" stroke-width=".35"/>` });
    }
  });
  const cover = readFileSync(`public${spec.imageUrl}`, 'utf8');
  const href = `data:image/svg+xml;base64,${Buffer.from(cover).toString('base64')}`;
  const yTop = (spec.bottom ?? 1.2) + spec.height;
  const worldZ = spec.position[2] + (spec.depth ?? 0.64) / 2 + 0.035;
  const pos = (u: number, v: number) => project(new THREE.Vector3(spec.position[0] - spec.width / 2 + u / 1920 * spec.width,
    spec.position[1] + yTop - v / 1080 * spec.height, worldZ));
  let strips = `<defs><image id="cover" width="1920" height="1080" href="${href}"/></defs>`;
  // 窄条分段仿射近似透视贴图；使用和模型相同的角点投影。
  for (let row = 0; row < 1080; row += 9) {
    const a = pos(0, row), b = pos(1920, row), c = pos(0, row + 9), d = pos(1920, row + 9);
    const sx = (b[0] - a[0]) / 1920, sy = (b[1] - a[1]) / 1920;
    const tx = (c[0] - a[0]) / 9, ty = (c[1] - a[1]) / 9;
    strips += `<clipPath id="r${row}"><path d="M${point(a)}L${point(b)}L${point(d)}L${point(c)}Z"/></clipPath><g clip-path="url(#r${row})"><use href="#cover" transform="matrix(${sx},${sy},${tx},${ty},${a[0]-tx*row},${a[1]-ty*row})"/></g>`;
  }
  faces.push({ z: pos(960, 540)[2], svg: strips });
  faces.sort((a, b) => b.z - a.z);
  const corners = [pos(0, 0), pos(1920, 0), pos(1920, 1080), pos(0, 1080)];
  writeFileSync(`${out}/${spec.width}m.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="900" viewBox="0 0 1440 900"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#141829"/><stop offset="1" stop-color="#394565"/></linearGradient></defs><rect width="1440" height="900" fill="url(#sky)"/><path d="M0 340H1440V900H0Z" fill="#232b3b"/>${faces.map(f=>f.svg).join('')}<g font-family="sans-serif" fill="#eee0cc"><rect x="24" y="794" width="660" height="78" fill="#101725"/><text x="44" y="825" font-size="22">${spec.width}m × ${spec.height}m / 同出生机位</text><text x="44" y="852" font-size="15">几何投影方案图 · 非运行截图 · 建筑仅表示现有包围体</text></g></svg>`);
  report.push({ width: spec.width, camera: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov,
    corners, fullScreenInsideFrame: corners.every(p=>p[0]>=0&&p[0]<=1440&&p[1]>=0&&p[1]<=900),
    outerWidth: spec.width + 2.36, northPathFrontEdgeZ: -12.2, plinthNorthEdgeZ: -10.85 });
  curtain.dispose();
}
writeFileSync(`${out}/projection-checks.json`, JSON.stringify({ kind: 'design-projection-not-browser-capture', variants: report }, null, 2));
const mx = (x: number) => 470 + x * 14;
const mz = (z: number) => 85 + (z + 28) * 14;
let plan = `<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="1000" viewBox="0 0 1240 1000"><defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6" fill="#85d9dc"/></marker></defs><rect width="1240" height="1000" fill="#121b29"/><g font-family="sans-serif" fill="#e5dccf"><text x="50" y="40" font-size="24">中央广场 / 北侧双塔之间 · 摆放提案</text><text x="50" y="70" font-size="15" fill="#a5b5c4">平面示意 · 单位米 · 大屏与雕塑位移均未写入正式场景</text>`;
for (const path of paths) plan += `<rect x="${mx(path.center[0]-path.size[0]/2)}" y="${mz(path.center[2]-path.size[1]/2)}" width="${path.size[0]*14}" height="${path.size[1]*14}" fill="#273449"/>`;
plan += `<circle cx="${mx(0)}" cy="${mz(0)}" r="${8.1*14}" fill="none" stroke="#52737f" stroke-dasharray="4 5"/>`;
for (const b of buildings) plan += `<g transform="translate(${mx(b.position[0])} ${mz(b.position[2])}) rotate(${-b.yawRad*180/Math.PI})"><rect x="${-b.size[0]*7}" y="${-b.size[2]*7}" width="${b.size[0]*14}" height="${b.size[2]*14}" fill="#57585d" stroke="#8a8d91"/><text text-anchor="middle" font-size="15" dy="5">${b.id}</text></g>`;
plan += `<rect x="${mx(-8.18)}" y="${mz(-10.85)}" width="${16.36*14}" height="28" fill="#c1a181"/><rect x="${mx(-7)}" y="${mz(-9.7)}" width="196" height="9" fill="#99dddd"/><path d="M${mx(-6)},${mz(-10.5)}V${mz(-8.7)}M${mx(6)},${mz(-10.5)}V${mz(-8.7)}" stroke="#ffdf91" stroke-width="2" stroke-dasharray="4 3"/>`;
plan += `<circle cx="${mx(0)}" cy="${mz(0)}" r="${1.96*14}" fill="none" stroke="#8795a3" stroke-dasharray="4 4"/><path d="M${mx(-.7)},${mz(-.7)}L${mx(.7)},${mz(.7)}M${mx(-.7)},${mz(.7)}L${mx(.7)},${mz(-.7)}" stroke="#8795a3"/>`;
plan += `<path d="M${mx(-.8)},${mz(.3)}L${mx(-5)},${mz(2.8)}" stroke="#e9ba8f" stroke-dasharray="5 4"/><circle cx="${mx(-6.5)}" cy="${mz(3)}" r="${1.96*14}" fill="#67605a" stroke="#e9ba8f"/><text x="${mx(-6.5)}" y="${mz(3)+5}" text-anchor="middle" font-size="12">LM-01</text>`;
for (const x of [-10.5,10.5]) plan += `<path d="M${mx(x)},${mz(13)}V${mz(-14)}" stroke="#85d9dc" stroke-width="2" marker-end="url(#arrow)"/><text x="${mx(x)+9}" y="${mz(9)}" font-size="13">3.6m 通路</text>`;
plan += `<path d="M${mx(-7)},${mz(-9.7)}L${mx(0)},${mz(camera.position.z)}L${mx(7)},${mz(-9.7)}" fill="#7dcad1" fill-opacity=".06" stroke="#72a1ac" stroke-dasharray="5 5"/><circle cx="${mx(0)}" cy="${mz(SPAWN.feet[2])}" r="5" fill="#85d9dc"/><text x="${mx(0)+12}" y="${mz(SPAWN.feet[2])+5}" font-size="14">出生点 (0, 6.5)</text><path d="M${mx(-.5)},${mz(camera.position.z)+9}L${mx(0)},${mz(camera.position.z)}L${mx(.5)},${mz(camera.position.z)+9}Z" fill="#e9ba8f"/><text x="${mx(0)+12}" y="${mz(camera.position.z)+9}" font-size="14">固定出生相机</text>`;
plan += `<g transform="translate(870 180)"><text font-size="20">整合建议</text><text y="46" font-size="16">画幕根节点：(0, 0, −9.7)</text><text y="77" font-size="16">朝南，yaw = 0</text><text y="125" font-size="16">雕塑根节点：(−6.5, 0, 3)</text><text y="156" font-size="16">保留雕塑本体，移至侧前方</text><text y="210" font-size="16" fill="#99dddd">青色：14m 有效画面</text><text y="241" font-size="16" fill="#ffdf91">虚线：12m 两侧画面边界</text><text y="272" font-size="16" fill="#c1a181">砂色：侧墩 / 基座包围范围</text><text y="320" font-size="15">北侧公共道路宽 3.6m</text><text y="350" font-size="15">基座距北路南缘约 1.35m</text><text y="380" font-size="15">14m 外壳距侧路内缘约 0.52m</text><text y="430" font-size="15" fill="#e9ba8f">最终碰撞 / 侧移 / 落点校验</text><text y="457" font-size="15" fill="#e9ba8f">由整合负责人实施后验收</text></g></g></svg>`;
writeFileSync(`${out}/placement.svg`, plan);
console.log(JSON.stringify(report, null, 2));
