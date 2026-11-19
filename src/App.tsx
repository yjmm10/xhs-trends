import { useState } from 'react';
import type * as echarts from 'echarts';
import EChart from './components/EChart';
import MetricCard from './components/MetricCard';
import RankTable from './components/RankTable';
import ShareModal from './components/ShareModal';
import { overview, rankings, vibe } from './data';
import type { RankListKey, SeriesPoint, VibeListKey } from './types';

type Domain = 'overview' | 'skill' | 'minitools';

const TABS: {
  key: RankListKey;
  label: string;
  nameField: 'skill_name' | 'nickname';
  values: { key: string; label: string }[];
}[] = [
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
    key: 'useList',
    label: '使用人数榜',
    nameField: 'skill_name',
    values: [
      { key: 'use_cnt', label: '使用次数' },
      { key: 'use_users', label: '使用人数' },
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
  { key: 'useList', label: '使用人数', nameField: 'app_name', values: [{ key: 'use_users', label: '使用人数' }] },
  { key: 'authorList', label: '作者发布', nameField: 'nickname', values: [{ key: 'app_cnt', label: '小工具数' }] },
];

const AXIS_TEXT = { color: '#7d8ba8', fontSize: 11 };

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
  const [tab, setTab] = useState<RankListKey>('todayList');
  const [vibeTab, setVibeTab] = useState<VibeListKey>('todayList');
  const [shareOpen, setShareOpen] = useState(false);

  const conf = TABS.find((t) => t.key === tab)!;
  const vConf = VIBE_TABS.find((t) => t.key === vibeTab)!;
  const { series, latest } = overview;
  const vSeries = vibe.series;
  const vLatest = vibe.latest;
  const vRankings = vibe.rankings;

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <span className="brand">REDSKILL TRENDS</span>
          <span className="nav-sub">小红书榜单趋势</span>
          <span className="nav-spacer" />
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
          </div>
          <span className="nav-spacer" />
          <button className="btn-neon" onClick={() => setShareOpen(true)}>
            ◈ 分享卡片
          </button>
        </div>
      </nav>

      <div className="page">
        {domain === 'overview' && (
          <>
            <div className="hero">
              <div>
                <h1 className="page-title">
                  <span className="hl">数据总览</span>
                </h1>
                <p className="page-sub">
                  <span className="chip">SKILL {overview.latestDate}</span>
                  <span className="chip">小工具 {vibe.latestDate ?? '—'}</span>
                </p>
              </div>
              <div className="hero-status">
                <span className="live-line">
                  <span className="live-dot" />
                  LIVE
                </span>
              </div>
            </div>

            <div className="grid-metrics">
              <MetricCard
                label="SKILL 收录量"
                value={latest.total.toLocaleString()}
                hint={overview.latestDate}
                spark={series.map((p) => p.total)}
              />
              <MetricCard
                label="SKILL 较上次新增"
                value={latest.newSinceLast === null ? '—' : `+${latest.newSinceLast.toLocaleString()}`}
                hint="快照集合差"
                spark={series.map((p) => p.newSinceLast)}
              />
              <MetricCard
                label="小工具收录量"
                value={vLatest ? vLatest.total.toLocaleString() : '—'}
                hint={vibe.latestDate ?? '待接入'}
                spark={vSeries.map((p) => p.total)}
              />
              <MetricCard
                label="小工具较上次新增"
                value={vLatest && vLatest.newSinceLast !== null ? `+${vLatest.newSinceLast.toLocaleString()}` : '—'}
                hint="快照集合差"
                spark={vSeries.map((p) => p.newSinceLast)}
              />
            </div>

            <div className="grid-2">
              <div className="card">
                <h3>SKILL 收录量趋势</h3>
                <TrendBlock series={series} />
              </div>
              <div className="card">
                <h3>小工具收录量趋势</h3>
                <TrendBlock series={vSeries} />
              </div>
            </div>
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

            <div className="card">
              <h3>收录量趋势</h3>
              <TrendBlock series={series} height={360} />
            </div>

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
                    hint={vLatest.date}
                    spark={vSeries.map((p) => p.total)}
                  />
                  <MetricCard
                    label="较上次新增"
                    value={vLatest.newSinceLast === null ? '—' : `+${vLatest.newSinceLast.toLocaleString()}`}
                    hint="快照集合差"
                    spark={vSeries.map((p) => p.newSinceLast)}
                  />
                  <MetricCard label="当日新增榜" value={vRankings.todayList.length} hint="TOP100" />
                  <MetricCard label="快照覆盖" value={vSeries.length} hint="份日度快照" />
                </div>

                <div className="card">
                  <h3>收录量趋势</h3>
                  <TrendBlock series={vSeries} height={360} />
                </div>

                <div className="tabs">
                  {VIBE_TABS.map((t) => (
                    <button key={t.key} className={t.key === vibeTab ? 'active' : ''} onClick={() => setVibeTab(t.key)}>
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="card">
                  <RankTable
                    rows={vRankings[vibeTab]}
                    nameField={vConf.nameField}
                    descField={vConf.nameField === 'app_name' ? 'slogan' : undefined}
                    valueColumns={vConf.values}
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>

      <footer className="footer">
        <div className="footer-inner">
          <p style={{ margin: 0 }}>
            数据源：Builder Hub REDSkill · 小工具榜 vibe-app-rank · 聚合时间{' '}
            {new Date(overview.generatedAt).toLocaleString('zh-CN')}
          </p>
        </div>
      </footer>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        overview={overview}
        rankings={rankings}
      />
    </>
  );
}
