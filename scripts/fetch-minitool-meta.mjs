#!/usr/bin/env node
/**
 * 小工具平台数据导入（只读查询，不写入平台）：
 *   redapp config  → 平台官方小工具类目
 *   redapp list    → 本账号的小工具列表
 *   redapp status  → 每个小工具的状态详情（statusText）
 *
 * 汇总写入 data/sources/minitool-platform.json，供 aggregate 使用。
 *
 * 前置：redapp CLI 已安装并登录（prod）。按 redapp-cli skill 约定，
 * 首次使用前先跑版本门禁：
 *   node "<redapp-cli skill>/scripts/ensure-cli.mjs"
 * 可用环境变量 REDAPP_GATE 指定门禁脚本路径（存在则自动执行）。
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = join(root, 'data/sources/minitool-platform.json');
const GATE_CANDIDATES = [
  process.env.REDAPP_GATE,
  join(homedir(), '.pi/agent/skills/redapp-cli/scripts/ensure-cli.mjs'),
].filter(Boolean);

function runGate() {
  for (const gate of GATE_CANDIDATES) {
    if (existsSync(gate)) {
      console.log(`[minitool-meta] 运行版本门禁: ${gate}`);
      const res = spawnSync('node', [gate], { encoding: 'utf-8', timeout: 120_000 });
      const out = `${res.stdout ?? ''}${res.stderr ?? ''}`;
      const m = out.match(/CLI_VERSION_JSON:(\{.*\})/);
      if (m) {
        const info = JSON.parse(m[1]);
        if (!['current', 'installed', 'updated'].includes(info.status)) {
          console.error(`[minitool-meta] 版本门禁状态异常: ${info.status}，终止（见 redapp-cli skill）`);
          process.exit(1);
        }
        console.log(`[minitool-meta] redapp ${info.version} (${info.env})`);
      }
      return;
    }
  }
  console.warn('[minitool-meta] 未找到版本门禁脚本，直接使用 PATH 中的 redapp');
}

/** 执行 redapp 子命令，解析 stdout 中的 RESULT_JSON 行 */
function redapp(args) {
  const res = spawnSync('redapp', args, { encoding: 'utf-8', timeout: 60_000, shell: true });
  const out = `${res.stdout ?? ''}\n${res.stderr ?? ''}`;
  if (res.status !== 0 && !out.includes('RESULT_JSON')) {
    throw new Error(`redapp ${args[0]} 失败(exit=${res.status}): ${out.trim().slice(0, 300)}`);
  }
  const m = out.match(/^RESULT_JSON:(\{.*\})\s*$/m);
  if (!m) throw new Error(`redapp ${args[0]} 输出中没有 RESULT_JSON: ${out.trim().slice(0, 300)}`);
  return JSON.parse(m[1]);
}

function main() {
  runGate();

  console.log('[minitool-meta] 查询平台官方类目 (redapp config)');
  const config = redapp(['config', '--source', 'thirdAgent', '--agent']);
  const categories = (config.data?.categories ?? config.categories ?? []).map((c) => ({
    code: c.code,
    name: c.name,
  }));

  console.log('[minitool-meta] 查询本账号小工具列表 (redapp list)');
  const list = redapp(['list', '--source', 'thirdAgent', '--page-num', '1', '--page-size', '50', '--agent']);
  const apps = list.data?.apps ?? [];

  const ownApps = apps.map((app) => {
    let statusText = app.statusText;
    if (!statusText && app.appId) {
      try {
        const st = redapp(['status', '--source', 'thirdAgent', '--app-id', String(app.appId), '--agent']);
        statusText = st.data?.statusText;
      } catch (err) {
        console.warn(`[minitool-meta] status 查询失败(${app.appId}): ${err.message}`);
      }
    }
    return {
      appId: app.appId,
      appName: app.appName,
      slogan: app.slogan ?? '',
      category: app.category ?? app.categoryCode ?? '',
      version: app.version ?? '',
      status: app.status,
      statusText: statusText ?? `状态码 ${app.status}`,
      updateTime: app.updateTime ?? app.updatedAt ?? '',
    };
  });

  const payload = {
    fetchedAt: new Date().toISOString(),
    env: 'prod',
    categories,
    ownApps,
  };
  writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(
    `[minitool-meta] 写出 ${OUT_FILE}\n` +
      `  官方类目 ${categories.length} 个：${categories.map((c) => c.name).join('、')}\n` +
      `  本账号小工具 ${ownApps.length} 个：${ownApps.map((a) => `${a.appName}(${a.statusText})`).join('、')}`
  );
}

main();
