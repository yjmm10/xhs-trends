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

export type VibeListKey = 'todayList' | 'new7List' | 'useList' | 'authorList';

export interface VibeRow {
  rank: number;
  prevRank: number | null;
  rankDelta: number | null;
  isNew: boolean;
  app_id?: string;
  app_name?: string;
  slogan?: string;
  note_id?: string;
  use_users?: number;
  active7d?: number;
  cum_users?: number;
  creator?: string;
  nickname?: string;
  app_cnt?: number;
  gmt_create?: string;
}

export interface VibeRankings {
  date: string;
  prevDate: string | null;
  todayList: VibeRow[];
  new7List: VibeRow[];
  useList: VibeRow[];
  authorList: VibeRow[];
}

export interface VibeData {
  hasData: boolean;
  generatedAt: string;
  latestDate: string | null;
  prevDate: string | null;
  series: SeriesPoint[];
  latest: { date: string; total: number; newSinceLast: number | null } | null;
  rankings: VibeRankings | null;
}
