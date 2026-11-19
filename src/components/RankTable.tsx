import { useMemo, useState } from 'react';

export interface RankRowBase {
  rank: number;
  prevRank: number | null;
  rankDelta: number | null;
  isNew: boolean;
}

interface RankTableProps {
  rows: RankRowBase[];
  nameField: string;
  descField?: string;
  valueColumns: { key: string; label: string }[];
  emptyText?: string;
}

function field(row: RankRowBase, key: string): unknown {
  return (row as unknown as Record<string, unknown>)[key];
}

function DeltaMark({ row }: { row: RankRowBase }) {
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

export default function RankTable({ rows, nameField, descField, valueColumns, emptyText }: RankTableProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = String(field(r, nameField) ?? '');
      const desc = descField ? String(field(r, descField) ?? '') : '';
      return name.toLowerCase().includes(q) || desc.toLowerCase().includes(q);
    });
  }, [rows, query, nameField, descField]);

  const colMax = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of valueColumns) {
      m[c.key] = Math.max(...rows.map((r) => Number(field(r, c.key) ?? 0)), 1);
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
          {filtered.map((row) => {
            const name = String(field(row, nameField) ?? '');
            const desc = descField ? String(field(row, descField) ?? '') : '';
            return (
              <tr key={`${name}-${row.rank}`}>
                <td className="rank-num">
                  <span className={`rank-chip ${row.rank === 1 ? 'rank-1' : row.rank === 2 ? 'rank-2' : row.rank === 3 ? 'rank-3' : 'rank-other'}`}>
                    {row.rank}
                  </span>
                  <DeltaMark row={row} />
                </td>
                <td>
                  <div className="cell-name">{name}</div>
                  {desc && (
                    <div className="cell-desc" title={desc}>
                      {desc}
                    </div>
                  )}
                </td>
                {valueColumns.map((c) => {
                  const raw = field(row, c.key);
                  const v = raw === null || raw === undefined ? null : Number(raw);
                  const pct = v === null || Number.isNaN(v) ? 0 : Math.max(4, Math.min(100, (v / colMax[c.key]) * 100));
                  return (
                    <td key={c.key} className="num-cell">
                      <span className="val-wrap">
                        <span className="val">{v === null || Number.isNaN(v) ? '—' : v.toLocaleString()}</span>
                        {v !== null && !Number.isNaN(v) && (
                          <span className="val-bar">
                            <i style={{ width: `${pct}%` }} />
                          </span>
                        )}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
