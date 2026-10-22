import { useCallback, useEffect, useRef, useState } from 'react';
import { useWorldStore } from '../../app/worldStore';
import { getArtwork } from '../../content/artworks/index';
import type { FrameExhibitSpec } from '../../engine/contracts/types';
import { CloseIcon } from '../../ui/Icons';

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

interface LightboxProps {
  getFrameExhibit: (id: string) => FrameExhibitSpec | undefined;
  frameOrder: readonly string[];
  frameLocations: Readonly<Record<string, string>>;
}

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export function Lightbox({ getFrameExhibit, frameOrder, frameLocations }: LightboxProps): React.JSX.Element | null {
  const mode = useWorldStore((state) => state.mode);
  const id = useWorldStore((state) => state.lightboxId);
  const closeLightbox = useWorldStore((state) => state.closeLightbox);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const stageRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
  } | null>(null);

  const exhibit = id ? getFrameExhibit(id) : undefined;
  const artwork = id ? getArtwork(id) : undefined;

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [id]);

  useEffect(() => {
    if (mode !== 'lightbox') return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    return () => previous?.focus();
  }, [mode]);

  useEffect(() => {
    if (mode !== 'lightbox') return;
    const node = window;
    const onKey = (event: KeyboardEvent): void => {
      if (event.code === 'Equal' || event.code === 'NumpadAdd') {
        event.preventDefault();
        setZoom((value) => clampZoom(value * 1.18));
      } else if (event.code === 'Minus' || event.code === 'NumpadSubtract') {
        event.preventDefault();
        setZoom((value) => clampZoom(value / 1.18));
      } else if (event.code === 'Digit0') {
        event.preventDefault();
        setZoom(1);
        setPan({ x: 0, y: 0 });
      } else if (event.code === 'Tab') {
        const root = stageRef.current?.closest('.lightbox');
        if (!root) return;
        const focusables = Array.from(
          root.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])'),
        ).filter((element) => !element.hasAttribute('disabled'));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    node.addEventListener('keydown', onKey);
    return () => node.removeEventListener('keydown', onKey);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'lightbox') return;
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent): void => {
      event.preventDefault();
      setZoom((value) => clampZoom(value * (event.deltaY < 0 ? 1.1 : 0.9)));
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [mode]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (zoom <= 1) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    },
    [pan, zoom],
  );

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const limit = 260;
    setPan({
      x: Math.max(-limit, Math.min(limit, drag.panX + event.clientX - drag.startX)),
      y: Math.max(-limit, Math.min(limit, drag.panY + event.clientY - drag.startY)),
    });
  }, []);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
  }, []);

  if (mode !== 'lightbox' || !exhibit || !artwork) return null;

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lightbox-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeLightbox();
      }}
    >
      <div className="lightbox__scrim" aria-hidden="true" />
      <div className="lightbox__shell">
        <header className="lightbox__bar">
          <div className="lightbox__crumb mono">
            <span>{exhibit.id}</span>
            <span className="lightbox__crumb-line" aria-hidden="true" />
            <span>IMAGE EXHIBIT / 近景灯箱</span>
          </div>
          <button ref={closeRef} type="button" className="lightbox__close" onClick={closeLightbox}>
            <CloseIcon />
            <span>关闭</span>
            <kbd>ESC</kbd>
          </button>
        </header>

        <div className="lightbox__body">
          <div
            ref={stageRef}
            className={`lightbox__stage ${zoom > 1 ? 'is-zoomed' : ''}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onDoubleClick={() => {
              setZoom((value) => (value > 1 ? 1 : 2));
              setPan({ x: 0, y: 0 });
            }}
          >
            <div className="lightbox__grid" aria-hidden="true" />
            <img
              src={artwork.previewUrl}
              alt={artwork.alt}
              width={artwork.width}
              height={artwork.height}
              draggable={false}
              className="lightbox__image"
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
              }}
            />
            <span className="lightbox__demo">演示图</span>
            <div className="lightbox__tips mono">
              <span>滚轮 / ＋− 缩放</span>
              <span>{zoom > 1 ? '拖动查看局部 · 双击复位' : '双击放大'}</span>
            </div>
          </div>

          <aside className="lightbox__info">
            <div className="lightbox__index mono">
              {exhibit.id} ·{' '}
              {String(
                Math.max(1, frameOrder.indexOf(exhibit.id as (typeof frameOrder)[number]) + 1),
              ).padStart(2, '0')}{' '}
              / {String(frameOrder.length).padStart(2, '0')}
            </div>
            <h2 id="lightbox-title">{exhibit.title}</h2>
            <p className="lightbox__desc">{exhibit.description}</p>

            <dl className="lightbox__facts">
              <div>
                <dt>类别</dt>
                <dd>程序化演示图</dd>
              </div>
              <div>
                <dt>尺寸</dt>
                <dd className="mono">
                  {artwork.width} × {artwork.height}
                </dd>
              </div>
              <div>
                <dt>画框</dt>
                <dd>{exhibit.frame.lit ? '点亮的暖色灯槽' : '未点亮的低调边框'}</dd>
              </div>
              <div>
                <dt>位置</dt>
                <dd>{frameLocations[exhibit.id] ?? '环路展位'}</dd>
              </div>
            </dl>

            <div className="lightbox__zoom" role="group" aria-label="图片缩放">
              <button
                type="button"
                onClick={() => setZoom((value) => clampZoom(value / 1.18))}
                aria-label="缩小"
              >
                −
              </button>
              <span className="mono">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoom((value) => clampZoom(value * 1.18))}
                aria-label="放大"
              >
                ＋
              </button>
              <button
                type="button"
                className="lightbox__reset"
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }}
              >
                复位 <kbd>0</kbd>
              </button>
            </div>

            <p className="lightbox__attribution">{artwork.attribution}</p>
            <p className="lightbox__return">关闭后回到街区原位，行走状态自动恢复。</p>
          </aside>
        </div>
      </div>
    </div>
  );
}
