import { useMemo, useState } from 'react';
import type * as echarts from 'echarts';
import EChart from './components/EChart';
import MetricCard from './components/MetricCard';
import RankTable from './components/RankTable';
import CategoryBoard from './components/CategoryBoard';
import MiniRank from './components/MiniRank';
import FeaturedList from './components/FeaturedList';
import Aurora from './components/Aurora';
import ShareModal from './components/ShareModal';
import { overview, rankings, vibe } from './data';
import { vibeCategoryMetas, xhsNoteUrl } from './lib/vibeCats';
import { removeFav, useFavs } from './lib/localStore';
import type { RankListKey, SeriesPoint, VibeListKey, VibeRow } from './types';

type Domain = 'overview' | 'skill' | 'minitools' | 'about';

const TABS: {
  key: RankListKey;
  label: string;
  nameField: 'skill_name' | 'nickname';
  values: { key: string; label: string }[];
}[] = [
  {
    key: 'useList',
    label: '使用人数榜',
    nameField: 'skill_name',
    values: [
      { key: 'use_cnt', label: '使用次数' },
      { key: 'use_users', label: '使用人数' },
    ],
  },
  {
    key: 'todayList',
    label: '当日新增榜',
    nameField: 'skill_name',
    values: [
      { key: 'use_cnt', label: '使用次数' },
      { key: 'use_users', label: '使用人数' },
    ],
  },
  {
    key: 'newList',
    label: '7天新增榜',
    nameField: 'skill_name',
    values: [
      { key: 'new7_cnt', label: '7日新增' },
      { key: 'cum_cnt', label: '累计' },
    ],
  },
  {
    key: 'authorList',
    label: '作者发布榜',
    nameField: 'nickname',
    values: [{ key: 'skill_cnt', label: '技能数' }],
  },
];

const VIBE_TABS: {
  key: VibeListKey;
  label: string;
  nameField: 'app_name' | 'nickname';
  values: { key: string; label: string }[];
}[] = [
  { key: 'useList', label: '使用人数', nameField: 'app_name', values: [{ key: 'use_users', label: '使用人数' }] },
  { key: 'todayList', label: '当日新增', nameField: 'app_name', values: [{ key: 'use_users', label: '使用人数' }] },
  {
    key: 'new7List',
    label: '7天活跃',
    nameField: 'app_name',
    values: [
      { key: 'active7d', label: '7日活跃' },
      { key: 'cum_users', label: '累计用户' },
    ],
  },
  { key: 'authorList', label: '作者发布', nameField: 'nickname', values: [{ key: 'app_cnt', label: '小工具数' }] },
];

/** 类目分布（官方精选 vs 规则估算堆叠柱）：三 app 榜去重后统计。 */
function vibeCategoryDistOption(
  dist: { name: string; official: number; estimate: number }[]
): echarts.EChartsOption {
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(10,15,28,0.92)',
      borderColor: 'rgba(34,211,238,0.35)',
      textStyle: { color: '#e8eefc', fontSize: 12 },
    },
    legend: { data: ['官方精选', '规则估算'], top: 0, textStyle: { color: '#8fa0c0', fontSize: 12 }, itemWidth: 14 },
    grid: { left: 110, right: 40, top: 36, bottom: 28 },
    xAxis: { type: 'value', minInterval: 1, axisLabel: AXIS_TEXT, splitLine: { lineStyle: { color: 'rgba(56,189,248,0.08)' } } },
    yAxis: {
      type: 'category',
      inverse: true,
      data: dist.map((d) => d.name),
      axisLabel: { color: '#aab7d0', fontSize: 12 },
      axisLine: { lineStyle: { color: 'rgba(56,189,248,0.25)' } },
    },
    series: [
      {
        name: '官方精选',
        type: 'bar',
        stack: 'cat',
        data: dist.map((d) => d.official),
        itemStyle: { color: '#22d3ee' },
        barMaxWidth: 20,
      },
      {
        name: '规则估算',
        type: 'bar',
        stack: 'cat',
        data: dist.map((d) => d.estimate),
        itemStyle: { color: 'rgba(244,63,142,0.55)' },
        barMaxWidth: 20,
      },
    ],
  };
}

const AXIS_TEXT = { color: '#7d8ba8', fontSize: 11 };

/** 榜单行动态字段读取（行结构因榜单而异，统一经 unknown 中转）。 */
function rowField(row: unknown, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

function trendOption(series: SeriesPoint[]): echarts.EChartsOption {
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(10,15,28,0.92)',
      borderColor: 'rgba(34,211,238,0.35)',
      textStyle: { color: '#e8eefc', fontSize: 12 },
    },
    legend: {
      data: ['总量', '较上次采集新增'],
      top: 0,
      textStyle: { color: '#8fa0c0', fontSize: 12 },
      itemWidth: 14,
    },
    grid: { left: 60, right: 24, top: 40, bottom: 34 },
    xAxis: {
      type: 'category',
      data: series.map((p) => p.date),
      axisLine: { lineStyle: { color: 'rgba(56,189,248,0.25)' } },
      axisLabel: AXIS_TEXT,
    },
    yAxis: [
      {
        type: 'value',
        name: '总量',
        nameTextStyle: { color: '#7d8ba8' },
        splitLine: { lineStyle: { color: 'rgba(56,189,248,0.08)' } },
        axisLabel: AXIS_TEXT,
      },
      {
        type: 'value',
        name: '新增',
        nameTextStyle: { color: '#7d8ba8' },
        splitLine: { show: false },
        axisLabel: AXIS_TEXT,
      },
    ],
    series: [
      {
        name: '总量',
        type: 'line',
        smooth: true,
        data: series.map((p) => p.total),
        itemStyle: { color: '#22d3ee' },
        lineStyle: { width: 3, shadowColor: 'rgba(34,211,238,0.6)', shadowBlur: 14 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(34,211,238,0.28)' },
              { offset: 1, color: 'rgba(34,211,238,0)' },
            ],
          },
        },
      },
      {
        name: '较上次采集新增',
        type: 'bar',
        yAxisIndex: 1,
        data: series.map((p) => p.newSinceLast),
        itemStyle: { color: '#f43f8e', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 18,
      },
    ],
  };
}

function TrendBlock({ series, height = 340 }: { series: SeriesPoint[]; height?: number }) {
  if (series.length < 2) {
    return <div className="empty">累积多份快照后展示总量与新增曲线</div>;
  }
  return <EChart option={trendOption(series)} height={height} />;
}

export default function App() {
  const [domain, setDomain] = useState<Domain>('overview');
  const [tab, setTab] = useState<RankListKey>('useList');
  const [vibeTab, setVibeTab] = useState<VibeListKey>('useList');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [shareOpen, setShareOpen] = useState(false);
  const favs = useFavs();

  const conf = TABS.find((t) => t.key === tab)!;
  const vConf = VIBE_TABS.find((t) => t.key === vibeTab)!;
  const { series, latest } = overview;
  const vSeries = vibe.series;
  const vLatest = vibe.latest;
  const vRankings = vibe.rankings;
  const officialMetas = useMemo(() => vibeCategoryMetas(vibe.official?.categories), [vibe.official]);

  // 官方精选标签：app_id → tag（如 7天热榜）
  const featuredTagByApp = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of vibe.official?.featured ?? []) {
      if (f.tag) m.set(String(f.app_id), f.tag);
    }
    return m;
  }, [vibe.official]);

  const currentVibeRows: VibeRow[] = vRankings ? vRankings[vibeTab] : [];

  const catCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of currentVibeRows) {
      if (r.category) c[r.category.key] = (c[r.category.key] ?? 0) + 1;
    }
    return c;
  }, [currentVibeRows]);

  const filteredVibeRows = useMemo(
    () => (catFilter === 'all' ? currentVibeRows : currentVibeRows.filter((r) => r.category?.key === catFilter)),
    [currentVibeRows, catFilter]
  );

  const catDist = useMemo(() => {
    if (!vRankings) return [];
    const seen = new Set<string>();
    const acc: Record<string, { official: number; estimate: number }> = {};
    for (const row of [...vRankings.useList, ...vRankings.new7List, ...vRankings.todayList]) {
      const id = String(row.app_id);
      if (seen.has(id)) continue;
      seen.add(id);
      if (!row.category) continue;
      acc[row.category.key] ??= { official: 0, estimate: 0 };
      acc[row.category.key][row.category.source]++;
    }
    return officialMetas
      .map((m) => ({
        name: `${m.icon} ${m.label}`,
        key: m.key,
        official: acc[m.key]?.official ?? 0,
        estimate: acc[m.key]?.estimate ?? 0,
      }))
      .filter((d) => d.official + d.estimate > 0)
      .sort((a, b) => b.official + b.estimate - (a.official + a.estimate));
  }, [vRankings, officialMetas]);

  return (
    <>
      <Aurora />
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-left">
            <span className="brand">REDSKILL TRENDS</span>
            <span className="nav-sub">小红书榜单趋势</span>
          </div>
          <div className="nav-right">
            <div className="domain-tabs">
              <button className={domain === 'overview' ? 'active' : ''} onClick={() => setDomain('overview')}>
                总览
              </button>
              <button className={domain === 'skill' ? 'active' : ''} onClick={() => setDomain('skill')}>
                SKILL
              </button>
              <button className={domain === 'minitools' ? 'active' : ''} onClick={() => setDomain('minitools')}>
                小工具
              </button>
              <button className={domain === 'about' ? 'active' : ''} onClick={() => setDomain('about')}>
                关于
              </button>
            </div>
            <button className="btn-neon" onClick={() => setShareOpen(true)}>
              ◈ 分享卡片
            </button>
          </div>
        </div>
      </nav>

      <div className="page">
        {domain === 'overview' && (
          <>
            <section className="phero">
              <div className="phero-main">
                <p className="phero-kicker">
                  <span className="live-line">
                    <span className="live-dot" />
                    LIVE · 双源日更
                  </span>
                </p>
                <h1 className="phero-title">
                  小红书生态，<span className="hl">一屏看尽</span>
                </h1>
                <p className="phero-sub">
                  每日追踪官方榜单：SKILL 收录{' '}
                  <strong>{latest.total.toLocaleString()}</strong> · 小工具收录{' '}
                  <strong>{vLatest ? vLatest.total.toLocaleString() : '—'}</strong>
                  ，官方类目与精选数据直接透出。
                </p>
                <div className="phero-cta">
                  <button
                    className="btn-solid"
                    onClick={() => {
                      setDomain('skill');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    看 SKILL 榜单
                  </button>
                  <button
                    className="btn-neon"
                    onClick={() => {
                      setDomain('minitools');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    看小工具榜单
                  </button>
                </div>
              </div>
              <div className="phero-side">
                <div className="phero-stat">
                  <span className="phero-stat-num">{overview.latestDate}</span>
                  <span className="phero-stat-label">SKILL 最新快照</span>
                </div>
                <div className="phero-stat">
                  <span className="phero-stat-num">{vibe.latestDate ?? '—'}</span>
                  <span className="phero-stat-label">小工具最新快照</span>
                </div>
                <div className="phero-stat">
                  <span className="phero-stat-num">{officialMetas.reduce((s, m) => s + m.count, 0)}</span>
                  <span className="phero-stat-label">官方精选小工具</span>
                </div>
              </div>
            </section>

            <div className="grid-metrics">
              <MetricCard
                label="SKILL 收录量"
                value={latest.total.toLocaleString()}
                delta={
                  latest.newSinceLast === null
                    ? undefined
                    : {
                        text: `+${latest.newSinceLast.toLocaleString()} 较上次`,
                        tone: latest.newSinceLast > 0 ? 'up' : 'flat',
                      }
                }
                hint={latest.newSinceLast === null ? `${overview.latestDate} · 快照集合差` : overview.latestDate}
                spark={series.map((p) => p.total)}
              />
              <MetricCard
                label="小工具收录量"
                value={vLatest ? vLatest.total.toLocaleString() : '—'}
                delta={
                  vLatest && vLatest.newSinceLast !== null
                    ? {
                        text: `+${vLatest.newSinceLast.toLocaleString()} 较上次`,
                        tone: vLatest.newSinceLast > 0 ? 'up' : 'flat',
                      }
                    : undefined
                }
                hint={
                  vLatest
                    ? vLatest.newSinceLast === null
                      ? `${vibe.latestDate} · 快照集合差`
                      : (vibe.latestDate ?? '')
                    : '待接入'
                }
                spark={vSeries.map((p) => p.total)}
              />
            </div>

            <section className="psec">
              <div className="sec-head">
                <span className="sec-kicker">TOP BOARDS</span>
                <h2>今日热门榜</h2>
              </div>
              <div className="grid-2">
                <div className="card">
                  <h3>SKILL 使用人数 TOP 8</h3>
                <MiniRank
                  rows={rankings.useList.slice(0, 8)}
                  nameField="skill_name"
                  valueField="use_users"
                  valueLabel="使用人数"
                  showNoteLink
                />
              </div>
                <div className="card">
                  <h3>小工具 使用人数 TOP 8</h3>
                  <MiniRank
                    rows={(vRankings?.useList ?? []).slice(0, 8)}
                    nameField="app_name"
                    valueField="use_users"
                    valueLabel="使用人数"
                    showNoteLink
                    showCategory
                  />
                </div>
              </div>
            </section>

            {favs.length > 0 && (
            <section className="psec">
              <div className="sec-head">
                <span className="sec-kicker">MY STARS</span>
                <h2>我的收藏</h2>
              </div>
              <div className="card">
                <ul className="fav-list">
                    {favs.map((f) => {
                      const url = xhsNoteUrl(f.noteId);
                      return (
                        <li key={`${f.kind}-${f.id}`} className="fav-row">
                          <span className={`fav-kind ${f.kind}`}>{f.kind === 'skill' ? 'SKILL' : '工具'}</span>
                          {url && (
                            <a className="name-link" href={url} target="_blank" rel="noreferrer" title="查看官方挂载笔记">
                              ↗
                            </a>
                          )}
                          <span className="fav-name" title={f.name}>
                            {f.name}
                          </span>
                          <span className="fav-meta">
                            {f.list} · {f.date}
                          </span>
                          <span className="fav-vals">{f.values.map((v) => `${v.label} ${v.value}`).join(' / ')}</span>
                          <button className="fav-remove" title="移除收藏" onClick={() => removeFav(f.kind, f.id)}>
                            ✕
                          </button>
                        </li>
                      );
                    })}
                  </ul>
              </div>
            </section>
            )}

            {(series.length >= 2 || vSeries.length >= 2) && (
              <section className="psec">
                <div className="sec-head">
                  <span className="sec-kicker">GROWTH</span>
                  <h2>收录量趋势</h2>
                </div>
                <div className="grid-2">
                  {series.length >= 2 && (
                    <div className="card">
                      <h3>SKILL 收录量趋势</h3>
                      <TrendBlock series={series} />
                    </div>
                  )}
                  {vSeries.length >= 2 && (
                    <div className="card">
                      <h3>小工具收录量趋势</h3>
                      <TrendBlock series={vSeries} />
                    </div>
                  )}
                </div>
              </section>
            )}


          </>
        )}

        {domain === 'skill' && (
          <>
            <div className="hero">
              <div>
                <h1 className="page-title">
                  <span className="hl">SKILL 官方榜单</span>
                </h1>
                <p className="page-sub">
                  <span className="chip">DATA {rankings.date}</span>
                  {rankings.prevDate ? `对比 ${rankings.prevDate}` : '首份快照'}
                </p>
              </div>
              <div className="hero-status">
                <span className="live-line">
                  <span className="live-dot" />
                  LIVE
                </span>
                <div className="hero-date">BUILDER HUB / REDSKILL</div>
              </div>
            </div>

            {series.length >= 2 && (
              <div className="card">
                <h3>收录量趋势</h3>
                <TrendBlock series={series} height={360} />
              </div>
            )}

            <div className="tabs">
              {TABS.map((t) => (
                <button key={t.key} className={t.key === tab ? 'active' : ''} onClick={() => setTab(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="card">
              <RankTable
                rows={rankings[tab]}
                nameField={conf.nameField}
                descField={conf.nameField === 'skill_name' ? 'skill_description' : undefined}
                valueColumns={conf.values}
                showNoteLink
                profileLinkField={conf.nameField === 'nickname' ? 'author_id' : undefined}
                fav={{
                  kind: 'skill',
                  idField: conf.nameField === 'nickname' ? 'author_id' : 'skill_id',
                  list: conf.label,
                  date: rankings.date,
                }}
              />
            </div>
          </>
        )}

        {domain === 'minitools' && (
          <>
            <div className="hero">
              <div>
                <h1 className="page-title">
                  <span className="hl">小工具官方榜单</span>
                </h1>
                <p className="page-sub">
                  <span className="chip">DATA {vibe.latestDate ?? '—'}</span>
                  {vibe.prevDate ? `对比 ${vibe.prevDate}` : '首份快照'}
                </p>
              </div>
              <div className="hero-status">
                <span className="live-line">
                  <span className="live-dot" />
                  LIVE
                </span>
                <div className="hero-date">VIBE APP RANK</div>
              </div>
            </div>

            {!vibe.hasData || !vLatest || !vRankings ? (
              <div className="card">
                <div className="empty">小工具榜数据待接入</div>
              </div>
            ) : (
              <>
                <div className="grid-metrics">
                  <MetricCard
                    label="小工具收录量"
                    value={vLatest.total.toLocaleString()}
                    delta={
                      vLatest.newSinceLast === null
                        ? undefined
                        : {
                            text: `+${vLatest.newSinceLast.toLocaleString()} 较上次`,
                            tone: vLatest.newSinceLast > 0 ? 'up' : 'flat',
                          }
                    }
                    hint={vLatest.newSinceLast === null ? `${vLatest.date} · 快照集合差` : vLatest.date}
                    spark={vSeries.map((p) => p.total)}
                  />
                  <MetricCard label="当日新增榜" value={vRankings.todayList.length} hint="TOP100" />
                  <MetricCard label="快照覆盖" value={vSeries.length} hint="份日度快照" />
                </div>


                <div className="card">
                  <h3>官方推荐</h3>
                  <p className="card-note">
                    官方标注的 7天热榜与今日新品；上榜者同时在榜单行内展示标签徽标。
                  </p>
                  <FeaturedList items={vibe.official?.featured ?? []} />
                </div>

                <div className="card">
                  <h3>官方精选分类</h3>
                  <p className="card-note">
                    官方类目与精选代表作来自 vibe-app-rank 快照，共 {officialMetas.reduce((s, m) => s + m.count, 0)}{' '}
                    个精选小工具；代表作可点击跳转官方挂载笔记。
                  </p>
                  <CategoryBoard metas={officialMetas} />
                </div>

                <div className="card">
                  <h3>类目分布</h3>
                  <p className="card-note">
                    三大 app 榜去重 {catDist.reduce((s, d) => s + d.official + d.estimate, 0)} 个小工具：官方精选分类优先，其余按关键词规则估算（估算口径与官方可能存在出入）。
                  </p>
                  <EChart option={vibeCategoryDistOption(catDist)} height={300} />
                </div>

                <div className="tabs">
                  {VIBE_TABS.map((t) => (
                    <button key={t.key} className={t.key === vibeTab ? 'active' : ''} onClick={() => setVibeTab(t.key)}>
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="cat-filter">
                  <button className={catFilter === 'all' ? 'active' : ''} onClick={() => setCatFilter('all')}>
                    全部 {currentVibeRows.length}
                  </button>
                  {officialMetas
                    .filter((m) => catCounts[m.key])
                    .map((m) => (
                      <button
                        key={m.key}
                        className={catFilter === m.key ? 'active' : ''}
                        onClick={() => setCatFilter(m.key)}
                      >
                        {m.icon} {m.label} {catCounts[m.key]}
                      </button>
                    ))}
                </div>

                <div className="card">
                  <RankTable
                    rows={filteredVibeRows}
                    nameField={vConf.nameField}
                    descField={vConf.nameField === 'app_name' ? 'slogan' : undefined}
                    valueColumns={vConf.values}
                    showCategory
                    showNoteLink={vConf.nameField === 'app_name'}
                    profileLinkField={vConf.nameField === 'nickname' ? 'creator' : undefined}
                    metaFields={vConf.nameField === 'app_name' ? [{ field: 'gmt_create', label: '上线' }] : undefined}
                    renumber={catFilter !== 'all'}
                    fav={{
                      kind: 'app',
                      idField: vConf.nameField === 'nickname' ? 'creator' : 'app_id',
                      list: vConf.label,
                      date: vRankings.date,
                    }}
                    badge={(row) => {
                      const tag = featuredTagByApp.get(String(rowField(row, "app_id") ?? ""));
                      return tag ? <span className="badge-featured">{tag}</span> : null;
                    }}
                  />
                </div>
              </>
            )}
          </>
        )}
        {domain === 'about' && (
          <div className="about">
            <div className="about-avatar" aria-hidden>
              <svg viewBox="0 0 120 120" width="148" height="148">
                <defs>
                  <radialGradient id="av-bg" cx="50%" cy="42%" r="70%">
                    <stop offset="0%" stopColor="#111b30" />
                    <stop offset="100%" stopColor="#05070d" />
                  </radialGradient>
                </defs>
                <circle cx="60" cy="60" r="56" fill="url(#av-bg)" stroke="rgba(34,211,238,0.3)" />
                <circle
                  cx="60"
                  cy="60"
                  r="56"
                  fill="none"
                  stroke="rgba(34,211,238,0.55)"
                  strokeDasharray="2 10"
                  className="av-ring"
                />
                <path
                  d="M60 28 C43 28 33 44 33 62 C33 82 42 96 60 96 C78 96 87 82 87 62 C87 44 77 28 60 28 Z"
                  fill="#0a1120"
                  stroke="rgba(125,139,168,0.3)"
                />
                <path
                  d="M60 44 C50 44 44 54 44 66 C44 78 50 86 60 86 C70 86 76 78 76 66 C76 54 70 44 60 44 Z"
                  fill="#050a14"
                />
                <ellipse cx="50" cy="64" rx="4.2" ry="2.8" fill="#22d3ee" className="av-eye" />
                <ellipse cx="70" cy="64" rx="4.2" ry="2.8" fill="#22d3ee" className="av-eye" />
              </svg>
            </div>
            <div className="about-name">
              lucas <span className="about-sep">|</span> 独立开发者
            </div>
            <p className="about-line">编译世界，反编译自己。</p>
          </div>
        )}
      </div>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        overview={overview}
        rankings={rankings}
      />
    </>
  );
}
