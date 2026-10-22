import { useWorldStore } from '../../app/worldStore';
import type { FrameExhibitSpec, PortalSpec } from '../../engine/contracts/types';
import { getArtwork } from '../../content/artworks/index';
import { LockIcon } from '../../ui/Icons';
import { OverlayPanel } from '../../ui/OverlayPanel';

interface DirectoryPanelProps {
  enabledCount: number;
  frames: readonly { exhibitId: string; lit: boolean }[];
  getFrameExhibit: (id: string) => FrameExhibitSpec | undefined;
  portals: readonly PortalSpec[];
  frameLocations: Readonly<Record<string, string>>;
  portalLocations: Readonly<Record<string, string>>;
}

export function DirectoryPanel({ enabledCount, frames, getFrameExhibit, portals, frameLocations, portalLocations }: DirectoryPanelProps): React.JSX.Element {
  const mode = useWorldStore((state) => state.mode);
  const closeOverlay = useWorldStore((state) => state.closeOverlay);
  const open = mode === 'directory';

  return (
    <OverlayPanel
      open={open}
      onClose={closeOverlay}
      eyebrow="DIRECTORY / BLOCK 01"
      title="街区目录"
      footer={
        <>
          <span>近景展位需步行靠近后开启</span>
          <span className="mono">ESC 关闭</span>
        </>
      }
    >
      <p className="overlay__lede">
        八处展位沿环路展开。西侧图片街聚集五幅近景演示，东侧小院保留两幅安静的画面；
        三座展馆中，视觉与摄影馆本轮开放，学习馆与 AI 终端亭保留入口标识。
      </p>

      <div className="overlay__counts">
        <span>
          <b>{enabledCount}</b> 已启用
        </span>
        <span className="overlay__count-line" aria-hidden="true" />
        <span>
          <b>02</b> 下一轮开放
        </span>
        <span className="overlay__count-line" aria-hidden="true" />
        <span className="mono">LAYOUT V1</span>
      </div>

      <section className="directory-section">
        <header className="directory-section__head">
          <h3>图片展位</h3>
          <span className="mono">W1 — W5 · IMAGE FRAMES</span>
        </header>
        <ul className="directory-list">
          {frames.map((frame) => {
            const exhibit = getFrameExhibit(frame.exhibitId);
            const artwork = getArtwork(frame.exhibitId);
            if (!exhibit) return null;
            return (
              <li key={frame.exhibitId} className="directory-row">
                <img
                  className="directory-row__thumb"
                  src={artwork.previewUrl}
                  alt=""
                  loading="lazy"
                  width={96}
                  height={60}
                />
                <div className="directory-row__body">
                  <div className="directory-row__title">
                    <span className="mono">{frame.exhibitId}</span>
                    {exhibit.title}
                  </div>
                  <div className="directory-row__meta">{frameLocations[frame.exhibitId]}</div>
                </div>
                <span className={`tag ${frame.lit ? 'tag--gold' : 'tag--muted'}`}>
                  {frame.lit ? '近景可看' : '低调展位'}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="directory-section">
        <header className="directory-section__head">
          <h3>展馆入口</h3>
          <span className="mono">E-01 — E-03 · PORTALS</span>
        </header>
        <ul className="directory-list">
          {portals.map((portal) => (
            <li key={portal.id} className={`directory-row ${portal.enabled ? '' : 'is-locked'}`}>
              <span className={`directory-row__index mono ${portal.accent === 'cyan' ? 'is-cyan' : ''}`}>
                {portal.id}
              </span>
              <div className="directory-row__body">
                <div className="directory-row__title">{portal.title}</div>
                <div className="directory-row__meta">
                  {portalLocations[portal.id]}
                  {!portal.enabled && ' · 本轮不提供传送'}
                </div>
              </div>
              <span className={`tag ${portal.enabled ? 'tag--cyan' : 'tag--muted'}`}>
                {portal.enabled ? (
                  '开放 · 可进入'
                ) : (
                  <>
                    <LockIcon size={12} /> 下一轮开放
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="overlay__callout">
        <span className="overlay__callout-mark" aria-hidden="true" />
        <p>
          灯箱与展馆页面会暂停行走并保存位置；关闭后回到街区原位。画框背后的交互点不会触发，
          需要走到画面正前方。
        </p>
      </div>
    </OverlayPanel>
  );
}
