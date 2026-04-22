import { describe, it, expect, vi, beforeEach } from 'vitest'
// 导入核心函数（不触发 utils/db 的 require）
import { doTrackEvent } from '../../../cloudfunctions/trackEvent/index.js'

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

describe('trackEvent', () => {
  let analyticsChain
  let pushSubscriptionChain
  let mockCollection
  const openid = 'test_openid_123'

  function makeDeps() {
    return {
      collection: mockCollection,
      getOpenid: vi.fn(() => openid),
      validateEventName: vi.fn(),
      getTodayDate: vi.fn(() => '2026-04-21'),
      formatDateTime: vi.fn(() => '2026-04-21 12:00:00'),
      openid
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    analyticsChain = createMockChain()
    pushSubscriptionChain = createMockChain()
    mockCollection = vi.fn((name) => {
      if (name === 'Analytics') return analyticsChain
      if (name === 'PushSubscription') return pushSubscriptionChain
      return createMockChain()
    })
  })

  it('page_view → 写入 Analytics', async () => {
    analyticsChain.add.mockResolvedValue({})

    const deps = makeDeps()
    deps.validateEventName.mockReturnValue(true)

    const result = await doTrackEvent(
      { event: 'page_view', case_id: '100001' },
      deps
    )

    expect(deps.validateEventName).toHaveBeenCalledWith('page_view')
    expect(mockCollection).toHaveBeenCalledWith('Analytics')
    expect(analyticsChain.add).toHaveBeenCalledWith(
      expect.objectContaining({
        openid,
        event: 'page_view',
        date: '2026-04-21',
        case_id: '100001'
      })
    )
    expect(result).toEqual({ success: true, data: null })
  })

  it('subscribe → 写入 PushSubscription（不是 Analytics）', async () => {
    pushSubscriptionChain.add.mockResolvedValue({})

    const deps = makeDeps()
    deps.validateEventName.mockReturnValue(true)

    const result = await doTrackEvent(
      { event: 'subscribe' },
      deps
    )

    expect(mockCollection).toHaveBeenCalledWith('PushSubscription')
    expect(pushSubscriptionChain.add).toHaveBeenCalledWith(
      expect.objectContaining({
        openid,
        subscribed_at: '2026-04-21 12:00:00'
      })
    )
    // 确保没有写入 Analytics
    expect(analyticsChain.add).not.toHaveBeenCalled()
    expect(result).toEqual({ success: true, data: null })
  })

  it('无效事件名 → 返回 INVALID_INPUT', async () => {
    const deps = makeDeps()
    deps.validateEventName.mockImplementation(() => {
      throw new Error('INVALID_INPUT: event 必须是 page_view/case_click/case_collect/case_share/subscribe 之一')
    })

    const result = await doTrackEvent({ event: 'bad_event' }, deps)

    expect(result.success).toBe(false)
    expect(result.code).toBe('INVALID_INPUT')
  })

  it('错误时也返回 success(null)', async () => {
    const deps = makeDeps()
    deps.validateEventName.mockReturnValue(true)
    // 模拟数据库写入失败
    analyticsChain.add.mockRejectedValue(new Error('database error'))

    const result = await doTrackEvent(
      { event: 'page_view' },
      deps
    )

    // 埋点不影响用户体验，错误时也返回 success(null)
    expect(result).toEqual({ success: true, data: null })
  })

  describe('边缘场景', () => {
    it('包含 extra 字段 → 正常写入', async () => {
      analyticsChain.add.mockResolvedValueOnce({ _id: 'log_1' })

      const deps = makeDeps()
      deps.validateEventName.mockReturnValue(true)

      const result = await doTrackEvent(
        { event: 'page_view', case_id: '100001', extra: { from: 'daily_pick' } },
        deps
      )

      expect(result.success).toBe(true)
      const addData = analyticsChain.add.mock.calls[0][0]
      expect(addData.extra).toEqual({ from: 'daily_pick' })
    })

    it('subscribe 失败（写 PushSubscription 失败）→ 仍返回 success', async () => {
      // First add is for PushSubscription (subscribe event)
      pushSubscriptionChain.add.mockRejectedValueOnce(new Error('db write failed'))

      const deps = makeDeps()
      deps.validateEventName.mockReturnValue(true)

      const result = await doTrackEvent(
        { event: 'subscribe', case_id: '100001' },
        deps
      )

      // subscribe 失败不应影响主流程，埋点静默失败
      expect(result.success).toBe(true)
    })
  })
})
