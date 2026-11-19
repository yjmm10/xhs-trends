import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { xhsNoteUrl, xhsUserUrl } from '../lib/vibeCats';
import { isFav, toggleFav } from '../lib/localStore';
import type { FavKind } from '../lib/localStore';
import type { VibeCategory } from '../types';

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
  /** 行内有 note_id 时渲染官方笔记链接 */
  showNoteLink?: boolean;
  /** 以指定字段（author_id / creator）渲染作者主页链接 */
  profileLinkField?: string;
  /** 行内有 category 时渲染类目徽标（official 实心 / estimate 虚线） */
  showCategory?: boolean;
  /** 额外的补充元信息行（如上线时间 gmt_create），仅在有值时展示 */
  metaFields?: { field: string; label: string }[];
  /** 自定义徽标（如官方 featured 标签），返回 null 则不渲染 */
  badge?: (row: RankRowBase) => ReactNode | null;
  /** 收藏星标：提供后每行显示 ☆/★，存入本地缓存 */
  fav?: { kind: FavKind; idField: string; list: string; date: string };
  /** 按当前筛选结果重新编号（类目筛选时每类有自己的 1/2/3…），并隐藏跨榜变动标记 */
  renumber?: boolean;
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

function CategoryChip({ category }: { category: VibeCategory }) {
  const title = category.source === 'official' ? '官方精选分类' : '关键词规则估算';
  return (
    <span className={`cat-chip ${category.source === 'official' ? 'cat-official' : 'cat-estimate'}`} title={title}>
      {category.icon} {category.label}
    </span>
  );
}

function NameLink({ href, label }: { href: string; label: string }) {
  return (
    <a className="name-link" href={href} target="_blank" rel="noreferrer" title={label}>
      ↗
    </a>
  );
}

function FavStar({
  row,
  name,
  fav,
  values,
}: {
  row: RankRowBase;
  name: string;
  fav: { kind: FavKind; idField: string; list: string; date: string };
  values: { label: string; value: string }[];
}) {
  const id = String(field(row, fav.idField) ?? '');
  if (!id) return null;
  const active = isFav(fav.kind, id);
  const noteIdRaw = field(row, 'note_id');
  return (
    <button
      className={`fav-btn ${active ? 'on' : ''}`}
      title={active ? '取消收藏' : '收藏到本地'}
      onClick={() =>
        toggleFav({
          kind: fav.kind,
          id,
          name,
          list: fav.list,
          date: fav.date,
          values,
          noteId: noteIdRaw ? String(noteIdRaw) : undefined,
        })
      }
    >
      {active ? '★' : '☆'}
    </button>
  );
}

export default function RankTable({
  rows,
  nameField,
  descField,
  valueColumns,
  emptyText,
  showNoteLink,
  profileLinkField,
  showCategory,
  metaFields,
  badge,
  fav,
  renumber,
}: RankTableProps) {
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
          {filtered.map((row, idx) => {
            const name = String(field(row, nameField) ?? '');
            const desc = descField ? String(field(row, descField) ?? '') : '';
            // 按当前筛选重新编号，或数据缺失 rank 时回退为序号
            const rank = renumber || !(Number(row.rank) > 0) ? idx + 1 : Number(row.rank);
            return (
              <tr key={`${name}-${rank}`}>
                <td className="rank-num">
                  <span className={`rank-chip ${rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other'}`}>
                    {rank}
                  </span>
                  {!renumber && <DeltaMark row={row} />}
                </td>
                <td>
                  <div className="cell-name">
                    {fav && (
                      <FavStar
                        row={row}
                        name={name}
                        fav={fav}
                        values={valueColumns.map((c) => ({
                          label: c.label,
                          value: String(field(row, c.key) ?? '—'),
                        }))}
                      />
                    )}
                    {name}
                    {showCategory &&
                      ((field(row, 'category') as VibeCategory | undefined) ? (
                        <CategoryChip category={field(row, 'category') as VibeCategory} />
                      ) : null)}
                    {showNoteLink && xhsNoteUrl(field(row, 'note_id') as string | undefined) && (
                      <NameLink
                        href={xhsNoteUrl(field(row, 'note_id') as string | undefined)!}
                        label="查看官方挂载笔记"
                      />
                    )}
                    {profileLinkField &&
                      xhsUserUrl(field(row, profileLinkField) as string | undefined) && (
                        <NameLink
                          href={xhsUserUrl(field(row, profileLinkField) as string | undefined)!}
                          label="查看作者主页"
                        />
                      )}
                    {badge?.(row) ?? null}
                  </div>
                  {desc && (
                    <div className="cell-desc" title={desc}>
                      {desc}
                    </div>
                  )}
                  {metaFields && (
                    <div className="cell-meta">
                      {metaFields
                        .map(({ field: f, label }) => {
                          const v = field(row, f);
                          return v ? `${label} ${String(v)}` : null;
                        })
                        .filter(Boolean)
                        .join(' · ')}
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
