import { describe, it, expect } from 'vitest';
import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateVibeSnapshot, saveVibeSnapshot, vibeSnapshotFileName } from './vibe-snapshot.mjs';

const validRaw = {
  dataDate: '2026-10-24',
  genTime: '2026-10-25 08:14:28',
  totalApps: 2,
  allApps: [{ app_id: 'a' }, { app_id: 'b' }],
  useList: [{ app_id: 'a', app_name: 'A', use_users: 10 }],
  authorList: [{ creator: 'u1', nickname: 'N', app_cnt: 3 }],
  new7List: [{ app_id: 'a', active7d: 5, cum_users: 9 }],
  todayList: [{ app_id: 'b', use_users: 1 }],
  categories: [
    {
      key: 'game',
      label: '互动玩法',
      icon: '🎮',
      count: 3,
      items: Array.from({ length: 12 }, (_, i) => ({
        app_id: `g${i}`,
        app_name: `游戏${i}`,
        slogan: `slogan${i}`,
        use_users: 100 - i,
        note_id: `n${i}`,
      })),
    },
  ],
  featured: [
    { app_id: 'g0', app_name: '游戏0', slogan: 'slogan0', tag: '7天热榜', use_users: 100, note_id: 'n0' },
  ],
  linkOverrides: { g0: 'https://www.xiaohongshu.com/s/poster?x=1' },
};

describe('validateVibeSnapshot', () => {
  it('通过合法数据并裁剪大字段', () => {
    const r = validateVibeSnapshot(validRaw);
    expect(r.ok).toBe(true);
    expect(r.snapshot.totalApps).toBe(2);
    expect(r.snapshot.allApps).toBeUndefined();
    expect(r.snapshot.useList).toHaveLength(1);
    expect(r.snapshot.new7List).toHaveLength(1);
    expect(r.snapshot.todayList).toHaveLength(1);
    expect(r.snapshot.authorList).toHaveLength(1);
  });

  it('保留官方 categories（精简结构，items 截断到前 10）', () => {
    const r = validateVibeSnapshot(validRaw);
    expect(r.ok).toBe(true);
    const cats = r.snapshot.categories;
    expect(cats).toHaveLength(1);
    expect(cats[0].key).toBe('game');
    expect(cats[0].label).toBe('互动玩法');
    expect(cats[0].icon).toBe('🎮');
    expect(cats[0].count).toBe(3);
    expect(cats[0].items).toHaveLength(10);
    expect(cats[0].items[0]).toEqual({
      app_id: 'g0',
      app_name: '游戏0',
      slogan: 'slogan0',
      use_users: 100,
      note_id: 'n0',
    });
  });

  it('生成官方 appCategories 全量映射（item 未截断前）', () => {
    const r = validateVibeSnapshot(validRaw);
    const map = r.snapshot.appCategories;
    expect(map['g0']).toBe('game');
    expect(map['g11']).toBe('game');
    expect(Object.keys(map)).toHaveLength(12);
  });

  it('保留官方 featured 与 linkOverrides', () => {
    const r = validateVibeSnapshot(validRaw);
    expect(r.snapshot.featured).toEqual([
      { app_id: 'g0', app_name: '游戏0', slogan: 'slogan0', tag: '7天热榜', use_users: 100, note_id: 'n0' },
    ]);
    expect(r.snapshot.linkOverrides).toEqual({ g0: 'https://www.xiaohongshu.com/s/poster?x=1' });
  });

  it('源缺 categories/featured/linkOverrides 时给安全空值', () => {
    const { categories, featured, linkOverrides, ...rest } = validRaw;
    const r = validateVibeSnapshot(rest);
    expect(r.ok).toBe(true);
    expect(r.snapshot.categories).toEqual([]);
    expect(r.snapshot.appCategories).toEqual({});
    expect(r.snapshot.featured).toEqual([]);
    expect(r.snapshot.linkOverrides).toEqual({});
  });

  it('categories 非法结构时宽容降级为空值', () => {
    const r = validateVibeSnapshot({ ...validRaw, categories: 'bad', featured: 42, linkOverrides: [] });
    expect(r.ok).toBe(true);
    expect(r.snapshot.categories).toEqual([]);
    expect(r.snapshot.appCategories).toEqual({});
    expect(r.snapshot.featured).toEqual([]);
    expect(r.snapshot.linkOverrides).toEqual({});
  });

  it('拒绝非法 dataDate', () => {
    expect(validateVibeSnapshot({ ...validRaw, dataDate: 'bad' }).ok).toBe(false);
    expect(validateVibeSnapshot({ ...validRaw, dataDate: undefined }).ok).toBe(false);
  });

  it('拒绝缺失榜单', () => {
    expect(validateVibeSnapshot({ ...validRaw, new7List: [] }).ok).toBe(false);
    expect(validateVibeSnapshot({ ...validRaw, authorList: null }).ok).toBe(false);
  });

  it('拒绝非对象根节点', () => {
    expect(validateVibeSnapshot(null).ok).toBe(false);
    expect(validateVibeSnapshot([1]).ok).toBe(false);
  });

  it('allApps 缺失时 totalApps 为 null 但仍通过', () => {
    const { allApps, ...rest } = validRaw;
    const r = validateVibeSnapshot(rest);
    expect(r.ok).toBe(true);
    expect(r.snapshot.totalApps).toBeNull();
  });
});

describe('saveVibeSnapshot', () => {
  it('首次保存，重复跳过（幂等）', () => {
    const dir = mkdtempSync(join(tmpdir(), 'vibe-snap-'));
    const snap = validateVibeSnapshot(validRaw).snapshot;
    const first = saveVibeSnapshot(dir, snap);
    const second = saveVibeSnapshot(dir, snap);
    expect(first.action).toBe('saved');
    expect(second.action).toBe('skipped');
    expect(readdirSync(dir)).toEqual([vibeSnapshotFileName(snap)]);
  });
});
