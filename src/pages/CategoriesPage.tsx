import { useMemo } from 'react';
import * as echarts from 'echarts';
import EChart from '../components/EChart';
import { categories } from '../data';

export default function CategoriesPage() {
  const { current, history, caveat, total } = categories;

  const barOption = useMemo<echarts.EChartsOption>(() => {
    const sorted = [...current].reverse(); // 横向条形图自下而上
    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: unknown) => {
          const p = (params as { name: string; value: number }[])[0];
          const share = ((p.value / total) * 100).toFixed(1);
          return `${p.name}：${p.value.toLocaleString()}（${share}%）`;
        },
      },
      grid: { left: 90, right: 40, top: 12, bottom: 28 },
      xAxis: { type: 'value' },
      yAxis: {
        type: 'category',
        data: sorted.map((c) => c.category),
        axisLabel: { fontSize: 12 },
      },
      series: [
        {
          type: 'bar',
          data: sorted.map((c) => c.count),
          itemStyle: { color: '#ff2442', borderRadius: [0, 4, 4, 0] },
          barMaxWidth: 22,
          label: {
            show: true,
            position: 'right',
            formatter: (params) => Number((params as { value: number }).value).toLocaleString(),
          },
        },
      ],
    };
  }, [current, total]);

  const trendOption = useMemo<echarts.EChartsOption>(() => {
    const cats = current.slice(0, 6).map((c) => c.category);
    const palette = ['#ff2442', '#ffb100', '#00b42a', '#3491fa', '#722ed1', '#14c9c9'];
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: cats, top: 0, type: 'scroll' },
      grid: { left: 48, right: 24, top: 40, bottom: 32 },
      xAxis: { type: 'category', data: history.map((h) => h.date) },
      yAxis: { type: 'value' },
      series: cats.map((cat, i) => ({
        name: cat,
        type: 'line' as const,
        smooth: true,
        showSymbol: history.length <= 30,
        data: history.map((h) => h.counts[cat] ?? 0),
        itemStyle: { color: palette[i % palette.length] },
      })),
    };
  }, [current, history]);

  return (
    <div className="page">
      <h1 className="page-title">赛道分布</h1>
      <p className="page-sub">
        数据日期 {categories.date} · 共 {total.toLocaleString()} 个技能
      </p>

      <div className="card">
        <h3>当前赛道分布</h3>
        <EChart option={barOption} height={Math.max(280, current.length * 40)} />
        <div className="footnote">
          <b>{caveat}</b>。规则可在 <code>data/sources/category-rules.json</code> 中编辑，聚合时自动重算。
        </div>
      </div>

      <div className="card">
        <h3>赛道历史趋势（TOP6）</h3>
        {history.length >= 2 ? (
          <EChart option={trendOption} height={380} />
        ) : (
          <div className="empty">累积多份快照后展示赛道趋势</div>
        )}
      </div>

      <div className="card">
        <h3>明细</h3>
        <table className="data">
          <thead>
            <tr>
              <th>赛道</th>
              <th>技能数</th>
              <th>占比</th>
            </tr>
          </thead>
          <tbody>
            {current.map((c) => (
              <tr key={c.category}>
                <td>{c.category}</td>
                <td className="num-cell">{c.count.toLocaleString()}</td>
                <td className="num-cell">{c.share}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="footnote">每技能恰好归入一个赛道（首命中规则），占比合计 100%。</div>
      </div>
    </div>
  );
}
