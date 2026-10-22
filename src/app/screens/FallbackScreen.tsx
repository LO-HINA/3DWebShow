import { Link } from 'react-router-dom';
import { COPY } from '../../ui/copy';

export function FallbackScreen(): React.JSX.Element {
  return (
    <div className="screen screen--fallback">
      <div className="fallback__mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="eyebrow">
        <span className="eyebrow__line" />
        RENDERER UNAVAILABLE
      </p>
      <h1>{COPY.fallbackTitle}</h1>
      <p className="fallback__body">{COPY.fallbackBody}</p>
      <div className="fallback__actions">
        <Link to="/world/gallery" className="btn btn--primary">
          浏览图片馆
        </Link>
        <button type="button" className="btn btn--ghost" onClick={() => window.location.reload()}>
          重新尝试
        </button>
      </div>
      <dl className="fallback__facts">
        <div>
          <dt>需要</dt>
          <dd>WebGL 2 / 硬件加速</dd>
        </div>
        <div>
          <dt>建议</dt>
          <dd>Chrome / Edge 最新版本</dd>
        </div>
        <div>
          <dt>降级</dt>
          <dd>图片与文字内容独立可用</dd>
        </div>
      </dl>
    </div>
  );
}
