import {Link} from 'react-router-dom';
import {observatoryDestinations,observatoryHref} from '../content/observatoryDestinations';
import {usePageTitle} from '../ui/usePageTitle';
import './observatory.css';

export function ObservatoryPage():React.JSX.Element {
  usePageTitle('轨道中枢 · LOHINA WORLD');
  return <div className="observatory-page">
    <header className="observatory-top">
      <Link to="/world" className="observatory-brand">LOHINA <span>WORLD</span></Link>
      <span className="observatory-coordinate">LM-01 / OBSERVATORY</span>
      <Link to="/world" className="observatory-return">返回出生庭 <span aria-hidden="true">↗</span></Link>
    </header>
    <main className="observatory-main">
      <section className="observatory-hero" aria-labelledby="observatory-title">
        <div className="observatory-orbits" aria-hidden="true">
          <div className="observatory-orbit observatory-orbit--earth"><i /></div>
          <div className="observatory-orbit observatory-orbit--moon"><i /></div>
          <span className="observatory-center">01</span><span className="observatory-orbit-label">EARTH / MOON</span>
        </div>
        <div className="observatory-heading">
          <p className="observatory-kicker"><span /> ORBITAL NAVIGATION</p>
          <h1 id="observatory-title">从这里，<br />开启下一段<span>探索。</span></h1>
          <p className="observatory-lede">两条轨道交汇的地方，也是你的起点。选择一个目的地，继续探索作品与新的世界。</p>
          <div className="observatory-status"><span>双轨运行</span><span>中央广场 · 出生庭</span></div>
        </div>
      </section>
      <section className="observatory-destinations" aria-labelledby="destinations-title">
        <div className="observatory-section-head"><h2 id="destinations-title">选择目的地</h2><span>DESTINATIONS / {String(observatoryDestinations.length).padStart(2,'0')}</span></div>
        <div className="observatory-destination-list">
          {observatoryDestinations.map((destination,index)=>{
            const href=destination.target?observatoryHref(destination.target):null;
            const content=<><span className="observatory-destination-number">{String(index+1).padStart(2,'0')}</span>
              <div className="observatory-destination-copy"><span>{destination.category}</span><h3>{destination.title}</h3><p>{destination.description}</p></div>
              <span className="observatory-destination-action">{href?'进入 ↗':'等待接入'}</span></>;
            return href&&destination.target?.kind==='route'
              ?<Link key={destination.id} className="observatory-destination" to={href}>{content}</Link>
              :href?<a key={destination.id} className="observatory-destination" href={href} target="_blank" rel="noopener noreferrer">{content}</a>
              :<div key={destination.id} className="observatory-destination observatory-destination--pending">{content}</div>;
          })}
        </div>
      </section>
      <footer className="observatory-footer"><span>LOHINA WORLD / 轨道中枢</span><span>沿着好奇心，继续前行。</span></footer>
    </main>
  </div>;
}
