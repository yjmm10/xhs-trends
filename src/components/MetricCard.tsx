interface MetricCardProps {
  label: string;
  value: string | number;
  hint?: string;
  spark?: (number | null)[];
  /** 增长徽标：紧跟在主数值后的涨跌 pill */
  delta?: { text: string; tone: 'up' | 'flat' | 'down' };
}

/** 迷你趋势线（SVG）：随指标卡展示近几期走势 */
function Spark({ data }: { data: (number | null)[] }) {
  const vals = data.filter((v): v is number => v !== null && v !== undefined);
  if (vals.length < 2) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const pts = vals
    .map((v, i) => `${((i / (vals.length - 1)) * 100).toFixed(1)},${(28 - ((v - min) / range) * 24).toFixed(1)}`)
    .join(' ');
  return (
    <svg className="spark" width="130" height="32" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.35" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,30 ${pts} 100,30`} fill="url(#sparkFill)" stroke="none" />
      <polyline
        points={pts}
        fill="none"
        stroke="#22d3ee"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function MetricCard({ label, value, hint, spark, delta }: MetricCardProps) {
  return (
    <div className="metric">
      <div className="label">{label}</div>
      <div className="value-row">
        <span className="value">{value}</span>
        {delta && <span className={`metric-delta ${delta.tone}`}>{delta.text}</span>}
      </div>
      {spark && <Spark data={spark} />}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}
