/**
 * generateDailyPick API 测试
 * 验证定时生成精选接口行为
 *
 * 注意：此函数幂等，同一天多次调用返回相同结果
 */
const { callFunction } = require('./_helper')

describe('generateDailyPick', () => {
  test('调用成功应返回 date 和 case_ids', async () => {
    const res = await callFunction('generateDailyPick', {})

    expect(res.success).toBe(true)
    expect(res.data).toBeDefined()
    expect(res.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Array.isArray(res.data.case_ids)).toBe(true)
  })

  test('case_ids 应包含 3 个案例 ID', async () => {
    const res = await callFunction('generateDailyPick', {})

    expect(res.data.case_ids.length).toBe(3)
    res.data.case_ids.forEach(id => {
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
    })
  })

  test('幂等性：再次调用应返回 same_ids（不创建重复记录）', async () => {
    const res1 = await callFunction('generateDailyPick', {})

    // 等待一秒避免同一秒内重复调用
    await new Promise(r => setTimeout(r, 1000))

    const res2 = await callFunction('generateDailyPick', {})

    // 同一天多次调用应返回相同结果（幂等）
    expect(res2.data.case_ids).toEqual(res1.data.case_ids)
  })
})
