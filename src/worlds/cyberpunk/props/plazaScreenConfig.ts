import type { BoxColliderSpec, Vec3 } from '../../../engine/contracts/types';

/** position 是地面根节点，正面为局部 +Z；width / height 指有效画面尺寸。 */
export interface PlazaScreenSpec {
  id: string;
  position: Vec3;
  yawRad: number;
  width: number;
  height: number;
  imageUrl: string;
  bottom?: number;
  frameWidth?: number;
  depth?: number;
}

export function screenDimensions(spec: PlazaScreenSpec) {
  const bottom = spec.bottom ?? 2.6;
  const frame = spec.frameWidth ?? 0.12;
  const depth = spec.depth ?? 0.34;
  if (![...spec.position, spec.yawRad, spec.width, spec.height, bottom, frame, depth].every(Number.isFinite) ||
    spec.width < 1 || spec.height < 0.5 || bottom < 0.5 || frame <= 0 || depth < 0.1) {
    throw new Error(`Invalid plaza screen dimensions: ${spec.id}`);
  }
  return { bottom, frame, depth, outerWidth: spec.width + frame * 2,
    outerHeight: spec.height + frame * 2, centerY: bottom + spec.height / 2,
    supportX: spec.width * 0.36, footWidth: Math.min(0.85, spec.width * 0.16), footDepth: 1.0 };
}

/** 与外观共享尺寸，旋转和高空屏体也参与角色及镜头碰撞。 */
export function createPlazaScreenColliders(spec: PlazaScreenSpec): BoxColliderSpec[] {
  const d = screenDimensions(spec);
  const cos = Math.cos(spec.yawRad), sin = Math.sin(spec.yawRad);
  const box = (id: string, x: number, y: number, z: number, size: Vec3): BoxColliderSpec => ({
    kind: 'box', id: `${spec.id}:${id}`, size, yawRad: spec.yawRad,
    center: [spec.position[0] + x * cos + z * sin, spec.position[1] + y,
      spec.position[2] - x * sin + z * cos],
  });
  return [
    box('panel', 0, d.centerY, 0, [d.outerWidth, d.outerHeight, d.depth]),
    ...[-1, 1].flatMap(side => [
      box(`support-${side}`, side * d.supportX, d.bottom / 2, 0, [0.18, d.bottom, 0.24]),
      box(`foot-${side}`, side * d.supportX, 0.09, 0, [d.footWidth, 0.18, d.footDepth]),
    ]),
  ];
}

/** 保持原图完整，不拉伸；非 16:9 图片在屏幕内留暗边。 */
export function fitScreenImage(width: number, height: number, imageWidth: number, imageHeight: number) {
  const aspect = imageWidth / imageHeight;
  return aspect > width / height ? [width, width / aspect] as const : [height * aspect, height] as const;
}
