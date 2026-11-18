import { useMemo } from 'react';
import * as echarts from 'echarts';
import { Link } from 'react-router-dom';
import EChart from '../components/EChart';
import MetricCard from '../components/MetricCard';
import EmptyState from '../components/EmptyState';
import { minitools, overview } from '../data';

const OFFICIAL_CATEGORY_CODES: Record<string, string> = {
  efficiency_life: '生活方式',
  casual_game: '休闲玩法',
  image_creation: '图像创作',
  learning_education: '学习知识',
  query_tool: '实用工具',
  entertainment: '娱乐测试',
  other: '其他',
};

function categoryName(app: { category: string }): string {
  return OFFICIAL_CATEGORY_CODES[app.category] ?? app.category ?? '未分类';
}

export default function MinitoolsPage() {
  const { items, ownApps, platformCategories, categoryCounts, caveat, platformFetchedAt } = minitools;
  const summary = overview.minitools;

  const barOption = useMemo<echarts.EChartsOption>(() => {
    const entries = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).reverse();
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 90, right: 40, top: 12, bottom: 28 },
      xAxis: { type: 'value', minInterval: 1 },
      yAxis: { type: 'category', data: entries.map(([c]) => c), axisLabel: { fontSize: 12 } },
      series: [
        {
          type: 'bar',
          data: entries.map(([, n]) => n),
          itemStyle: { color: '#ff2442', borderRadius: [0, 4, 4, 0] },
          barMaxWidth: 22,
          label: { show: true, position: 'right', formatter: (p) => String((p as { value: number }).value) },
        },
      ],
    };
  }, [categoryCounts]);

  return (
    <div className="page">
      <h1 className="page-title">小工具生态</h1>
      <p className="page-sub">
        小红书 Builder Hub「小工具」：可挂载在笔记里的迷你 Web 应用 · {caveat}
      </p>

      <div className="grid-metrics">
        <MetricCard label="观察清单" value={summary.watchlistCount} hint="手动登记的其他作者作品" />
        <MetricCard
          label="本账号作品"
          value={`${summary.publishedOwnCount} / ${summary.ownAppCount}`}
          hint="已发布 / 总数（redapp CLI 只读查询）"
        />
        <MetricCard label="平台官方类目" value={summary.platformCategoryCount || '—'} hint={platformCategories.map((c) => c.name).slice(0, 4).join('、') + '…'} />
        <MetricCard label="数据截至" value={platformFetchedAt ? new Date(platformFetchedAt).toLocaleDateString('zh-CN') : '—'} hint="平台元数据拉取日期" />
      </div>

      <div className="card">
        <h3>本账号作品（redapp CLI 自动导入）</h3>
        {ownApps.length === 0 ? (
          <EmptyState
            title="暂无本账号小工具数据"
            detail="运行 npm run minitools:fetch 拉取（需 redapp CLI 已登录）"
          />
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>名称</th>
                <th>Slogan</th>
                <th>类目</th>
                <th>版本</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {ownApps.map((app) => (
                <tr key={app.appId}>
                  <td>
                    <span className="cell-name">{app.appName}</span>
                    <span className="cell-desc" style={{ display: 'inline', marginLeft: 8 }}>
                      {app.appId}
                    </span>
                  </td>
                  <td>{app.slogan || '—'}</td>
                  <td>{categoryName(app)}</td>
                  <td className="num-cell">{app.version || '—'}</td>
                  <td>
                    {app.statusText === '已发布' ? (
                      <span className="delta-up">● 已发布</span>
                    ) : (
                      <span>● {app.statusText}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>类目分布（登记 + 本账号作品）</h3>
        {Object.keys(categoryCounts).length > 0 ? (
          <>
            <EChart option={barOption} height={Math.max(240, Object.keys(categoryCounts).length * 44)} />
            <div className="footnote">
              本账号作品按官方类目计入（{platformCategories.map((c) => c.name).join('、')}）；观察清单条目使用登记类目。
            </div>
          </>
        ) : (
          <EmptyState title="暂无数据" detail="登记或导入小工具后展示类目分布" />
        )}
      </div>

      <div className="card">
        <h3>观察清单（手动登记的其他作者作品）</h3>
        {items.length === 0 ? (
          <EmptyState
            title="观察清单还是空的"
            detail="在小红书 App 内刷到其他作者的小工具时，把名称/类目/挂载笔记登记进 data/sources/minitools.json，再跑 npm run aggregate"
          />
        ) : (
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
        )}
      </div>

      <div className="card">
        <h3>数据来源说明</h3>
        <div className="footnote" style={{ marginTop: 0 }}>
          小工具目前<b>没有公开榜单或商店页</b>，本页用两条途径积累数据：
          <br />
          ① <b>本账号作品</b>：<code>npm run minitools:fetch</code> 通过 redapp CLI（只读）拉取官方类目与作品状态；
          <br />
          ② <b>观察清单</b>：App 内刷到别家小工具时手动登记到 <code>data/sources/minitools.json</code>。
          <br />
          想看 RedSkill 技能商店的官方榜单？<Link to="/rankings" style={{ color: 'var(--accent)' }}>前往 REDSkill 榜单 →</Link>
        </div>
      </div>
    </div>
  );
}
