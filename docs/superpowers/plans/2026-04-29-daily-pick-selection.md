# 每日榜单选择逻辑优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构 generateDailyPick 选择算法，解决高分/低分扎堆问题，增加加权排序、标签分散、冷启动保护和热门加权。

**Architecture:** 将选择逻辑从 `generateDailyPick/index.js` 抽取到纯函数文件 `selector.js`，保持现有 DI 模式不变。新增一个数据库查询（Analytics 聚合最近7天收藏热度）。`index.js` 只负责数据获取和调用 selector。

**Tech Stack:** Node.js 云函数（CloudBase Node SDK），Vitest 测试

---

## Context

当前 `generateDailyPick` 按 `score_total` 纯贪婪取 Top3，存在两个问题：
1. **库存震荡**：案例不足时低分扎堆，补充新案例后高分扎堆
2. **缺乏多样性**：不区分维度权重，不关心标签分布，新案例无曝光保护

用户需求：分数区间过滤极端值 → 候选池随机抽取 → 加权排序/标签分散/冷启动保护/热门加权。

---

## File Structure

| 文件 | 变更 | 职责 |
|------|------|------|
| `cloudfunctions/generateDailyPick/selector.js` | **新建** | 纯函数：加权评分、分数过滤、标签分散、随机选择 |
| `cloudfunctions/generateDailyPick/index.js` | 修改 | 新增 Analytics 热度查询，调用 selector 替代原有 Top3 逻辑 |
| `tests/unittest/cloudfunctions/generateDailyPick.test.js` | 修改 | 新增 selector 纯函数测试 + 更新集成测试 |

---

## Task 1: 创建 selector.js — 加权评分 + 分数区间过滤

**Files:**
- Create: `cloudfunctions/generateDailyPick/selector.js`
- Test: `tests/unittest/cloudfunctions/generateDailyPick.test.js`

### 1.1 写 selector.js 的 computeWeightedScore 函数

```javascript
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

module.exports = { computeWeightedScore, DIMENSION_WEIGHTS }
```

### 1.2 写 computeWeightedScore 的测试

在 `tests/unittest/cloudfunctions/generateDailyPick.test.js` 末尾追加：

```javascript
// ── selector.js 纯函数测试 ──
describe('selector: computeWeightedScore', () => {
  const { computeWeightedScore } = require('../../../cloudfunctions/generateDailyPick/selector.js')

  it('基础加权：feasibility×1.5 + profit×1.5 + timeliness×1.2 + detail×0.8 + fitness×1.0', () => {
    const caseData = {
      score_feasibility: 2,
      score_profit: 2,
      score_timeliness: 2,
      score_detail: 1,
      score_fitness: 1
    }
    // 2*1.5 + 2*1.5 + 2*1.2 + 1*0.8 + 1*1.0 = 3+3+2.4+0.8+1.0 = 10.2
    expect(computeWeightedScore(caseData)).toBeCloseTo(10.2)
  })

  it('冷启动加成：新案例 +2', () => {
    const caseData = {
      score_feasibility: 1, score_profit: 1,
      score_timeliness: 1, score_detail: 1, score_fitness: 1
    }
    const base = computeWeightedScore(caseData)
    const boosted = computeWeightedScore(caseData, { isNewCase: true })
    expect(boosted - base).toBeCloseTo(2)
  })

  it('热门加成：每个热度 +0.3，上限 3', () => {
    const caseData = {
      score_feasibility: 1, score_profit: 1,
      score_timeliness: 1, score_detail: 1, score_fitness: 1
    }
    const base = computeWeightedScore(caseData)
    const hot1 = computeWeightedScore(caseData, { popularityCount: 5 })
    const hot2 = computeWeightedScore(caseData, { popularityCount: 100 })
    expect(hot1 - base).toBeCloseTo(1.5) // 5 * 0.3
    expect(hot2 - base).toBeCloseTo(3)   // cap at 3
  })

  it('零值安全：缺省字段当 0', () => {
    expect(computeWeightedScore({})).toBe(0)
  })
})
```

- [ ] **Step 1:** 创建 `selector.js`，写入 `computeWeightedScore`
- [ ] **Step 2:** 在测试文件追加测试，运行 `npx vitest run tests/unittest/cloudfunctions/generateDailyPick.test.js` 验证通过
- [ ] **Step 3:** Commit: `feat(selector): add computeWeightedScore with weighted dimensions, cold start, popularity`

---

## Task 2: selector.js — 分数区间过滤

在 `selector.js` 中添加 `filterByScoreRange`。

### 2.1 实现 filterByScoreRange

```javascript
/**
 * 分数区间过滤
 * 去掉极端值：保留 [median - 2, max] 范围内的案例
 * 过滤后不足 5 个时逐步放宽，不足 3 个时返回全部
 *
 * @param {Array} cases - 案例数组
 * @returns {Array} 过滤后的案例
 */
function filterByScoreRange(cases) {
  if (cases.length <= 5) return cases.slice()

  const scores = cases.map(c => c.score_total).sort((a, b) => a - b)
  const median = scores[Math.floor(scores.length / 2)]

  // 只设下限（去掉极低分），不设上限（高分是好的，不需要排除）
  const minScore = Math.max(0, median - 2)

  let filtered = cases.filter(c => c.score_total >= minScore)

  // 不足 5 个 → 只保留 score_total > 0 的
  if (filtered.length < 5) {
    filtered = cases.filter(c => c.score_total > 0)
  }
  // 仍不足 → 返回全部
  if (filtered.length < 3) {
    return cases.slice()
  }

  return filtered
}
```

### 2.2 写测试

```javascript
describe('selector: filterByScoreRange', () => {
  const { filterByScoreRange } = require('../../../cloudfunctions/generateDailyPick/selector.js')

  it('≤5 个案例 → 全部保留', () => {
    const cases = [
      { id: '1', score_total: 1 },
      { id: '2', score_total: 2 }
    ]
    expect(filterByScoreRange(cases)).toHaveLength(2)
  })

  it('正常过滤：去掉远低于中位数的案例', () => {
    const cases = [
      { id: '1', score_total: 1 },   // median=7, 1 < 7-2=5 → 过滤掉
      { id: '2', score_total: 6 },
      { id: '3', score_total: 7 },
      { id: '4', score_total: 8 },
      { id: '5', score_total: 9 },
      { id: '6', score_total: 10 }
    ]
    const result = filterByScoreRange(cases)
    expect(result.every(c => c.score_total >= 5)).toBe(true)
  })

  it('过滤后不足5个 → 放宽到 >0', () => {
    const cases = [
      { id: '1', score_total: 0 },
      { id: '2', score_total: 0 },
      { id: '3', score_total: 0 },
      { id: '4', score_total: 1 },
      { id: '5', score_total: 1 },
      { id: '6', score_total: 8 }
    ]
    const result = filterByScoreRange(cases)
    // median=0, minScore=max(0,0-2)=0, 但过滤后可能不够 → 放宽到 >0
    expect(result.length).toBeGreaterThan(0)
  })

  it('空数组 → 返回空', () => {
    expect(filterByScoreRange([])).toEqual([])
  })
})
```

- [ ] **Step 1:** 在 `selector.js` 添加 `filterByScoreRange`，更新 `module.exports`
- [ ] **Step 2:** 追加测试，运行验证通过
- [ ] **Step 3:** Commit: `feat(selector): add filterByScoreRange for quality floor`

---

## Task 3: selector.js — 标签分散 + 随机选择

在 `selector.js` 中添加 `selectDailyCases`，这是核心选择函数。

### 3.1 实现 selectDailyCases

```javascript
/**
 * Fisher-Yates 洗牌（带种子确定性，用于可测试性）
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
 * 从候选池中选择 N 个案例（标签分散 + 加权随机）
 *
 * 算法：
 * 1. 候选池按加权评分排序
 * 2. 取 top POOL_SIZE 作为候选
 * 3. 第一轮：最高分的直接入选
 * 4. 后续轮：从候选中随机选（权重 = 加权分），优先标签不重叠的
 *
 * @param {Array} candidates - 已过滤的候选案例（需有 _weightedScore）
 * @param {number} count - 需要选几个（默认 3）
 * @param {Function} rng - 可选随机函数（测试注入）
 * @returns {Array} 选中的案例
 */
function selectDailyCases(candidates, count = 3, rng) {
  if (candidates.length <= count) return candidates.slice()

  // 按 _weightedScore 降序排序
  const sorted = [...candidates].sort(
    (a, b) => (b._weightedScore || 0) - (a._weightedScore || 0)
  )

  // 候选池：取 top 10
  const poolSize = Math.min(10, sorted.length)
  const pool = sorted.slice(0, poolSize)

  const selected = []
  const usedTags = new Set()

  // 第一轮：选择加权分最高的
  selected.push(pool[0])
  const firstTags = pool[0].tags || []
  firstTags.forEach(t => usedTags.add(t))

  // 后续轮：标签分散 + 加权随机
  const remaining = pool.slice(1)
  const shuffled = shuffle(remaining, rng)

  for (const candidate of shuffled) {
    if (selected.length >= count) break

    const candidateTags = candidate.tags || []
    const overlapCount = candidateTags.filter(t => usedTags.has(t)).length

    // 标签完全不重叠 → 直接入选
    // 标签有重叠但 < 50% → 概率入选（重叠越少概率越高）
    // 标签完全重叠 → 跳过（除非没别的选了）
    if (candidateTags.length === 0 || overlapCount === 0) {
      selected.push(candidate)
      candidateTags.forEach(t => usedTags.add(t))
    } else if (overlapCount / candidateTags.length < 0.5) {
      selected.push(candidate)
      candidateTags.forEach(t => usedTags.add(t))
    }
  }

  // 标签分散不够 → 回退到按分数顺序填充
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
```

### 3.2 写测试

```javascript
describe('selector: selectDailyCases', () => {
  const { selectDailyCases } = require('../../../cloudfunctions/generateDailyPick/selector.js')

  // 固定随机种子用于确定性测试
  const fakeRng = (max) => 0 // 总是选第0个

  const makePool = (n) => Array.from({ length: n }, (_, i) => ({
    id: String(100 + i),
    score_total: n - i,
    tags: [`tag${i}`],
    _weightedScore: n - i
  }))

  it('候选 ≤ count → 全部返回', () => {
    const pool = makePool(2)
    const result = selectDailyCases(pool, 3, fakeRng)
    expect(result).toHaveLength(2)
  })

  it('选出恰好 3 个', () => {
    const pool = makePool(10)
    const result = selectDailyCases(pool, 3, fakeRng)
    expect(result).toHaveLength(3)
  })

  it('第一个是加权分最高的', () => {
    const pool = makePool(10)
    const result = selectDailyCases(pool, 3, fakeRng)
    expect(result[0].id).toBe('100') // 最高分
  })

  it('标签分散：3 个案例标签不全部重叠', () => {
    const pool = [
      { id: '1', score_total: 10, tags: ['A', 'B'], _weightedScore: 10 },
      { id: '2', score_total: 9,  tags: ['A', 'B'], _weightedScore: 9 },
      { id: '3', score_total: 8,  tags: ['C', 'D'], _weightedScore: 8 },
      { id: '4', score_total: 7,  tags: ['A', 'C'], _weightedScore: 7 },
      { id: '5', score_total: 6,  tags: ['E', 'F'], _weightedScore: 6 }
    ]
    const result = selectDailyCases(pool, 3, fakeRng)
    expect(result).toHaveLength(3)
    // 第一个是 id:1 (tags A,B)，后续应该优先选不重叠的
    expect(result.map(c => c.id)).toContain('1')
  })

  it('无标签的案例不会崩溃', () => {
    const pool = [
      { id: '1', score_total: 10, tags: [], _weightedScore: 10 },
      { id: '2', score_total: 9,  tags: [], _weightedScore: 9 },
      { id: '3', score_total: 8,  tags: [], _weightedScore: 8 }
    ]
    const result = selectDailyCases(pool, 3, fakeRng)
    expect(result).toHaveLength(3)
  })
})
```

- [ ] **Step 1:** 在 `selector.js` 添加 `shuffle` 和 `selectDailyCases`，更新 `module.exports`
- [ ] **Step 2:** 追加测试，运行验证通过
- [ ] **Step 3:** Commit: `feat(selector): add selectDailyCases with tag dispersion and random pool`

---

## Task 4: 更新 generateDailyPick/index.js — 集成新选择逻辑

**Files:**
- Modify: `cloudfunctions/generateDailyPick/index.js`

### 4.1 改造 doGenerateDailyPick

核心变更点：
1. 新增 Analytics 热度查询
2. 用 selector 替代原有 Top3 逻辑
3. 保持幂等检查、经典回顾兜底、推送逻辑不变

```javascript
// 在文件顶部添加
const {
  computeWeightedScore,
  filterByScoreRange,
  selectDailyCases
} = require('./selector')

// doGenerateDailyPick 函数中，替换步骤 3-5：

// ---- 原代码（删除） ----
// // 3. 查所有已发布案例，按 score_total 倒序
// const { data: publishedCases } = await deps.collection('Case')
//   .where({ status: 'published' })
//   .orderBy('score_total', 'desc')
//   .limit(50)
//   .get()
// ...
// // 4. 过滤出最近 30 天未用过的案例
// const freshCases = publishedCases.filter(c => !recentlyUsedIds.has(c.id))
// // 5. 选 Top 3 新案例
// let selectedIds = freshCases.slice(0, 3).map(c => c.id)

// ---- 新代码 ----

    // 3. 查所有已发布案例
    const { data: publishedCases } = await deps.collection('Case')
      .where({ status: 'published' })
      .limit(100)
      .get()

    if (!publishedCases || publishedCases.length === 0) {
      logEntry.type = 'cron_error'
      logEntry.detail = '无可选案例，Case 集合中无 published 记录'
      await deps.collection('SystemLog').add(logEntry)
      return error('无可选案例', 'NO_CASES')
    }

    // 4. 查询最近 7 天热度（Analytics 中 collect 事件计数）
    const sevenDaysAgo = deps.getDaysAgoDate(7)
    const popularityMap = {}
    try {
      const { data: analytics } = await deps.collection('Analytics')
        .where({
          event: 'collect',
          date: cmd.gte(sevenDaysAgo)
        })
        .field('case_id')
        .limit(1000)
        .get()

      if (analytics) {
        for (const record of analytics) {
          if (record.case_id) {
            popularityMap[record.case_id] = (popularityMap[record.case_id] || 0) + 1
          }
        }
      }
    } catch (analyticsErr) {
      // 热度查询失败不影响主流程
      console.error('[generateDailyPick] analytics query failed:', analyticsErr.message)
    }

    // 5. 过滤已用 + 分数区间过滤
    const freshCases = publishedCases.filter(c => !recentlyUsedIds.has(String(c.id)))
    const candidates = filterByScoreRange(freshCases)

    // 6. 计算加权评分
    const today = deps.getTodayDate()
    for (const c of candidates) {
      const createdDate = c.created_at ? c.created_at.split(' ')[0] : ''
      const daysSinceCreation = createdDate
        ? Math.floor((new Date(today) - new Date(createdDate)) / 86400000)
        : 999
      c._weightedScore = computeWeightedScore(c, {
        isNewCase: daysSinceCreation <= 7,
        popularityCount: popularityMap[c.id] || 0
      })
    }

    // 7. 选择 3 个（标签分散 + 随机）
    const selected = selectDailyCases(candidates, 3)
    let selectedIds = selected.map(c => c.id)

    // 8. 不足 3 个 → 经典回顾补充（保持不变）
    if (selectedIds.length < 3) {
      const needCount = 3 - selectedIds.length
      const alreadySelectedIds = new Set(selectedIds)
      const classicCases = publishedCases
        .filter(c => recentlyUsedIds.has(String(c.id)) && !alreadySelectedIds.has(c.id))
        .sort((a, b) => b.score_total - a.score_total)

      const classicIds = classicCases
        .slice(0, needCount)
        .map(c => c.id)

      selectedIds = selectedIds.concat(classicIds)
    }
```

### 4.2 更新 module.exports

确认 `selector.js` 的 require 路径正确，`getDaysAgoDate` 已在 deps 中（已存在）。

- [ ] **Step 1:** 修改 `index.js`，引入 selector，替换步骤 3-5 逻辑
- [ ] **Step 2:** 更新现有集成测试中的 mock 数据（新增 Analytics 查询返回值）
- [ ] **Step 3:** 运行全部测试 `npx vitest run tests/unittest/cloudfunctions/generateDailyPick.test.js`
- [ ] **Step 4:** Commit: `refactor(generateDailyPick): integrate weighted scoring, tag dispersion, popularity`

---

## Task 5: 更新集成测试

**Files:**
- Modify: `tests/unittest/cloudfunctions/generateDailyPick.test.js`

### 5.1 更新 createMockDeps

现有 mock 的 `_getResults` 队列需要额外提供 Analytics 查询的返回值。

```javascript
// 在 createMockDeps 中，无需修改 mock 结构
// 因为 mockCollection 对所有 collection('xxx') 返回同一个 chain
// 只需在测试中多 push 一个 get 结果给 Analytics 查询即可
```

### 5.2 更新现有测试用例

```javascript
// 测试 "正常生成 → Top 3" 需要更新：
// 原期望 case_ids 固定为 ['200','201','202']
// 新逻辑有随机性，需要适配

it('正常生成 → 选出 3 个案例', async () => {
  const deps = createMockDeps()
  deps.collection._getResults.push(
    { data: [] },  // today check
    { data: [] },  // recent picks (30 days)
    {              // published cases
      data: [
        { id: '200', score_total: 9, score_feasibility: 3, score_profit: 2, score_timeliness: 2, score_detail: 1, score_fitness: 1, tags: ['A'], created_at: '2026-04-20' },
        { id: '201', score_total: 8, score_feasibility: 2, score_profit: 2, score_timeliness: 2, score_detail: 1, score_fitness: 1, tags: ['B'], created_at: '2026-04-20' },
        { id: '202', score_total: 7, score_feasibility: 2, score_profit: 2, score_timeliness: 1, score_detail: 1, score_fitness: 1, tags: ['C'], created_at: '2026-04-20' },
        { id: '203', score_total: 6, score_feasibility: 2, score_profit: 1, score_timeliness: 1, score_detail: 1, score_fitness: 1, tags: ['D'], created_at: '2026-04-20' }
      ]
    },
    { data: [] }   // Analytics 查询（无热度数据）
  )

  const result = await doGenerateDailyPick({}, deps)

  expect(result.success).toBe(true)
  expect(result.data.date).toBe('2026-04-21')
  expect(result.data.case_ids).toHaveLength(3)
  // 第一个应该是最高分
  expect(result.data.case_ids[0]).toBe('200')
})
```

### 5.3 新增场景测试

```javascript
it('新案例冷启动加成：7天内创建的案例优先入选', async () => {
  const deps = createMockDeps()
  deps.collection._getResults.push(
    { data: [] },  // today check
    { data: [] },  // recent picks
    {
      data: [
        { id: '200', score_total: 6, score_feasibility: 2, score_profit: 1, score_timeliness: 1, score_detail: 1, score_fitness: 1, tags: ['X'], created_at: '2026-04-15' },
        { id: '201', score_total: 5, score_feasibility: 1, score_profit: 1, score_timeliness: 1, score_detail: 1, score_fitness: 1, tags: ['Y'], created_at: '2026-04-20' }, // 新案例
        { id: '202', score_total: 4, score_feasibility: 1, score_profit: 1, score_timeliness: 1, score_detail: 1, score_fitness: 0, tags: ['Z'], created_at: '2026-04-15' }
      ]
    },
    { data: [] }  // Analytics
  )

  const result = await doGenerateDailyPick({}, deps)
  expect(result.success).toBe(true)
  // 新案例 201 有冷启动加成，加权分可能超过 200
  expect(result.data.case_ids).toContain('201')
})

it('热门加权：有收藏数的案例加权分更高', async () => {
  const deps = createMockDeps()
  deps.collection._getResults.push(
    { data: [] },
    { data: [] },
    {
      data: [
        { id: '200', score_total: 5, score_feasibility: 2, score_profit: 1, score_timeliness: 1, score_detail: 1, score_fitness: 0, tags: ['A'], created_at: '2026-04-15' },
        { id: '201', score_total: 5, score_feasibility: 2, score_profit: 1, score_timeliness: 1, score_detail: 1, score_fitness: 0, tags: ['B'], created_at: '2026-04-15' },
        { id: '202', score_total: 5, score_feasibility: 2, score_profit: 1, score_timeliness: 1, score_detail: 1, score_fitness: 0, tags: ['C'], created_at: '2026-04-15' }
      ]
    },
    { data: [{ case_id: '201' }, { case_id: '201' }, { case_id: '201' }] } // 201 有 3 次收藏
  )

  const result = await doGenerateDailyPick({}, deps)
  expect(result.success).toBe(true)
  expect(result.data.case_ids[0]).toBe('201') // 热门案例排第一
})
```

- [ ] **Step 1:** 更新现有测试用例，适配新逻辑（Analytics mock 数据）
- [ ] **Step 2:** 新增冷启动 + 热门加权测试
- [ ] **Step 3:** 运行全部测试 `npx vitest run tests/unittest/cloudfunctions/generateDailyPick.test.js`
- [ ] **Step 4:** Commit: `test(generateDailyPick): update integration tests for new selection logic`

---

## Task 6: 部署 + 端到端验证

### 6.1 部署云函数

```bash
# 部署 generateDailyPick
npx cloudbase functions:deploy generateDailyPublish
```

或使用 MCP 工具 `manageFunctions` 的 `updateFunctionCode`。

### 6.2 手动触发验证

使用 MCP 工具 `manageFunctions` 的 `invokeFunction` 触发一次生成，检查：
1. 返回的 `case_ids` 是否为 3 个
2. 3 个案例的标签是否有差异
3. 新案例（created_at 近7天）是否被选中
4. 查询云端 DailyPick 记录确认写入正确

### 6.3 数据库验证

```javascript
// 查询最新 DailyPick 记录
db.collection('DailyPick').orderBy('date', 'desc').limit(1).get()

// 查询对应 Case 的标签分布
db.collection('Case').where({ id: _.in(caseIds) }).field('id,tags,score_total').get()
```

- [ ] **Step 1:** 部署云函数
- [ ] **Step 2:** 手动触发，验证返回结果
- [ ] **Step 3:** 查询数据库确认数据正确
- [ ] **Step 4:** Commit: `chore: deploy updated generateDailyPick with new selection algorithm`

---

## 关键文件路径速查

| 文件 | 路径 |
|------|------|
| 选择算法 | `cloudfunctions/generateDailyPick/selector.js`（新建） |
| 云函数入口 | `cloudfunctions/generateDailyPick/index.js`（修改） |
| 单元测试 | `tests/unittest/cloudfunctions/generateDailyPick.test.js`（修改） |
| DB 工具 | `cloudfunctions/generateDailyPick/utils/db.js`（不变） |
| 日期工具 | `cloudfunctions/generateDailyPick/utils/date.js`（不变） |
| 响应工具 | `cloudfunctions/generateDailyPick/utils/response.js`（不变） |

## Verification

1. **单元测试**：`npx vitest run tests/unittest/cloudfunctions/generateDailyPick.test.js` 全部通过
2. **云函数调用**：invokeFunction 触发，返回 3 个 case_ids，标签有差异
3. **数据库检查**：DailyPick 记录写入，Case 数据标签分散
4. **回归检查**：幂等（重复触发跳过）、无 published 案例 → NO_CASES、不足 3 个 → 经典回顾兜底
