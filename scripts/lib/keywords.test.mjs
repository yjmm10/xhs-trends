import { describe, it, expect } from 'vitest';
import { tokenize, countKeywords, compareKeywordCounts, loadStopwords } from './keywords.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const stopwords = loadStopwords(readFileSync(join(here, '../../data/sources/stopwords.txt'), 'utf-8'));

describe('tokenize — Intl.Segmenter 中英文混合分词', () => {
  it('切分中文词与英文词（未登录词走 bigram 合并）', () => {
    const tokens = tokenize('小红书文案助手 xiaohongshu writer', stopwords);
    expect(tokens).toContain('小红'); // 小红书 未登录 → bigram
    expect(tokens).toContain('红书');
    expect(tokens).toContain('文案'); // 词典词直接命中
    expect(tokens).toContain('xiaohongshu');
    expect(tokens).toContain('writer');
    expect(tokens).not.toContain('小'); // 单字被并入 bigram，不单独出现
  });

  it('过滤停用词', () => {
    const tokens = tokenize('这是一个帮助学习的助手', stopwords);
    expect(tokens).not.toContain('一个');
    expect(tokens).not.toContain('帮助');
    expect(tokens).not.toContain('助手');
    expect(tokens).toContain('学习');
  });

  it('过短与纯停用词输入产出为空', () => {
    const tokens = tokenize('I am a AI helper 我和你', stopwords);
    expect(tokens).toEqual([]);
  });

  it('大小写归一化', () => {
    expect(tokenize('PDF PDF pdf', stopwords).filter((t) => t === 'pdf').length).toBe(3);
  });

  it('词典词 运势 可由 bigram 兜底恢复', () => {
    const tokens = tokenize('星座运势查询', stopwords);
    expect(tokens).toContain('星座');
    expect(tokens).toContain('运势'); // 运+势 单字 run → bigram
    expect(tokens).toContain('查询');
  });
});

describe('countKeywords — 技能列表词频统计', () => {
  it('统计 name+description 的词频（停用词不计数）', () => {
    const skills = [
      { skill_id: 1, skill_name: 'resume helper', skill_description: 'build your resume fast' },
      { skill_id: 2, skill_name: 'resume checker', skill_description: 'check resume quality' },
    ];
    const counts = countKeywords(skills, stopwords);
    expect(counts.get('resume')).toBe(4);
    expect(counts.get('helper')).toBeUndefined(); // helper 为停用词
    expect(counts.get('quality')).toBe(1);
  });
});

describe('compareKeywordCounts — 上一期对比', () => {
  it('delta = curr - prev；prev 为 0 且 curr>=3 判定新涌现', () => {
    const prev = new Map([['老词', 10], ['降温词', 8], ['稳定词', 5]]);
    const curr = new Map([['老词', 15], ['降温词', 3], ['稳定词', 5], ['新热词', 4], ['弱新词', 2]]);
    const rows = compareKeywordCounts(prev, curr);
    const byWord = new Map(rows.map((r) => [r.word, r]));

    expect(byWord.get('老词').delta).toBe(5);
    expect(byWord.get('降温词').delta).toBe(-5);
    expect(byWord.get('新热词').prevCount).toBe(0);
    expect(byWord.get('新热词').emerging).toBe(true);
    expect(byWord.get('弱新词').emerging).toBe(false); // count < 3
    expect(byWord.get('稳定词').delta).toBe(0);
  });
});
