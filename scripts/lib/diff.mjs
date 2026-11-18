/**
 * 快照 diff 纯函数。
 *
 * 口径纪律（见 docs/superpowers/specs 设计文档）：
 * - 新增 = 相邻快照 skill_id 集合差，绝不用时间戳分桶。
 * - 排名变化 = 上一份快照同榜单名次对比，正值=上升。
 * - 消失 = 连续 >= threshold 份快照缺席才判定。
 */

/** 规范化 id：官方数据里 skill_id 可能是数字或字符串，统一按字符串比较。 */
function normId(id) {
  return String(id);
}

function idSet(items, idField) {
  const set = new Set();
  for (const item of items) set.add(normId(item[idField]));
  return set;
}

/**
 * 新增技能 id 列表：在 curr 中出现、prev 中没有的 skill_id（保留 curr 的原始类型）。
 * @param {Array<{skill_id: *}>} prev 上一份快照的技能列表
 * @param {Array<{skill_id: *}>} curr 当前快照的技能列表
 * @returns {Array} 新增的 skill_id（原始类型）
 */
export function newSkillIds(prev, curr) {
  const prevSet = idSet(prev, 'skill_id');
  const seen = new Set();
  const fresh = [];
  for (const item of curr) {
    const key = normId(item.skill_id);
    if (!prevSet.has(key) && !seen.has(key)) {
      seen.add(key);
      fresh.push(item.skill_id);
    }
  }
  return fresh;
}

/**
 * 榜单排名对比：给当前榜单每行附加 rank / prevRank / rankDelta / isNew。
 * @param {Array} prevList 上一份快照的同名榜单
 * @param {Array} currList 当前榜单
 * @param {string} idField 用于匹配的 id 字段名（技能榜 'skill_id'，作者榜 'author_id'）
 * @returns {Array} currList 的浅拷贝行 + 对比字段，保持当前榜单顺序
 */
export function compareRanks(prevList, currList, idField = 'skill_id') {
  const prevRankById = new Map();
  prevList.forEach((item, index) => {
    const key = normId(item[idField]);
    if (!prevRankById.has(key)) prevRankById.set(key, index + 1);
  });
  return currList.map((item, index) => {
    const key = normId(item[idField]);
    const prevRank = prevRankById.get(key) ?? null;
    return {
      ...item,
      rank: index + 1,
      prevRank,
      rankDelta: prevRank === null ? null : prevRank - (index + 1),
      isNew: prevRank === null,
    };
  });
}

/**
 * 判定"消失"的 id：以最后一份快照为基准，连续缺席 >= threshold 份快照才判定。
 * 注意：判定基于"最后一份快照中不存在的 id"，且从最后一份快照往前数缺席次数；
 * 中途重现会打断连续缺席计数。
 * @param {Array<Set<string>>} snapshotsIdSets 按时间升序的各快照 id 集合（已规范化为字符串）
 * @param {number} threshold 连续缺席阈值
 * @returns {Array<string>} 消失的 id（字符串形式）
 */
export function disappearedIds(snapshotsIdSets, threshold) {
  if (snapshotsIdSets.length === 0 || snapshotsIdSets.length <= threshold) return [];
  const latest = snapshotsIdSets[snapshotsIdSets.length - 1];

  // 所有曾经出现过的 id（排除最新快照已有的）
  const everSeen = new Set();
  for (const set of snapshotsIdSets) {
    for (const id of set) everSeen.add(id);
  }

  const candidates = [...everSeen].filter((id) => !latest.has(id));
  const result = [];
  for (const id of candidates) {
    // 最新快照本身算第一次缺席（candidates 已保证不在 latest 中），再往前数连续缺席
    let absentStreak = 1;
    for (let i = snapshotsIdSets.length - 2; i >= 0; i--) {
      if (snapshotsIdSets[i].has(id)) break;
      absentStreak++;
    }
    if (absentStreak >= threshold) result.push(id);
  }
  return result.sort();
}
