import { useWorldStore } from '../worldStore';
import type { CameraDebugSnapshot } from '../../engine/contracts/types';

function deg(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(1)}°` : '—';
}

function meters(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(2)}m` : '—';
}

function ratio(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : '—';
}

function Row({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`camera-debug__row${warn ? ' camera-debug__row--warn' : ''}`}>
      <dt>{label}</dt>
      <dd className="mono">{value}</dd>
    </div>
  );
}

export function CameraDebugPanel(): React.JSX.Element | null {
  const visible = useWorldStore((state) => state.cameraDebugVisible);
  const debug = useWorldStore((state) => state.cameraDebug) as CameraDebugSnapshot | null;
  const close = useWorldStore((state) => state.setCameraDebugVisible);
  if (!visible) return null;

  const pitchGap = debug ? Math.abs(debug.viewPitchUpDeg - debug.targetPitchUpDeg) : 0;
  const collisionText = debug?.collisionHitDistance === null
    ? '无'
    : meters(debug?.collisionHitDistance ?? undefined);

  return (
    <aside className="camera-debug" aria-label="相机调试面板">
      <header className="camera-debug__head">
        <div>
          <strong>CAMERA DEBUG</strong>
          <span className="mono">{debug?.runtime ?? '等待运行时数据'}</span>
        </div>
        <button type="button" className="camera-debug__close" aria-label="关闭调试面板"
          onClick={() => close(false)}>×</button>
      </header>

      {!debug ? (
        <p className="camera-debug__empty">等待引擎采样…</p>
      ) : (
        <>
          <section className="camera-debug__section">
            <h4>视线 <span>水平向上为正</span></h4>
            <dl>
              <Row label="模式" value={debug.mode === 'lookUp' ? 'lookUp / V' : 'follow / 普通拖拽'} />
              <Row label="目标仰角" value={deg(debug.targetPitchUpDeg)} />
              <Row label="平滑仰角" value={deg(debug.actualPitchUpDeg)} />
              <Row label="真实视线仰角" value={deg(debug.viewPitchUpDeg)} warn={pitchGap > 2} />
              <Row label="水平朝向" value={deg(debug.yawDeg)} />
            </dl>
            <p className="camera-debug__note">
              真实视线由最终 camera.getWorldDirection() 反算；与目标差 {deg(pitchGap)}。
            </p>
          </section>

          <section className="camera-debug__section">
            <h4>位置与距离</h4>
            <dl>
              <Row label="相机高度" value={meters(debug.cameraHeight)} />
              <Row label="地面高度" value={meters(debug.groundHeight)} />
              <Row label="期望距离" value={meters(debug.desiredDistance)} />
              <Row label="目标距离" value={meters(debug.targetDistance)} />
              <Row label="碰撞后距离" value={meters(debug.boomLength)} />
              <Row label="期望臂长" value={meters(debug.desiredLength)} />
            </dl>
          </section>

          <section className="camera-debug__section">
            <h4>碰撞</h4>
            <dl>
              <Row label="对象" value={debug.collisionObject} />
              <Row label="命中距离" value={collisionText} />
              <Row label="原始命中" value={debug.collisionRawHitDistance === null ? '无' : meters(debug.collisionRawHitDistance)} />
              <Row label="起点重叠" value={debug.collisionStartOverlap ? '是 · 已启用探针' : '否'} warn={debug.collisionStartOverlap} />
              <Row label="帧间扫掠" value={debug.temporalHitDistance === null ? '无' : meters(debug.temporalHitDistance)} />
              <Row label="球半径" value={meters(debug.sweepRadius)} />
            </dl>
          </section>

          <section className="camera-debug__section">
            <h4>人物弱化</h4>
            <dl>
              <Row label="触发" value={debug.avatarTrigger === 'none' ? '无' : debug.avatarTrigger} />
              <Row label="目标透明度" value={ratio(debug.avatarTargetOpacity)} />
              <Row label="实际透明度" value={ratio(debug.avatarOpacity)} />
              <Row label="材质 α" value={ratio(debug.avatarMaterialOpacity)} />
              <Row label="近距 / 中心" value={`${meters(debug.avatarNearDistance)} / ${meters(debug.avatarCenterDistance)}`} />
              <Row label="屏幕占比" value={`${(debug.avatarScreenHeight * 100).toFixed(0)}%`} />
              <Row label="仰视权重" value={ratio(debug.avatarUpLookFactor)} />
            </dl>
          </section>

          <footer className="camera-debug__foot mono">
            <span>{debug.fps > 0 ? `${debug.fps} FPS` : '— FPS'}</span>
            <span>F3 关闭 · R 复位</span>
          </footer>
        </>
      )}
    </aside>
  );
}
