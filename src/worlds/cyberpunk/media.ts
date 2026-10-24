import * as THREE from 'three';

/**
 * 媒体塔素材通道。
 * 浏览器无法列目录，所有素材通过 manifest.json 显式登记。
 * 图片与视频各自独立轮播，互不阻塞：图片带始终有内容，视频墙只负责视频。
 */

const MEDIA_BASE = '/assets/worlds/cyberpunk/media/';
const MAX_IMAGES = 10;
const DEFAULT_IMAGE_DURATION = 8;
const FALLBACK_ASPECT = 16 / 9;

export type MediaFit = 'cover' | 'contain';

export interface MediaFrame {
  texture: THREE.Texture;
  aspect: number;
}

export interface MediaChannel {
  readonly frame: MediaFrame | null;
  subscribe(listener: (frame: MediaFrame | null) => void): () => void;
  update(delta: number): void;
  dispose(): void;
}

export interface MediaManifest {
  images: string[];
  videos: string[];
  imageDuration: number;
  videoFit: MediaFit;
}

interface RawManifest {
  images?: unknown;
  videos?: unknown;
  imageDuration?: unknown;
  videoFit?: unknown;
}

export function mediaAssetUrl(path: string): string {
  if (/^(?:https?:|blob:|data:|\/)/i.test(path)) return path;
  return `${MEDIA_BASE}${path.replace(/^\.?\//, '')}`;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

export async function loadMediaManifest(): Promise<MediaManifest> {
  const empty: MediaManifest = {
    images: [],
    videos: [],
    imageDuration: DEFAULT_IMAGE_DURATION,
    videoFit: 'cover',
  };
  try {
    const response = await fetch(`${MEDIA_BASE}manifest.json`, { cache: 'no-cache' });
    if (!response.ok) return empty;
    const raw = (await response.json()) as RawManifest;
    const duration = Number(raw.imageDuration);
    return {
      images: stringList(raw.images),
      videos: stringList(raw.videos),
      imageDuration: Number.isFinite(duration) && duration >= 2 ? duration : DEFAULT_IMAGE_DURATION,
      videoFit: raw.videoFit === 'contain' ? 'contain' : 'cover',
    };
  } catch (error) {
    console.warn('[media] manifest.json 读取失败，媒体塔将使用待机画面。', error);
    return empty;
  }
}

export function createImageChannel(
  urls: string[],
  anisotropy: number,
  duration: number,
): MediaChannel {
  const loader = new THREE.TextureLoader();
  const listeners = new Set<(frame: MediaFrame | null) => void>();
  let frames: MediaFrame[] = [];
  let current: MediaFrame | null = null;
  let index = 0;
  let elapsed = 0;
  let disposed = false;

  const emit = (): void => {
    for (const listener of listeners) listener(current);
  };

  void Promise.all(
    urls.slice(0, MAX_IMAGES).map(async (url): Promise<MediaFrame | null> => {
      try {
        const texture = await loader.loadAsync(mediaAssetUrl(url));
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = anisotropy;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        const image = texture.image as { width?: number; height?: number } | undefined;
        const width = image?.width ?? 16;
        const height = image?.height ?? 9;
        return { texture, aspect: height > 0 ? width / height : FALLBACK_ASPECT };
      } catch (error) {
        console.warn(`[media] 图片加载失败：${url}`, error);
        return null;
      }
    }),
  ).then((loaded) => {
    const ready = loaded.filter((item): item is MediaFrame => item !== null);
    if (disposed) {
      for (const frame of ready) frame.texture.dispose();
      return;
    }
    frames = ready;
    if (frames.length > 0) {
      current = frames[0];
      emit();
    }
  });

  return {
    get frame() {
      return current;
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(current);
      return () => listeners.delete(listener);
    },
    update(delta) {
      if (frames.length < 2) return;
      elapsed += delta;
      if (elapsed < duration) return;
      elapsed = 0;
      index = (index + 1) % frames.length;
      current = frames[index];
      emit();
    },
    dispose() {
      disposed = true;
      listeners.clear();
      for (const frame of frames) frame.texture.dispose();
      frames = [];
      current = null;
    },
  };
}

export function createVideoChannel(urls: string[]): MediaChannel {
  const listeners = new Set<(frame: MediaFrame | null) => void>();
  let current: MediaFrame | null = null;
  let index = 0;
  let disposed = false;
  let retry: number | null = null;

  if (urls.length === 0) {
    return {
      frame: null,
      subscribe(listener) {
        listeners.add(listener);
        listener(null);
        return () => listeners.delete(listener);
      },
      update() {},
      dispose() {
        listeners.clear();
      },
    };
  }

  const video = document.createElement('video');
  video.muted = true;
  video.defaultMuted = true;
  video.loop = false;
  video.playsInline = true;
  video.preload = 'auto';
  video.crossOrigin = 'anonymous';
  video.setAttribute('playsinline', '');
  video.style.display = 'none';

  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const emit = (): void => {
    for (const listener of listeners) listener(current);
  };

  const play = (next: number): void => {
    if (disposed) return;
    index = next % urls.length;
    video.pause();
    video.src = mediaAssetUrl(urls[index]);
    video.load();
    void video.play().catch((error: unknown) => {
      console.warn(`[media] 视频无法自动播放：${urls[index]}`, error);
    });
  };

  const advance = (): void => {
    if (disposed) return;
    play(index + 1);
  };

  const onMetadata = (): void => {
    if (!Number.isFinite(video.videoWidth) || video.videoWidth === 0) return;
    current = { texture, aspect: video.videoWidth / video.videoHeight };
    emit();
  };

  const onError = (): void => {
    console.warn(`[media] 视频加载失败：${urls[index]}`);
    if (retry !== null) window.clearTimeout(retry);
    retry = window.setTimeout(() => {
      retry = null;
      advance();
    }, 1500);
  };

  video.addEventListener('loadedmetadata', onMetadata);
  video.addEventListener('ended', advance);
  video.addEventListener('error', onError);

  play(0);

  return {
    get frame() {
      return current;
    },
    subscribe(listener) {
      listeners.add(listener);
      listener(current);
      return () => listeners.delete(listener);
    },
    update() {},
    dispose() {
      disposed = true;
      listeners.clear();
      if (retry !== null) window.clearTimeout(retry);
      video.removeEventListener('loadedmetadata', onMetadata);
      video.removeEventListener('ended', advance);
      video.removeEventListener('error', onError);
      video.pause();
      video.removeAttribute('src');
      video.load();
      texture.dispose();
      current = null;
    },
  };
}
