import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorldEngine } from '../../world/engine/WorldEngine';
import { useWorldStore } from '../../state/worldStore';
import { saveSnapshot } from '../../world/snapshot';
import type { FocusInfo, PortalSpec } from '../../world/config/types';

export function WorldCanvas(): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    const store = useWorldStore.getState();
    store.reset();

    const handlePortal = (portal: PortalSpec): void => {
      saveSnapshot(
        portal.interaction.returnFeet,
        portal.interaction.returnYawRad,
        portal.id,
      );
      useWorldStore.getState().setMode('transitioning');
      navigate(portal.targetRoute);
    };

    const engine = new WorldEngine(container, {
      onFocus: (focus: FocusInfo | null) => useWorldStore.getState().setFocus(focus),
      onLockedHint: (hint) => useWorldStore.getState().setLockedHint(hint),
      onZone: (zone) => useWorldStore.getState().setZone(zone),
      onStats: (stats) => useWorldStore.getState().setStats(stats),
      onPortal: handlePortal,
    });

    const onPageHide = (): void => engine.saveNow();
    window.addEventListener('pagehide', onPageHide);

    void (async () => {
      try {
        await engine.init((progress) => {
          if (!disposed) useWorldStore.getState().setBootProgress(progress);
        });
        if (disposed) return;
        engine.start();
        useWorldStore
          .getState()
          .setMode(engine.hasRestoredSnapshot ? 'exploring' : 'intro');
      } catch (error) {
        console.error('[LOHINA WORLD] 场景初始化失败', error);
        if (!disposed) useWorldStore.getState().setMode('fallback');
      }
    })();

    return () => {
      disposed = true;
      window.removeEventListener('pagehide', onPageHide);
      engine.dispose();
    };
  }, [navigate]);

  return <div ref={containerRef} className="world-canvas-host" />;
}
