import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { WorldPage } from './WorldPage';
import { GalleryPage } from '../pages/GalleryPage';
import { ComingSoonPage } from '../pages/ComingSoonPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import {ObservatoryPage} from '../pages/ObservatoryPage';

function ScrollToTop(): null {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

export default function App(): React.JSX.Element {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Navigate to="/world" replace />} />
        <Route path="/world" element={<WorldPage />} />
        <Route path="/world/gallery" element={<GalleryPage />} />
        <Route path="/world/observatory" element={<ObservatoryPage />} />
        <Route path="/world/learning" element={<ComingSoonPage variant="learning" />} />
        <Route path="/world/ai-lab" element={<ComingSoonPage variant="ai" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
