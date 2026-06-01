// tests/unittest/cloudfunctions/generateDailyPick.test.js
// 依赖注入模式：直接调用 doGenerateDailyPick(event, deps)，无需 vi.mock 拦截 CJS 模块
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// 导入核心纯函数（不走 @cloudbase/node-sdk）
const { doGenerateDailyPick } = await import(
  '../../../cloudfunctions/generateDailyPick/index.js'
)

// ── Helper: 构造 mock deps ──
function createMockDeps(overrides = {}) {
  const getResults = []
  const addEntries = []

  const mockCollection = vi.fn(() => {
    const chain = {}
    chain.where = vi.fn(() => chain)
    chain.limit = vi.fn(() => chain)
    chain.orderBy = vi.fn(() => chain)
    chain.skip = vi.fn(() => chain)
    chain.field = vi.fn(() => chain)
    chain.get = vi.fn(() => {
      if (getResults.length > 0) return Promise.resolve(getResults.shift())
      return Promise.resolve({ data: [] })
    })
    chain.add = vi.fn((data) => {
      addEntries.push(data)
      return Promise.resolve({})
    })
    chain.doc = vi.fn(() => chain)
    chain.remove = vi.fn(() => Promise.resolve({}))
    chain.set = vi.fn(() => Promise.resolve({}))
    return chain
  })
  mockCollection._getResults = getResults
  mockCollection._addEntries = addEntries

  const deps = {
    collection: mockCollection,
    getCommand: vi.fn(() => ({
      gte: (v) => ({ _cmd: 'gte', value: v })
    })),
    formatDateTime: vi.fn(() => '2026-04-21 12:00:00'),
    getTodayDate: vi.fn(() => '2026-04-21'),
    getDaysAgoDate: vi.fn((days) => {
      const d = new Date('2026-04-21')
      d.setDate(d.getDate() - days)
      return d.toISOString().split('T')[0]
    }),
    callFunction: vi.fn().mockResolvedValue({ result: { success: true } }),
    ...overrides
  }
  return deps
}

// ── 标准案例数据 ──
const makeCase = (id, scoreTotal, extra = {}) => ({
  id: String(id),
  score_total: scoreTotal,
  score_feasibility: extra.score_feasibility ?? Math.min(scoreTotal, 3),
  score_profit: extra.score_profit ?? Math.min(Math.max(scoreTotal - 2, 0), 3),
  score_timeliness: extra.score_timeliness ?? Math.min(Math.max(scoreTotal - 1, 0), 3),
  score_detail: extra.score_detail ?? 1,
  score_fitness: extra.score_fitness ?? 0,
  tags: extra.tags ?? [`tag${id}`],
  created_at: extra.created_at ?? '2026-04-15',
  ...extra
})

describe('generateDailyPick (DI)', () => {
  let originalTemplateId

  beforeEach(() => {
    vi.clearAllMocks()
    originalTemplateId = process.env.PUSH_TEMPLATE_ID
    process.env.PUSH_TEMPLATE_ID = 'test_template_id'
  })

  afterEach(() => {
    if (originalTemplateId === undefined) {
      delete process.env.PUSH_TEMPLATE_ID
    } else {
      process.env.PUSH_TEMPLATE_ID = originalTemplateId
    }
  })

  // 1. 今日已生成 → 跳过
  it('今日已生成 → 跳过（幂等）', async () => {
    const deps = createMockDeps()
    deps.collection._getResults.push({
      data: [{ _id: 'dp1', date: '2026-04-21', case_ids: ['100', '101', '102'] }]
    })

    const result = await doGenerateDailyPick({}, deps)

    expect(result.success).toBe(true)
    expect(result.data.skipped).toBe(true)
    expect(result.data.case_ids).toEqual(['100', '101', '102'])
    expect(deps.collection._addEntries.length).toBe(1)
  })

  // 2. 正常生成 → 选出 3 个案例
  it('正常生成 → 选出 3 个案例', async () => {
    const deps = createMockDeps()
    deps.collection._getResults.push(
      { data: [] },  // today check
      { data: [] },  // recent picks (30 days)
      {              // published cases
        data: [
          makeCase(200, 9, { tags: ['A'] }),
          makeCase(201, 8, { tags: ['B'] }),
          makeCase(202, 7, { tags: ['C'] }),
          makeCase(203, 6, { tags: ['D'] })
        ]
      },
      { data: [] }   // Analytics 查询（无热度数据）
    )

    const result = await doGenerateDailyPick({}, deps)

    expect(result.success).toBe(true)
    expect(result.data.date).toBe('2026-04-21')
    expect(result.data.case_ids).toHaveLength(3)
    expect(result.data.case_ids[0]).toBe('200') // 最高分排第一
  })

  // 3. 新案例不足 → 渐进放宽冷却期
  it('新案例不足 → 渐进放宽冷却期', async () => {
    const deps = createMockDeps()
    deps.collection._getResults.push(
      { data: [] },    // today check
      {                // recent picks (30 days) - 200, 201 已用过
        data: [{ case_ids: ['200', '201'] }]
      },
      {                // published cases
        data: [
          makeCase(200, 9),
          makeCase(201, 8),
          makeCase(202, 7)
        ]
      },
      { data: [] }    // Analytics
    )

    const result = await doGenerateDailyPick({}, deps)

    expect(result.success).toBe(true)
    expect(result.data.case_ids).toHaveLength(3)
    expect(result.data.case_ids).toContain('202')
  })

  // 4. 无 published 案例 → 错误
  it('无 published 案例 → 返回错误', async () => {
    const deps = createMockDeps()
    deps.collection._getResults.push(
      { data: [] }, // today check
      { data: [] }, // recent picks
      { data: [] }  // no published cases
    )

    const result = await doGenerateDailyPick({}, deps)

    expect(result.success).toBe(false)
    expect(result.code).toBe('NO_CASES')
  })

  // 5. 推送不 await
  it('推送不 await（callFunction 被调用但不阻塞）', async () => {
    const deps = createMockDeps()
    deps.collection._getResults.push(
      { data: [] },
      { data: [] },
      {
        data: [
          makeCase(300, 10),
          makeCase(301, 9),
          makeCase(302, 8)
        ]
      },
      { data: [] }  // Analytics
    )

    let resolvePush
    deps.callFunction.mockReturnValue(new Promise(r => { resolvePush = r }))

    const result = await doGenerateDailyPick({}, deps)

    expect(result.success).toBe(true)
    expect(result.data.case_ids).toHaveLength(3)
    expect(deps.callFunction).toHaveBeenCalledWith({
      name: 'subscribeMessage',
      data: expect.objectContaining({
        template_id: expect.any(String),
        data: expect.any(Object)
      })
    })

    resolvePush({ result: { success: true } })
  })

  describe('边缘场景', () => {
    it('无可选案例（Case 集合为空）→ NO_CASES', async () => {
      const deps = createMockDeps()
      deps.collection._getResults.push(
        { data: [] },
        { data: [] },
        { data: [] }
      )

      const result = await doGenerateDailyPick({}, deps)

      expect(result.success).toBe(false)
      expect(result.code).toBe('NO_CASES')
    })

    it('有案例但全部14天冷却期内 → 渐进放宽冷却期', async () => {
      const deps = createMockDeps()
      deps.collection._getResults.push(
        { data: [] },
        { data: [{ case_ids: ['100001', '100002'] }] },
        {
          data: [
            makeCase(100001, 9),
            makeCase(100002, 8)
          ]
        },
        { data: [] }  // Analytics
      )

      const result = await doGenerateDailyPick({}, deps)

      expect(result.success).toBe(true)
      expect(result.data.case_ids).toHaveLength(2)
    })

    it('PUSH_TEMPLATE_ID 未配置 → 不触发推送', async () => {
      const deps = createMockDeps()
      delete process.env.PUSH_TEMPLATE_ID

      deps.collection._getResults.push(
        { data: [] },
        { data: [] },
        { data: [makeCase(100001, 8)] },
        { data: [] }
      )

      const result = await doGenerateDailyPick({}, deps)

      expect(result.success).toBe(true)
      expect(deps.callFunction).not.toHaveBeenCalled()
    })
  })

  describe('新选择逻辑', () => {
    it('新案例冷启动加成：7天内创建的案例优先入选', async () => {
      const deps = createMockDeps()
      deps.collection._getResults.push(
        { data: [] },
        { data: [] },
        {
          data: [
            makeCase(200, 6, { created_at: '2026-04-15' }),
            makeCase(201, 5, { created_at: '2026-04-20' }), // 新案例 7天内
            makeCase(202, 4, { created_at: '2026-04-15' })
          ]
        },
        { data: [] }
      )

      const result = await doGenerateDailyPick({}, deps)
      expect(result.success).toBe(true)
      // 201 有冷启动加成 +2，加权分应该最高或接近最高
      expect(result.data.case_ids).toContain('201')
    })

    it('热门加权：有收藏数的案例加权分更高', async () => {
      const deps = createMockDeps()
      deps.collection._getResults.push(
        { data: [] },
        { data: [] },
        {
          data: [
            makeCase(200, 5, { tags: ['A'] }),
            makeCase(201, 5, { tags: ['B'] }),
            makeCase(202, 5, { tags: ['C'] })
          ]
        },
        // 201 有 10 次收藏 → 热门加成 3（上限），显著高于其他
        { data: Array.from({ length: 10 }, () => ({ case_id: '201' })) }
      )

      const result = await doGenerateDailyPick({}, deps)
      expect(result.success).toBe(true)
      // 201 有热门加成 +3，加权分明显高于 200 和 202
      expect(result.data.case_ids).toContain('201')
    })

    it('Analytics 查询失败不影响主流程', async () => {
      const deps = createMockDeps()
      deps.collection._getResults.push(
        { data: [] },
        { data: [] },
        {
          data: [
            makeCase(200, 9),
            makeCase(201, 8),
            makeCase(202, 7)
          ]
        }
        // 不 push Analytics 结果 → get() 返回默认空数组
      )

      const result = await doGenerateDailyPick({}, deps)
      expect(result.success).toBe(true)
      expect(result.data.case_ids).toHaveLength(3)
    })

    it('有充足候选池时冷却期内案例被排除', async () => {
      const deps = createMockDeps()
      deps.collection._getResults.push(
        { data: [] },                      // today check
        { data: [{ case_ids: ['200'] }] }, // 14-day cooling
        {
          data: [
            makeCase(200, 9, { tags: ['A'] }),
            makeCase(201, 8, { tags: ['B'] }),
            makeCase(202, 7, { tags: ['C'] }),
            makeCase(203, 6, { tags: ['D'] }),
            makeCase(204, 5, { tags: ['E'] }),
            makeCase(205, 4, { tags: ['F'] })
          ]
        },
        { data: [] }
      )

      const result = await doGenerateDailyPick({}, deps)

      expect(result.success).toBe(true)
      // 6 published >= 5, 不会触发放宽 → 200 在冷却期，不应出现
      expect(result.data.case_ids).toHaveLength(3)
      expect(result.data.case_ids).not.toContain('200')
    })

    it('候选池 < 5 时放宽到全部 published（含冷却期内案例）', async () => {
      const deps = createMockDeps()
      deps.collection._getResults.push(
        { data: [] },                      // today check
        { data: [{ case_ids: ['200'] }] }, // 14-day cooling
        {
          data: [
            makeCase(200, 9, { tags: ['A'] }),
            makeCase(201, 8, { tags: ['B'] }),
            makeCase(202, 7, { tags: ['C'] })
          ]
        },
        { data: [] }
      )

      const result = await doGenerateDailyPick({}, deps)

      expect(result.success).toBe(true)
      // 3 published < 5, 触发放宽 → 200 回到候选池
      expect(result.data.case_ids).toContain('200')
      expect(result.data.case_ids).toHaveLength(3)
    })
  })
})

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
    expect(hot1 - base).toBeCloseTo(1.5)
    expect(hot2 - base).toBeCloseTo(3)
  })

  it('零值安全：缺省字段当 0', () => {
    expect(computeWeightedScore({})).toBe(0)
  })
})

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
      { id: '1', score_total: 1 },
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
    expect(result.length).toBeGreaterThan(0)
  })

  it('空数组 → 返回空', () => {
    expect(filterByScoreRange([])).toEqual([])
  })
})

describe('selector: selectDailyCases', () => {
  const { selectDailyCases } = require('../../../cloudfunctions/generateDailyPick/selector.js')

  const fakeRng = (max) => 0

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
    expect(result[0].id).toBe('100')
  })

  it('标签分散：优先选标签不重叠的', () => {
    const pool = [
      { id: '1', score_total: 10, tags: ['A', 'B'], _weightedScore: 10 },
      { id: '2', score_total: 9,  tags: ['A', 'B'], _weightedScore: 9 },
      { id: '3', score_total: 8,  tags: ['C', 'D'], _weightedScore: 8 },
      { id: '4', score_total: 7,  tags: ['A', 'C'], _weightedScore: 7 },
      { id: '5', score_total: 6,  tags: ['E', 'F'], _weightedScore: 6 }
    ]
    const result = selectDailyCases(pool, 3, fakeRng)
    expect(result).toHaveLength(3)
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
