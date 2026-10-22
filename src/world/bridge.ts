export interface WorldBridgeHandlers {
  interact: () => void;
  resetToSpawn: () => void;
  setTouchMove: (x: number, z: number) => void;
}

let current: WorldBridgeHandlers | null = null;

export const worldBridge = {
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
