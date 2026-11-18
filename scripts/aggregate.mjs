#!/usr/bin/env node
/**
 * 聚合脚本：读取全部快照与小工具数据源，生成前端专用的 derived JSON。
 *
 * 产物（data/derived/，gitignore，构建时再生成）：
 *   overview.json   小工具指标 + RedSkill 总量曲线与最新指标（榜单页使用）
 *   rankings.json   RedSkill 官方四榜单 + 与上一份快照的排名对比
 *   minitools.json  小工具聚合（登记清单 + 平台官方类目 + 本账号作品）
 *
 * 口径：RedSkill 新增 = 相邻快照 skill_id 集合差；消失 = 连续 >=3 快照缺席。
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { newSkillIds, compareRanks, disappearedIds } from './lib/diff.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOTS_DIR = join(root, 'data/snapshots');
const DERIVED_DIR = join(root, 'data/derived');
const SOURCES_DIR = join(root, 'data/sources');

function loadSnapshots() {
  const files = readdirSync(SNAPSHOTS_DIR)
    .filter((f) => /^skills-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
  const snapshots = files.map((f) => {
    try {
      return JSON.parse(readFileSync(join(SNAPSHOTS_DIR, f), 'utf-8'));
    } catch (err) {
      throw new Error(`快照文件损坏: ${f} (${err.message})`);
    }
  });
  snapshots.sort((a, b) => a.dataDate.localeCompare(b.dataDate));
  return snapshots;
}

function writeDerived(name, data) {
  mkdirSync(DERIVED_DIR, { recursive: true });
  const file = join(DERIVED_DIR, name);
  writeFileSync(file, JSON.stringify(data), 'utf-8');
  console.log(`[aggregate] 写出 ${name}（${(JSON.stringify(data).length / 1024).toFixed(0)} KB）`);
}

function loadMinitoolSources() {
  // 手动观察清单 + 本账号作品类目注解（list 接口不返回类目）
  let items = [];
  let ownAppCategories = {};
  try {
    const mt = JSON.parse(readFileSync(join(SOURCES_DIR, 'minitools.json'), 'utf-8'));
    items = Array.isArray(mt.items) ? mt.items : [];
    ownAppCategories = mt.ownAppCategories && typeof mt.ownAppCategories === 'object' ? mt.ownAppCategories : {};
  } catch {
    console.warn('[aggregate] minitools.json 缺失或非法，按空处理');
  }
  // 平台元数据（scripts/fetch-minitool-meta.mjs 生成；缺失时容忍）
  let platform = null;
  const platformFile = join(SOURCES_DIR, 'minitool-platform.json');
  if (existsSync(platformFile)) {
    try {
      platform = JSON.parse(readFileSync(platformFile, 'utf-8'));
    } catch (err) {
      console.warn(`[aggregate] minitool-platform.json 解析失败，忽略: ${err.message}`);
    }
  } else {
    console.warn('[aggregate] 无 minitool-platform.json（可运行 npm run minitools:fetch 获取官方类目与本账号作品）');
  }
  return { items, ownAppCategories, platform };
}

function main() {
  let snapshots;
  try {
    snapshots = loadSnapshots();
  } catch (err) {
    console.error(`[aggregate] ${err.message}`);
    process.exit(1);
  }
  if (snapshots.length === 0) {
    console.error('[aggregate] 没有快照，请先运行 npm run collect');
    process.exit(1);
  }

  const latest = snapshots[snapshots.length - 1];
  const prev = snapshots.length >= 2 ? snapshots[snapshots.length - 2] : null;
  const hasPrev = prev !== null;
  console.log(
    `[aggregate] 快照 ${snapshots.length} 份（${snapshots[0].dataDate} → ${latest.dataDate}），prev=${hasPrev ? prev.dataDate : '无'}`
  );

  // ── RedSkill 总量曲线（榜单页趋势图用）────────────────────
  const series = [];
  for (let i = 0; i < snapshots.length; i++) {
    const s = snapshots[i];
    const newSinceLast =
      i === 0 ? null : newSkillIds(snapshots[i - 1].allSkills, s.allSkills).length;
    series.push({ date: s.dataDate, total: s.allSkills.length, newSinceLast });
  }
  const officialNew7Sum = latest.newList.reduce((sum, item) => sum + (Number(item.new7_cnt) || 0), 0);

  let disappeared = [];
  if (snapshots.length >= 4) {
    const idSets = snapshots.map((s) => new Set(s.allSkills.map((k) => String(k.skill_id))));
    disappeared = disappearedIds(idSets, 3);
  }

  // ── 小工具数据（核心板块）────────────────────────────────
  const { items, ownAppCategories, platform } = loadMinitoolSources();
  const minitoolCategoryCounts = {};
  for (const item of items) {
    const c = item.category || '未分类';
    minitoolCategoryCounts[c] = (minitoolCategoryCounts[c] ?? 0) + 1;
  }
  // 本账号作品：合并手动类目注解；无类目信息则不计入分布（避免“未分类”噪声）
  const ownApps = (platform?.ownApps ?? []).map((app) => ({
    ...app,
    category: ownAppCategories[String(app.appId)] ?? app.category ?? '',
  }));
  const platformCategories = platform?.categories ?? [];
  for (const app of ownApps) {
    if (!app.category) continue;
    minitoolCategoryCounts[app.category] = (minitoolCategoryCounts[app.category] ?? 0) + 1;
  }
  const publishedOwnCount = ownApps.filter((a) => a.statusText === '已发布').length;

  // ── overview ─────────────────────────────────────────────
  writeDerived('overview.json', {
    generatedAt: new Date().toISOString(),
    latestDate: latest.dataDate,
    prevDate: hasPrev ? prev.dataDate : null,
    series,
    latest: {
      date: latest.dataDate,
      total: latest.allSkills.length,
      newSinceLast: hasPrev ? series[series.length - 1].newSinceLast : null,
      officialNew7Sum,
      todayRankCount: latest.todayList.length,
      disappearedCount: disappeared.length,
    },
    minitools: {
      watchlistCount: items.length,
      ownAppCount: ownApps.length,
      publishedOwnCount,
      platformCategoryCount: platformCategories.length,
      categoryCounts: minitoolCategoryCounts,
      platformFetchedAt: platform?.fetchedAt ?? null,
    },
  });

  // ── rankings（RedSkill 官方四榜单）─────────────────────────
  writeDerived('rankings.json', {
    date: latest.dataDate,
    prevDate: hasPrev ? prev.dataDate : null,
    useList: compareRanks(hasPrev ? prev.useList : [], latest.useList),
    newList: compareRanks(hasPrev ? prev.newList : [], latest.newList),
    todayList: compareRanks(hasPrev ? prev.todayList : [], latest.todayList),
    authorList: compareRanks(hasPrev ? prev.authorList : [], latest.authorList, 'author_id'),
  });

  // ── minitools ────────────────────────────────────────────
  writeDerived('minitools.json', {
    generatedAt: new Date().toISOString(),
    items,
    ownApps,
    platformCategories,
    categoryCounts: minitoolCategoryCounts,
    platformFetchedAt: platform?.fetchedAt ?? null,
    caveat: '小工具无公开榜单：观察清单为手动登记，本账号作品来自 redapp CLI 只读查询',
  });

  console.log(
    `[aggregate] 完成：RedSkill total=${latest.allSkills.length} 较上次新增=${hasPrev ? series[series.length - 1].newSinceLast : 'N/A'}；小工具 观察清单=${items.length} 本账号=${ownApps.length}（已发布 ${publishedOwnCount}）`
  );
}

main();
