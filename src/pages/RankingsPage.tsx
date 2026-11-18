import { useMemo, useState } from 'react';
import * as echarts from 'echarts';
import EChart from '../components/EChart';
import RankTable from '../components/RankTable';
import MetricCard from '../components/MetricCard';
import { rankings, overview } from '../data';
import type { RankListKey } from '../types';

const TABS: {
  key: RankListKey;
  label: string;
  nameField: 'skill_name' | 'nickname';
  values: { key: 'use_cnt' | 'use_users' | 'new7_cnt' | 'cum_cnt' | 'skill_cnt'; label: string }[];
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
    key: 'newList',
    label: '7天新增榜',
    nameField: 'skill_name',
    values: [
      { key: 'new7_cnt', label: '7日新增' },
      { key: 'cum_cnt', label: '累计' },
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
    key: 'authorList',
    label: '作者发布榜',
    nameField: 'nickname',
    values: [{ key: 'skill_cnt', label: '技能数' }],
  },
];

export default function RankingsPage() {
  const [tab, setTab] = useState<RankListKey>('useList');
  const conf = TABS.find((t) => t.key === tab)!;
  const { series, latest } = overview;
  const hasTrend = series.length >= 2;

  const trendOption = useMemo<echarts.EChartsOption>(() => {
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['技能总量', '较上次采集新增'], top: 0 },
      grid: { left: 56, right: 24, top: 36, bottom: 32 },
      xAxis: { type: 'category', data: series.map((p) => p.date) },
      yAxis: [
        { type: 'value', name: '总量' },
        { type: 'value', name: '新增', splitLine: { show: false } },
      ],
      series: [
        {
          name: '技能总量',
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
    <div className="page">
      <h1 className="page-title">REDSkill 官方榜单</h1>
      <p className="page-sub">
        Builder Hub 旗下 AI 技能商店（RedSkill）· 数据日期 {rankings.date}
        {rankings.prevDate
          ? ` · 对比 ${rankings.prevDate}：↑上升 ↓下降 ·「新上榜」= 上一份快照未出现`
          : ' · 首份快照，全部标记为新上榜'}
      </p>

      <div className="grid-metrics">
        <MetricCard label="技能总量" value={latest.total.toLocaleString()} hint={`数据日期 ${latest.date}`} />
        <MetricCard
          label="较上次采集新增"
          value={latest.newSinceLast === null ? '—' : `+${latest.newSinceLast.toLocaleString()}`}
          hint={overview.prevDate ? `对比 ${overview.prevDate}` : '首份快照无对比基准'}
        />
        <MetricCard
          label="官方 7 日新增使用"
          value={latest.officialNew7Sum.toLocaleString()}
          hint="7天新增榜 TOP100 合计"
        />
      </div>

      <div className="card">
        <h3>技能总量趋势</h3>
        {hasTrend ? (
          <EChart option={trendOption} height={340} />
        ) : (
          <div className="empty">每天运行一次 npm run collect，累积多份快照后展示趋势</div>
        )}
        {latest.disappearedCount > 0 && (
          <div className="footnote">
            判定为「消失」的技能（连续 ≥3 快照缺席）共 {latest.disappearedCount} 个（新增口径 = 快照 skill_id 集合差）。
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
  );
}
