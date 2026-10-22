import { create } from 'zustand';
import type { FocusInfo, QualityLevel, WorldSettings } from '../world/config/types';

export type WorldMode =
  | 'loading'
  | 'intro'
  | 'exploring'
  | 'lightbox'
  | 'directory'
  | 'settings'
  | 'transitioning'
  | 'fallback';

export interface RenderStats {
  fps: number;
  drawCalls: number;
  triangles: number;
}

interface WorldUIState {
  mode: WorldMode;
  bootProgress: number;
  layoutVersion: string;
  focus: FocusInfo | null;
  lockedHint: string | null;
  lightboxId: string | null;
  zone: string;
  hudVisible: boolean;
  toast: { id: number; text: string } | null;
  stats: RenderStats;
  quality: QualityLevel;
  parallax: boolean;
  reducedMotion: boolean;

  setBootProgress: (progress: number) => void;
  setMode: (mode: WorldMode) => void;
  startExploring: () => void;
  setFocus: (focus: FocusInfo | null) => void;
  setLockedHint: (hint: string | null) => void;
  openLightbox: (id: string) => void;
  closeLightbox: () => void;
  openDirectory: () => void;
  openSettings: () => void;
  closeOverlay: () => void;
  setZone: (zone: string) => void;
  toggleHud: () => void;
  showToast: (text: string) => void;
  clearToast: () => void;
  setStats: (stats: RenderStats) => void;
  setQuality: (quality: QualityLevel) => void;
  toggleParallax: () => void;
  toggleReducedMotion: () => void;
  hydrateSettings: (settings: WorldSettings) => void;
  setLayoutVersion: (version: string) => void;
  reset: () => void;
}

let toastCounter = 0;
let toastTimer: number | null = null;

const initialStats: RenderStats = { fps: 0, drawCalls: 0, triangles: 0 };

export const useWorldStore = create<WorldUIState>((set, get) => ({
  mode: 'loading',
  bootProgress: 0,
  layoutVersion: '',
  focus: null,
  lockedHint: null,
  lightboxId: null,
  zone: '中央广场',
  hudVisible: true,
  toast: null,
  stats: initialStats,
  quality: 'high',
  parallax: true,
  reducedMotion: false,

  setBootProgress: (progress) => set({ bootProgress: Math.min(100, Math.max(0, progress)) }),
  setMode: (mode) => set({ mode, ...(mode === 'exploring' ? {} : { toast: null }) }),
  startExploring: () => set({ mode: 'exploring' }),
  setFocus: (focus) => set({ focus }),
  setLockedHint: (lockedHint) => set({ lockedHint }),
  openLightbox: (id) => set({ mode: 'lightbox', lightboxId: id }),
  closeLightbox: () => set({ mode: 'exploring', lightboxId: null }),
  openDirectory: () => {
    if (get().mode === 'exploring') set({ mode: 'directory' });
  },
  openSettings: () => {
    if (get().mode === 'exploring') set({ mode: 'settings' });
  },
  closeOverlay: () => {
    const mode = get().mode;
    if (mode === 'directory' || mode === 'settings') set({ mode: 'exploring' });
  },
  setZone: (zone) => set({ zone }),
  toggleHud: () => set((state) => ({ hudVisible: !state.hudVisible })),
  showToast: (text) => {
    toastCounter += 1;
    if (toastTimer !== null) window.clearTimeout(toastTimer);
    const toast = { id: toastCounter, text };
    set({ toast });
    toastTimer = window.setTimeout(() => {
      if (get().toast?.id === toast.id) set({ toast: null });
    }, 2600);
  },
  clearToast: () => set({ toast: null }),
  setStats: (stats) => set({ stats }),
  setQuality: (quality) => set({ quality }),
  toggleParallax: () => set((state) => ({ parallax: !state.parallax })),
  toggleReducedMotion: () => set((state) => ({ reducedMotion: !state.reducedMotion })),
  hydrateSettings: (settings) =>
    set({
      quality: settings.quality,
      parallax: settings.parallax,
      reducedMotion: settings.reducedMotion,
    }),
  setLayoutVersion: (layoutVersion) => set({ layoutVersion }),
  reset: () =>
    set({
      mode: 'loading',
      bootProgress: 0,
      focus: null,
      lockedHint: null,
      lightboxId: null,
      toast: null,
      stats: initialStats,
    }),
}));
