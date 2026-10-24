import { useWorldStore } from '../../app/worldStore';
import { worldBridge } from '../../app/commands';
import { QUALITY } from '../../engine/core/quality';
import { COPY } from '../../ui/copy';
import { ResetIcon } from '../../ui/Icons';
import { OverlayPanel } from '../../ui/OverlayPanel';

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
  const cameraFraming = useWorldStore((state) => state.cameraFraming);
  const reducedMotion = useWorldStore((state) => state.reducedMotion);
  const layoutVersion = useWorldStore((state) => state.layoutVersion);
  const open = mode === 'settings';
  const closeOverlay = useWorldStore((state) => state.closeOverlay);
  const setQuality = useWorldStore((state) => state.setQuality);
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
        拖动画面可贴近地面并自由仰视高楼，滚轮调整距离；按 R 恢复默认镜头。WASD 始终沿镜头水平方向移动。
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
          精细模式：DPR ≤ {QUALITY.high.dprCap}、{QUALITY.high.shadowMapSize}px 阴影，并开启窗光辉光与湿地面反射；
          流畅模式关闭这些光影增强并降低像素比。
        </p>
      </section>

      <section className="setting-section">
        <header className="setting-section__head">
          <h3>镜头与动态</h3>
          <span className="mono">CAMERA</span>
        </header>
        <div className="segmented" role="group" aria-label="跟随取景">
          {(['low', 'medium', 'high'] as const).map((framing, index) => (
            <button type="button" key={framing} className={cameraFraming === framing ? 'is-active' : ''}
              aria-pressed={cameraFraming === framing} onClick={() => worldBridge.setFraming(framing)}>
              <span>{['低位', '中位', '高位'][index]}</span><span className="mono">{framing.toUpperCase()}</span>
            </button>
          ))}
        </div>
        <p className="setting-note">三个档位作为起始取景，都支持自由俯仰。人物过近或遮挡中心时自动渐隐。V 可切入暂停行走的观赏模式。</p>
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
