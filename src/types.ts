// derived JSON 的类型定义（与 scripts/aggregate.mjs 的产物结构一一对应）

export interface SeriesPoint {
  date: string;
  total: number;
  newSinceLast: number | null;
}

export interface Overview {
  generatedAt: string;
  latestDate: string;
  prevDate: string | null;
  series: SeriesPoint[];
  latest: {
    date: string;
    total: number;
    newSinceLast: number | null;
    officialNew7Sum: number;
    todayRankCount: number;
    disappearedCount: number;
  };
  minitools: { count: number; categoryCounts: Record<string, number> };
}

export interface RankRow {
  rank: number;
  prevRank: number | null;
  rankDelta: number | null;
  isNew: boolean;
  skill_id?: number;
  skill_name?: string;
  skill_description?: string;
  author_id?: number;
  nickname?: string;
  note_id?: number;
  use_cnt?: number;
  use_users?: number;
  new7_cnt?: number;
  cum_cnt?: number;
  skill_cnt?: number;
}

export type RankListKey = 'useList' | 'newList' | 'todayList' | 'authorList';

export interface Rankings {
  date: string;
  prevDate: string | null;
  useList: RankRow[];
  newList: RankRow[];
  todayList: RankRow[];
  authorList: RankRow[];
}

export interface CategoryShare {
  category: string;
  count: number;
  share: number;
}

export interface Categories {
  date: string;
  total: number;
  current: CategoryShare[];
  history: { date: string; counts: Record<string, number> }[];
  fallback: string;
  caveat: string;
}

export interface KeywordRow {
  word: string;
  count: number;
  prevCount: number;
  delta: number;
  emerging: boolean;
}

export interface Keywords {
  date: string;
  prevDate: string | null;
  top: KeywordRow[];
  emerging: KeywordRow[];
  caveat: string | null;
}

export interface MinitoolsItem {
  name: string;
  category?: string;
  launchDate?: string;
  noteId?: number | string;
  source?: string;
  addedAt?: string;
}

export interface Minitools {
  generatedAt: string;
  items: MinitoolsItem[];
  categoryCounts: Record<string, number>;
  caveat: string;
}
