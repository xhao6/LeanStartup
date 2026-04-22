// tests/unittest/cloudfunctions/getDailyPick.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleGetDailyPick } from '../../../cloudfunctions/getDailyPick/index.js'

// ============================================================
// Helper: create a mock collection chain
// ============================================================
function createMockCollection() {
  const chain = {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    get: vi.fn(),
    count: vi.fn()
  }
  return chain
}

// ============================================================
// Helper: build deps for handleGetDailyPick
// ============================================================
function createDeps(overrides = {}) {
  const dailyPickChain = createMockCollection()
  const caseChain = createMockCollection()

  const collection = vi.fn((name) => {
    if (name === 'DailyPick') return dailyPickChain
    if (name === 'Case') return caseChain
    return createMockCollection()
  })

  const mockCmd = {
    lt: (val) => ({ operator: 'lt', value: val }),
    in: (val) => ({ operator: 'in', value: val })
  }

  const getCommand = vi.fn(() => mockCmd)
  const getTodayDate = vi.fn(() => '2026-04-21')

  return {
    dailyPickChain,
    caseChain,
    collection,
    getCommand,
    getTodayDate,
    mockCmd,
    ...overrides
  }
}

// ============================================================
// Sample data
// ============================================================
const SAMPLE_DAILY_PICK = {
  _id: 'dp001',
  date: '2026-04-21',
  case_ids: ['100001', '100002', '100003'],
  created_at: '2026-04-21 06:00:00'
}

const SAMPLE_DAILY_PICK_OLD = {
  _id: 'dp000',
  date: '2026-04-20',
  case_ids: ['200001', '200002'],
  created_at: '2026-04-20 06:00:00'
}

const SAMPLE_CASES = [
  { _id: 'c1', id: '100001', title: '案例A', summary: '摘要A', score_total: 9, cost: '500', source_account: '账号A', suitable_for: '上班族', status: 'published' },
  { _id: 'c2', id: '100002', title: '案例B', summary: '摘要B', score_total: 8, cost: '300', source_account: '账号B', suitable_for: '大学生', status: 'published' },
  { _id: 'c3', id: '100003', title: '案例C', summary: '摘要C', score_total: 7, cost: '1000', source_account: '账号C', suitable_for: '宝妈', status: 'published' }
]

// ============================================================
// Tests
// ============================================================
describe('getDailyPick - dependency injection', () => {
  let deps

  beforeEach(() => {
    deps = createDeps()
  })

  // ----------------------------------------------------------
  // 1. Single-day mode: has today's data
  // ----------------------------------------------------------
  it('单日模式：有今日数据 → 返回案例列表', async () => {
    const { dailyPickChain, caseChain } = deps

    // First .get() on DailyPick returns today's pick
    dailyPickChain.get.mockResolvedValueOnce({ data: [SAMPLE_DAILY_PICK] })

    // .get() on Case returns matching cases
    caseChain.get.mockResolvedValueOnce({ data: SAMPLE_CASES })

    const result = await handleGetDailyPick({ date: '2026-04-21' }, deps)

    expect(result.success).toBe(true)
    expect(result.data.date).toBe('2026-04-21')
    expect(result.data.cases).toHaveLength(3)

    // Verify order follows case_ids order
    expect(result.data.cases[0].id).toBe('100001')
    expect(result.data.cases[1].id).toBe('100002')
    expect(result.data.cases[2].id).toBe('100003')

    // Verify only frontend fields are returned
    const firstCase = result.data.cases[0]
    expect(firstCase).toHaveProperty('id')
    expect(firstCase).toHaveProperty('title')
    expect(firstCase).toHaveProperty('summary')
    expect(firstCase).toHaveProperty('score_total')
    expect(firstCase).toHaveProperty('cost')
    expect(firstCase).toHaveProperty('source_account')
    expect(firstCase).toHaveProperty('suitable_for')
    // Should NOT include internal fields
    expect(firstCase).not.toHaveProperty('_id')
    expect(firstCase).not.toHaveProperty('status')
  })

  // ----------------------------------------------------------
  // 2. Single-day mode: no today's data, fallback
  // ----------------------------------------------------------
  it('单日模式：无今日数据，fallback 到最近有效日', async () => {
    const { dailyPickChain, caseChain } = deps

    // First .get() returns empty (no data for target date)
    dailyPickChain.get.mockResolvedValueOnce({ data: [] })

    // Second .get() returns fallback pick (older date)
    dailyPickChain.get.mockResolvedValueOnce({ data: [SAMPLE_DAILY_PICK_OLD] })

    // Case query for fallback pick's case_ids
    caseChain.get.mockResolvedValueOnce({
      data: [
        { _id: 'c4', id: '200001', title: '旧案例A', summary: '旧摘要', score_total: 8, cost: '200', source_account: '账号D', suitable_for: '自由职业', status: 'published' },
        { _id: 'c5', id: '200002', title: '旧案例B', summary: '旧摘要B', score_total: 7, cost: '150', source_account: '账号E', suitable_for: '学生', status: 'published' }
      ]
    })

    const result = await handleGetDailyPick({ date: '2026-04-21' }, deps)

    expect(result.success).toBe(true)
    // Date should be the fallback date, not the requested date
    expect(result.data.date).toBe('2026-04-20')
    expect(result.data.cases).toHaveLength(2)
    expect(result.data.cases[0].id).toBe('200001')

    // Verify the fallback query used cmd.lt (ordered by date desc)
    const whereCalls = dailyPickChain.where.mock.calls
    expect(whereCalls.length).toBeGreaterThanOrEqual(2)
  })

  // ----------------------------------------------------------
  // 3. Single-day mode: completely no data
  // ----------------------------------------------------------
  it('单日模式：完全无数据 → 返回空数组', async () => {
    const { dailyPickChain } = deps

    // First .get() returns empty
    dailyPickChain.get.mockResolvedValueOnce({ data: [] })

    // Second .get() (fallback) also returns empty
    dailyPickChain.get.mockResolvedValueOnce({ data: [] })

    const result = await handleGetDailyPick({ date: '2026-04-21' }, deps)

    expect(result.success).toBe(true)
    expect(result.data.date).toBe('2026-04-21')
    expect(result.data.cases).toEqual([])
  })

  // ----------------------------------------------------------
  // 4. Pagination mode: returns paginated list
  // ----------------------------------------------------------
  it('分页模式：返回按日期倒序的分页精选列表', async () => {
    const { dailyPickChain } = deps

    const page1Picks = [
      { _id: 'dp1', date: '2026-04-21', case_ids: ['100001'], created_at: '2026-04-21 06:00:00' },
      { _id: 'dp2', date: '2026-04-20', case_ids: ['100002'], created_at: '2026-04-20 06:00:00' }
    ]

    // .get() for the page of picks
    dailyPickChain.get.mockResolvedValueOnce({ data: page1Picks })

    // .count() for total
    dailyPickChain.count.mockResolvedValueOnce({ total: 5 })

    const result = await handleGetDailyPick({ page: 1, pageSize: 2 }, deps)

    expect(result.success).toBe(true)
    expect(result.data.total).toBe(5)
    expect(result.data.list).toHaveLength(2)
    expect(result.data.list[0].date).toBe('2026-04-21')
    expect(result.data.list[1].date).toBe('2026-04-20')
    expect(result.data.page).toBe(1)
    expect(result.data.pageSize).toBe(2)

    // Verify pagination methods were called
    expect(dailyPickChain.orderBy).toHaveBeenCalledWith('date', 'desc')
    expect(dailyPickChain.skip).toHaveBeenCalledWith(0)
    expect(dailyPickChain.limit).toHaveBeenCalledWith(2)
  })

  // ----------------------------------------------------------
  // 4b. Pagination mode: page 2 with skip
  // ----------------------------------------------------------
  it('分页模式：第2页正确计算 skip', async () => {
    const { dailyPickChain } = deps

    dailyPickChain.get.mockResolvedValueOnce({ data: [{ _id: 'dp3', date: '2026-04-19', case_ids: ['100003'], created_at: '2026-04-19 06:00:00' }] })
    dailyPickChain.count.mockResolvedValueOnce({ total: 5 })

    const result = await handleGetDailyPick({ page: 2, pageSize: 2 }, deps)

    expect(result.success).toBe(true)
    expect(result.data.page).toBe(2)
    expect(dailyPickChain.skip).toHaveBeenCalledWith(2)
  })

  // ----------------------------------------------------------
  // 5. Default mode (no params): equals querying today
  // ----------------------------------------------------------
  it('默认模式（无参数）：等同于查今天', async () => {
    const { dailyPickChain, caseChain } = deps

    // getTodayDate mock returns '2026-04-21'
    dailyPickChain.get.mockResolvedValueOnce({ data: [SAMPLE_DAILY_PICK] })
    caseChain.get.mockResolvedValueOnce({ data: SAMPLE_CASES })

    // Call with empty object (no date, no page)
    const result = await handleGetDailyPick({}, deps)

    expect(result.success).toBe(true)
    expect(result.data.date).toBe('2026-04-21')

    // Verify the first where was called with today's date
    const firstWhereCall = dailyPickChain.where.mock.calls[0]
    expect(firstWhereCall[0]).toEqual({ date: '2026-04-21' })
  })

  // ----------------------------------------------------------
  // 6. Single-day mode: case_ids empty
  // ----------------------------------------------------------
  it('单日模式：DailyPick 的 case_ids 为空 → 返回空案例', async () => {
    const { dailyPickChain } = deps

    dailyPickChain.get.mockResolvedValueOnce({
      data: [{ _id: 'dp002', date: '2026-04-21', case_ids: [], created_at: '2026-04-21 06:00:00' }]
    })

    const result = await handleGetDailyPick({ date: '2026-04-21' }, deps)

    expect(result.success).toBe(true)
    expect(result.data.cases).toEqual([])
  })

  // ----------------------------------------------------------
  // 7. Error handling — tests the try/catch in exports.main
  // ----------------------------------------------------------
  it('异常处理：数据库报错返回 error', async () => {
    const { dailyPickChain } = deps

    dailyPickChain.get.mockRejectedValueOnce(new Error('database connection failed'))

    // Simulate the try/catch wrapper that exports.main provides
    let result
    try {
      result = await handleGetDailyPick({ date: '2026-04-21' }, deps)
    } catch (err) {
      result = { success: false, error: err.message, code: 'INTERNAL_ERROR' }
    }

    expect(result.success).toBe(false)
    expect(result.error).toBe('database connection failed')
    expect(result.code).toBe('INTERNAL_ERROR')
  })

  // ----------------------------------------------------------
  // 8. Uses getCommand() for cmd operators
  // ----------------------------------------------------------
  it('使用 getCommand() 构造查询操作符', async () => {
    const { dailyPickChain, caseChain, getCommand } = deps

    dailyPickChain.get.mockResolvedValueOnce({ data: [] }) // no pick for target date
    dailyPickChain.get.mockResolvedValueOnce({ data: [SAMPLE_DAILY_PICK_OLD] }) // fallback

    caseChain.get.mockResolvedValueOnce({ data: [] })

    await handleGetDailyPick({ date: '2026-04-21' }, deps)

    // Verify getCommand was called
    expect(getCommand).toHaveBeenCalled()

    // Verify the fallback where used cmd.lt
    const whereCalls = dailyPickChain.where.mock.calls
    const fallbackWhereArg = whereCalls[1][0]
    expect(fallbackWhereArg.date).toEqual({ operator: 'lt', value: '2026-04-21' })
  })

  // ----------------------------------------------------------
  // 9. Batch query uses cmd.in (no N+1)
  // ----------------------------------------------------------
  it('批量查 Case 使用 cmd.in 避免 N+1', async () => {
    const { dailyPickChain, caseChain } = deps

    dailyPickChain.get.mockResolvedValueOnce({ data: [SAMPLE_DAILY_PICK] })
    caseChain.get.mockResolvedValueOnce({ data: SAMPLE_CASES })

    await handleGetDailyPick({ date: '2026-04-21' }, deps)

    // Case collection should have been queried with cmd.in
    const caseWhereArg = caseChain.where.mock.calls[0][0]
    expect(caseWhereArg.id).toEqual({ operator: 'in', value: ['100001', '100002', '100003'] })
    expect(caseWhereArg.status).toBe('published')
  })

  // ----------------------------------------------------------
  // 10. Pagination: page param triggers pagination mode
  // ----------------------------------------------------------
  it('有 page 参数走分页模式，即使有 date 参数', async () => {
    const { dailyPickChain } = deps

    dailyPickChain.get.mockResolvedValueOnce({ data: [] })
    dailyPickChain.count.mockResolvedValueOnce({ total: 0 })

    // Both page and date provided — page takes precedence
    const result = await handleGetDailyPick({ page: 1, pageSize: 10, date: '2026-04-21' }, deps)

    expect(result.success).toBe(true)
    // Should be in pagination mode (returns list, not cases)
    expect(result.data).toHaveProperty('list')
    expect(result.data).toHaveProperty('total')
    expect(result.data).toHaveProperty('page')
    expect(result.data).toHaveProperty('pageSize')
  })

  // ----------------------------------------------------------
  // Edge cases
  // ----------------------------------------------------------
  describe('边缘场景', () => {
    it('查询历史时分页参数无效 → 使用默认值', async () => {
      const { dailyPickChain } = deps

      dailyPickChain.get.mockResolvedValueOnce({ data: [] })
      dailyPickChain.count.mockResolvedValueOnce({ total: 0 })

      const result = await handleGetDailyPick(
        { page: -1, pageSize: 0 },
        deps
      )

      // Math.max(1, Number(-1)) = 1, Number(0)||10 = 10 → Math.min(50, Math.max(1, 10)) = 10
      expect(result.success).toBe(true)
      expect(result.data.page).toBe(1)
      expect(result.data.pageSize).toBe(10)
    })

    it('单日查询但 DailyPick 不存在 → 返回空 cases', async () => {
      const { dailyPickChain } = deps

      // First .get() returns empty (no data for target date)
      dailyPickChain.get.mockResolvedValueOnce({ data: [] })
      // Second .get() (fallback) also returns empty
      dailyPickChain.get.mockResolvedValueOnce({ data: [] })

      const result = await handleGetDailyPick(
        { date: '2026-04-21' },
        deps
      )

      expect(result.success).toBe(true)
      expect(result.data.cases).toEqual([])
    })
  })
})
