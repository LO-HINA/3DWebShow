import { useEffect, useRef } from 'react';
import type { ArtworkSpec } from '../../content/artworks/index';
import { CloseIcon } from '../../ui/Icons';

interface ArtworkModalProps {
  artwork: ArtworkSpec | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export function ArtworkModal({ artwork, onClose, onPrev, onNext }: ArtworkModalProps): React.JSX.Element | null {
  const closeRef = useRef<HTMLButtonElement>(null);
  const previous = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!artwork) return;
    previous.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    return () => previous.current?.focus();
  }, [artwork]);

  useEffect(() => {
    if (!artwork) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.code === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.code === 'ArrowLeft' && onPrev) {
        onPrev();
      } else if (event.code === 'ArrowRight' && onNext) {
        onNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [artwork, onClose, onNext, onPrev]);

  if (!artwork) return null;

  return (
    <div
      className="viewer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="viewer-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="viewer__scrim" aria-hidden="true" />
      <div className="viewer__panel">
        <header className="viewer__bar">
          <span className="mono">
            {artwork.id} / GALLERY ARCHIVE
          </span>
          <div className="viewer__nav">
            {onPrev && (
              <button type="button" onClick={onPrev} aria-label="上一幅">
                ←
              </button>
            )}
            {onNext && (
              <button type="button" onClick={onNext} aria-label="下一幅">
                →
              </button>
            )}
            <button ref={closeRef} type="button" className="viewer__close" onClick={onClose}>
              <CloseIcon />
              <span>关闭</span>
              <kbd>ESC</kbd>
            </button>
          </div>
        </header>
        <div className="viewer__body">
          <figure className="viewer__figure">
            <img src={artwork.previewUrl} alt={artwork.alt} width={artwork.width} height={artwork.height} />
            <span className="viewer__badge">演示图</span>
          </figure>
          <div className="viewer__info">
            <span className="mono viewer__index">{artwork.id}</span>
            <h2 id="viewer-title">{artwork.title}</h2>
            <p>{artwork.description}</p>
            <dl>
              <div>
                <dt>尺寸</dt>
                <dd className="mono">
                  {artwork.width} × {artwork.height}
                </dd>
              </div>
              <div>
                <dt>出处</dt>
                <dd>E-01 视觉与摄影馆</dd>
              </div>
            </dl>
            <p className="viewer__attribution">{artwork.attribution}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
