/**
 * 赛道分类：基于关键词规则（估算口径，规则可编辑）。
 *
 * 匹配策略：
 * - 中文关键词：子串匹配（中文无词边界）。
 * - 英文关键词：词边界匹配（\b），避免 "git" 误命中 "digital"。
 * - 规则数组顺序即优先级，首个命中的赛道即为归属；每技能恰好一个赛道（合计=100%）。
 *
 * 性能：matcher 预编译一次（compileRules），全量 5 万+ 技能分类时复用。
 */
import { readFileSync } from 'node:fs';

const CJK_RE = /[\u4e00-\u9fff\u3040-\u30ff]/;

/** @returns {{rules: Array<{category: string, keywords: string[]}>, fallback: string}} */
export function loadRules(jsonText) {
  const parsed = JSON.parse(jsonText);
  if (!Array.isArray(parsed.rules) || parsed.rules.length === 0) {
    throw new Error('category-rules.json 缺少 rules 数组');
  }
  return { rules: parsed.rules, fallback: parsed.fallback ?? '其它' };
}

export function loadRulesFromFile(path) {
  return loadRules(readFileSync(path, 'utf-8'));
}

function buildMatcher(kw) {
  const lower = kw.toLowerCase();
  if (CJK_RE.test(kw)) {
    return { text: lower, isCjk: true };
  }
  // 英文：转义正则特殊字符后加词边界
  const escaped = lower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return { regex: new RegExp(`\\b${escaped}\\b`), isCjk: false };
}

/**
 * 预编译规则：每条规则的 keywords 只构建一次 matcher。
 * @returns {Array<{category: string, matchers: Array<*>}>}
 */
export function compileRules(rules) {
  return rules.rules.map((rule) => ({
    category: rule.category,
    matchers: rule.keywords.map(buildMatcher),
  }));
}

/**
 * 单技能分类。
 * @param {{rules:*, fallback:string}} rules loadRules 的返回
 * @param {*} skill
 * @param {Array<{category:string, matchers:Array<*>}>} [compiled] 可选的预编译结果；不传时内部编译
 * @returns {string} 赛道名（含 fallback）
 */
export function classifySkill(rules, skill, compiled) {
  const compiledRules = compiled ?? compileRules(rules);
  const name = String(skill.skill_name ?? '');
  const desc = String(skill.skill_description ?? '');
  const haystack = `${name}\n${desc}`.toLowerCase();

  for (const rule of compiledRules) {
    for (const m of rule.matchers) {
      if (m.isCjk ? haystack.includes(m.text) : m.regex.test(haystack)) {
        return rule.category;
      }
    }
  }
  return rules.fallback;
}

/**
 * 全量分类（编译一次，循环复用）。
 * @returns {{counts: Record<string, number>, assignments: Map<string, string>}}
 *          assignments 的 key 为规范化后的 skill_id（字符串）
 */
export function categorizeAll(rules, skills) {
  const compiled = compileRules(rules);
  const counts = {};
  const assignments = new Map();
  for (const skill of skills) {
    const category = classifySkill(rules, skill, compiled);
    counts[category] = (counts[category] ?? 0) + 1;
    assignments.set(String(skill.skill_id), category);
  }
  return { counts, assignments };
}
