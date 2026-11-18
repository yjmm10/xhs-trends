#!/usr/bin/env node
/**
 * 聚合脚本：读取全部快照，生成前端专用的 derived JSON。
 *
 * 产物（data/derived/，gitignore，构建时再生成）：
 *   overview.json   总量曲线 + 最新指标卡
 *   rankings.json   最新四榜单 + 与上一份快照的排名对比
 *   categories.json 赛道分布（估算口径）+ 历史趋势
 *   keywords.json   关键词词频对比 + 新涌现
 *   minitools.json  手动登记数据聚合
 *
 * 口径：新增 = 相邻快照 skill_id 集合差；消失 = 连续 >=3 快照缺席。
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { newSkillIds, compareRanks, disappearedIds } from './lib/diff.mjs';
import { loadRules, compileRules, classifySkill } from './lib/categories.mjs';
import { loadStopwords, countKeywords, compareKeywordCounts } from './lib/keywords.mjs';

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

  // ── overview ─────────────────────────────────────────────
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

  // ── minitools（先读，overview 要用）────────────────────────
  let minitoolsItems = [];
  try {
    const mt = JSON.parse(readFileSync(join(SOURCES_DIR, 'minitools.json'), 'utf-8'));
    minitoolsItems = Array.isArray(mt.items) ? mt.items : [];
  } catch {
    console.warn('[aggregate] minitools.json 缺失或非法，按空处理');
  }
  const minitoolCategoryCounts = {};
  for (const item of minitoolsItems) {
    const c = item.category || '未分类';
    minitoolCategoryCounts[c] = (minitoolCategoryCounts[c] ?? 0) + 1;
  }

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
    minitools: { count: minitoolsItems.length, categoryCounts: minitoolCategoryCounts },
  });

  // ── rankings ─────────────────────────────────────────────
  writeDerived('rankings.json', {
    date: latest.dataDate,
    prevDate: hasPrev ? prev.dataDate : null,
    useList: compareRanks(hasPrev ? prev.useList : [], latest.useList),
    newList: compareRanks(hasPrev ? prev.newList : [], latest.newList),
    todayList: compareRanks(hasPrev ? prev.todayList : [], latest.todayList),
    authorList: compareRanks(hasPrev ? prev.authorList : [], latest.authorList, 'author_id'),
  });

  // ── categories（估算口径）─────────────────────────────────
  const rules = loadRules(readFileSync(join(SOURCES_DIR, 'category-rules.json'), 'utf-8'));
  const compiled = compileRules(rules);
  const history = [];
  let currentCounts = null;
  for (const s of snapshots) {
    const counts = {};
    for (const skill of s.allSkills) {
      const category = classifySkill(rules, skill, compiled);
      counts[category] = (counts[category] ?? 0) + 1;
    }
    history.push({ date: s.dataDate, counts });
    currentCounts = counts;
  }
  const total = latest.allSkills.length;
  const current = Object.entries(currentCounts)
    .map(([category, count]) => ({
      category,
      count,
      share: Math.round((count / total) * 1000) / 10,
    }))
    .sort((a, b) => b.count - a.count);

  writeDerived('categories.json', {
    date: latest.dataDate,
    total,
    current,
    history,
    fallback: rules.fallback,
    caveat: '估算口径：按关键词规则将每个技能归入首个命中赛道（合计=100%），非官方分类',
  });

  // ── keywords ─────────────────────────────────────────────
  const stopwords = loadStopwords(readFileSync(join(SOURCES_DIR, 'stopwords.txt'), 'utf-8'));
  const currCounts = countKeywords(latest.allSkills, stopwords);
  const prevCounts = hasPrev ? countKeywords(prev.allSkills, stopwords) : new Map();
  const allRows = compareKeywordCounts(prevCounts, currCounts);
  writeDerived('keywords.json', {
    date: latest.dataDate,
    prevDate: hasPrev ? prev.dataDate : null,
    top: allRows.slice(0, 200),
    emerging: hasPrev ? allRows.filter((r) => r.emerging).slice(0, 50) : [],
    caveat: hasPrev ? null : '首份快照无对比基准',
  });

  // ── minitools ────────────────────────────────────────────
  writeDerived('minitools.json', {
    generatedAt: new Date().toISOString(),
    items: minitoolsItems,
    categoryCounts: minitoolCategoryCounts,
    caveat: '手动登记数据，非平台全量',
  });

  console.log(
    `[aggregate] 完成：total=${total} 较上次新增=${hasPrev ? series[series.length - 1].newSinceLast : 'N/A'} 消失(连续3缺席)=${disappeared.length} 赛道=${current.length}类 关键词=${allRows.length}词`
  );
}

main();
