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
    getDaysAgoDate: vi.fn(() => '2026-03-22'),
    callFunction: vi.fn().mockResolvedValue({ result: { success: true } }),
    ...overrides
  }
  return deps
}

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
    // DailyPick.where({date: today}).get() → 已存在
    deps.collection._getResults.push({
      data: [{ _id: 'dp1', date: '2026-04-21', case_ids: ['100', '101', '102'] }]
    })

    const result = await doGenerateDailyPick({}, deps)

    expect(result.success).toBe(true)
    expect(result.data.skipped).toBe(true)
    expect(result.data.case_ids).toEqual(['100', '101', '102'])
    // 不应添加新的 DailyPick，只有 SystemLog
    expect(deps.collection._addEntries.length).toBe(1) // 仅 SystemLog
  })

  // 2. 正常生成 → Top 3
  it('正常生成 → Top 3', async () => {
    const deps = createMockDeps()
    deps.collection._getResults.push(
      { data: [] }, // today check - no existing
      { data: [] }, // recent picks (30 days) - empty
      {            // published cases, ordered by score_total desc
        data: [
          { id: '200', score_total: 9, title: 'Case A' },
          { id: '201', score_total: 8, title: 'Case B' },
          { id: '202', score_total: 7, title: 'Case C' },
          { id: '203', score_total: 6, title: 'Case D' }
        ]
      }
    )

    const result = await doGenerateDailyPick({}, deps)

    expect(result.success).toBe(true)
    expect(result.data.date).toBe('2026-04-21')
    expect(result.data.case_ids).toEqual(['200', '201', '202'])
    expect(result.data.case_ids).toHaveLength(3)

    // callFunction 用于异步推送 subscribeMessage
    expect(deps.callFunction).toHaveBeenCalled()
  })

  // 3. 新案例不足 → 经典回顾补充
  it('新案例不足 → 经典回顾补充', async () => {
    const deps = createMockDeps()
    deps.collection._getResults.push(
      { data: [] },    // today check
      {                // recent picks (30 days) - 200, 201 已用过
        data: [{ case_ids: ['200', '201'] }]
      },
      {                // published cases
        data: [
          { id: '200', score_total: 9, title: 'Case A' },
          { id: '201', score_total: 8, title: 'Case B' },
          { id: '202', score_total: 7, title: 'Case C' }
        ]
      }
    )

    const result = await doGenerateDailyPick({}, deps)

    expect(result.success).toBe(true)
    // 1 fresh (202) + 2 classic review (200, 201)
    expect(result.data.case_ids).toHaveLength(3)
    expect(result.data.case_ids).toContain('202')
    expect(result.data.case_ids).toContain('200')
    expect(result.data.case_ids).toContain('201')
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

  // 5. 推送不 await（callFunction 被调用但不阻塞）
  it('推送不 await（callFunction 被调用但不阻塞）', async () => {
    const deps = createMockDeps()
    deps.collection._getResults.push(
      { data: [] },
      { data: [] },
      {
        data: [
          { id: '300', score_total: 10, title: 'Top' },
          { id: '301', score_total: 9, title: 'Second' },
          { id: '302', score_total: 8, title: 'Third' }
        ]
      }
    )

    // 让 callFunction 返回一个不立即 resolve 的 promise
    let resolvePush
    deps.callFunction.mockReturnValue(new Promise(r => { resolvePush = r }))

    const result = await doGenerateDailyPick({}, deps)

    // 主流程应该先返回，不等 push 完成
    expect(result.success).toBe(true)
    expect(result.data.case_ids).toHaveLength(3)

    // callFunction 已被调用（推送已触发）
    expect(deps.callFunction).toHaveBeenCalledWith({
      name: 'subscribeMessage',
      data: expect.objectContaining({
        template_id: expect.any(String),
        data: expect.any(Object)
      })
    })

    // 清理 pending promise
    resolvePush({ result: { success: true } })
  })
})
