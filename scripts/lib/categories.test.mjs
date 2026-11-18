import { describe, it, expect } from 'vitest';
import { loadRules, classifySkill, categorizeAll } from './categories.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const rulesPath = join(here, '../../data/sources/category-rules.json');
const rules = loadRules(readFileSync(rulesPath, 'utf-8'));

describe('loadRules', () => {
  it('解析规则文件并保留顺序与 fallback', () => {
    expect(rules.rules.length).toBeGreaterThanOrEqual(6);
    expect(rules.fallback).toBe('其它');
  });
});

describe('classifySkill — 首个命中即归属', () => {
  it('中文名直接命中', () => {
    expect(classifySkill(rules, { skill_id: 1, skill_name: '小红书文案助手', skill_description: '' })).toBe('内容创作');
  });

  it('英文名大小写不敏感', () => {
    expect(classifySkill(rules, { skill_id: 2, skill_name: 'Stock Trading Helper', skill_description: '' })).toBe('金融理财');
  });

  it('描述命中也可归类', () => {
    expect(
      classifySkill(rules, { skill_id: 3, skill_name: 'misc-helper', skill_description: 'Helps you 背单词 every day' })
    ).toBe('学习成长');
  });

  it('英文关键词按词边界匹配：git 不应命中 digital', () => {
    expect(
      classifySkill(rules, { skill_id: 4, skill_name: 'digital-art', skill_description: 'digital painting helper' })
    ).not.toBe('编程开发');
  });

  it('中文关键词按子串匹配', () => {
    expect(classifySkill(rules, { skill_id: 5, skill_name: '塔罗牌解读大师', skill_description: '' })).toBe('生活决策');
  });

  it('优先级：规则顺序靠前的赛道先命中', () => {
    // 同时含"代码"（编程开发）与"理财"（金融理财）→ 编程开发在前
    expect(classifySkill(rules, { skill_id: 6, skill_name: '代码理财两不误', skill_description: '' })).toBe('编程开发');
  });

  it('无命中返回 fallback', () => {
    expect(classifySkill(rules, { skill_id: 7, skill_name: 'xyz-abc-123', skill_description: 'nothing matches here' })).toBe('其它');
  });

  it('空字段安全', () => {
    expect(classifySkill(rules, { skill_id: 8 })).toBe('其它');
  });
});

describe('categorizeAll — 全量分布', () => {
  it('每技能恰好一个赛道，计数合计等于技能数', () => {
    const skills = [
      { skill_id: 1, skill_name: '小红书文案助手', skill_description: '' },
      { skill_id: 2, skill_name: '代码生成器', skill_description: '' },
      { skill_id: 3, skill_name: 'unknown-thing', skill_description: '' },
    ];
    const result = categorizeAll(rules, skills);
    const total = Object.values(result.counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(3);
    expect(result.counts['内容创作']).toBe(1);
    expect(result.counts['编程开发']).toBe(1);
    expect(result.counts['其它']).toBe(1);
    expect(result.assignments.get('1')).toBe('内容创作');
  });
});
