/**
 * getCaseDetail API 测试
 * 验证案例详情接口行为
 */
const { callFunction } = require('./_helper')

describe('getCaseDetail', () => {
  describe('正常查询', () => {
    test('查询存在的案例 ID 应返回完整案例', async () => {
      const res = await callFunction('getCaseDetail', { case_id: '100001' })

      expect(res.success).toBe(true)
      expect(res.data).toBeDefined()
      expect(res.data.case).toBeDefined()
      expect(res.data.case.id).toBe('100001')
    })

    test('返回的案例应包含所有必填字段', async () => {
      const res = await callFunction('getCaseDetail', { case_id: '100001' })
      const c = res.data.case

      // 核心字段
      expect(typeof c.id).toBe('string')
      expect(typeof c.title).toBe('string')
      expect(typeof c.summary).toBe('string')
      expect(typeof c.score_total).toBe('number')
      expect(typeof c.score_feasibility).toBe('number')
      expect(typeof c.score_profit).toBe('number')
      expect(typeof c.score_timeliness).toBe('number')
      expect(typeof c.score_detail).toBe('number')
      expect(typeof c.score_fitness).toBe('number')

      // 评分一致性
      const sum = c.score_feasibility + c.score_profit +
        c.score_timeliness + c.score_detail + c.score_fitness
      expect(c.score_total).toBe(sum)

      // 内容字段
      expect(Array.isArray(c.steps)).toBe(true)
      expect(Array.isArray(c.tools)).toBe(true)
      expect(typeof c.cost).toBe('string')
      expect(typeof c.expected_revenue).toBe('string')
      expect(typeof c.cycle).toBe('string')
      expect(typeof c.suitable_for).toBe('string')
      expect(c.status).toBe('published')
    })
  })

  describe('异常输入', () => {
    test('case_id 缺失应返回 INVALID_INPUT 错误', async () => {
      const res = await callFunction('getCaseDetail', {})

      expect(res.success).toBe(false)
      expect(res.code).toBe('INVALID_INPUT')
      expect(res.error).toContain('case_id')
    })

    test('case_id 为空应返回 INVALID_INPUT 错误', async () => {
      const res = await callFunction('getCaseDetail', { case_id: '' })

      expect(res.success).toBe(false)
      expect(res.code).toBe('INVALID_INPUT')
    })

    test('查询不存在的案例应返回 NOT_FOUND', async () => {
      const res = await callFunction('getCaseDetail', { case_id: '999999' })

      expect(res.success).toBe(false)
      expect(res.code).toBe('NOT_FOUND')
    })
  })
})
