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
