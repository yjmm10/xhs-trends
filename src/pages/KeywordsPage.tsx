import { useMemo, useState } from 'react';
import * as echarts from 'echarts';
import EChart from '../components/EChart';
import EmptyState from '../components/EmptyState';
import { keywords } from '../data';

export default function KeywordsPage() {
  const { top, emerging, prevDate, caveat } = keywords;
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return top;
    return top.filter((r) => r.word.toLowerCase().includes(q));
  }, [top, query]);

  const barOption = useMemo<echarts.EChartsOption>(() => {
    const top20 = [...top.slice(0, 20)].reverse();
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 100, right: 40, top: 12, bottom: 28 },
      xAxis: { type: 'value' },
      yAxis: { type: 'category', data: top20.map((r) => r.word), axisLabel: { fontSize: 12 } },
      series: [
        {
          type: 'bar',
          data: top20.map((r) => r.count),
          itemStyle: { color: '#ff2442', borderRadius: [0, 4, 4, 0] },
          barMaxWidth: 18,
        },
      ],
    };
  }, [top]);

  return (
    <div className="page">
      <h1 className="page-title">关键词洞察</h1>
      <p className="page-sub">
        数据日期 {keywords.date} · 对全量技能的名称+描述分词统计（Intl.Segmenter，未登录中文词以 bigram 兜底）
        {prevDate ? ` · 对比 ${prevDate}` : ''}
      </p>

      {caveat && (
        <div className="card">
          <EmptyState title={caveat} detail="再采集一份快照后，将展示词频变化与新涌现关键词" />
        </div>
      )}

      {emerging.length > 0 && (
        <div className="card">
          <h3>🆕 新涌现关键词（上次未出现，本次 ≥3 次）</h3>
          <div>
            {emerging.map((r) => (
              <span key={r.word} className="emerging-tag" title={`${r.prevCount} → ${r.count}`}>
                {r.word} ×{r.count}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h3>高频关键词 TOP20</h3>
        <EChart option={barOption} height={560} />
      </div>

      <div className="card">
        <h3>关键词明细（TOP200）</h3>
        <div className="toolbar">
          <input
            type="search"
            placeholder="搜索关键词…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="count-note">
            {filtered.length} / {top.length} 条 ·「上次」为上一份快照词频
          </span>
        </div>
        <table className="data">
          <thead>
            <tr>
              <th>关键词</th>
              <th>本次词频</th>
              <th>上次词频</th>
              <th>变化</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.word}>
                <td>
                  {r.word}
                  {r.emerging && <span className="badge-new">新涌现</span>}
                </td>
                <td className="num-cell">{r.count.toLocaleString()}</td>
                <td className="num-cell">{prevDate ? r.prevCount.toLocaleString() : '—'}</td>
                <td className="num-cell">
                  {prevDate ? (
                    r.delta > 0 ? (
                      <span className="delta-up">🔥 +{r.delta.toLocaleString()}</span>
                    ) : r.delta < 0 ? (
                      <span className="delta-down">{r.delta.toLocaleString()}</span>
                    ) : (
                      '0'
                    )
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
