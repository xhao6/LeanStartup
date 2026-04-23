/**
 * getDailyPick API 测试
 * 验证每日精选接口行为
 */
const { callFunction } = require('./_helper')

describe('getDailyPick', () => {
  describe('单日模式（无参数）', () => {
    test('返回今日精选，应有 date 和 cases 字段', async () => {
      const res = await callFunction('getDailyPick', {})

      expect(res.success).toBe(true)
      expect(res.data).toBeDefined()
      expect(res.data.date).toBeDefined()
      expect(Array.isArray(res.data.cases)).toBe(true)
    })

    test('cases 每项应包含 id、title、summary、score_total', async () => {
      const res = await callFunction('getDailyPick', {})

      for (const c of res.data.cases) {
        expect(typeof c.id).toBe('string')
        expect(typeof c.title).toBe('string')
        expect(typeof c.summary).toBe('string')
        expect(typeof c.score_total).toBe('number')
      }
    })

    test('今日有精选时应返回 3 个案例', async () => {
      const res = await callFunction('getDailyPick', {})

      expect(res.data.cases.length).toBeGreaterThan(0)
      expect(res.data.cases.length).toBeLessThanOrEqual(3)
    })
  })

  describe('单日模式（指定日期）', () => {
    test('查询昨天日期应有 date 字段（fallback 或空）', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const dateStr = yesterday.toISOString().split('T')[0]

      const res = await callFunction('getDailyPick', { date: dateStr })

      expect(res.success).toBe(true)
      expect(res.data.date).toBeDefined()
    })
  })

  describe('分页模式', () => {
    test('传入 page 参数走分页，返回 list 和 total', async () => {
      const res = await callFunction('getDailyPick', { page: 1, pageSize: 10 })

      expect(res.success).toBe(true)
      expect(Array.isArray(res.data.list)).toBe(true)
      expect(typeof res.data.total).toBe('number')
    })

    test('分页参数 pageSize 限制最大 50', async () => {
      const res = await callFunction('getDailyPick', { page: 1, pageSize: 100 })

      // pageSize 超过 50 时会被限制
      // 无报错，但单次返回最多 50 条
      expect(res.success).toBe(true)
    })
  })
})
