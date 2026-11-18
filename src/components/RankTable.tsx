import { useMemo, useState } from 'react';
import type { RankRow } from '../types';

interface ValueColumn {
  key: 'use_cnt' | 'use_users' | 'new7_cnt' | 'cum_cnt' | 'skill_cnt';
  label: string;
}

interface RankTableProps {
  rows: RankRow[];
  nameField: 'skill_name' | 'nickname';
  descField?: 'skill_description';
  valueColumns: ValueColumn[];
  emptyText?: string;
}

function DeltaMark({ row }: { row: RankRow }) {
  if (row.isNew || row.prevRank === null) {
    return <span className="badge-new">新上榜</span>;
  }
  if (row.rankDelta !== null && row.rankDelta > 0) {
    return (
      <span className="rank-delta delta-up">
        ↑{row.rankDelta}
      </span>
    );
  }
  if (row.rankDelta !== null && row.rankDelta < 0) {
    return (
      <span className="rank-delta delta-down">
        ↓{Math.abs(row.rankDelta)}
      </span>
    );
  }
  return null;
}

/** 榜单表格：排名徽章（前三名高亮）、名称+描述、数值列（含相对 TOP1 的比例条）；内置搜索过滤 */
export default function RankTable({ rows, nameField, descField, valueColumns, emptyText }: RankTableProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = String(r[nameField] ?? '');
      const desc = descField ? String(r[descField] ?? '') : '';
      return name.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
    });
  }, [rows, query, nameField, descField]);

  const colMax = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of valueColumns) {
      m[c.key] = Math.max(...rows.map((r) => Number(r[c.key] ?? 0)), 1);
    }
    return m;
  }, [rows, valueColumns]);

  if (rows.length === 0) {
    return <div className="empty">{emptyText ?? '暂无数据'}</div>;
  }

  return (
    <div>
      <div className="toolbar">
        <input
          type="search"
          placeholder="搜索名称或描述…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="count-note">
          {filtered.length} / {rows.length} 条
        </span>
      </div>
      <table className="data">
        <thead>
          <tr>
            <th>排名</th>
            <th>名称</th>
            {valueColumns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr key={`${row[nameField]}-${row.rank}`}>
              <td className="rank-num">
                <span className={`rank-chip ${row.rank === 1 ? 'rank-1' : row.rank === 2 ? 'rank-2' : row.rank === 3 ? 'rank-3' : 'rank-other'}`}>
                  {row.rank}
                </span>
                <DeltaMark row={row} />
              </td>
              <td>
                <div className="cell-name">{String(row[nameField] ?? '')}</div>
                {descField && row[descField] && (
                  <div className="cell-desc" title={String(row[descField])}>
                    {String(row[descField])}
                  </div>
                )}
              </td>
              {valueColumns.map((c) => {
                const v = row[c.key];
                const pct = v === null || v === undefined ? 0 : Math.max(4, Math.min(100, (Number(v) / colMax[c.key]) * 100));
                return (
                  <td key={c.key} className="num-cell">
                    <span className="val-wrap">
                      <span className="val">{v ?? '—'}</span>
                      {v !== null && v !== undefined && <span className="val-bar"><i style={{ width: `${pct}%` }} /></span>}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
