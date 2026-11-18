import { useMemo } from 'react';
import * as echarts from 'echarts';
import EChart from '../components/EChart';
import MetricCard from '../components/MetricCard';
import EmptyState from '../components/EmptyState';
import { overview } from '../data';

export default function OverviewPage() {
  const { latest, series, minitools } = overview;
  const hasTrend = series.length >= 2;

  const option = useMemo<echarts.EChartsOption>(() => {
    const dates = series.map((p) => p.date);
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['技能总量', '较上次采集新增'], top: 0 },
      grid: { left: 48, right: 24, top: 36, bottom: 32 },
      xAxis: { type: 'category', data: dates },
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
      <h1 className="page-title">生态总览</h1>
      <p className="page-sub">
        数据日期 {latest.date}（官方 genTime 以快照为准） · 生成于 {new Date(overview.generatedAt).toLocaleString('zh-CN')}
      </p>

      <div className="grid-metrics">
        <MetricCard label="RedSkill 技能总量" value={latest.total.toLocaleString()} hint={`数据日期 ${latest.date}`} />
        <MetricCard
          label="较上次采集新增"
          value={latest.newSinceLast === null ? '—' : `+${latest.newSinceLast.toLocaleString()}`}
          hint={overview.prevDate ? `对比 ${overview.prevDate}` : '首份快照无对比基准'}
        />
        <MetricCard label="快照覆盖" value={overview.series.length} hint="份日度快照" />
        <MetricCard
          label="官方 7 日新增使用"
          value={latest.officialNew7Sum.toLocaleString()}
          hint="7天新增榜 TOP100 合计"
        />
        <MetricCard label="小工具（手动登记）" value={minitools.count} hint="非平台全量" />
      </div>

      <div className="card">
        <h3>RedSkill 技能总量趋势</h3>
        {hasTrend ? (
          <EChart option={option} height={380} />
        ) : (
          <EmptyState
            title="趋势图需要至少 2 份快照"
            detail="每天运行一次 npm run collect，累积几天后这里会展示总量与新增曲线"
          />
        )}
      </div>

      <div className="card">
        <h3>口径说明</h3>
        <div className="footnote" style={{ marginTop: 0 }}>
          <b>「较上次采集新增」</b> = 相邻快照 skill_id 集合差（不用时间戳估算）；当前判定为「消失」的技能（连续 ≥3 快照缺席）共{' '}
          {latest.disappearedCount} 个。数据源为官方 REDSkill 排行榜公开静态 JSON，采集与聚合口径详见页脚说明。
        </div>
      </div>
    </div>
  );
}
