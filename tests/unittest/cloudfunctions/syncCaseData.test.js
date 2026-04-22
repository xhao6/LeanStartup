// tests/unittest/cloudfunctions/syncCaseData.test.js
//
// 依赖注入模式：直接导入 doSyncCaseData，通过 deps 参数注入 mock 依赖，
// 无需操作 require 缓存，彻底绕开 vi.mock 对 CJS require 的拦截问题。
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContext, createUnauthContext } from './helpers/mock-context.js'

// ---------------------------------------------------------------------------
// 导入被测函数（依赖注入版本，无需 mock 模块）
// ---------------------------------------------------------------------------
const { doSyncCaseData } = require('../../../cloudfunctions/syncCaseData/index.js')

// ---------------------------------------------------------------------------
// 构建 mock 数据库链式调用
// ---------------------------------------------------------------------------

const chain = {
  where: vi.fn(() => chain),
  get: vi.fn(),
  update: vi.fn(),
  add: vi.fn()
}

const mockCollection = vi.fn(() => chain)
const mockGetCommand = vi.fn(() => ({ eq: vi.fn(), or: vi.fn() }))
const mockFormatDateTime = vi.fn(() => '2026-04-21 12:00:00')
const mockAssertAuth = vi.fn()

/** 组装 deps 对象 */
function makeDeps() {
  return {
    collection: mockCollection,
    getCommand: mockGetCommand,
    formatDateTime: mockFormatDateTime,
    assertCloudFunctionContext: mockAssertAuth
  }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeValidCase(overrides = {}) {
  return {
    id: '100001',
    title: '测试案例',
    source_account: '来源账号',
    source_url: 'https://example.com',
    summary: '简介',
    score_total: 8,
    score_feasibility: 3,
    score_profit: 2,
    score_timeliness: 1,
    score_detail: 1,
    score_fitness: 1,
    cost: '100元',
    expected_revenue: '500元',
    cycle: '7天',
    steps: '步骤内容',
    tools: '工具',
    pitfalls: '注意',
    suitable_for: '适合人群',
    risk_tags: '风险标签',
    status: 'published',
    ...overrides
  }
}

const validContext = createMockContext()

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('syncCaseData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 默认：鉴权通过
    mockAssertAuth.mockImplementation(() => {})
    // 默认：集合查询返回空（新案例）
    chain.where.mockReturnValue(chain)
    chain.get.mockResolvedValue({ data: [] })
    chain.update.mockResolvedValue({ updated: 1 })
    chain.add.mockResolvedValue({ _id: 'mock_id' })
  })

  // ---- 1. 正常导入新案例 ----
  it('正常导入新案例 → 成功', async () => {
    const caseData = makeValidCase()
    const result = await doSyncCaseData({ cases: [caseData] }, validContext, makeDeps())

    expect(result.success).toBe(true)
    expect(result.data.synced).toBe(1)
    expect(mockCollection).toHaveBeenCalledWith('Case')
    expect(chain.add).toHaveBeenCalled()
  })

  // ---- 2. 更新已有案例 → 保留 created_at ----
  it('更新已有案例 → 保留 created_at 和 published_at', async () => {
    const caseData = makeValidCase()
    const existingRecord = {
      _id: 'existing_doc_id',
      id: caseData.id,
      created_at: '2026-01-01 00:00:00',
      published_at: '2026-01-05 00:00:00'
    }
    chain.get.mockResolvedValue({ data: [existingRecord] })

    const result = await doSyncCaseData({ cases: [caseData] }, validContext, makeDeps())

    expect(result.success).toBe(true)
    expect(result.data.synced).toBe(1)
    // update 应该被调用且保留 created_at / published_at
    const updateData = chain.update.mock.calls[0][0]
    expect(updateData.created_at).toBe('2026-01-01 00:00:00')
    expect(updateData.published_at).toBe('2026-01-05 00:00:00')
  })

  // ---- 3. 缺少必填字段 → 返回错误详情 ----
  it('缺少必填字段 → 返回错误详情', async () => {
    const badCase = { id: '100001' } // 缺少 title 等必填字段
    const result = await doSyncCaseData({ cases: [badCase] }, validContext, makeDeps())

    expect(result.success).toBe(false)
    expect(result.code).toBe('INVALID_INPUT')
    expect(result.error).toContain('title')
  })

  // ---- 4. 评分不一致（总分 ≠ 分项之和）→ 返回错误 ----
  it('评分不一致（总分 ≠ 分项之和）→ 返回错误', async () => {
    const caseData = makeValidCase({
      score_total: 20,
      score_feasibility: 3,
      score_profit: 2,
      score_timeliness: 1,
      score_detail: 1,
      score_fitness: 1
    })
    const result = await doSyncCaseData({ cases: [caseData] }, validContext, makeDeps())

    expect(result.success).toBe(false)
    expect(result.code).toBe('INVALID_INPUT')
    expect(result.error).toMatch(/评分/)
  })

  // ---- 5. 评分为小数 → 返回错误 ----
  it('评分为小数 → 返回错误', async () => {
    const caseData = makeValidCase({
      score_total: 7.5,
      score_feasibility: 3,
      score_profit: 1.5,
      score_timeliness: 1,
      score_detail: 1,
      score_fitness: 1
    })
    const result = await doSyncCaseData({ cases: [caseData] }, validContext, makeDeps())

    expect(result.success).toBe(false)
    expect(result.code).toBe('INVALID_INPUT')
    expect(result.error).toMatch(/整数/)
  })

  // ---- 6. cases 为空数组 → INVALID_INPUT ----
  it('cases 为空数组 → INVALID_INPUT', async () => {
    const result = await doSyncCaseData({ cases: [] }, validContext, makeDeps())

    expect(result.success).toBe(false)
    expect(result.code).toBe('INVALID_INPUT')
  })

  // ---- 7. id 类型为数字 → 强转为字符串 ----
  it('id 类型为数字 → 强转为字符串', async () => {
    const caseData = makeValidCase({ id: 12345 })
    const result = await doSyncCaseData({ cases: [caseData] }, validContext, makeDeps())

    expect(result.success).toBe(true)
    const addData = chain.add.mock.calls[0][0]
    expect(addData.id).toBe('12345')
    expect(typeof addData.id).toBe('string')
  })

  describe('边缘场景', () => {
    it('单个批次中部分有效部分无效 → 返回部分失败错误', async () => {
      const goodCase = makeValidCase()
      const badCase = { id: '100002' } // 缺少必填字段

      const result = await doSyncCaseData(
        { cases: [goodCase, badCase] },
        validContext,
        makeDeps()
      )

      expect(result.success).toBe(false)
      expect(result.code).toBe('INVALID_INPUT')
      expect(result.error).toContain('[1]')
      expect(result.error).toContain('title')
    })

    it('鉴权失败 → FORBIDDEN', async () => {
      mockAssertAuth.mockImplementation(() => {
        throw new Error('FORBIDDEN: 此函数仅支持云函数内部调用')
      })

      const result = await doSyncCaseData(
        { cases: [makeValidCase()] },
        createUnauthContext(),
        makeDeps()
      )

      expect(result.success).toBe(false)
      expect(result.code).toBe('FORBIDDEN')
    })

    it('title 为空字符串 → 缺少必填字段错误', async () => {
      const caseData = makeValidCase({ title: '' })

      const result = await doSyncCaseData(
        { cases: [caseData] },
        validContext,
        makeDeps()
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('title')
    })
  })
})
