/**
 * 小工具榜（独立板块）。
 * 数据源：小红书 App 内官方「小工具」榜单专属页（每日 9:00 更新）。
 * 当前入口/接口尚未接入自动采集，先展示预留空态；数据接通后由 aggregate 输出 minitools.json 驱动。
 */
export default function MinitoolsBoard({ rows }: { rows: unknown[] | null }) {
  if (rows && rows.length > 0) {
    return (
      <table className="data">
        <thead>
          <tr>
            <th>排名</th>
            <th>工具名</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String((r as { name?: string }).name)}>
              <td className="rank-num">{String((r as { rank?: number }).rank ?? '')}</td>
              <td>{String((r as { name?: string }).name ?? '')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return (
    <div className="board-placeholder">
      <span className="bp-chip">PENDING · 数据源待接入</span>
      <h3>官方小工具榜</h3>
      <p>
        官方在小红书 App 内设有「小工具」榜单专属页，每日 9:00 更新。
        该页面入口尚未接入自动采集，数据源接通后将在此展示排名、热度与升降变化（云端定时直采）。
      </p>
      <div className="bp-meta">SOURCE: XHS APP · UPDATE 09:00 CST · STATUS: STANDBY</div>
    </div>
  );
}
