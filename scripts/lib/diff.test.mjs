import { describe, it, expect } from 'vitest';
import { newSkillIds, compareRanks, disappearedIds } from './diff.mjs';

describe('newSkillIds — 新增口径必须为 skill_id 集合差', () => {
  it('返回在 curr 中、不在 prev 中的 id', () => {
    const prev = [{ skill_id: 1 }, { skill_id: 2 }, { skill_id: 3 }];
    const curr = [{ skill_id: 2 }, { skill_id: 3 }, { skill_id: 4 }, { skill_id: 5 }];
    expect(newSkillIds(prev, curr).sort()).toEqual([4, 5]);
  });

  it('prev 为空时全部算新增', () => {
    const curr = [{ skill_id: 1 }, { skill_id: 2 }];
    expect(newSkillIds([], curr).sort()).toEqual([1, 2]);
  });

  it('skill_id 以字符串形式比较也可行（官方可能给数字或字符串）', () => {
    const prev = [{ skill_id: 1 }];
    const curr = [{ skill_id: '1' }, { skill_id: 2 }];
    // '1' 与 1 视为同一技能（规范化为字符串比较）
    expect(newSkillIds(prev, curr)).toEqual([2]);
  });

  it('无新增返回空数组', () => {
    const items = [{ skill_id: 9 }];
    expect(newSkillIds(items, items)).toEqual([]);
  });
});

describe('compareRanks — 榜单排名对比', () => {
  it('标记新上榜 isNew=true 且 prevRank=null', () => {
    const prev = [{ skill_id: 1, skill_name: 'a' }];
    const curr = [{ skill_id: 1, skill_name: 'a' }, { skill_id: 2, skill_name: 'b' }];
    const result = compareRanks(prev, curr);
    const b = result.find((r) => r.skill_id === 2);
    expect(b.isNew).toBe(true);
    expect(b.prevRank).toBeNull();
    expect(b.rank).toBe(2);
  });

  it('计算排名上升与下降（正值=上升）', () => {
    const prev = [
      { skill_id: 1, skill_name: 'a' },
      { skill_id: 2, skill_name: 'b' },
      { skill_id: 3, skill_name: 'c' },
    ];
    const curr = [
      { skill_id: 3, skill_name: 'c' },
      { skill_id: 1, skill_name: 'a' },
      { skill_id: 2, skill_name: 'b' },
    ];
    const result = compareRanks(prev, curr);
    const c = result.find((r) => r.skill_id === 3);
    const b = result.find((r) => r.skill_id === 2);
    expect(c.rankDelta).toBe(2); // 3→1，上升 2 位
    expect(b.rankDelta).toBe(-1); // 2→3，下降 1 位
  });

  it('保留榜单上的全部原始字段', () => {
    const prev = [];
    const curr = [{ skill_id: 1, skill_name: 'a', use_cnt: 999, note_id: 42 }];
    const [row] = compareRanks(prev, curr);
    expect(row.use_cnt).toBe(999);
    expect(row.note_id).toBe(42);
    expect(row.skill_name).toBe('a');
  });

  it('作者榜同样适用（按 author_id 比较）', () => {
    const prev = [{ author_id: 7, nickname: 'x', skill_cnt: 10 }];
    const curr = [{ author_id: 7, nickname: 'x', skill_cnt: 12 }];
    const result = compareRanks(prev, curr, 'author_id');
    expect(result[0].isNew).toBe(false);
    expect(result[0].rankDelta).toBe(0);
  });
});

describe('disappearedIds — 连续缺席才算消失', () => {
  it('缺席 1 份快照不算消失', () => {
    const snapshots = [
      new Set([1, 2, 3]),
      new Set([1, 2]),
    ];
    expect(disappearedIds(snapshots, 3)).toEqual([]);
  });

  it('连续缺席达到阈值才算消失', () => {
    const snapshots = [
      new Set([1, 2, 3]),
      new Set([1, 2]),
      new Set([1, 2]),
      new Set([1, 2]),
    ];
    expect(disappearedIds(snapshots, 3)).toEqual([3]);
  });

  it('中途重现则重新计数', () => {
    const snapshots = [
      new Set([1, 2]),
      new Set([1]),
      new Set([1, 2]),
      new Set([1]),
      new Set([1]),
    ];
    expect(disappearedIds(snapshots, 3)).toEqual([]);
  });

  it('快照数不足阈值时不判定任何消失', () => {
    const snapshots = [new Set([1, 2]), new Set([1])];
    expect(disappearedIds(snapshots, 3)).toEqual([]);
  });
});
