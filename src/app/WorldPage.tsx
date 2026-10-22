import { enabledExhibits, frames, getFrameExhibit, portals, frameLocations, portalLocations, FRAME_ORDER, FRAME_LOCATION } from '../worlds/cyberpunk';
import { useEffect } from 'react';
import { WorldHost } from './WorldHost';
import { Hud } from './hud/Hud';
import { IntroScreen } from './screens/IntroScreen';
import { LoadingScreen } from './screens/LoadingScreen';
import { FallbackScreen } from './screens/FallbackScreen';
import { Lightbox } from '../features/lightbox/Lightbox';
import { DirectoryPanel } from '../features/directory/DirectoryPanel';
import { SettingsPanel } from '../features/settings/SettingsPanel';
import { TouchControls } from './hud/TouchControls';
import { CameraDebugPanel } from './hud/CameraDebugPanel';
import { useWorldStore } from './worldStore';
import { worldBridge } from './commands';

function useWorldHotkeys(): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (/input|textarea|select/i.test(target.tagName) || target.isContentEditable)
      ) {
        return;
      }
      const state = useWorldStore.getState();
      if (event.isComposing || event.repeat) return;
      if (event.code === 'KeyR' && state.mode === 'exploring') {
        event.preventDefault();
        worldBridge.resetCamera();
        return;
      }
      if (event.code === 'KeyV' && state.mode === 'exploring') {
        event.preventDefault();
        worldBridge.toggleLookUp();
        return;
      }
      if (event.code === 'Escape' && state.mode === 'exploring' && state.cameraMode === 'lookUp') {
        event.preventDefault();
        worldBridge.toggleLookUp();
        return;
      }
      if (event.code === 'Enter' && state.mode === 'intro') {
        event.preventDefault();
        state.startExploring();
        return;
      }
      if (event.code === 'KeyE' && state.mode === 'exploring') {
        event.preventDefault();
        worldBridge.interact();
        return;
      }
      if (event.code === 'KeyC' && state.mode === 'exploring') {
        event.preventDefault();
        state.openDirectory();
        return;
      }
      if (event.code === 'KeyH' && state.mode !== 'intro' && state.mode !== 'loading') {
        event.preventDefault();
        state.toggleHud();
        return;
      }
      if (event.code === 'F3') {
        event.preventDefault();
        state.toggleCameraDebug();
        return;
      }
      if (event.code === 'Escape') {
        if (state.mode === 'lightbox') {
          event.preventDefault();
          state.closeLightbox();
        } else if (state.mode === 'directory' || state.mode === 'settings') {
          event.preventDefault();
          state.closeOverlay();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

export function WorldPage(): React.JSX.Element {
  useWorldHotkeys();
  const mode = useWorldStore((state) => state.mode);
  const showHud = mode !== 'loading' && mode !== 'intro' && mode !== 'fallback';

  useEffect(() => {
    document.documentElement.classList.add('is-world');
    return () => document.documentElement.classList.remove('is-world');
  }, []);

  return (
    <main className="world">
      <WorldHost />
      {showHud && <Hud />}
      <CameraDebugPanel />
      {mode === 'loading' && <LoadingScreen />}
      {mode === 'intro' && <IntroScreen />}
      {mode === 'fallback' && <FallbackScreen />}
      <Lightbox getFrameExhibit={getFrameExhibit} frameOrder={FRAME_ORDER} frameLocations={FRAME_LOCATION} />
      <DirectoryPanel enabledCount={enabledExhibits.length} frames={frames} getFrameExhibit={getFrameExhibit}
        portals={portals} frameLocations={frameLocations} portalLocations={portalLocations} />
      <SettingsPanel />
      <TouchControls />
    </main>
  );
}
