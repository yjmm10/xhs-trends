import { useMemo, useState } from 'react';
import type * as echarts from 'echarts';
import EChart from './components/EChart';
import MetricCard from './components/MetricCard';
import RankTable from './components/RankTable';
import { overview, rankings } from './data';
import type { RankListKey } from './types';

const TABS: {
  key: RankListKey;
  label: string;
  nameField: 'skill_name' | 'nickname';
  values: { key: 'use_cnt' | 'use_users' | 'new7_cnt' | 'cum_cnt' | 'skill_cnt'; label: string }[];
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

export default function App() {
  const [tab, setTab] = useState<RankListKey>('todayList');
  const conf = TABS.find((t) => t.key === tab)!;
  const { series, latest } = overview;
  const hasTrend = series.length >= 2;

  const trendOption = useMemo<echarts.EChartsOption>(() => {
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['总量', '较上次采集新增'], top: 0 },
      grid: { left: 56, right: 24, top: 36, bottom: 32 },
      xAxis: { type: 'category', data: series.map((p) => p.date) },
      yAxis: [
        { type: 'value', name: '总量' },
        { type: 'value', name: '新增', splitLine: { show: false } },
      ],
      series: [
        {
          name: '总量',
          type: 'line',
          smooth: true,
          data: series.map((p) => p.total),
          itemStyle: { color: '#ff2442' },
          areaStyle: { opacity: 0.08 },
        },
        {
          name: '较上次采集新增',
          type: 'bar',
          yAxisIndex: 1,
          data: series.map((p) => p.newSinceLast),
          itemStyle: { color: '#ffb100' },
          barMaxWidth: 18,
        },
      ],
    };
  }, [series]);

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <span className="brand">小红书榜单趋势</span>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>
            Builder Hub REDSkill 排行榜 · 官方四榜单跟踪
          </span>
        </div>
      </nav>

      <div className="page">
        <h1 className="page-title">官方榜单总览</h1>
        <p className="page-sub">
          数据日期 {rankings.date}
          {rankings.prevDate
            ? ` · 对比上一份快照 ${rankings.prevDate}：↑上升 ↓下降 ·「新上榜」= 上一份快照中未出现`
            : ' · 首份快照，全部标记为新上榜'}
        </p>

        <div className="grid-metrics">
          <MetricCard label="总收录量" value={latest.total.toLocaleString()} hint={`数据日期 ${latest.date}`} />
          <MetricCard
            label="较上次采集新增"
            value={latest.newSinceLast === null ? '—' : `+${latest.newSinceLast.toLocaleString()}`}
            hint={overview.prevDate ? `对比 ${overview.prevDate} · 口径=快照集合差` : '首份快照无对比基准'}
          />
          <MetricCard
            label="官方 7 日新增使用"
            value={latest.officialNew7Sum.toLocaleString()}
            hint="7天新增榜 TOP100 合计"
          />
          <MetricCard label="快照覆盖" value={series.length} hint="份日度快照" />
        </div>

        <div className="card">
          <h3>收录量趋势</h3>
          {hasTrend ? (
            <EChart option={trendOption} height={360} />
          ) : (
            <div className="empty">
              每天运行一次 <code>npm run collect</code>，累积多份快照后这里展示总量与新增曲线
            </div>
          )}
          {latest.disappearedCount > 0 && (
            <div className="footnote">
              判定为「消失」的条目（连续 ≥3 快照缺席）共 {latest.disappearedCount} 个。
            </div>
          )}
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
      </div>

      <footer className="footer">
        <div className="footer-inner">
          <p style={{ margin: '0 0 6px' }}>
            <b>数据说明</b> · 数据源：官方{' '}
            <a href="https://cowork.xiaohongshu.com/s/redskill-rank/" target="_blank" rel="noreferrer">
              REDSkill 排行榜（Builder Hub）
            </a>{' '}
            公开静态 JSON，每日快照存档于 <code>data/snapshots/</code>（git 跟踪，时间序列真源）。
          </p>
          <p style={{ margin: '0 0 6px' }}>
            口径：<b>新增</b> = 相邻快照 skill_id 集合差（非时间戳估算）；<b>消失</b> = 连续 ≥3 快照缺席才判定；榜单对比基于上一份快照。
          </p>
          <p style={{ margin: 0 }}>
            聚合生成时间 {new Date(overview.generatedAt).toLocaleString('zh-CN')} · 本站为个人研究工具，与小红书官方无关。
          </p>
        </div>
      </footer>
    </>
  );
}
