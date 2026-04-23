import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock wx.cloud.callFunction before importing
const mockCallFunction = vi.fn()
vi.stubGlobal('wx', {
  cloud: {
    callFunction: mockCallFunction
  }
})

import { useCaseDetail } from '@/composables/useCaseDetail'

const MOCK_CASE = {
  id: 'case-001',
  title: '小红书爆款笔记代写',
  summary: '帮助品牌方撰写高质量种草笔记',
  score_total: 92,
  score_feasibility: 19,
  score_profit: 17,
  score_timeliness: 18,
  score_detail: 20,
  score_fitness: 18,
  cost: '零成本',
  source_account: '副业研究所',
  source_url: 'https://example.com',
  suitable_for: ['大学生', '上班族'],
  steps: [
    { title: '注册账号', description: '在小红书平台注册个人账号' },
    { title: '学习爆款模板', description: '分析热门笔记的写作套路' }
  ],
  tools: [{ name: 'ChatGPT', description: 'AI写作辅助' }],
  resources: [{ name: '爆款笔记模板库', url: 'https://example.com/templates' }]
}

describe('useCaseDetail', () => {
  beforeEach(() => {
    mockCallFunction.mockReset()
  })

  it('has correct initial state', () => {
    const { caseData, isLoading, error } = useCaseDetail()
    expect(caseData.value).toBeNull()
    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('fetches detail successfully and extracts data.case', async () => {
    mockCallFunction.mockResolvedValue({
      result: { errCode: 0, data: { case: MOCK_CASE } }
    })

    const { caseData, isLoading, error, fetchDetail } = useCaseDetail()
    await fetchDetail('case-001')

    expect(mockCallFunction).toHaveBeenCalledWith({
      name: 'getCaseDetail',
      data: { case_id: 'case-001' }
    })
    expect(caseData.value).toEqual(MOCK_CASE)
    expect(error.value).toBeNull()
    expect(isLoading.value).toBe(false)
  })

  it('handles errCode !== 0', async () => {
    mockCallFunction.mockResolvedValue({
      result: { errCode: 1001, data: null }
    })

    const { caseData, error, fetchDetail } = useCaseDetail()
    await fetchDetail('case-001')

    expect(caseData.value).toBeNull()
    expect(error.value).toBe('获取案例详情失败')
  })

  it('handles missing data.case in response', async () => {
    mockCallFunction.mockResolvedValue({
      result: { errCode: 0, data: {} }
    })

    const { caseData, error, fetchDetail } = useCaseDetail()
    await fetchDetail('case-001')

    expect(caseData.value).toBeNull()
    expect(error.value).toBe('获取案例详情失败')
  })

  it('handles network exception', async () => {
    mockCallFunction.mockRejectedValue(new Error('Network timeout'))

    const { caseData, error, fetchDetail } = useCaseDetail()
    await fetchDetail('case-001')

    expect(caseData.value).toBeNull()
    expect(error.value).toBe('网络错误，请稍后重试')
  })

  it('sets isLoading correctly during request lifecycle', async () => {
    let resolveFn: (value: any) => void
    const pending = new Promise(resolve => { resolveFn = resolve })
    mockCallFunction.mockReturnValue(pending)

    const { isLoading, fetchDetail } = useCaseDetail()
    const promise = fetchDetail('case-001')

    // Should be loading while promise is pending
    expect(isLoading.value).toBe(true)

    resolveFn!({
      result: { errCode: 0, data: { case: MOCK_CASE } }
    })
    await promise

    // Should be done after promise resolves
    expect(isLoading.value).toBe(false)
  })

  it('resets error on new fetch after previous failure', async () => {
    // First call fails
    mockCallFunction.mockRejectedValueOnce(new Error('fail'))
    const { error, fetchDetail } = useCaseDetail()
    await fetchDetail('case-001')
    expect(error.value).toBe('网络错误，请稍后重试')

    // Second call succeeds
    mockCallFunction.mockResolvedValue({
      result: { errCode: 0, data: { case: MOCK_CASE } }
    })
    await fetchDetail('case-001')
    expect(error.value).toBeNull()
  })
})
