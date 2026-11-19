import type { VibeCategoryMeta } from '../types';

/**
 * 官方 8 大类目元数据（key 与 vibe-app-rank categories 对齐）。
 * 当 derived 数据里 official.categories 为空时的静态兑底，正常情况下以快照内官方数据为准。
 */
export const FALLBACK_CATEGORY_METAS: VibeCategoryMeta[] = [
  { key: 'game', label: '互动玩法', icon: '🎮', count: 0, items: [] },
  { key: 'test', label: '趣味测评', icon: '🎯', count: 0, items: [] },
  { key: 'image', label: '图像创作', icon: '🎨', count: 0, items: [] },
  { key: 'query', label: '查询工具', icon: '🔍', count: 0, items: [] },
  { key: 'life', label: '效率生活', icon: '📝', count: 0, items: [] },
  { key: 'edu', label: '学习教育', icon: '📚', count: 0, items: [] },
  { key: 'fun', label: '娱乐互动', icon: '🎉', count: 0, items: [] },
  { key: 'other', label: '其他', icon: '✨', count: 0, items: [] },
];

export function vibeCategoryMetas(categories: VibeCategoryMeta[] | undefined): VibeCategoryMeta[] {
  if (!categories || categories.length === 0) return FALLBACK_CATEGORY_METAS;
  return categories;
}

/** 小红书笔记页链接（官方榜单行自带 note_id）。 */
export function xhsNoteUrl(noteId: string | number | undefined | null): string | null {
  const id = noteId === undefined || noteId === null ? '' : String(noteId).trim();
  return id ? `https://www.xiaohongshu.com/explore/${id}` : null;
}

/** 小红书用户主页链接（作者榜自带 author_id / creator）。 */
export function xhsUserUrl(userId: string | number | undefined | null): string | null {
  const id = userId === undefined || userId === null ? '' : String(userId).trim();
  return id ? `https://www.xiaohongshu.com/user/profile/${id}` : null;
}
