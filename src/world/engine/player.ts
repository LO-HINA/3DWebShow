import * as THREE from 'three';
import type { WorldMaterials } from '../procedural/materials';

export interface PlayerRig {
  group: THREE.Group;
  update: (delta: number, speedRatio: number, moving: boolean, reducedMotion: boolean) => void;
  dispose: () => void;
}

interface Limb {
  pivot: THREE.Group;
  restRotation: number;
}

function capsule(
  radius: number,
  length: number,
  material: THREE.Material,
  segments = 12,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 6, segments), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createPlayerRig(materials: WorldMaterials): PlayerRig {
  const group = new THREE.Group();
  group.name = 'PlayerRig';

  const body = new THREE.Group();
  body.name = 'PlayerBody';
  group.add(body);

  const coatMaterial = materials.metal.clone();
  coatMaterial.color.setHex(0x323543);
  coatMaterial.roughness = 0.72;
  coatMaterial.metalness = 0.24;

  const coatLight = materials.metalSoft.clone();
  coatLight.color.setHex(0x3d4152);

  const darkMaterial = materials.frameBack.clone();
  darkMaterial.color.setHex(0x181b26);

  const scarfMaterial = materials.emissiveGoldSoft.clone();
  scarfMaterial.emissiveIntensity = 1.25;

  const visorMaterial = materials.emissiveCyan.clone();
  visorMaterial.emissiveIntensity = 2.8;

  const skinMaterial = materials.concreteWarmLight.clone();
  skinMaterial.color.setHex(0xb9977c);
  skinMaterial.roughness = 0.82;

  const torso = capsule(0.22, 0.4, coatMaterial);
  torso.position.y = 0.94;
  torso.scale.set(1, 1, 0.86);
  body.add(torso);

  const shoulderWrap = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.255, 0.22, 16), coatLight);
  shoulderWrap.position.y = 1.2;
  shoulderWrap.castShadow = true;
  body.add(shoulderWrap);

  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.045, 8, 20), scarfMaterial);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.31;
  body.add(scarf);

  const scarfTail = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.34, 0.045), scarfMaterial);
  scarfTail.position.set(0.13, 1.13, -0.16);
  scarfTail.rotation.z = 0.18;
  body.add(scarfTail);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 10), skinMaterial);
  neck.position.y = 1.35;
  body.add(neck);

  const headPivot = new THREE.Group();
  headPivot.position.y = 1.43;
  body.add(headPivot);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.165, 20, 16), skinMaterial);
  head.scale.set(0.94, 1.02, 0.94);
  head.castShadow = true;
  headPivot.add(head);

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.171, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), darkMaterial);
  hair.position.y = 0.025;
  headPivot.add(hair);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 0.025), visorMaterial);
  visor.position.set(0, 0.035, 0.152);
  headPivot.add(visor);

  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.16), darkMaterial);
  backpack.position.set(0, 1.0, -0.24);
  // 背包紧贴躯干，真实阴影贡献极小，省去一次阴影 pass 绘制。
  backpack.castShadow = false;
  body.add(backpack);

  const backpackBar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.01), materials.emissiveCyanSoft);
  backpackBar.position.set(0, 0.92, -0.325);
  body.add(backpackBar);

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.215, 0.022, 6, 20), materials.metalSoft);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.75;
  body.add(belt);

  const legs: Limb[] = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.1, 0.66, 0);
    body.add(pivot);
    const leg = capsule(0.062, 0.34, coatLight);
    leg.position.y = -0.235;
    pivot.add(leg);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, 0.26), darkMaterial);
    boot.position.set(0, -0.47, 0.045);
    boot.castShadow = false;
    pivot.add(boot);
    legs.push({ pivot, restRotation: 0 });
  }

  const arms: Limb[] = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.255, 1.18, 0);
    pivot.rotation.z = side * 0.08;
    body.add(pivot);
    const arm = capsule(0.052, 0.32, coatMaterial);
    arm.position.y = -0.22;
    pivot.add(arm);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 10), scarfMaterial);
    cuff.position.y = -0.41;
    pivot.add(cuff);
    arms.push({ pivot, restRotation: side * 0.08 });
  }

  const shadowMaterial = materials.contactShadow.clone();
  shadowMaterial.opacity = 0.55;
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.014;
  group.add(shadow);

  let phase = 0;
  let idleTime = 0;
  let swing = 0;
  let lean = 0;
  let bob = 0;

  const update = (delta: number, speedRatio: number, moving: boolean, reducedMotion: boolean): void => {
    idleTime += delta;
    const targetSwing = moving && !reducedMotion ? Math.min(1, speedRatio) : 0;
    swing += (targetSwing - swing) * Math.min(1, delta * 10);
    if (moving) phase += delta * (7.2 + speedRatio * 3.6);

    const stride = Math.sin(phase) * 0.52 * swing;
    legs[0].pivot.rotation.x = stride;
    legs[1].pivot.rotation.x = -stride;
    arms[0].pivot.rotation.x = -stride * 0.78;
    arms[1].pivot.rotation.x = stride * 0.78;

    const targetLean = moving ? 0.055 + speedRatio * 0.035 : 0;
    lean += (targetLean - lean) * Math.min(1, delta * 8);
    const targetBob = reducedMotion ? 0 : Math.abs(Math.sin(phase * 2)) * 0.022 * swing;
    bob += (targetBob - bob) * Math.min(1, delta * 12);
    body.rotation.x = lean;
    body.position.y = bob + (reducedMotion ? 0 : Math.sin(idleTime * 1.7) * 0.004 * (1 - swing));

    headPivot.rotation.y = reducedMotion ? 0 : Math.sin(idleTime * 0.6) * 0.07 * (1 - swing);
    headPivot.rotation.x = -lean * 0.6;

    const shadowScale = 1 - bob * 2;
    shadow.scale.setScalar(Math.max(0.9, shadowScale));
  };

  const dispose = (): void => {
    group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
      }
    });
  };

  return { group, update, dispose };
}
