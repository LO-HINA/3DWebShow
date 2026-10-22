import { Link } from 'react-router-dom';
import { usePageTitle } from '../ui/usePageTitle';

interface ComingSoonPageProps {
  variant: 'learning' | 'ai';
}

const content = {
  learning: {
    code: 'E-02',
    title: '前端与算法',
    english: 'LEARNING HALL',
    lede:
      '学习馆的体量、入口门洞与青色标识已经落位，但内部内容保留到下一轮。本轮不提供传送，也不展示尚未完成的功能。',
    plans: [
      { title: '排序可视化', detail: '把快排、归并的交换过程放进可步进的画布。' },
      { title: '算法学习卡片', detail: '用同一套视觉语言解释复杂度与边界条件。' },
      { title: '前端实验台', detail: '记录布局、动效与性能取舍的可复现片段。' },
    ],
    titleTag: '前端与算法学习馆 · LOHINA WORLD',
  },
  ai: {
    code: 'E-03',
    title: 'AI 与工具',
    english: 'AI TERMINAL',
    lede:
      '终端亭的屏幕已经亮起，入口保持清晰标识，但本轮不开放。下一轮将接入无需密钥的注意力矩阵教学模拟，而不是假装成可用的在线服务。',
    plans: [
      { title: '注意力矩阵', detail: '用可控的教学数据展示 token 之间的权重分布。' },
      { title: '工具笔记', detail: '整理提示词、检索与评测的实际使用记录。' },
      { title: '离线演示', detail: '所有模拟在本机运行，不需要 API 密钥。' },
    ],
    titleTag: 'AI 终端亭 · LOHINA WORLD',
  },
} as const;

export function ComingSoonPage({ variant }: ComingSoonPageProps): React.JSX.Element {
  const data = content[variant];
  usePageTitle(data.titleTag);

  return (
    <div className="subpage coming-page">
      <header className="subpage__top">
        <Link to="/world" className="brand brand--link" aria-label="返回 LOHINA WORLD">
          <span className="brand__mark brand__mark--small" aria-hidden="true">
            <span />
            <span />
          </span>
          <span className="brand__text">
            LOHINA <b>WORLD</b>
          </span>
        </Link>
        <Link to="/world" className="btn btn--ghost btn--small">
          返回街区
          <span aria-hidden="true">↩</span>
        </Link>
      </header>

      <main className="coming">
        <div className="coming__ghost mono" aria-hidden="true">
          {data.code}
        </div>
        <p className="eyebrow">
          <span className="eyebrow__line" />
          {data.code} / {data.english} · 下一轮开放
        </p>
        <h1>{data.title}</h1>
        <p className="coming__lede">{data.lede}</p>

        <div className="coming__status">
          <span className="dot dot--gold" aria-hidden="true" />
          本轮状态：入口标识已落位，内容未接入
        </div>

        <section className="coming__plans" aria-label="下一轮计划">
          {data.plans.map((plan, index) => (
            <article key={plan.title} className="coming__plan">
              <span className="mono">0{index + 1}</span>
              <h2>{plan.title}</h2>
              <p>{plan.detail}</p>
              <span className="tag tag--muted">下一轮</span>
            </article>
          ))}
        </section>

        <div className="coming__actions">
          <Link to="/world/gallery" className="btn btn--primary">
            先看视觉与摄影馆
          </Link>
          <Link to="/world" className="btn btn--ghost">
            回到街区
          </Link>
        </div>
      </main>
    </div>
  );
}
