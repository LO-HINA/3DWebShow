import type { FollowFraming } from '../engine/contracts/types';

export interface WorldBridgeHandlers {
  resetCamera: () => void;
  jump: () => void;
  setSprint: (enabled: boolean) => void;
  toggleLookUp: () => void;
  setFraming: (framing: FollowFraming) => void;
  interact: () => void;
  resetToSpawn: () => void;
  setTouchMove: (x: number, z: number) => void;
}

let current: WorldBridgeHandlers | null = null;

export const worldBridge = {
  resetCamera(): void { current?.resetCamera(); },
  jump(): void { current?.jump(); },
  setSprint(enabled: boolean): void { current?.setSprint(enabled); },
  toggleLookUp(): void { current?.toggleLookUp(); },
  setFraming(framing: FollowFraming): void { current?.setFraming(framing); },
  register(handlers: WorldBridgeHandlers): void {
    current = handlers;
  },
  unregister(handlers: WorldBridgeHandlers): void {
    if (current === handlers) current = null;
  },
  interact(): void {
    current?.interact();
  },
  resetToSpawn(): void {
    current?.resetToSpawn();
  },
  setTouchMove(x: number, z: number): void {
    current?.setTouchMove(x, z);
  },
};
