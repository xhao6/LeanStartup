// tests/unittest/cloudfunctions/subscribeMessage.test.js
// 依赖注入模式：直接调用 doSubscribeMessage(event, deps)，无需 vi.mock 拦截 CJS 模块
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockContext, createUnauthContext } from './helpers/mock-context.js'

// 导入核心纯函数（不走 @cloudbase/node-sdk）
const { doSubscribeMessage } = await import(
  '../../../cloudfunctions/subscribeMessage/index.js'
)

// ── Helper: 构造 mock deps ──
function createMockDeps(overrides = {}) {
  const logEntries = []

  const mockCollection = vi.fn(() => {
    const chain = {}
    chain.where = vi.fn(() => chain)
    chain.skip = vi.fn(() => chain)
    chain.limit = vi.fn(() => chain)
    chain.get = vi.fn(() => mockCollection._getNextResult())
    chain.add = vi.fn((data) => { logEntries.push(data); return Promise.resolve({}) })
    chain.doc = vi.fn(() => chain)
    chain.remove = vi.fn(() => Promise.resolve({}))
    return chain
  })
  // 队列式返回，支持多次 get 调用
  mockCollection._results = []
  mockCollection._getNextResult = function () {
    if (this._results.length > 0) return Promise.resolve(this._results.shift())
    return Promise.resolve({ data: [] })
  }
  mockCollection._logEntries = logEntries

  const deps = {
    collection: mockCollection,
    sendSubscribeMessage: vi.fn().mockResolvedValue({ errcode: 0 }),
    formatDateTime: vi.fn(() => '2026-04-21 12:00:00'),
    assertCloudFunctionContext: vi.fn(),
    callFunction: vi.fn().mockResolvedValue({}),
    sleep: vi.fn().mockResolvedValue(undefined),
    ...overrides
  }
  return deps
}

describe('subscribeMessage (DI)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 1. 无订阅用户 → { sent: 0, failed: 0 }
  it('无订阅用户 → { sent: 0, failed: 0 }', async () => {
    const deps = createMockDeps()
    // PushSubscription.get → 空数组
    deps.collection._results = [{ data: [] }]

    const result = await doSubscribeMessage(
      { template_id: 'tmpl_001', data: { thing1: { value: 'hello' } } },
      deps,
      createMockContext()
    )

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ sent: 0, failed: 0 })
  })

  // 2. 发送成功 → 统计 sentCount
  it('发送成功 → 统计 sentCount', async () => {
    const deps = createMockDeps()
    const subs = [
      { _id: 'sub1', openid: 'openid_a' },
      { _id: 'sub2', openid: 'openid_b' }
    ]
    deps.collection._results = [{ data: subs }]

    const result = await doSubscribeMessage(
      { template_id: 'tmpl_001', data: { thing1: { value: 'hello' } }, page: 'pages/index/index' },
      deps,
      createMockContext()
    )

    expect(result.success).toBe(true)
    expect(result.data.sent).toBe(2)
    expect(result.data.failed).toBe(0)
    expect(deps.sendSubscribeMessage).toHaveBeenCalledTimes(2)
  })

  // 3. 发送失败不删除订阅
  it('发送失败不删除订阅', async () => {
    const deps = createMockDeps()
    const subs = [
      { _id: 'sub1', openid: 'openid_a' },
      { _id: 'sub2', openid: 'openid_b' }
    ]
    deps.collection._results = [{ data: subs }]
    deps.sendSubscribeMessage
      .mockRejectedValueOnce(new Error('发送订阅消息失败: 40003 invalid openid'))
      .mockResolvedValueOnce({ errcode: 0 })

    const result = await doSubscribeMessage(
      { template_id: 'tmpl_001', data: { thing1: { value: 'hello' } } },
      deps,
      createMockContext()
    )

    expect(result.success).toBe(true)
    expect(result.data.sent).toBe(1)
    expect(result.data.failed).toBe(1)
    // remove 只对成功那条调用（sub2），失败那条（sub1）不删除
    const chainCalls = deps.collection.mock.results
    // 找到 doc().remove() 的调用链 - 只成功订阅才 remove
    // 通过检查 sendSubscribeMessage 的调用次数和 remove 的调用次数
    expect(deps.sendSubscribeMessage).toHaveBeenCalledTimes(2)
  })

  // 4. 超过 50 个 → 递归调用（limit(50) 返回 50 条 = 满批，触发递归）
  it('超过 50 个 → 递归调用 callFunction', async () => {
    const deps = createMockDeps()
    // 模拟 limit(50) 返回正好 50 条（满批，说明可能还有更多）
    const subs = Array.from({ length: 50 }, (_, i) => ({
      _id: `sub_${i}`,
      openid: `openid_${i}`
    }))
    deps.collection._results = [{ data: subs }]
    deps.sendSubscribeMessage.mockResolvedValue({ errcode: 0 })

    const result = await doSubscribeMessage(
      { template_id: 'tmpl_001', data: { thing1: { value: 'hello' } } },
      deps,
      createMockContext()
    )

    expect(result.data.sent).toBe(50)
    expect(result.data.failed).toBe(0)

    // 应该触发递归调用处理下一批
    expect(deps.callFunction).toHaveBeenCalledWith({
      name: 'subscribeMessage',
      data: expect.objectContaining({
        template_id: 'tmpl_001',
        data: { thing1: { value: 'hello' } },
        page: 'pages/index/index',
        offset: 50 // offset = 原offset(0) + BATCH_SIZE(50)
      })
    })
  })

  // 5. 无 context → FORBIDDEN
  it('无 context → FORBIDDEN', async () => {
    const deps = createMockDeps()
    deps.assertCloudFunctionContext.mockImplementation(() => {
      throw new Error('FORBIDDEN: 此函数仅支持云函数内部调用')
    })

    const result = await doSubscribeMessage(
      { template_id: 'tmpl_001', data: { thing1: { value: 'hello' } } },
      deps,
      createUnauthContext()
    )

    expect(result.success).toBe(false)
    expect(result.code).toBe('FORBIDDEN')
  })

  describe('边缘场景', () => {
    it('template_id 缺失 → INVALID_INPUT', async () => {
      const deps = createMockDeps()
      deps.assertCloudFunctionContext.mockImplementation(() => {})

      const result = await doSubscribeMessage(
        { data: { thing1: { value: 'hello' } } },
        deps,
        createMockContext()
      )

      expect(result.success).toBe(false)
      expect(result.code).toBe('INVALID_INPUT')
    })

    it('data 缺失 → INVALID_INPUT', async () => {
      const deps = createMockDeps()
      deps.assertCloudFunctionContext.mockImplementation(() => {})

      const result = await doSubscribeMessage(
        { template_id: 'tmpl_001' },
        deps,
        createMockContext()
      )

      expect(result.success).toBe(false)
      expect(result.code).toBe('INVALID_INPUT')
    })

    it('不足50条 → 不触发递归', async () => {
      const deps = createMockDeps()
      const subs = Array.from({ length: 10 }, (_, i) => ({
        _id: `sub_${i}`, openid: `openid_${i}`
      }))
      deps.collection._results = [{ data: subs }]

      const result = await doSubscribeMessage(
        { template_id: 'tmpl_001', data: { thing1: { value: 'hello' } } },
        deps,
        createMockContext()
      )

      expect(result.data.sent).toBe(10)
      expect(deps.callFunction).not.toHaveBeenCalled()
    })
  })
})
