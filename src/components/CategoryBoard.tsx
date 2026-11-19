import { xhsNoteUrl } from '../lib/vibeCats';
import type { VibeCategoryMeta } from '../types';

/**
 * 官方精选分类板块：vibe-app-rank 官方 8 大类目 + 每类精选代表作（快照内官方数据）。
 * 代表作带官方挂载笔记链接。
 */
export default function CategoryBoard({ metas }: { metas: VibeCategoryMeta[] }) {
  return (
    <div className="cat-board">
      {metas.map((m) => (
        <div className="cat-card" key={m.key}>
          <div className="cat-card-head">
            <span className="cat-icon">{m.icon}</span>
            <span className="cat-label">{m.label}</span>
            <span className="cat-count">{m.count}</span>
          </div>
          {m.items.length > 0 ? (
            <ul className="cat-items">
              {m.items.map((it) => {
                const url = xhsNoteUrl(it.note_id);
                return (
                  <li key={it.app_id}>
                    {url ? (
                      <a className="cat-item-name" href={url} target="_blank" rel="noreferrer" title={it.slogan}>
                        {it.app_name}
                      </a>
                    ) : (
                      <span className="cat-item-name" title={it.slogan}>
                        {it.app_name}
                      </span>
                    )}
                    {it.use_users !== undefined && (
                      <span className="cat-item-users">{it.use_users.toLocaleString()}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="cat-empty">暂无精选数据</div>
          )}
        </div>
      ))}
    </div>
  );
}
