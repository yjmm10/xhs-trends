/**
 * 小工具榜（vibe-app-rank）快照校验与落盘。
 * 数据源需要登录 Cookie（env XHS_COOKIE），仅保留四榜单与总量计数，裁剪 allApps/categories 等大字段。
 */
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const VIBE_DATA_URL = 'https://cowork.xiaohongshu.com/s/vibe-app-rank/data.json';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const REQUIRED_LISTS = ['useList', 'authorList', 'new7List', 'todayList'];

export function validateVibeSnapshot(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'data.json 顶层必须是对象' };
  }
  if (typeof raw.dataDate !== 'string' || !DATE_RE.test(raw.dataDate)) {
    return { ok: false, error: `dataDate 缺失或格式非法: ${JSON.stringify(raw.dataDate)}` };
  }
  for (const key of REQUIRED_LISTS) {
    if (!Array.isArray(raw[key]) || raw[key].length === 0) {
      return { ok: false, error: `榜单 ${key} 缺失、非数组或为空` };
    }
  }
  return {
    ok: true,
    snapshot: {
      dataDate: raw.dataDate,
      genTime: typeof raw.genTime === 'string' ? raw.genTime : '',
      totalApps: Array.isArray(raw.allApps) ? raw.allApps.length : null,
      useList: raw.useList,
      authorList: raw.authorList,
      new7List: raw.new7List,
      todayList: raw.todayList,
    },
  };
}

export function vibeSnapshotFileName(snapshot) {
  return `vibe-${snapshot.dataDate}.json`;
}

export function saveVibeSnapshot(snapshotsDir, snapshot) {
  const file = join(snapshotsDir, vibeSnapshotFileName(snapshot));
  if (existsSync(file)) {
    return { action: 'skipped', file };
  }
  writeFileSync(file, JSON.stringify(snapshot), 'utf-8');
  return { action: 'saved', file };
}
