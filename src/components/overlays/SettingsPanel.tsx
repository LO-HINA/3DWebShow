import { useWorldStore } from '../../state/worldStore';
import { worldBridge } from '../../world/bridge';
import { QUALITY } from '../../world/config/world';
import { COPY } from '../../ui/copy';
import { ResetIcon } from '../common/Icons';
import { OverlayPanel } from './OverlayPanel';

function SwitchRow({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}): React.JSX.Element {
  return (
    <div className="setting-row">
      <div className="setting-row__body">
        <span className="setting-row__label">{label}</span>
        <span className="setting-row__desc">{description}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`switch ${checked ? 'is-on' : ''}`}
        onClick={onToggle}
      >
        <span className="switch__knob" />
      </button>
    </div>
  );
}

export function SettingsPanel(): React.JSX.Element {
  const mode = useWorldStore((state) => state.mode);
  const quality = useWorldStore((state) => state.quality);
  const parallax = useWorldStore((state) => state.parallax);
  const reducedMotion = useWorldStore((state) => state.reducedMotion);
  const layoutVersion = useWorldStore((state) => state.layoutVersion);
  const open = mode === 'settings';
  const closeOverlay = useWorldStore((state) => state.closeOverlay);
  const setQuality = useWorldStore((state) => state.setQuality);
  const toggleParallax = useWorldStore((state) => state.toggleParallax);
  const toggleReducedMotion = useWorldStore((state) => state.toggleReducedMotion);

  return (
    <OverlayPanel
      open={open}
      onClose={closeOverlay}
      eyebrow="SETTINGS / LOCAL"
      title="显示与操作"
      footer={
        <>
          <span>设置保存在本机浏览器</span>
          <span className="mono">ESC 关闭</span>
        </>
      }
    >
      <p className="overlay__lede">
        首轮街区以稳定行走与清晰阅读为优先。画质切换会即时调整像素比与阴影；减少动态会关闭视差、
        镜头缓动和雕塑旋转。
      </p>

      <section className="setting-section">
        <header className="setting-section__head">
          <h3>画质</h3>
          <span className="mono">RENDER QUALITY</span>
        </header>
        <div className="segmented" role="group" aria-label="画质">
          <button
            type="button"
            className={quality === 'high' ? 'is-active' : ''}
            aria-pressed={quality === 'high'}
            onClick={() => setQuality('high')}
          >
            <span>精细</span>
            <span className="mono">HIGH</span>
          </button>
          <button
            type="button"
            className={quality === 'low' ? 'is-active' : ''}
            aria-pressed={quality === 'low'}
            onClick={() => setQuality('low')}
          >
            <span>流畅</span>
            <span className="mono">SMOOTH</span>
          </button>
        </div>
        <p className="setting-note">
          精细模式：DPR ≤ {QUALITY.high.dprCap}、{QUALITY.high.shadowMapSize}px 阴影；
          流畅模式关闭实时阴影并降低像素比。
        </p>
      </section>

      <section className="setting-section">
        <header className="setting-section__head">
          <h3>镜头与动态</h3>
          <span className="mono">CAMERA</span>
        </header>
        <SwitchRow
          label="鼠标视差"
          description="镜头随指针轻微偏移，最大 ±12°，不改变行走方向。"
          checked={parallax}
          onToggle={toggleParallax}
        />
        <SwitchRow
          label="减少动态"
          description="关闭镜头缓动、角色摆动与双环雕塑旋转。"
          checked={reducedMotion}
          onToggle={toggleReducedMotion}
        />
      </section>

      <section className="setting-section">
        <header className="setting-section__head">
          <h3>位置</h3>
          <span className="mono">RESPAWN</span>
        </header>
        <button
          type="button"
          className="setting-reset"
          onClick={() => {
            worldBridge.resetToSpawn();
            closeOverlay();
          }}
        >
          <ResetIcon />
          <span>
            回到出生点
            <small>清除当前会话中的位置快照</small>
          </span>
        </button>
      </section>

      <section className="setting-section setting-section--meta">
        <div>
          <span className="mono">LAYOUT</span>
          <span>{layoutVersion || 'lohina-block-v1'}</span>
        </div>
        <div>
          <span className="mono">SNAPSHOT</span>
          <span>每 2 秒自动保存到 sessionStorage</span>
        </div>
        <div>
          <span className="mono">NOTE</span>
          <span>{COPY.OVERLAY_HINT}</span>
        </div>
      </section>
    </OverlayPanel>
  );
}
