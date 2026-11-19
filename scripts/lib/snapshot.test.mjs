import { describe, it, expect } from 'vitest';
import { validateSnapshot, snapshotFileName, RANK_DATA_URL } from './snapshot.mjs';

const valid = {
  dataDate: '2026-11-17',
  genTime: '2026-11-18 08:00:00',
  useList: [{ skill_id: 1, skill_name: 'a', skill_description: 'x', use_cnt: 10, use_users: 5, note_id: 1 }],
  authorList: [{ author_id: 7, nickname: 'n', skill_cnt: 3 }],
  newList: [{ skill_id: 2, skill_name: 'b', skill_description: 'y', new7_cnt: 4, cum_cnt: 40, note_id: 2 }],
  todayList: [],
  allSkills: [
    { skill_id: 1, skill_name: 'a', skill_description: 'x' },
    { skill_id: 2, skill_name: 'b', skill_description: 'y' },
  ],
};

describe('validateSnapshot — 官方 data.json 结构校验', () => {
  it('合法快照通过并返回规范化对象（全量名单降为 id 集合，不携带完整行）', () => {
    const result = validateSnapshot(valid);
    expect(result.ok).toBe(true);
    expect(result.snapshot.dataDate).toBe('2026-11-17');
    expect(result.snapshot.total).toBe(2);
    expect(result.snapshot.skillIds).toEqual(['1', '2']);
    expect(result.snapshot.allSkills).toBeUndefined();
  });

  it('非对象/数组输入拒绝', () => {
    expect(validateSnapshot(null).ok).toBe(false);
    expect(validateSnapshot([]).ok).toBe(false);
    expect(validateSnapshot('str').ok).toBe(false);
  });

  it('缺少 dataDate 或格式非法拒绝', () => {
    expect(validateSnapshot({ ...valid, dataDate: undefined }).ok).toBe(false);
    expect(validateSnapshot({ ...valid, dataDate: '2026/11/17' }).ok).toBe(false);
    expect(validateSnapshot({ ...valid, dataDate: 'not-a-date' }).ok).toBe(false);
  });

  it('allSkills 缺失、非数组或为空拒绝', () => {
    expect(validateSnapshot({ ...valid, allSkills: undefined }).ok).toBe(false);
    expect(validateSnapshot({ ...valid, allSkills: 'x' }).ok).toBe(false);
    expect(validateSnapshot({ ...valid, allSkills: [] }).ok).toBe(false);
  });

  it('allSkills 条目缺 skill_id/skill_name 拒绝', () => {
    expect(validateSnapshot({ ...valid, allSkills: [{ skill_name: 'a' }] }).ok).toBe(false);
    expect(validateSnapshot({ ...valid, allSkills: [{ skill_id: 1 }] }).ok).toBe(false);
  });

  it('四个榜单缺失或非数组拒绝', () => {
    for (const key of ['useList', 'authorList', 'newList', 'todayList']) {
      const broken = { ...valid };
      delete broken[key];
      expect(validateSnapshot(broken).ok).toBe(false);
      expect(validateSnapshot({ ...valid, [key]: 'oops' }).ok).toBe(false);
    }
  });

  it('宽容附加字段：官方未来新增字段不拒绝', () => {
    const extended = { ...valid, brandNewField: { nested: true } };
    expect(validateSnapshot(extended).ok).toBe(true);
  });

  it('错误信息可读（指出第一个问题）', () => {
    const result = validateSnapshot({ ...valid, allSkills: [] });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('allSkills');
  });
});

describe('snapshotFileName', () => {
  it('按 dataDate 命名', () => {
    expect(snapshotFileName(valid)).toBe('skills-2026-11-17.json');
  });
});

describe('RANK_DATA_URL', () => {
  it('默认指向官方排行榜数据', () => {
    expect(RANK_DATA_URL).toBe('https://cowork.xiaohongshu.com/s/redskill-rank/data.json');
  });
});
