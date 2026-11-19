interface CatDistItem {
  key: string;
  name: string;
  official: number;
  estimate: number;
}

/** 总览页类目分布条：官方精选 / 规则估算两段堆叠的轻量横条（纯 CSS，不引入图表）。 */
export default function CatBars({ dist }: { dist: CatDistItem[] }) {
  if (dist.length === 0) return <div className="empty">暂无类目数据</div>;
  const max = Math.max(...dist.map((d) => d.official + d.estimate), 1);
  return (
    <div className="catbars">
      {dist.map((d) => (
        <div className="catbar-row" key={d.key}>
          <span className="catbar-label">{d.name}</span>
          <span
            className="catbar-track"
            title={`官方精选 ${d.official} · 规则估算 ${d.estimate}`}
          >
            {d.official > 0 && <i className="seg-official" style={{ width: `${(d.official / max) * 100}%` }} />}
            {d.estimate > 0 && <i className="seg-estimate" style={{ width: `${(d.estimate / max) * 100}%` }} />}
          </span>
          <span className="catbar-count">{d.official + d.estimate}</span>
        </div>
      ))}
      <div className="catbar-legend">
        <i className="seg-official" /> 官方精选
        <i className="seg-estimate" /> 规则估算
      </div>
    </div>
  );
}
