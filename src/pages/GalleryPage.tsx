import { useState } from 'react';
import { Link } from 'react-router-dom';
import { allArtworks, type ArtworkSpec } from '../content/artworks/index';
import { ArtworkModal } from '../features/lightbox/ArtworkModal';
import { ArrowIcon } from '../ui/Icons';
import { usePageTitle } from '../ui/usePageTitle';

function cardClass(index: number): string {
  if (index === 0) return 'art-card art-card--feature';
  if (index < 5) return 'art-card art-card--wide';
  return 'art-card art-card--tall';
}

export function GalleryPage(): React.JSX.Element {
  usePageTitle('视觉与摄影馆 · LOHINA WORLD');
  const [selected, setSelected] = useState<number | null>(null);
  const selectedArtwork: ArtworkSpec | null =
    selected === null ? null : allArtworks[selected] ?? null;

  const step = (delta: number): void => {
    setSelected((current) => {
      if (current === null) return current;
      return (current + delta + allArtworks.length) % allArtworks.length;
    });
  };

  return (
    <div className="subpage gallery-page">
      <header className="subpage__top">
        <Link to="/world" className="brand brand--link" aria-label="返回 LOHINA WORLD">
          <span className="brand__mark brand__mark--small" aria-hidden="true">
            <span />
            <span />
          </span>
          <span className="brand__text">
            LOHINA <b>WORLD</b>
          </span>
        </Link>
        <Link to="/world" className="btn btn--ghost btn--small">
          返回街区
          <span aria-hidden="true">↩</span>
        </Link>
      </header>

      <main className="gallery">
        <header className="gallery__hero">
          <div className="gallery__hero-main">
            <p className="eyebrow">
              <span className="eyebrow__line" />
              E-01 / GALLERY · VISUAL & PHOTOGRAPHY
            </p>
            <h1>
              视觉与<span>摄影</span>
            </h1>
            <p className="gallery__lede">
              从街区的暖色灯槽走进室内。这里陈列首发轮次的程序化演示图：弧线、砂岩色层、
              导视网格与轨道，共同构成暮光街区的视觉底稿。
            </p>
          </div>
          <aside className="gallery__hero-aside">
            <div className="gallery__stat">
              <span className="gallery__stat-value mono">09</span>
              <span>演示图</span>
            </div>
            <div className="gallery__stat">
              <span className="gallery__stat-value mono">05</span>
              <span>近景展位</span>
            </div>
            <p className="gallery__note">
              全部画面由 Canvas 程序化生成，不依赖外部图库。每幅图均在角落标注“演示图”。
            </p>
          </aside>
        </header>

        <div className="gallery__section-head">
          <span className="mono">COLLECTION / ROUND 01</span>
          <span className="gallery__section-line" aria-hidden="true" />
          <span className="gallery__hint">点击画面查看说明</span>
        </div>

        <section className="gallery__grid" aria-label="演示图画廊">
          {allArtworks.map((artwork, index) => (
            <button
              key={artwork.id}
              type="button"
              className={cardClass(index)}
              onClick={() => setSelected(index)}
              aria-label={`查看 ${artwork.title}`}
            >
              <span className="art-card__image">
                <img
                  src={artwork.previewUrl}
                  alt={artwork.alt}
                  width={artwork.width}
                  height={artwork.height}
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
                <span className="art-card__badge">演示图</span>
                <span className="art-card__arrow" aria-hidden="true">
                  <ArrowIcon size={14} />
                </span>
              </span>
              <span className="art-card__meta">
                <span className="art-card__title-row">
                  <span className="mono">{artwork.id}</span>
                  <span className="art-card__title">{artwork.title}</span>
                </span>
                <span className="art-card__desc">{artwork.description}</span>
              </span>
            </button>
          ))}
        </section>

        <footer className="gallery__footer">
          <div>
            <p className="eyebrow eyebrow--small">
              <span className="eyebrow__line" />
              END OF COLLECTION
            </p>
            <p>
              正式作品接入后，只需替换展位与灯箱的图片来源，街区中的画框、导视与浏览路径保持不变。
            </p>
          </div>
          <Link to="/world" className="btn btn--primary">
            回到街区
            <span aria-hidden="true">→</span>
          </Link>
        </footer>
      </main>

      <ArtworkModal
        artwork={selectedArtwork}
        onClose={() => setSelected(null)}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
      />
    </div>
  );
}
