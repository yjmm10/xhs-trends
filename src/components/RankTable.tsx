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

/** 榜单表格：排名（含变化标记）、名称+描述、数值列；内置搜索过滤 */
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
                {row.rank}
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
              {valueColumns.map((c) => (
                <td key={c.key} className="num-cell">
                  {row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
