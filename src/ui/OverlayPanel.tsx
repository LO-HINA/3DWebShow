import { useEffect, useRef } from 'react';
import { CloseIcon } from './Icons';

interface OverlayPanelProps {
  open: boolean;
  onClose: () => void;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'narrow' | 'wide';
}

export function OverlayPanel({
  open,
  onClose,
  eyebrow,
  title,
  children,
  footer,
  width = 'narrow',
}: OverlayPanelProps): React.JSX.Element | null {
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    return () => previousFocus.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="overlay-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="overlay__scrim" aria-hidden="true" />
      <aside className={`overlay__panel overlay__panel--${width}`}>
        <header className="overlay__head">
          <div>
            <p className="eyebrow eyebrow--small">
              <span className="eyebrow__line" />
              {eyebrow}
            </p>
            <h2 id="overlay-title">{title}</h2>
          </div>
          <button ref={closeRef} type="button" className="overlay__close" onClick={onClose} aria-label="关闭面板">
            <CloseIcon size={18} />
          </button>
        </header>
        <div className="overlay__content">{children}</div>
        {footer && <footer className="overlay__footer">{footer}</footer>}
      </aside>
    </div>
  );
}
