import * as THREE from 'three';
export interface AvatarMaterials {
  metal: THREE.MeshStandardMaterial;
  metalSoft: THREE.MeshStandardMaterial;
  frameBack: THREE.MeshStandardMaterial;
  concreteWarmLight: THREE.MeshStandardMaterial;
  emissiveGoldSoft: THREE.MeshStandardMaterial;
  emissiveCyan: THREE.MeshStandardMaterial;
  emissiveCyanSoft: THREE.MeshStandardMaterial;
  contactShadow: THREE.MeshBasicMaterial;
}
import { DistanceGait, LEG, solveLeg, type MotionSample } from './gait';

export interface PlayerRig {
  group: THREE.Group;
  update: (delta: number, motion: MotionSample) => void;
  reset?: () => void;
  diagnostics?: () => object;
  dispose: () => void;
}

interface Limb {
  pivot: THREE.Group;
  elbow: THREE.Group;
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

export function createPlayerRig(materials: AvatarMaterials): PlayerRig {
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

  const pelvis = new THREE.Group();
  pelvis.name = 'Pelvis';
  pelvis.position.y = LEG.hipHeight;
  group.add(pelvis);
  const legs: Array<{ hip: THREE.Group; knee: THREE.Group; ankle: THREE.Group; toe: THREE.Group }> = [];
  for (const side of [-1, 1]) {
    const hip = new THREE.Group();
    hip.name = side < 0 ? 'Hip_L' : 'Hip_R';
    hip.position.set(side * LEG.separation, 0, 0);
    pelvis.add(hip);
    const thigh = capsule(0.062, LEG.upper - 0.124, coatLight);
    thigh.position.y = -LEG.upper / 2;
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.name = side < 0 ? 'Knee_L' : 'Knee_R';
    knee.position.y = -LEG.upper;
    hip.add(knee);
    const kneecap = new THREE.Mesh(new THREE.SphereGeometry(0.061, 10, 8), coatLight);
    knee.add(kneecap);
    const shin = capsule(0.054, LEG.lower - 0.108, coatMaterial);
    shin.position.y = -LEG.lower / 2;
    knee.add(shin);
    const ankle = new THREE.Group();
    ankle.name = side < 0 ? 'Ankle_L' : 'Ankle_R';
    ankle.position.y = -LEG.lower;
    knee.add(ankle);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, 0.17), darkMaterial);
    boot.position.set(0, -0.03, 0);
    boot.castShadow = false;
    ankle.add(boot);
    const toe = new THREE.Group();
    toe.name = side < 0 ? 'Toe_L' : 'Toe_R';
    toe.position.set(0, -0.055, 0.085);
    ankle.add(toe);
    const forefoot = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.08, 0.09), darkMaterial);
    forefoot.position.set(0, 0.025, 0.045);
    toe.add(forefoot);
    legs.push({ hip, knee, ankle, toe });
  }

  const arms: Limb[] = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.name = side < 0 ? 'Shoulder_L' : 'Shoulder_R';
    pivot.position.set(side * 0.255, 1.18, 0);
    pivot.rotation.z = side * 0.08;
    body.add(pivot);
    const arm = capsule(0.052, 0.116, coatMaterial);
    arm.position.y = -0.11;
    pivot.add(arm);
    const elbow = new THREE.Group();
    elbow.name = side < 0 ? 'Elbow_L' : 'Elbow_R';
    elbow.position.y = -0.22;
    pivot.add(elbow);
    const forearm = capsule(0.047, 0.126, coatMaterial);
    forearm.position.y = -0.11;
    elbow.add(forearm);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 10), scarfMaterial);
    cuff.position.y = -0.2;
    elbow.add(cuff);
    arms.push({ pivot, elbow });
  }

  const shadowMaterial = materials.contactShadow.clone();
  shadowMaterial.opacity = 0.55;
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.014;
  group.add(shadow);

  const gait = new DistanceGait();
  let idleTime = 0;
  let lean = 0;
  let posture = 0;
  let landing = 0;
  let landingId = 0;
  let updates = 0;
  let maxReachError = 0;
  const footTarget = new THREE.Vector3();
  const rootInverse = new THREE.Quaternion();
  const pelvisInverse = new THREE.Quaternion();
  const parentRotation = new THREE.Quaternion();
  const footRotation = new THREE.Quaternion();
  const footEuler = new THREE.Euler(0, 0, 0, 'YXZ');

  const update: PlayerRig['update'] = (delta, motion) => {
    updates++;
    gait.update(delta, group.position, group.rotation.y, motion);
    idleTime += delta;
    const weight = Math.min(1, motion.speed / 0.7);
    const phase = gait.phase * Math.PI * 2;
    const secondary = motion.reducedMotion ? 0 : 1;
    const targetPosture = motion.grounded ? weight * THREE.MathUtils.lerp(0.04, 0.105, gait.run) : 0.04;
    posture = THREE.MathUtils.damp(posture, targetPosture, 28, delta);
    if (motion.landingId !== landingId) {
      landing = Math.min(0.035, motion.landingImpact * 0.004);
      landingId = motion.landingId;
    } else landing *= Math.exp(-22 * delta);
    const bob = secondary * weight * (1 - Math.cos(phase * 2)) * 0.004;
    pelvis.position.y = LEG.hipHeight - posture + bob - landing;
    pelvis.rotation.set(0, Math.sin(phase) * 0.025 * weight * secondary,
      Math.cos(phase) * 0.015 * weight * secondary);
    rootInverse.copy(group.quaternion).invert();
    // 支撑与停步收脚时允许骨盆少量让位，避免 IK 末端超出腿长。
    for (let i = 0; i < legs.length; i++) {
      footTarget.copy(gait.feet[i].position).sub(group.position).applyQuaternion(rootInverse);
      const horizontal = Math.hypot(footTarget.x - legs[i].hip.position.x, footTarget.z);
      const maxHeight = footTarget.y + Math.sqrt(Math.max(0.01, 0.665 ** 2 - horizontal ** 2));
      pelvis.position.y = Math.min(pelvis.position.y, maxHeight);
    }
    body.position.y = pelvis.position.y - LEG.hipHeight + secondary * (1 - weight) * Math.sin(idleTime * 1.7) * 0.002;
    lean = THREE.MathUtils.damp(lean, weight * THREE.MathUtils.lerp(0.025, 0.075, gait.run), 24, delta);
    body.rotation.set(lean * secondary, -Math.sin(phase) * 0.04 * weight * secondary, pelvis.rotation.z * 0.45);
    const armSwing = Math.sin(phase) * THREE.MathUtils.lerp(0.34, 0.62, gait.run) * weight;
    for (let i = 0; i < arms.length; i++) {
      const shoulder = motion.grounded ? (i === 0 ? -armSwing : armSwing) : -0.45;
      const elbow = motion.grounded ? -THREE.MathUtils.lerp(0.16, 0.85, gait.run) - Math.abs(armSwing) * 0.12 : -0.7;
      arms[i].pivot.rotation.x = THREE.MathUtils.damp(arms[i].pivot.rotation.x, shoulder, 35, delta);
      arms[i].elbow.rotation.x = THREE.MathUtils.damp(arms[i].elbow.rotation.x, elbow, 35, delta);
    }

    pelvisInverse.copy(pelvis.quaternion).invert();
    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      const foot = gait.feet[i];
      footTarget.copy(foot.position).sub(group.position).applyQuaternion(rootInverse);
      footTarget.y += Math.max(0, Math.sin(foot.pitch) * 0.14, -Math.sin(foot.pitch) * 0.085);
      footTarget.sub(pelvis.position).applyQuaternion(pelvisInverse).sub(leg.hip.position);
      const error = solveLeg(footTarget, leg.hip.quaternion, leg.knee.quaternion);
      maxReachError = Math.max(maxReachError, error);
      footEuler.set(foot.pitch, foot.yaw - group.rotation.y, 0, 'YXZ');
      footRotation.setFromEuler(footEuler);
      parentRotation.copy(pelvis.quaternion).multiply(leg.hip.quaternion).multiply(leg.knee.quaternion).invert();
      leg.ankle.quaternion.copy(parentRotation).multiply(footRotation);
      leg.toe.rotation.x = foot.toe;
    }

    headPivot.rotation.y = 0;
    headPivot.rotation.x = -lean * 0.6;
    const height = Math.max(0, motion.height);
    shadow.position.y = 0.014 - height;
    shadowMaterial.opacity = 0.55 / (1 + height * 0.7);
    shadow.scale.setScalar(1 + height * 0.2);
  };

  const dispose = (): void => {
    group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
      }
    });
  };

  return { group, update, dispose, reset: () => { gait.reset(); landing = 0; posture = 0; },
    diagnostics: () => ({ ...gait.diagnostics(), updates, maxReachError,
      joints: legs.map(leg => ({ hip: leg.hip.quaternion.toArray(), knee: leg.knee.quaternion.toArray(), ankle: leg.ankle.quaternion.toArray() })) }) };
}
