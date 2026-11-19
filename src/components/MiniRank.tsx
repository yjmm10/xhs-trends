import { xhsNoteUrl } from '../lib/vibeCats';
import type { VibeCategory } from '../types';

interface MiniRankProps<T extends { rank: number }> {
  rows: T[];
  nameField: string;
  valueField: string;
  valueLabel: string;
  showNoteLink?: boolean;
  showCategory?: boolean;
}

function readField(row: unknown, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

/** 总览页迷你榜单：排名 + 名称 + 相对值条，比完整表格轻量。 */
export default function MiniRank<T extends { rank: number }>({
  rows,
  nameField,
  valueField,
  valueLabel,
  showNoteLink,
  showCategory,
}: MiniRankProps<T>) {
  if (rows.length === 0) return <div className="empty">暂无数据</div>;
  const max = Math.max(...rows.map((r) => Number(readField(r, valueField) ?? 0)), 1);
  return (
    <ol className="mini-rank">
      {rows.map((row) => {
        const name = String(readField(row, nameField) ?? '');
        const v = Number(readField(row, valueField) ?? 0);
        const cat = readField(row, 'category') as VibeCategory | undefined;
        const url = showNoteLink ? xhsNoteUrl(readField(row, 'note_id') as string | undefined) : null;
        return (
          <li key={`${name}-${row.rank}`} className="mini-rank-row">
            <span className={`mini-rank-rank ${row.rank <= 3 ? `top${row.rank}` : ''}`}>{row.rank}</span>
            <span className="mini-rank-main">
              <span className="mini-rank-name">
                <span className="mini-rank-title" title={name}>
                  {name}
                </span>
                {showCategory && cat && (
                  <span className={`cat-chip ${cat.source === 'official' ? 'cat-official' : 'cat-estimate'}`} title={cat.source === 'official' ? '官方精选分类' : '关键词规则估算'}>
                    {cat.icon} {cat.label}
                  </span>
                )}
                {url && (
                  <a className="name-link" href={url} target="_blank" rel="noreferrer" title="查看官方挂载笔记">
                    ↗
                  </a>
                )}
              </span>
              <span className="mini-rank-bar">
                <i style={{ width: `${Math.max(6, (v / max) * 100)}%` }} />
              </span>
            </span>
            <span className="mini-rank-val" title={valueLabel}>
              {v.toLocaleString()}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
