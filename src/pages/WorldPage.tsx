import { useEffect } from 'react';
import { WorldCanvas } from '../components/world/WorldCanvas';
import { Hud } from '../components/hud/Hud';
import { IntroScreen } from '../components/screens/IntroScreen';
import { LoadingScreen } from '../components/screens/LoadingScreen';
import { FallbackScreen } from '../components/screens/FallbackScreen';
import { Lightbox } from '../components/overlays/Lightbox';
import { DirectoryPanel } from '../components/overlays/DirectoryPanel';
import { SettingsPanel } from '../components/overlays/SettingsPanel';
import { TouchControls } from '../components/hud/TouchControls';
import { useWorldStore } from '../state/worldStore';
import { worldBridge } from '../world/bridge';

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
      <WorldCanvas />
      {showHud && <Hud />}
      {mode === 'loading' && <LoadingScreen />}
      {mode === 'intro' && <IntroScreen />}
      {mode === 'fallback' && <FallbackScreen />}
      <Lightbox />
      <DirectoryPanel />
      <SettingsPanel />
      <TouchControls />
    </main>
  );
}
