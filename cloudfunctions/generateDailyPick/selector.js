// cloudfunctions/generateDailyPick/selector.js

/**
 * 维度权重配置
 */
const DIMENSION_WEIGHTS = {
  feasibility: 1.5,
  profit: 1.5,
  timeliness: 1.2,
  detail: 0.8,
  fitness: 1.0
}

/**
 * 计算加权评分
 * @param {object} caseData - 案例数据
 * @param {object} options
 * @param {boolean} options.isNewCase - 是否新案例（7天内创建）
 * @param {number} options.popularityCount - 最近7天收藏/热度数
 * @returns {number} 加权评分（浮点数）
 */
function computeWeightedScore(caseData, options = {}) {
  const { isNewCase = false, popularityCount = 0 } = options

  const weighted =
    (caseData.score_feasibility || 0) * DIMENSION_WEIGHTS.feasibility +
    (caseData.score_profit || 0) * DIMENSION_WEIGHTS.profit +
    (caseData.score_timeliness || 0) * DIMENSION_WEIGHTS.timeliness +
    (caseData.score_detail || 0) * DIMENSION_WEIGHTS.detail +
    (caseData.score_fitness || 0) * DIMENSION_WEIGHTS.fitness

  // 冷启动加成：新案例 +2
  const coldStartBonus = isNewCase ? 2 : 0
  // 热门加成：每个热度 +0.3，上限 3
  const popularityBonus = Math.min(popularityCount * 0.3, 3)

  return weighted + coldStartBonus + popularityBonus
}

/**
 * 分数区间过滤
 * 只设下限（去掉极低分），保留 [median - 2, max] 范围
 * 过滤后不足 5 个时逐步放宽，不足 3 个时返回全部
 */
function filterByScoreRange(cases) {
  if (cases.length <= 5) return cases.slice()

  const scores = cases.map(c => c.score_total).sort((a, b) => a - b)
  const median = scores[Math.floor(scores.length / 2)]

  const minScore = Math.max(0, median - 2)

  let filtered = cases.filter(c => c.score_total >= minScore)

  if (filtered.length < 5) {
    filtered = cases.filter(c => c.score_total > 0)
  }
  if (filtered.length < 3) {
    return cases.slice()
  }

  return filtered
}

/**
 * Fisher-Yates 洗牌（支持注入 rng 用于可测试性）
 */
function shuffle(arr, rng) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng ? rng(i + 1) : Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * 从候选池中选择 N 个案例（标签分散 + 随机选择）
 *
 * 1. 按 _weightedScore 降序取 top 10 作为候选池
 * 2. 最高分直接入选
 * 3. 后续轮：打乱候选，优先选标签不重叠的
 * 4. 标签分散不够 → 回退到按分数顺序填充
 */
function selectDailyCases(candidates, count = 3, rng) {
  if (candidates.length <= count) return candidates.slice()

  const sorted = [...candidates].sort(
    (a, b) => (b._weightedScore || 0) - (a._weightedScore || 0)
  )

  const poolSize = Math.min(10, sorted.length)
  const pool = sorted.slice(0, poolSize)

  const selected = []
  const usedTags = new Set()

  // 最高分直接入选
  selected.push(pool[0])
  const firstTags = pool[0].tags || []
  firstTags.forEach(t => usedTags.add(t))

  // 后续轮：标签分散 + 随机
  const remaining = pool.slice(1)
  const shuffled = shuffle(remaining, rng)

  for (const candidate of shuffled) {
    if (selected.length >= count) break

    const candidateTags = candidate.tags || []
    const overlapCount = candidateTags.filter(t => usedTags.has(t)).length

    if (candidateTags.length === 0 || overlapCount === 0) {
      selected.push(candidate)
      candidateTags.forEach(t => usedTags.add(t))
    } else if (overlapCount / candidateTags.length < 0.5) {
      selected.push(candidate)
      candidateTags.forEach(t => usedTags.add(t))
    }
  }

  // 回退：按分数顺序填充
  if (selected.length < count) {
    for (const candidate of pool) {
      if (selected.length >= count) break
      if (!selected.find(s => s.id === candidate.id)) {
        selected.push(candidate)
      }
    }
  }

  return selected
}

module.exports = {
  computeWeightedScore,
  filterByScoreRange,
  selectDailyCases,
  shuffle,
  DIMENSION_WEIGHTS
}
