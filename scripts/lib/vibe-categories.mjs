/**
 * 小工具关键词分类：官方精选分类只覆盖部分上榜 app，其余按名称+slogan 关键词规则估算，
 * 归入官方 8 大类目（key 与 vibe-app-rank categories 对齐）。
 *
 * 匹配策略（沿用 skill 分类器的成熟口径）：
 * - 中文关键词：子串匹配（中文无词边界）。
 * - 英文关键词：词边界匹配（\b），避免 "test" 误命中 "latest"。
 * - 规则数组顺序即优先级，首个命中的类目即归属。
 * - 估算口径：与官方分类可能存在出入，前端以样式区分 official / estimate。
 */

import { readFileSync } from 'node:fs';

const CJK_RE = /[\u4e00-\u9fff\u3040-\u30ff]/;

/** @returns {{rules: Array<{key: string, keywords: string[]}>, fallback: string}} */
export function loadVibeRules(jsonText) {
  const parsed = JSON.parse(jsonText);
  if (!Array.isArray(parsed.rules) || parsed.rules.length === 0) {
    throw new Error('vibe-category-rules.json 缺少 rules 数组');
  }
  return { rules: parsed.rules, fallback: parsed.fallback ?? 'other' };
}

export function loadVibeRulesFromFile(path) {
  return loadVibeRules(readFileSync(path, 'utf-8'));
}

function buildMatcher(kw) {
  const lower = kw.toLowerCase();
  if (CJK_RE.test(kw)) {
    return { text: lower, isCjk: true };
  }
  const escaped = lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return { regex: new RegExp(`\\b${escaped}\\b`), isCjk: false };
}

/** 预编译规则：每条关键词只构建一次 matcher，全量分类时复用。 */
export function compileVibeRules(rules) {
  return rules.rules.map((rule) => ({
    key: rule.key,
    matchers: rule.keywords.map(buildMatcher),
  }));
}

/**
 * 单个 app 分类，返回官方类目 key。
 * @param {{rules:*, fallback:string}} rules loadVibeRules 的返回
 * @param {{app_name?: string, slogan?: string}} app
 * @param {Array<{key:string, matchers:Array<*>}>} [compiled] 可选预编译结果
 * @returns {string} 类目 key（含 fallback）
 */
export function classifyVibeApp(rules, app, compiled) {
  const compiledRules = compiled ?? compileVibeRules(rules);
  const name = String(app?.app_name ?? '');
  const slogan = String(app?.slogan ?? '');
  const haystack = `${name}\n${slogan}`.toLowerCase();

  for (const rule of compiledRules) {
    for (const m of rule.matchers) {
      if (m.isCjk ? haystack.includes(m.text) : m.regex.test(haystack)) {
        return rule.key;
      }
    }
  }
  return rules.fallback;
}
