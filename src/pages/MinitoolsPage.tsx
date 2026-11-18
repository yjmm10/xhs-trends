import { useMemo } from 'react';
import * as echarts from 'echarts';
import EChart from '../components/EChart';
import EmptyState from '../components/EmptyState';
import { minitools } from '../data';

export default function MinitoolsPage() {
  const { items, categoryCounts, caveat, generatedAt } = minitools;

  const barOption = useMemo<echarts.EChartsOption>(() => {
    const entries = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).reverse();
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 90, right: 40, top: 12, bottom: 28 },
      xAxis: { type: 'value', minInterval: 1 },
      yAxis: { type: 'category', data: entries.map(([c]) => c) },
      series: [
        {
          type: 'bar',
          data: entries.map(([, n]) => n),
          itemStyle: { color: '#ff2442', borderRadius: [0, 4, 4, 0] },
          barMaxWidth: 22,
        },
      ],
    };
  }, [categoryCounts]);

  return (
    <div className="page">
      <h1 className="page-title">小工具生态</h1>
      <p className="page-sub">登记于 {new Date(generatedAt).toLocaleString('zh-CN')} · {caveat}</p>

      {items.length === 0 ? (
        <div className="card">
          <EmptyState
            title="还没有登记任何小工具"
            detail="编辑 data/sources/minitools.json 追加条目，然后运行 npm run aggregate"
          />
        </div>
      ) : (
        <>
          <div className="card">
            <h3>类目分布（登记数据）</h3>
            <EChart option={barOption} height={Math.max(240, Object.keys(categoryCounts).length * 44)} />
          </div>

          <div className="card">
            <h3>登记明细</h3>
            <table className="data">
              <thead>
                <tr>
                  <th>名称</th>
                  <th>类目</th>
                  <th>上线日期</th>
                  <th>来源</th>
                  <th>登记日期</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.name}>
                    <td>
                      <span className="cell-name">{item.name}</span>
                      {item.noteId && (
                        <span className="cell-desc" style={{ display: 'inline', marginLeft: 8 }}>
                          笔记 {item.noteId}
                        </span>
                      )}
                    </td>
                    <td>{item.category ?? '未分类'}</td>
                    <td className="num-cell">{item.launchDate ?? '—'}</td>
                    <td>{item.source ?? '—'}</td>
                    <td className="num-cell">{item.addedAt ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="footnote">
              小工具生态目前<b>没有公开榜单页</b>，本页数据为手动登记（可插拔来源）：未来若发现公开数据源或接入
              redapp CLI 导出，仅需替换 <code>data/sources/minitools.json</code>，管道与页面不变。
            </div>
          </div>
        </>
      )}
    </div>
  );
}
