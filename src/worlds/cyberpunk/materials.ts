import * as THREE from 'three';
import { PALETTE } from './theme';
import {
  createGroundTexture,
  createNoiseTexture,
  createSignTexture,
  createScreenTexture,
  createStarTexture,
  createContactShadowTexture,
  createGlowTexture,
  createSkyTexture,
} from './textures';

export interface WorldMaterials {
  concreteWarm: THREE.MeshStandardMaterial;
  concreteWarmLight: THREE.MeshStandardMaterial;
  concreteDark: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  metalSoft: THREE.MeshStandardMaterial;
  ground: THREE.MeshStandardMaterial;
  walkway: THREE.MeshStandardMaterial;
  plaza: THREE.MeshStandardMaterial;
  frame: THREE.MeshStandardMaterial;
  frameBack: THREE.MeshStandardMaterial;
  emissiveGold: THREE.MeshStandardMaterial;
  emissiveGoldSoft: THREE.MeshStandardMaterial;
  emissiveCyan: THREE.MeshStandardMaterial;
  emissiveCyanSoft: THREE.MeshStandardMaterial;
  warmWindow: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  foliage: THREE.MeshStandardMaterial;
  screen: THREE.MeshBasicMaterial;
  sky: THREE.MeshBasicMaterial;
  star: THREE.PointsMaterial;
  glow: THREE.SpriteMaterial;
  contactShadow: THREE.MeshBasicMaterial;
  veil: THREE.MeshBasicMaterial;
}

export interface MaterialBundle {
  materials: WorldMaterials;
  textures: THREE.Texture[];
}

function createSignMaterial(texture: THREE.Texture): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    toneMapped: false,
    depthWrite: false,
    side: THREE.FrontSide,
  });
}

export function createSignMaterialPair(
  primary: string,
  secondary: string,
  color = '#f4e6d5',
): { material: THREE.MeshBasicMaterial; texture: THREE.Texture } {
  const texture = createSignTexture(primary, secondary, { color });
  return { material: createSignMaterial(texture), texture };
}

export function createMaterials(): MaterialBundle {
  const noise = createNoiseTexture();
  const groundTexture = createGroundTexture();
  const skyTexture = createSkyTexture();
  const screenTexture = createScreenTexture();
  const starTexture = createStarTexture();
  const glowTexture = createGlowTexture();
  const shadowTexture = createContactShadowTexture();

  const concreteWarm = new THREE.MeshStandardMaterial({
    color: PALETTE.concreteWarm,
    roughness: 0.85,
    metalness: 0,
    bumpMap: noise,
    bumpScale: 0.018,
    envMapIntensity: 0.55,
  });
  const concreteWarmLight = new THREE.MeshStandardMaterial({
    color: PALETTE.concreteWarmLight,
    roughness: 0.82,
    metalness: 0,
    bumpMap: noise,
    bumpScale: 0.014,
    envMapIntensity: 0.55,
  });
  const concreteDark = new THREE.MeshStandardMaterial({
    color: PALETTE.concreteDark,
    roughness: 0.8,
    metalness: 0.05,
    bumpMap: noise,
    bumpScale: 0.012,
    envMapIntensity: 0.65,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: PALETTE.metalCharcoal,
    roughness: 0.52,
    metalness: 0.62,
    envMapIntensity: 1.1,
  });
  const metalSoft = new THREE.MeshStandardMaterial({
    color: 0x3b3e4b,
    roughness: 0.64,
    metalness: 0.35,
    envMapIntensity: 0.9,
  });
  const ground = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: groundTexture,
    roughness: 0.55,
    metalness: 0.04,
    envMapIntensity: 0.7,
  });
  const walkway = new THREE.MeshStandardMaterial({
    color: PALETTE.groundWalk,
    roughness: 0.58,
    metalness: 0.04,
    envMapIntensity: 0.65,
  });
  const plaza = new THREE.MeshStandardMaterial({
    color: 0x2d3142,
    roughness: 0.46,
    metalness: 0.06,
    envMapIntensity: 0.8,
  });
  const frame = new THREE.MeshStandardMaterial({
    color: 0x24262f,
    roughness: 0.55,
    metalness: 0.55,
    envMapIntensity: 1,
  });
  const frameBack = new THREE.MeshStandardMaterial({
    color: 0x15171f,
    roughness: 0.78,
    metalness: 0.25,
  });
  const emissiveGold = new THREE.MeshStandardMaterial({
    color: 0x2a1a0c,
    emissive: PALETTE.emissiveGold,
    emissiveIntensity: 2.4,
    roughness: 0.38,
    metalness: 0.15,
    envMapIntensity: 0.4,
  });
  const emissiveGoldSoft = new THREE.MeshStandardMaterial({
    color: 0x24180d,
    emissive: PALETTE.emissiveGold,
    emissiveIntensity: 0.8,
    roughness: 0.5,
    metalness: 0.1,
  });
  const emissiveCyan = new THREE.MeshStandardMaterial({
    color: 0x081b1f,
    emissive: PALETTE.emissiveCyan,
    emissiveIntensity: 2.2,
    roughness: 0.34,
    metalness: 0.2,
    envMapIntensity: 0.35,
  });
  const emissiveCyanSoft = new THREE.MeshStandardMaterial({
    color: 0x08171b,
    emissive: PALETTE.emissiveCyan,
    emissiveIntensity: 0.7,
    roughness: 0.5,
    metalness: 0.1,
  });
  const warmWindow = new THREE.MeshStandardMaterial({
    color: 0x1a130c,
    emissive: 0xffc67d,
    emissiveIntensity: 0.72,
    roughness: 0.32,
    metalness: 0.08,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x0a1220,
    roughness: 0.18,
    metalness: 0.55,
    envMapIntensity: 1.35,
  });
  const wood = new THREE.MeshStandardMaterial({
    color: 0x5a4634,
    roughness: 0.72,
    metalness: 0.02,
    bumpMap: noise,
    bumpScale: 0.01,
  });
  const foliage = new THREE.MeshStandardMaterial({
    color: 0x263a33,
    roughness: 0.92,
    metalness: 0,
    flatShading: true,
  });
  const screen = new THREE.MeshBasicMaterial({
    map: screenTexture,
    toneMapped: false,
    side: THREE.FrontSide,
  });
  const sky = new THREE.MeshBasicMaterial({
    map: skyTexture,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  });
  const star = new THREE.PointsMaterial({
    map: starTexture,
    color: 0xdce8ff,
    size: 0.9,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const glow = new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0xffb366,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0.55,
    fog: false,
  });
  const contactShadow = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    depthWrite: false,
    opacity: 0.7,
    toneMapped: false,
  });
  const veil = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  });

  return {
    materials: {
      concreteWarm,
      concreteWarmLight,
      concreteDark,
      metal,
      metalSoft,
      ground,
      walkway,
      plaza,
      frame,
      frameBack,
      emissiveGold,
      emissiveGoldSoft,
      emissiveCyan,
      emissiveCyanSoft,
      warmWindow,
      glass,
      wood,
      foliage,
      screen,
      sky,
      star,
      glow,
      contactShadow,
      veil,
    },
    textures: [
      noise,
      groundTexture,
      skyTexture,
      screenTexture,
      starTexture,
      glowTexture,
      shadowTexture,
    ],
  };
}

export function createPosterMaterial(texture: THREE.Texture): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    map: texture,
    toneMapped: false,
    side: THREE.FrontSide,
  });
}

export function createLabelMaterial(texture: THREE.Texture): THREE.MeshBasicMaterial {
  return createSignMaterial(texture);
}
