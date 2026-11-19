import { xhsNoteUrl } from '../lib/vibeCats';
import type { VibeFeaturedItem } from '../types';

/**
 * 官方精选推荐（vibe-app-rank featured），按官方标签分组（7天热榜 / 今日新品），
 * 每个精选小工具渲染成一张小卡片：名称 + 一句话简介 + 使用人数 + 笔记链接。
 */
export default function FeaturedList({ items }: { items: VibeFeaturedItem[] }) {
  if (items.length === 0) return <div className="empty">暂无官方精选数据</div>;
  const groups = new Map<string, VibeFeaturedItem[]>();
  for (const f of items) {
    const tag = f.tag || '官方推荐';
    const list = groups.get(tag);
    if (list) list.push(f);
    else groups.set(tag, [f]);
  }
  return (
    <div>
      {[...groups.entries()].map(([tag, list]) => (
        <div className="feat-group" key={tag}>
          <div className="feat-group-title">
            <span className="badge-featured">{tag}</span>
            <span className="feat-group-count">{list.length}</span>
          </div>
          <div className="feat-grid">
            {list.map((f) => {
              const url = xhsNoteUrl(f.note_id);
              const body = (
                <>
                  <div className="feat-card-name" title={f.app_name}>
                    {f.app_name}
                  </div>
                  {f.slogan && <div className="feat-card-slogan" title={f.slogan}>{f.slogan}</div>}
                  {(f.use_users !== undefined || url) && (
                    <div className="feat-card-foot">
                      {f.use_users !== undefined && (
                        <span className="feat-card-users">{f.use_users.toLocaleString()} 在用</span>
                      )}
                      {url && (
                        <span className="feat-card-link" aria-hidden>
                          ↗ 笔记
                        </span>
                      )}
                    </div>
                  )}
                </>
              );
              return url ? (
                <a key={f.app_id} className="feat-card" href={url} target="_blank" rel="noreferrer" title={f.slogan}>
                  {body}
                </a>
              ) : (
                <div key={f.app_id} className="feat-card" title={f.slogan}>
                  {body}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
