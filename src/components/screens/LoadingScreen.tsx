import { COPY } from '../../ui/copy';
import { useWorldStore } from '../../state/worldStore';

function stageFor(progress: number): string {
  if (progress < 15) return '准备渲染器与材质';
  if (progress < 32) return '生成程序化建筑';
  if (progress < 52) return '布置广场与街景';
  if (progress < 72) return '校准暮光照明';
  if (progress < 88) return '载入角色与碰撞';
  if (progress < 100) return '编译着色器';
  return '街区就绪';
}

export function LoadingScreen(): React.JSX.Element {
  const progress = useWorldStore((state) => state.bootProgress);
  const rounded = Math.round(progress);

  return (
    <div className="screen screen--loading" role="status" aria-live="polite">
      <div className="loading-mark" aria-hidden="true">
        <span className="loading-mark__ring loading-mark__ring--a" />
        <span className="loading-mark__ring loading-mark__ring--b" />
        <span className="loading-mark__core" />
      </div>
      <div className="loading-wordmark">
        <span>LOHINA</span>
        <span>WORLD</span>
      </div>
      <p className="loading-copy">{COPY.loadingLine}</p>
      <div className="loading-track" aria-hidden="true">
        <span style={{ width: `${rounded}%` }} />
      </div>
      <div className="loading-row">
        <span>{stageFor(progress)}</span>
        <span className="mono">{String(rounded).padStart(3, '0')}%</span>
      </div>
      <p className="loading-note">ROUND 01 · TWILIGHT LEARNING BLOCK</p>
    </div>
  );
}
