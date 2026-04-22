import { describe, it, expect, vi, beforeEach } from 'vitest'
// 导入核心函数（不触发 utils/db 的 require）
import { toggleCollection } from '../../../cloudfunctions/toggleCollection/index.js'
// 直接导入验证工具（纯函数，无外部依赖）
import { validateCaseId, validateProgress } from '../../../cloudfunctions/_shared/auth.js'

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

describe('toggleCollection', () => {
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
      getOpenid: () => openid,
      formatDateTime: () => '2026-04-21 12:00:00',
      openid
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ucChain = createMockChain()
    caseChain = createMockChain()
  })

  describe('collect - 创建新收藏', () => {
    it('当记录不存在时，创建新记录', async () => {
      ucChain.get.mockResolvedValueOnce({ data: [] })

      const result = await toggleCollection(
        { case_id: '100001', action: 'collect' },
        makeDeps()
      )

      // 验证先查询了 UserCollection
      expect(ucChain.where).toHaveBeenCalledWith({ openid, case_id: '100001' })

      // 验证 doc().set() 写入
      expect(ucChain.doc).toHaveBeenCalledWith(`${openid}_100001`)
      expect(ucChain.set).toHaveBeenCalled()

      const setCall = ucChain.set.mock.calls[0][0]
      expect(setCall).toMatchObject({
        openid,
        case_id: '100001',
        progress: {}
      })
      expect(setCall).toHaveProperty('created_at')
      expect(setCall).toHaveProperty('updated_at')

      expect(result.success).toBe(true)
      expect(result.data.action).toBe('created')
    })
  })

  describe('collect - 更新已有收藏', () => {
    it('当记录已存在时，用 spread 合并 progress 后 doc().set() 写回完整记录', async () => {
      ucChain.get.mockResolvedValueOnce({
        data: [{
          _id: 'doc_1',
          openid,
          case_id: '100001',
          progress: { step_1: true },
          created_at: '2026-04-20 10:00:00',
          updated_at: '2026-04-20 10:00:00'
        }]
      })

      const result = await toggleCollection(
        { case_id: '100001', action: 'collect', progress: { step_2: true } },
        makeDeps()
      )

      // 验证用已有记录的 _id 调用 doc()
      expect(ucChain.doc).toHaveBeenCalledWith('doc_1')

      const setCall = ucChain.set.mock.calls[0][0]
      // spread 合并
      expect(setCall.progress).toEqual({ step_1: true, step_2: true })
      // 完整记录（五个字段）
      expect(setCall).toHaveProperty('openid')
      expect(setCall).toHaveProperty('case_id')
      expect(setCall).toHaveProperty('progress')
      expect(setCall).toHaveProperty('created_at')
      expect(setCall).toHaveProperty('updated_at')

      expect(result.success).toBe(true)
      expect(result.data.action).toBe('updated')
    })
  })

  describe('uncollect - 取消收藏', () => {
    it('直接 where + remove 删除记录', async () => {
      ucChain.remove.mockResolvedValueOnce({ stats: { removed: 1 } })

      const result = await toggleCollection(
        { case_id: '100001', action: 'uncollect' },
        makeDeps()
      )

      expect(ucChain.where).toHaveBeenCalledWith({ openid, case_id: '100001' })
      expect(ucChain.remove).toHaveBeenCalled()
      expect(result.success).toBe(true)
      expect(result.data.action).toBe('uncollected')
    })
  })

  describe('参数校验', () => {
    it('无效 case_id（空字符串）抛出 INVALID_INPUT', async () => {
      await expect(
        toggleCollection({ case_id: '', action: 'collect' }, makeDeps())
      ).rejects.toThrow('INVALID_INPUT')
    })

    it('无效 case_id（非数字）抛出 INVALID_INPUT', async () => {
      await expect(
        toggleCollection({ case_id: 'abc', action: 'collect' }, makeDeps())
      ).rejects.toThrow('INVALID_INPUT')
    })

    it('无效 action 返回错误', async () => {
      const result = await toggleCollection(
        { case_id: '100001', action: 'invalid' },
        makeDeps()
      )
      expect(result.success).toBe(false)
      expect(result.code).toBe('INVALID_INPUT')
    })
  })

  describe('progress spread 合并', () => {
    it('已有 {step_1: true}，传 {step_2: true} → 结果 {step_1: true, step_2: true}', async () => {
      ucChain.get.mockResolvedValueOnce({
        data: [{
          _id: 'doc_2',
          openid,
          case_id: '100002',
          progress: { step_1: true },
          created_at: '2026-04-19 08:00:00',
          updated_at: '2026-04-19 08:00:00'
        }]
      })

      const result = await toggleCollection(
        { case_id: '100002', action: 'collect', progress: { step_2: true } },
        makeDeps()
      )

      const setCall = ucChain.set.mock.calls[0][0]
      expect(setCall.progress).toEqual({ step_1: true, step_2: true })
      expect(result.data.progress).toEqual({ step_1: true, step_2: true })
    })

    it('collect 新记录带 progress 时正确设置', async () => {
      ucChain.get.mockResolvedValueOnce({ data: [] })

      const result = await toggleCollection(
        { case_id: '100003', action: 'collect', progress: { step_1: true, step_3: false } },
        makeDeps()
      )

      const setCall = ucChain.set.mock.calls[0][0]
      expect(setCall.progress).toEqual({ step_1: true, step_3: false })
    })

    it('collect 时不传 progress，新记录默认 {}', async () => {
      ucChain.get.mockResolvedValueOnce({ data: [] })

      const result = await toggleCollection(
        { case_id: '100004', action: 'collect' },
        makeDeps()
      )

      expect(result.data.progress).toEqual({})
    })
  })
})
