import { describe, it, expect, vi, beforeEach } from 'vitest'
// 导入核心函数（不触发 utils/db 的 require）
import { doGetCaseDetail } from '../../../cloudfunctions/getCaseDetail/index.js'

// ─── mock chain 工厂 ───
function createMockChain() {
  return {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn()
  }
}

describe('getCaseDetail', () => {
  let caseChain
  let mockCollection

  function makeDeps() {
    return {
      collection: mockCollection,
      validateCaseId: vi.fn()
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    caseChain = createMockChain()
    mockCollection = vi.fn((name) => {
      if (name === 'Case') return caseChain
      return createMockChain()
    })
  })

  it('案例存在 → 返回案例数据', async () => {
    const fakeCase = { id: '123', title: '精益副业案例', status: 'published' }
    caseChain.get.mockResolvedValue({ data: [fakeCase] })

    const deps = makeDeps()
    deps.validateCaseId.mockReturnValue(true)

    const result = await doGetCaseDetail({ case_id: '123' }, deps)

    expect(deps.validateCaseId).toHaveBeenCalledWith('123')
    expect(mockCollection).toHaveBeenCalledWith('Case')
    expect(caseChain.where).toHaveBeenCalledWith({ id: '123', status: 'published' })
    expect(caseChain.limit).toHaveBeenCalledWith(1)
    expect(result).toEqual({ success: true, data: { case: fakeCase } })
  })

  it('案例不存在 → NOT_FOUND', async () => {
    caseChain.get.mockResolvedValue({ data: [] })

    const deps = makeDeps()
    deps.validateCaseId.mockReturnValue(true)

    const result = await doGetCaseDetail({ case_id: '999' }, deps)

    expect(caseChain.where).toHaveBeenCalledWith({ id: '999', status: 'published' })
    expect(result).toEqual({ success: false, error: '案例不存在或已下架', code: 'NOT_FOUND' })
  })

  it('无效 case_id → INVALID_INPUT', async () => {
    const deps = makeDeps()
    deps.validateCaseId.mockImplementation(() => {
      throw new Error('INVALID_INPUT: case_id 必须是非空字符串')
    })

    // doGetCaseDetail 内部会 catch 并返回 error 格式
    const result = await doGetCaseDetail({ case_id: '' }, deps)

    expect(result.success).toBe(false)
    expect(result.code).toBe('INVALID_INPUT')
  })
})
