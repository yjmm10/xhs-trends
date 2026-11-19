/**
 * 小工具榜（vibe-app-rank）快照校验与落盘。
 * 数据源无需登录即可访问（历史需要 XHS_COOKIE，现为可选）。
 * 裁剪 allApps 大字段（4 万+ app 全量），但保留官方元数据：
 * - categories / appCategories：官方精选分类（8 大类目 + 精选 app → 类别映射）
 * - featured：官方精选标签（如 7天热榜）
 * - linkOverrides：官方自定义跳转链接
 */
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const VIBE_DATA_URL = 'https://cowork.xiaohongshu.com/s/vibe-app-rank/data.json';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const REQUIRED_LISTS = ['useList', 'authorList', 'new7List', 'todayList'];

const ITEM_FIELDS = ['app_id', 'app_name', 'slogan', 'use_users', 'note_id'];
const FEATURED_FIELDS = [...ITEM_FIELDS, 'tag'];

function pickFields(item, fields) {
  const out = {};
  for (const f of fields) {
    if (item && typeof item === 'object' && item[f] !== undefined) out[f] = item[f];
  }
  return out;
}

/** 官方精选分类：保留 key/label/icon/count，items 截断到前 10 条精选代表作。 */
function normalizeCategories(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c) => c && typeof c === 'object' && typeof c.key === 'string')
    .map((c) => ({
      key: c.key,
      label: typeof c.label === 'string' ? c.label : c.key,
      icon: typeof c.icon === 'string' ? c.icon : '',
      count: Number.isFinite(c.count) ? c.count : Array.isArray(c.items) ? c.items.length : 0,
      items: (Array.isArray(c.items) ? c.items : []).slice(0, 10).map((it) => pickFields(it, ITEM_FIELDS)),
    }));
}

/** 全量精选 app → 类别 key 映射（截断前，来自官方 categories[].items）。 */
function buildAppCategories(raw) {
  if (!Array.isArray(raw)) return {};
  const map = {};
  for (const c of raw) {
    if (!c || typeof c !== 'object' || typeof c.key !== 'string' || !Array.isArray(c.items)) continue;
    for (const it of c.items) {
      if (it && typeof it === 'object' && it.app_id !== undefined) map[String(it.app_id)] = c.key;
    }
  }
  return map;
}

function normalizeFeatured(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((f) => f && typeof f === 'object').map((f) => pickFields(f, FEATURED_FIELDS));
}

function normalizeLinkOverrides(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return { ...raw };
}

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
      categories: normalizeCategories(raw.categories),
      appCategories: buildAppCategories(raw.categories),
      featured: normalizeFeatured(raw.featured),
      linkOverrides: normalizeLinkOverrides(raw.linkOverrides),
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
