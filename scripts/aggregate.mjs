#!/usr/bin/env node
/**
 * 聚合脚本：读取全部快照，生成前端专用的 derived JSON。
 *
 * 产物（data/derived/，gitignore，构建时再生成）：
 *   overview.json   最新指标卡 + 总量曲线
 *   rankings.json   官方四榜单 + 与上一份快照的排名对比
 *
 * 口径：新增 = 相邻快照 skill_id 集合差；消失 = 连续 >=3 快照缺席。
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { newSkillIds, compareRanks, disappearedIds } from './lib/diff.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOTS_DIR = join(root, 'data/snapshots');
const VIBE_SNAPSHOTS_DIR = join(root, 'data/vibe-snapshots');
const DERIVED_DIR = join(root, 'data/derived');

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
  // ── 总量曲线 ─────────────────────────────────────────────
  const series = [];
  for (let i = 0; i < snapshots.length; i++) {
    const s = snapshots[i];
    const newSinceLast =
      i === 0 ? null : newSkillIds(snapshots[i - 1].allSkills, s.allSkills).length;
    series.push({ date: s.dataDate, total: s.allSkills.length, newSinceLast });
  }
  const officialNew7Sum = latest.newList.reduce((sum, item) => sum + (Number(item.new7_cnt) || 0), 0);

  // 消失判定（连续 >=3 缺席，需要 >=4 份快照才有意义）
  let disappeared = [];
  if (snapshots.length >= 4) {
    const idSets = snapshots.map((s) => new Set(s.allSkills.map((k) => String(k.skill_id))));
    disappeared = disappearedIds(idSets, 3);
  }

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
  });

  // ── rankings（官方四榜单）─────────────────────────────────
  writeDerived('rankings.json', {
    date: latest.dataDate,
    prevDate: hasPrev ? prev.dataDate : null,
    useList: compareRanks(hasPrev ? prev.useList : [], latest.useList),
    newList: compareRanks(hasPrev ? prev.newList : [], latest.newList),
    todayList: compareRanks(hasPrev ? prev.todayList : [], latest.todayList),
    authorList: compareRanks(hasPrev ? prev.authorList : [], latest.authorList, 'author_id'),
  });

  aggregateVibe();

  console.log(
    `[aggregate] 完成：total=${latest.allSkills.length} 较上次新增=${hasPrev ? series[series.length - 1].newSinceLast : 'N/A'} 消失(连续3缺席)=${disappeared.length}`
  );
}

function loadVibeSnapshots() {
  if (!existsSync(VIBE_SNAPSHOTS_DIR)) return [];
  const files = readdirSync(VIBE_SNAPSHOTS_DIR)
    .filter((f) => /^vibe-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
  return files
    .map((f) => JSON.parse(readFileSync(join(VIBE_SNAPSHOTS_DIR, f), 'utf-8')))
    .sort((a, b) => a.dataDate.localeCompare(b.dataDate));
}

/** 当日“上榜池”：四榜中三个 app 榜的 app_id 并集，用于集合差新增口径。 */
function vibePool(s) {
  const ids = new Set();
  for (const list of [s.useList, s.new7List, s.todayList]) {
    for (const row of list) ids.add(String(row.app_id));
  }
  return ids;
}

function aggregateVibe() {
  const snaps = loadVibeSnapshots();
  if (snaps.length === 0) {
    writeDerived('vibe.json', {
      hasData: false,
      generatedAt: new Date().toISOString(),
      series: [],
      latest: null,
      rankings: null,
    });
    console.log('[aggregate][vibe] 无快照，写出空骨架');
    return;
  }
  const latest = snaps[snaps.length - 1];
  const prev = snaps.length >= 2 ? snaps[snaps.length - 2] : null;
  const series = snaps.map((s, i) => {
    let newSinceLast = null;
    if (i > 0) {
      const a = vibePool(snaps[i - 1]);
      const b = vibePool(s);
      let n = 0;
      for (const id of b) if (!a.has(id)) n++;
      newSinceLast = n;
    }
    return { date: s.dataDate, total: s.totalApps ?? 0, newSinceLast };
  });
  writeDerived('vibe.json', {
    hasData: true,
    generatedAt: new Date().toISOString(),
    latestDate: latest.dataDate,
    prevDate: prev ? prev.dataDate : null,
    series,
    latest: {
      date: latest.dataDate,
      total: latest.totalApps ?? 0,
      newSinceLast: series[series.length - 1].newSinceLast,
    },
    rankings: {
      date: latest.dataDate,
      prevDate: prev ? prev.dataDate : null,
      todayList: compareRanks(prev ? prev.todayList : [], latest.todayList, 'app_id'),
      new7List: compareRanks(prev ? prev.new7List : [], latest.new7List, 'app_id'),
      useList: compareRanks(prev ? prev.useList : [], latest.useList, 'app_id'),
      authorList: compareRanks(prev ? prev.authorList : [], latest.authorList, 'creator'),
    },
  });
  console.log(`[aggregate][vibe] 快照 ${snaps.length} 份，最新 ${latest.dataDate}，totalApps=${latest.totalApps}`);
}

main();
