import * as THREE from 'three';
import type { WorldMaterials } from '../materials';

/**
 * 中央十字马路的标线、路缘灯与流动光带。
 * 全部为贴地平面/点精灵，不新增实时灯；亮度来自 Basic 材质与辉光选择。
 * 坐标与 layout.paths 对齐：南北向 18m 宽（x∈[-9,9]），东西向 18m 宽（z∈[-9,9]）。
 */

const START = 10.4;
const NS_END = 77.6;
const EW_END = 87.6;
const Y = 0.024;

/** 主路两端的中心坐标与长度。 */
function armCenters(start: number, end: number): Array<[number, number]> {
  return [[-(start + end) / 2, end - start], [(start + end) / 2, end - start]];
}

/** 贴地平面：width 沿 x，length 沿 z。 */
function flatStrip(
  material: THREE.Material,
  width: number,
  length: number,
  x: number,
  z: number,
  y = Y,
  renderOrder = 2,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, length), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.renderOrder = renderOrder;
  return mesh;
}

/** 贴地平面：width 沿 z，length 沿 x（东西向标线用）。 */
function flatBar(
  material: THREE.Material,
  width: number,
  length: number,
  x: number,
  z: number,
  y = Y,
  renderOrder = 2,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(length, width), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.renderOrder = renderOrder;
  return mesh;
}

/** 中心流动光带：沿路长方向滚动的高光脉冲，明确“车行”方向。 */
function createFlowMaterial(color: number): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float lane = smoothstep(0.5, 0.0, abs(vUv.x - 0.5) * 2.0);
        float dash = step(0.42, fract(vUv.y * 26.0 + 0.2));
        float travel = 0.5 + 0.5 * sin(vUv.y * 34.0 - uTime * 2.6);
        float pulse = pow(travel, 10.0);
        vec3 color = uColor * (0.2 + 2.4 * pulse) * dash * lane;
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  material.userData.bloom = true;
  return material;
}

/** 流动光带保持独立网格：合并会丢失 onBeforeRender 动画。 */
function addFlow(
  group: THREE.Group,
  material: THREE.ShaderMaterial,
  alongX: boolean,
  width: number,
  length: number,
  x: number,
  z: number,
): void {
  const mesh = alongX
    ? flatBar(material, width, length, x, z, 0.027, 3)
    : flatStrip(material, width, length, x, z, 0.027, 3);
  mesh.name = 'RoadFlowLine';
  mesh.userData.noMerge = true;
  mesh.onBeforeRender = () => {
    material.uniforms.uTime.value = (performance.now() * 0.001) % 1000;
  };
  group.add(mesh);
}

function addBollards(
  group: THREE.Group,
  materials: WorldMaterials,
  color: number,
  points: Array<[number, number]>,
): void {
  const positions = new Float32Array(points.length * 3);
  points.forEach(([x, z], index) => {
    positions[index * 3] = x;
    positions[index * 3 + 1] = 0.05;
    positions[index * 3 + 2] = z;
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    map: materials.glow.map,
    color,
    size: 1.15,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  material.userData.bloom = true;
  const dots = new THREE.Points(geometry, material);
  dots.name = 'RoadBollards';
  dots.frustumCulled = false;
  group.add(dots);
}

/** 中心虚线（2.4m 线 + 3.6m 间隔），沿指定轴排布。 */
function addCenterDashes(
  group: THREE.Group,
  material: THREE.Material,
  alongX: boolean,
  center: number,
  length: number,
): void {
  const dashLength = 2.4;
  const gap = 3.6;
  const count = Math.floor((length - 6) / (dashLength + gap));
  for (let i = 0; i < count; i += 1) {
    const along = Math.sign(center) * (3 + i * (dashLength + gap) + dashLength / 2);
    group.add(
      alongX
        ? flatBar(material, 0.13, dashLength, along, 0)
        : flatStrip(material, 0.13, dashLength, 0, along),
    );
  }
}

export function createRoadMarkings(materials: WorldMaterials): THREE.Group {
  const group = new THREE.Group();
  group.name = 'RoadMarkings';

  const edgeCyan = new THREE.MeshBasicMaterial({
    color: 0x3ee6ff,
    transparent: true,
    opacity: 0.5,
    toneMapped: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const edgeGold = new THREE.MeshBasicMaterial({
    color: 0xffbe7d,
    transparent: true,
    opacity: 0.44,
    toneMapped: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const crosswalk = new THREE.MeshBasicMaterial({
    color: 0xd6e8ff,
    transparent: true,
    opacity: 0.2,
    toneMapped: false,
    depthWrite: false,
  });
  const stopLine = new THREE.MeshBasicMaterial({
    color: 0xaef2ff,
    transparent: true,
    opacity: 0.32,
    toneMapped: false,
    depthWrite: false,
  });
  const centerDash = new THREE.MeshBasicMaterial({
    color: 0xbfefff,
    transparent: true,
    opacity: 0.32,
    toneMapped: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  // —— 南北向主路：青色路缘 + 白色中心虚线 + 流水光带 ——
  for (const [center, length] of armCenters(START, NS_END)) {
    for (const side of [-1, 1]) {
      group.add(flatStrip(edgeCyan, 0.14, length, side * 8.62, center));
    }
    addCenterDashes(group, centerDash, false, center, length);
    addFlow(group, createFlowMaterial(0x4fe8ff), false, 0.34, length - 4, 0, center);
  }

  // —— 东西向主路：暖金路缘 + 中心虚线 + 流水光带 ——
  for (const [center, length] of armCenters(START, EW_END)) {
    for (const side of [-1, 1]) {
      group.add(flatBar(edgeGold, 0.14, length, center, side * 8.62));
    }
    addCenterDashes(group, centerDash, true, center, length);
    addFlow(group, createFlowMaterial(0xffc27d), true, 0.34, length - 4, center, 0);
  }

  // —— 人行横道与停止线 ——
  const zebraCount = 9;
  for (const z of [-11.3, 11.3]) {
    for (let i = 0; i < zebraCount; i += 1) {
      const x = -7.2 + (i * 14.4) / (zebraCount - 1);
      group.add(flatStrip(crosswalk, 0.62, 3.0, x, z));
    }
  }
  for (const x of [-11.3, 11.3]) {
    for (let i = 0; i < zebraCount; i += 1) {
      const z = -7.2 + (i * 14.4) / (zebraCount - 1);
      group.add(flatBar(crosswalk, 0.62, 3.0, x, z));
    }
  }
  // 停止线放在斑马线外侧，提示路口边界。
  for (const z of [-13.4, 13.4]) group.add(flatBar(stopLine, 0.28, 16.2, 0, z));
  for (const x of [-13.4, 13.4]) group.add(flatStrip(stopLine, 0.28, 16.2, x, 0));
  // 斑马线前的中央减速带。
  for (const z of [-14.6, 14.6]) group.add(flatBar(centerDash, 0.5, 2.0, 0, z));
  for (const x of [-14.6, 14.6]) group.add(flatStrip(centerDash, 0.5, 2.0, x, 0));

  // —— 路缘引导点：南北青、东西金，低矮点精灵，不新增灯 ——
  const nsDots: Array<[number, number]> = [];
  for (const z of [-72, -64, -56, -48, -40, -32, -24, -18, 18, 24, 32, 40, 48, 56, 64, 72]) {
    nsDots.push([-8.78, z], [8.78, z]);
  }
  addBollards(group, materials, 0x8ff4ff, nsDots);
  const ewDots: Array<[number, number]> = [];
  for (const x of [-82, -74, -66, -58, -50, -42, -34, -26, -18, 18, 26, 34, 42, 50, 58, 66, 74, 82]) {
    ewDots.push([x, -8.78], [x, 8.78]);
  }
  addBollards(group, materials, 0xffcf9a, ewDots);

  // —— 支路（x=±44 / z=±44，4m 宽）弱标线，与主路断口处留空 ——
  for (const x of [-44, 44]) {
    for (const [center, length] of armCenters(10.4, 46)) {
      for (const side of [-1, 1]) {
        group.add(flatStrip(edgeCyan, 0.08, length, x + side * 1.72, center, Y, 1));
      }
    }
  }
  for (const z of [-44, 44]) {
    for (const [center, length] of armCenters(10.4, 46)) {
      for (const side of [-1, 1]) {
        group.add(flatBar(edgeGold, 0.08, length, center, z + side * 1.72, Y, 1));
      }
    }
  }

  return group;
}
