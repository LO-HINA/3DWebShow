import { useWorldStore } from '../../state/worldStore';
import { COPY } from '../../ui/copy';
import { worldBridge } from '../../world/bridge';
import { zones } from '../../world/config/world';
import { CompassIcon, GridIcon, SlidersIcon } from '../common/Icons';

function zoneIndex(label: string): string {
  const index = zones.findIndex((zone) => zone.label === label);
  return String(index >= 0 ? index + 1 : 0).padStart(2, '0');
}

export function Hud(): React.JSX.Element {
  const mode = useWorldStore((state) => state.mode);
  const hudVisible = useWorldStore((state) => state.hudVisible);
  const zone = useWorldStore((state) => state.zone);
  const focus = useWorldStore((state) => state.focus);
  const lockedHint = useWorldStore((state) => state.lockedHint);
  const stats = useWorldStore((state) => state.stats);
  const quality = useWorldStore((state) => state.quality);
  const toast = useWorldStore((state) => state.toast);
  const openDirectory = useWorldStore((state) => state.openDirectory);
  const openSettings = useWorldStore((state) => state.openSettings);
  const toggleHud = useWorldStore((state) => state.toggleHud);

  const expanded = mode === 'exploring' || mode === 'lightbox' || mode === 'directory' || mode === 'settings';

  if (!hudVisible) {
    return (
      <button type="button" className="hud-restore" onClick={toggleHud}>
        <span className="mono">H</span> 显示界面
      </button>
    );
  }

  return (
    <div className={`hud ${expanded ? '' : 'hud--quiet'}`}>
      <header className="hud__top">
        <div className="brand brand--hud">
          <span className="brand__mark brand__mark--small" aria-hidden="true">
            <span />
            <span />
          </span>
          <span className="brand__text">
            LOHINA <b>WORLD</b>
          </span>
          <span className="brand__sub">{COPY.worldNameCn}</span>
        </div>
        <nav className="hud__actions" aria-label="街区菜单">
          <button type="button" className="hud-btn" onClick={openDirectory}>
            <GridIcon />
            <span>目录</span>
            <kbd>C</kbd>
          </button>
          <button type="button" className="hud-btn" onClick={openSettings}>
            <SlidersIcon />
            <span>设置</span>
          </button>
        </nav>
      </header>

      <div className="hud__zone" aria-live="polite">
        <span className="hud__zone-index mono">{zoneIndex(zone)}</span>
        <span className="hud__zone-rule" aria-hidden="true" />
        <span className="hud__zone-name">{zone}</span>
        <CompassIcon className="hud__zone-icon" />
      </div>

      <div className="hud__bottom">
        <div className="hud__legend">
          <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 行走</span>
          <span className="hud__legend-divider" aria-hidden="true" />
          <span>鼠标 视差</span>
          <span className="hud__legend-divider" aria-hidden="true" />
          <span><kbd>E</kbd> 互动</span>
          <span className="hud__legend-divider" aria-hidden="true" />
          <span><kbd>H</kbd> 隐藏</span>
        </div>
        <div className="hud__stats mono" aria-label="渲染统计">
          <span className={`hud__quality hud__quality--${quality}`}>
            {quality === 'high' ? 'HIGH' : 'SMOOTH'}
          </span>
          <span>{stats.fps > 0 ? `${stats.fps} FPS` : '— FPS'}</span>
          <span>{stats.drawCalls > 0 ? `${stats.drawCalls} DC` : '— DC'}</span>
        </div>
      </div>

      {mode === 'exploring' && (
        <div className="hud__prompt-stack">
          {lockedHint && !focus && (
            <div className="locked-hint">
              <span className="dot dot--cyan" aria-hidden="true" />
              {lockedHint}
            </div>
          )}
          {focus && (
            <button
              type="button"
              className="prompt"
              onClick={() => worldBridge.interact()}
              aria-label={`${focus.verb}：${focus.title}`}
            >
              <span className="prompt__key">E</span>
              <span className="prompt__text">
                <span className="prompt__verb">{focus.verb}</span>
                <span className="prompt__title">
                  <span className="mono">{focus.exhibitId}</span> {focus.title}
                </span>
              </span>
              <span className="prompt__arrow" aria-hidden="true">↗</span>
            </button>
          )}
        </div>
      )}

      {toast && (
        <div className="toast" key={toast.id} role="status">
          <span className="dot dot--gold" aria-hidden="true" />
          {toast.text}
        </div>
      )}
    </div>
  );
}
