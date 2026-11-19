import { describe, it, expect } from 'vitest';
import { loadVibeRules, compileVibeRules, classifyVibeApp } from './vibe-categories.mjs';

const rules = loadVibeRules(
  JSON.stringify({
    rules: [
      { key: 'test', keywords: ['测试', '测评', 'mbti', 'quiz'] },
      { key: 'game', keywords: ['游戏', '模拟器', 'rpg', 'games'] },
      { key: 'query', keywords: ['查询', '计算器', 'lookup'] },
    ],
    fallback: 'other',
  })
);

describe('classifyVibeApp', () => {
  it('中文关键词按子串命中（名称）', () => {
    expect(classifyVibeApp(rules, { app_name: '理想型测试（阴湿版）', slogan: '' })).toBe('test');
  });

  it('中文关键词按子串命中（slogan）', () => {
    expect(classifyVibeApp(rules, { app_name: '烤肉小店', slogan: '烤肉模拟器经营玩法' })).toBe('game');
  });

  it('英文关键词按词边界命中', () => {
    expect(classifyVibeApp(rules, { app_name: 'my rpg world', slogan: '' })).toBe('game');
    expect(classifyVibeApp(rules, { app_name: 'a lookup tool', slogan: '' })).toBe('query');
  });

  it('英文词边界不误命中子串', () => {
    // "latest" 不应命中 "test"（词边界）
    expect(classifyVibeApp(rules, { app_name: 'latest news', slogan: '' })).toBe('other');
  });

  it('大小写不敏感', () => {
    expect(classifyVibeApp(rules, { app_name: 'MBTI 人格测试', slogan: '' })).toBe('test');
    expect(classifyVibeApp(rules, { app_name: 'GAMES hub', slogan: '' })).toBe('game');
  });

  it('规则顺序即优先级，首个命中生效', () => {
    // 同时含 测试 与 游戏 → 规则数组 test 在前
    expect(classifyVibeApp(rules, { app_name: '测试小游戏', slogan: '' })).toBe('test');
  });

  it('全部未命中回退 fallback', () => {
    expect(classifyVibeApp(rules, { app_name: '阿sueの美甲店', slogan: "Let's搞搞漂亮" })).toBe('other');
  });

  it('compileVibeRules 编译一次可复用', () => {
    const compiled = compileVibeRules(rules);
    expect(classifyVibeApp(rules, { app_name: '心情测试', slogan: '' }, compiled)).toBe('test');
    expect(classifyVibeApp(rules, { app_name: '跑跑游戏', slogan: '' }, compiled)).toBe('game');
  });
});
