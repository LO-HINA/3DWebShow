import { COPY } from '../../ui/copy';
import { useWorldStore } from '../worldStore';

export function IntroScreen(): React.JSX.Element {
  const startExploring = useWorldStore((state) => state.startExploring);
  const zone = useWorldStore((state) => state.zone);

  return (
    <div className="intro">
      <div className="intro__veil" aria-hidden="true" />
      <header className="intro__top">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            <span />
            <span />
          </span>
          <span className="brand__text">
            LOHINA <b>WORLD</b>
          </span>
        </div>
        <div className="intro__meta mono">
          <span>{COPY.round}</span>
          <span>BLOCK / 01</span>
        </div>
      </header>

      <div className="intro__content">
        <p className="eyebrow">
          <span className="eyebrow__line" />
          {COPY.introKicker}
        </p>
        <h1 className="intro__title" aria-label={COPY.worldName}>
          <span className="intro__title-fill">LOHINA</span>
          <span className="intro__title-outline">WORLD</span>
        </h1>
        <p className="intro__cn">暮光学习街区</p>
        <p className="intro__copy">{COPY.introParagraph}</p>
        <div className="intro__actions">
          <button type="button" className="btn btn--primary" onClick={startExploring} autoFocus>
            <span>{COPY.start}</span>
            <kbd>ENTER</kbd>
          </button>
          <span className="intro__hint">{COPY.introHint}</span>
        </div>
      </div>

      <footer className="intro__footer">
        <div className="intro__footer-item">
          <span className="mono">01</span>
          <span>{zone}</span>
        </div>
        <div className="intro__footer-item">
          <span className="mono">02</span>
          <span>W1—W5 近景演示</span>
        </div>
        <div className="intro__footer-item">
          <span className="mono">03</span>
          <span>GALLERY 开放 · 其余两馆预留</span>
        </div>
        <span className="intro__footer-note mono">{COPY.footerLine}</span>
      </footer>
    </div>
  );
}
