/**
 * 快照获取与校验。
 *
 * 数据源：官方 REDSkill 排行榜静态 JSON（无需登录）。
 * 校验失败绝不落盘；官方未来新增字段宽容接受（只读已知字段）。
 */
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const RANK_DATA_URL = process.env.XHS_RANK_URL ?? 'https://cowork.xiaohongshu.com/s/redskill-rank/data.json';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const REQUIRED_LISTS = ['useList', 'authorList', 'newList', 'todayList'];

/**
 * 校验官方 data.json 结构。
 * @param {*} raw fetch 后 JSON.parse 的结果
 * @returns {{ok: true, snapshot: object} | {ok: false, error: string}}
 */
export function validateSnapshot(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'data.json 顶层必须是对象' };
  }
  if (typeof raw.dataDate !== 'string' || !DATE_RE.test(raw.dataDate)) {
    return { ok: false, error: `dataDate 缺失或格式非法（期望 YYYY-MM-DD），实际: ${JSON.stringify(raw.dataDate)}` };
  }
  const { allSkills } = raw;
  if (!Array.isArray(allSkills) || allSkills.length === 0) {
    return { ok: false, error: 'allSkills 缺失、非数组或为空' };
  }
  for (let i = 0; i < Math.min(allSkills.length, 5); i++) {
    const item = allSkills[i];
    if (item === null || typeof item !== 'object' || !('skill_id' in item) || !('skill_name' in item)) {
      return { ok: false, error: `allSkills[${i}] 缺少 skill_id 或 skill_name` };
    }
  }
  for (const key of REQUIRED_LISTS) {
    if (!Array.isArray(raw[key])) {
      return { ok: false, error: `榜单 ${key} 缺失或非数组` };
    }
  }
  // 只保留已知字段（宽容官方新增字段，但不带入快照）。
  // 全量 5 万+ 技能行不落盘：只存 id 集合 + 总量（快照体积从 ~15MB 降到 <1MB），
  // aggregate 用 id 集合算“较上次新增 / 消失”，用榜单行渲染榜单。
  const snapshot = {
    dataDate: raw.dataDate,
    genTime: typeof raw.genTime === 'string' ? raw.genTime : '',
    useList: raw.useList,
    authorList: raw.authorList,
    newList: raw.newList,
    todayList: raw.todayList,
    total: allSkills.length,
    skillIds: allSkills.map((k) => String(k.skill_id)),
  };
  return { ok: true, snapshot };
}

export function snapshotFileName(snapshot) {
  return `skills-${snapshot.dataDate}.json`;
}

/**
 * 幂等落盘：同 dataDate 快照已存在则跳过。
 * @param {string} snapshotsDir
 * @param {object} snapshot 已通过校验的快照
 * @returns {{action: 'saved'|'skipped', file: string}}
 */
export function saveSnapshot(snapshotsDir, snapshot) {
  const file = join(snapshotsDir, snapshotFileName(snapshot));
  if (existsSync(file)) {
    return { action: 'skipped', file };
  }
  writeFileSync(file, JSON.stringify(snapshot), 'utf-8');
  return { action: 'saved', file };
}
