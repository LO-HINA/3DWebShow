import { Link } from 'react-router-dom';
import { usePageTitle } from '../ui/usePageTitle';

export function NotFoundPage(): React.JSX.Element {
  usePageTitle('页面不存在 · LOHINA WORLD');
  return (
    <div className="subpage notfound-page">
      <main className="notfound">
        <p className="eyebrow">
          <span className="eyebrow__line" />
          404 / OUTSIDE THE BLOCK
        </p>
        <h1>走环路之外了</h1>
        <p>这条岔路没有接入街区。回到中央广场，或者先去图片馆。</p>
        <div className="notfound__actions">
          <Link to="/world" className="btn btn--primary">
            回到街区
          </Link>
          <Link to="/world/gallery" className="btn btn--ghost">
            图片馆
          </Link>
        </div>
      </main>
    </div>
  );
}
