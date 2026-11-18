/**
 * 关键词统计：Intl.Segmenter（内置，零依赖）+ bigram 兜底 + 停用词过滤。
 *
 * 分词策略：
 * - Segmenter word 级切分（zh-CN），词典词直接命中（如 文案/星座/查询）。
 * - 连续的单字 CJK 片段合并为重叠 bigram，兜底未登录词（如 小红书 → 小红/红书、运+势 → 运势）。
 * - bigram 中任一单字为停用词时丢弃该 bigram（避免 "习的" 这类噪声）。
 * - 全部小写归一化；拉丁单字符丢弃。
 */

const CJK_RE = /[\u4e00-\u9fff]/;
const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });

export function loadStopwords(text) {
  const set = new Set();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    for (const word of trimmed.split(/\s+/)) {
      set.add(word.toLowerCase());
    }
  }
  return set;
}

/**
 * 单段文本 → 词元数组（小写、去停用词）。
 */
export function tokenize(text, stopwords) {
  const segments = [...segmenter.segment(String(text ?? ''))]
    .filter((s) => s.isWordLike)
    .map((s) => s.segment);

  const tokens = [];
  let run = []; // 连续单字 CJK 缓冲

  const flushRun = () => {
    for (let i = 0; i + 1 < run.length; i++) {
      const bigram = run[i] + run[i + 1];
      if (!stopwords.has(run[i]) && !stopwords.has(run[i + 1])) {
        tokens.push(bigram);
      }
    }
    run = [];
  };

  for (const seg of segments) {
    if (seg.length === 1 && CJK_RE.test(seg)) {
      run.push(seg);
      continue;
    }
    flushRun();
    const lower = seg.toLowerCase();
    if (lower.length < 2) continue; // 拉丁/数字单字符丢弃
    if (stopwords.has(lower)) continue;
    tokens.push(lower);
  }
  flushRun();
  return tokens;
}

/**
 * 技能列表 → 词频 Map（name + description 合并统计）。
 * @returns {Map<string, number>}
 */
export function countKeywords(skills, stopwords) {
  const counts = new Map();
  for (const skill of skills) {
    const text = `${skill.skill_name ?? ''} ${skill.skill_description ?? ''}`;
    for (const token of tokenize(text, stopwords)) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * 当前 vs 上一期词频对比。
 * emerging 判定：上一期为 0（未出现）且当前 count >= 3。
 * @param {Map<string,number>} prev
 * @param {Map<string,number>} curr
 * @returns {Array<{word, count, prevCount, delta, emerging}>} 按 count 降序
 */
export function compareKeywordCounts(prev, curr) {
  const words = new Set([...prev.keys(), ...curr.keys()]);
  const rows = [];
  for (const word of words) {
    const count = curr.get(word) ?? 0;
    const prevCount = prev.get(word) ?? 0;
    rows.push({
      word,
      count,
      prevCount,
      delta: count - prevCount,
      emerging: prevCount === 0 && count >= 3,
    });
  }
  return rows.sort((a, b) => b.count - a.count);
}
