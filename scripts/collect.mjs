#!/usr/bin/env node
/**
 * 采集脚本：抓取官方 REDSkill 排行榜 data.json 并落盘为当日快照。
 *
 * - 失败重试 2 次；校验失败不落盘、非零退出。
 * - 幂等：同 dataDate 快照已存在则跳过（可安全重复调度）。
 * - URL 可用环境变量 XHS_RANK_URL 覆盖。
 *
 * 用法: npm run collect  （等价 node scripts/collect.mjs）
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RANK_DATA_URL, validateSnapshot, saveSnapshot, snapshotFileName } from './lib/snapshot.mjs';
import { VIBE_DATA_URL, validateVibeSnapshot, saveVibeSnapshot } from './lib/vibe-snapshot.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const SNAPSHOTS_DIR = join(here, '../data/snapshots');
const VIBE_SNAPSHOTS_DIR = join(here, '../data/vibe-snapshots');
const MAX_RETRIES = 2; // 首次 + 2 次重试
const TIMEOUT_MS = 30_000;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36';

async function fetchOnce() {
  const res = await fetch(RANK_DATA_URL, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'user-agent': 'xhs-trends-collector/0.1 (personal research)' },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function fetchWithRetry() {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      return await fetchOnce();
    } catch (err) {
      lastError = err;
      if (attempt <= MAX_RETRIES) {
        console.warn(`[collect] 第 ${attempt} 次失败（${err.message}），重试...`);
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
  }
  throw lastError;
}

async function main() {
  console.log(`[collect] 拉取 ${RANK_DATA_URL}`);
  const raw = await fetchWithRetry();

  const result = validateSnapshot(raw);
  if (!result.ok) {
    console.error(`[collect] 校验失败，不落盘: ${result.error}`);
    process.exit(1);
  }
  const snapshot = result.snapshot;

  mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  const { action, file } = saveSnapshot(SNAPSHOTS_DIR, snapshot);

  if (action === 'skipped') {
    console.log(`[collect] 快照已存在，跳过: ${snapshotFileName(snapshot)}（幂等）`);
  } else {
    console.log(
      `[collect] 已保存 ${file}\n` +
        `  dataDate=${snapshot.dataDate}  genTime=${snapshot.genTime}\n` +
        `  allSkills=${snapshot.allSkills.length}  useList=${snapshot.useList.length}  newList=${snapshot.newList.length}  todayList=${snapshot.todayList.length}  authorList=${snapshot.authorList.length}`
    );
  }

  await collectVibe();
}

/** 小工具榜需要登录 Cookie（XHS_COOKIE）；失败只告警，不阻塞 SKILL 采集。 */
async function collectVibe() {
  const cookie = process.env.XHS_COOKIE;
  if (!cookie) {
    console.warn('[collect][vibe] 未设置 XHS_COOKIE，跳过小工具榜采集');
    return;
  }
  try {
    const url = `${VIBE_DATA_URL}?t=${Date.now()}`;
    console.log(`[collect][vibe] 拉取 ${url}`);
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        cookie,
        referer: 'https://cowork.xiaohongshu.com/s/vibe-app-rank/',
        accept: '*/*',
        'user-agent': UA,
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const raw = await res.json();
    const result = validateVibeSnapshot(raw);
    if (!result.ok) throw new Error(`校验失败，不落盘: ${result.error}`);
    const snapshot = result.snapshot;
    mkdirSync(VIBE_SNAPSHOTS_DIR, { recursive: true });
    const { action, file } = saveVibeSnapshot(VIBE_SNAPSHOTS_DIR, snapshot);
    const counts = `useList=${snapshot.useList.length} new7List=${snapshot.new7List.length} todayList=${snapshot.todayList.length} authorList=${snapshot.authorList.length}`;
    if (action === 'skipped') {
      console.log(`[collect][vibe] 快照已存在，跳过（幂等）`);
    } else {
      console.log(`[collect][vibe] 已保存 ${file}  dataDate=${snapshot.dataDate}  totalApps=${snapshot.totalApps}  ${counts}`);
    }
  } catch (err) {
    console.warn(`[collect][vibe] 小工具榜采集失败（不影响 SKILL）: ${err.message}`);
  }
}

main().catch((err) => {
  console.error(`[collect] 采集失败: ${err.message}`);
  process.exit(1);
});
