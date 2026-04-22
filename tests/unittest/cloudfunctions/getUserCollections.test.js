import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getUserCollections } from '../../../cloudfunctions/getUserCollections/index.js'

// ─── mock chain 工厂 ───
function createMockChain() {
  return {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    get: vi.fn(),
    count: vi.fn(),
    doc: vi.fn().mockReturnThis(),
    set: vi.fn(),
    remove: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    field: vi.fn().mockReturnThis()
  }
}

const mockCmd = {
  in: vi.fn((val) => ({ _mockCmdIn: true, value: val }))
}

describe('getUserCollections', () => {
  let ucChain
  let caseChain
  const openid = 'test_openid_123'

  function makeDeps() {
    return {
      collection: (name) => {
        if (name === 'UserCollection') return ucChain
        if (name === 'Case') return caseChain
        return createMockChain()
      },
      getCommand: () => mockCmd,
      openid
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ucChain = createMockChain()
    caseChain = createMockChain()
  })

  describe('有收藏数据', () => {
    it('返回带 Case 信息的列表', async () => {
      ucChain.count.mockResolvedValueOnce({ total: 2 })
      ucChain.get.mockResolvedValueOnce({
        data: [
          { _id: 'uc_1', openid, case_id: '100001', progress: { step_1: true }, updated_at: '2026-04-21' },
          { _id: 'uc_2', openid, case_id: '100002', progress: { step_1: true, step_2: true }, updated_at: '2026-04-20' }
        ]
      })
      caseChain.get.mockResolvedValueOnce({
        data: [
          { _id: 'doc_auto_001', id: '100001', title: '案例一', score_total: 95, steps_count: 3 },
          { _id: 'doc_auto_002', id: '100002', title: '案例二', score_total: 80, steps_count: 5 }
        ]
      })

      const result = await getUserCollections({ page: 1, pageSize: 10 }, makeDeps())

      expect(result.success).toBe(true)
      expect(result.data.total).toBe(2)
      expect(result.data.list).toHaveLength(2)

      const item = result.data.list[0]
      expect(item).toHaveProperty('case_id')
      expect(item).toHaveProperty('title')
      expect(item).toHaveProperty('score_total')
      expect(item).toHaveProperty('progress')
      expect(item).toHaveProperty('steps_count')
      expect(item).toHaveProperty('completed_count')

      // 验证 N+1 优化：用 cmd.in() 批量查 Case
      expect(caseChain.where).toHaveBeenCalled()
      const whereArg = caseChain.where.mock.calls[0][0]
      expect(whereArg.id).toBeDefined()
    })

    it('正确计算 completed_count', async () => {
      ucChain.count.mockResolvedValueOnce({ total: 1 })
      ucChain.get.mockResolvedValueOnce({
        data: [
          { _id: 'uc_1', openid, case_id: '100001', progress: { step_1: true, step_2: true, step_3: false }, updated_at: '2026-04-21' }
        ]
      })
      caseChain.get.mockResolvedValueOnce({
        data: [
          { _id: 'doc_auto_001', id: '100001', title: '案例一', score_total: 95, steps_count: 3 }
        ]
      })

      const result = await getUserCollections({ page: 1, pageSize: 10 }, makeDeps())

      expect(result.success).toBe(true)
      // completed_count = progress 中值为 true 的数量 = 2
      expect(result.data.list[0].completed_count).toBe(2)
    })
  })

  describe('无收藏数据', () => {
    it('返回 { total: 0, list: [] }', async () => {
      ucChain.count.mockResolvedValueOnce({ total: 0 })

      const result = await getUserCollections({ page: 1, pageSize: 10 }, makeDeps())

      expect(result.success).toBe(true)
      expect(result.data.total).toBe(0)
      expect(result.data.list).toEqual([])
    })
  })

  describe('分页参数', () => {
    it('默认 page=1, pageSize=10', async () => {
      // 需要有数据才能触发分页查询
      ucChain.count.mockResolvedValueOnce({ total: 5 })
      ucChain.get.mockResolvedValueOnce({ data: [] })

      await getUserCollections({}, makeDeps())

      expect(ucChain.orderBy).toHaveBeenCalledWith('updated_at', 'desc')
      expect(ucChain.skip).toHaveBeenCalledWith(0)   // (1-1)*10
      expect(ucChain.limit).toHaveBeenCalledWith(10)  // 默认 pageSize
    })

    it('自定义分页参数', async () => {
      ucChain.count.mockResolvedValueOnce({ total: 25 })
      ucChain.get.mockResolvedValueOnce({ data: [] })

      await getUserCollections({ page: 3, pageSize: 5 }, makeDeps())

      expect(ucChain.skip).toHaveBeenCalledWith(10) // (3-1)*5
      expect(ucChain.limit).toHaveBeenCalledWith(5)
    })

    it('page 超出范围时返回空列表（total 不变）', async () => {
      ucChain.count.mockResolvedValueOnce({ total: 3 })
      ucChain.get.mockResolvedValueOnce({ data: [] })

      const result = await getUserCollections({ page: 10, pageSize: 10 }, makeDeps())

      expect(result.success).toBe(true)
      expect(result.data.total).toBe(3)
      expect(result.data.list).toEqual([])
    })
  })
})
