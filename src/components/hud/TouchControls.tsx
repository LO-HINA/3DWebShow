import { useEffect, useRef, useState } from 'react';
import { useWorldStore } from '../../state/worldStore';
import { worldBridge } from '../../world/bridge';

export function TouchControls(): React.JSX.Element | null {
  const mode = useWorldStore((state) => state.mode);
  const focus = useWorldStore((state) => state.focus);
  const baseRef = useRef<HTMLDivElement>(null);
  const activePointer = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  useEffect(() => {
    return () => worldBridge.setTouchMove(0, 0);
  }, []);

  if (mode !== 'exploring') return null;

  const updateFromPointer = (event: React.PointerEvent<HTMLDivElement>): void => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = rect.width * 0.34;
    let dx = event.clientX - centerX;
    let dy = event.clientY - centerY;
    const length = Math.hypot(dx, dy);
    if (length > radius) {
      dx = (dx / length) * radius;
      dy = (dy / length) * radius;
    }
    setKnob({ x: dx, y: dy });
    const deadzone = 0.14;
    let nx = dx / radius;
    let ny = dy / radius;
    if (Math.hypot(nx, ny) < deadzone) {
      nx = 0;
      ny = 0;
    }
    worldBridge.setTouchMove(nx, ny);
  };

  const release = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (activePointer.current !== event.pointerId) return;
    activePointer.current = null;
    setActive(false);
    setKnob({ x: 0, y: 0 });
    worldBridge.setTouchMove(0, 0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div className="touch">
      <div className="touch__joystick-wrap">
        <span className="touch__label mono">MOVE</span>
        <div
          ref={baseRef}
          className={`touch__joystick ${active ? 'is-active' : ''}`}
          role="application"
          aria-label="移动摇杆"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            activePointer.current = event.pointerId;
            setActive(true);
            event.currentTarget.setPointerCapture(event.pointerId);
            updateFromPointer(event);
          }}
          onPointerMove={(event) => {
            if (activePointer.current !== event.pointerId) return;
            event.preventDefault();
            updateFromPointer(event);
          }}
          onPointerUp={release}
          onPointerCancel={release}
        >
          <span
            className="touch__knob"
            style={{ transform: `translate3d(${knob.x}px, ${knob.y}px, 0)` }}
          />
        </div>
      </div>

      {focus && (
        <button
          type="button"
          className="touch__interact"
          onClick={() => worldBridge.interact()}
          aria-label={`${focus.verb}：${focus.title}`}
        >
          <span className="touch__interact-key">E</span>
          <span>{focus.verb}</span>
        </button>
      )}
    </div>
  );
}
