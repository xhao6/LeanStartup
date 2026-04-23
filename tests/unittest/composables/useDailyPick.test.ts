import { describe, it, expect, beforeEach, vi } from 'vitest'

// ─── Mock setup (before imports) ─────────────────────────────────────

// Mock uni storage for useCache
const storage: Record<string, string> = {}
const mockUni = {
  setStorageSync: vi.fn((key: string, value: string) => { storage[key] = value }),
  getStorageSync: vi.fn((key: string) => storage[key] || ''),
  removeStorageSync: vi.fn((key: string) => { delete storage[key] }),
  getStorageInfoSync: vi.fn(() => ({ keys: Object.keys(storage) }))
}

// Mock wx.cloud.callFunction
const mockCallFunction = vi.fn()
const mockWx = {
  cloud: {
    callFunction: mockCallFunction
  }
}

vi.stubGlobal('uni', mockUni)
vi.stubGlobal('wx', mockWx)

// Mock getCurrentDate to return a fixed value
vi.mock('@/utils/format', () => ({
  getCurrentDate: vi.fn(() => '2026-04-23')
}))

// Now import the composable
import { useDailyPick } from '@/composables/useDailyPick'

// ─── Test fixtures ────────────────────────────────────────────────────

const mockCases = [
  {
    id: 'case-1',
    title: '社区团购小程序',
    summary: '利用社区信任关系做团购，零成本启动',
    score_total: 92,
    cost: '零成本',
    source_account: '创业笔记',
    suitable_for: ['宝妈', '社区运营']
  },
  {
    id: 'case-2',
    title: '短视频带货',
    summary: '通过短视频平台带货变现',
    score_total: 88,
    cost: '低门槛',
    source_account: '副业达人',
    suitable_for: ['上班族', '大学生']
  },
  {
    id: 'case-3',
    title: '知识付费课程',
    summary: '将专业知识做成在线课程出售',
    score_total: 85,
    cost: '低门槛',
    source_account: '知识变现',
    suitable_for: ['专业人士']
  }
]

// ─── Tests ────────────────────────────────────────────────────────────

describe('useDailyPick', () => {
  beforeEach(() => {
    Object.keys(storage).forEach(k => delete storage[k])
    vi.clearAllMocks()
  })

  // ─── Initial state ──────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts with empty cases', () => {
      const { cases } = useDailyPick()
      expect(cases.value).toEqual([])
    })

    it('starts with empty date', () => {
      const { date } = useDailyPick()
      expect(date.value).toBe('')
    })

    it('starts with isLoading false', () => {
      const { isLoading } = useDailyPick()
      expect(isLoading.value).toBe(false)
    })

    it('starts with error null', () => {
      const { error } = useDailyPick()
      expect(error.value).toBeNull()
    })
  })

  // ─── fetchDailyPick success ─────────────────────────────────────────

  describe('fetchDailyPick - success', () => {
    it('calls cloud function with correct name', async () => {
      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { date: '2026-04-23', cases: mockCases } }
      })
      const { fetchDailyPick } = useDailyPick()
      await fetchDailyPick('2026-04-23')
      expect(mockCallFunction).toHaveBeenCalledWith({
        name: 'getDailyPick',
        data: { date: '2026-04-23' }
      })
    })

    it('sets cases from response', async () => {
      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { date: '2026-04-23', cases: mockCases } }
      })
      const { fetchDailyPick, cases } = useDailyPick()
      await fetchDailyPick('2026-04-23')
      expect(cases.value).toEqual(mockCases)
    })

    it('sets date from response', async () => {
      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { date: '2026-04-23', cases: mockCases } }
      })
      const { fetchDailyPick, date } = useDailyPick()
      await fetchDailyPick('2026-04-23')
      expect(date.value).toBe('2026-04-23')
    })

    it('sets isLoading to false after completion', async () => {
      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { date: '2026-04-23', cases: mockCases } }
      })
      const { fetchDailyPick, isLoading } = useDailyPick()
      await fetchDailyPick('2026-04-23')
      expect(isLoading.value).toBe(false)
    })

    it('uses current date when no date provided', async () => {
      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { date: '2026-04-23', cases: mockCases } }
      })
      const { fetchDailyPick } = useDailyPick()
      await fetchDailyPick()
      expect(mockCallFunction).toHaveBeenCalledWith({
        name: 'getDailyPick',
        data: { date: '2026-04-23' }
      })
    })

    it('caches the response', async () => {
      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { date: '2026-04-23', cases: mockCases } }
      })
      const { fetchDailyPick } = useDailyPick()
      await fetchDailyPick('2026-04-23')
      // Verify something was written to storage
      const cacheKeys = Object.keys(storage).filter(k => k.includes('daily'))
      expect(cacheKeys.length).toBeGreaterThan(0)
    })
  })

  // ─── fetchDailyPick uses cache ──────────────────────────────────────

  describe('fetchDailyPick - cache hit', () => {
    it('returns cached data without calling cloud function', async () => {
      // Pre-populate cache
      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { date: '2026-04-23', cases: mockCases } }
      })
      const { fetchDailyPick: fetch1, cases: cases1 } = useDailyPick()
      await fetch1('2026-04-23')
      expect(mockCallFunction).toHaveBeenCalledTimes(1)

      // Second call should use cache
      vi.clearAllMocks()
      const { fetchDailyPick: fetch2, cases: cases2 } = useDailyPick()
      await fetch2('2026-04-23')
      expect(mockCallFunction).not.toHaveBeenCalled()
      expect(cases2.value).toEqual(mockCases)
    })
  })

  // ─── fetchDailyPick API error ───────────────────────────────────────

  describe('fetchDailyPick - API error', () => {
    it('sets error when errCode is not 0', async () => {
      mockCallFunction.mockResolvedValue({
        result: { errCode: 1, data: null }
      })
      const { fetchDailyPick, error } = useDailyPick()
      await fetchDailyPick('2026-04-23')
      expect(error.value).toBe('获取数据失败')
    })

    it('sets error when result is null', async () => {
      mockCallFunction.mockResolvedValue({
        result: null
      })
      const { fetchDailyPick, error } = useDailyPick()
      await fetchDailyPick('2026-04-23')
      expect(error.value).toBe('获取数据失败')
    })

    it('sets isLoading to false even on error', async () => {
      mockCallFunction.mockResolvedValue({
        result: { errCode: 1, data: null }
      })
      const { fetchDailyPick, isLoading } = useDailyPick()
      await fetchDailyPick('2026-04-23')
      expect(isLoading.value).toBe(false)
    })
  })

  // ─── fetchDailyPick network exception ───────────────────────────────

  describe('fetchDailyPick - network exception', () => {
    it('sets error message on exception', async () => {
      mockCallFunction.mockRejectedValue(new Error('Network error'))
      const { fetchDailyPick, error } = useDailyPick()
      await fetchDailyPick('2026-04-23')
      expect(error.value).toBe('网络错误，请稀后重试')
    })

    it('sets isLoading to false on exception', async () => {
      mockCallFunction.mockRejectedValue(new Error('Network error'))
      const { fetchDailyPick, isLoading } = useDailyPick()
      await fetchDailyPick('2026-04-23')
      expect(isLoading.value).toBe(false)
    })
  })

  // ─── refresh ────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('clears cache and refetches', async () => {
      // First fetch populates cache
      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { date: '2026-04-23', cases: mockCases } }
      })
      const { fetchDailyPick, refresh } = useDailyPick()
      await fetchDailyPick('2026-04-23')
      expect(mockCallFunction).toHaveBeenCalledTimes(1)

      // Refresh should clear cache and refetch
      const newCases = [mockCases[0]]
      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { date: '2026-04-23', cases: newCases } }
      })
      await refresh()
      expect(mockCallFunction).toHaveBeenCalledTimes(2)
    })

    it('uses stored date for refresh', async () => {
      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { date: '2026-04-22', cases: mockCases } }
      })
      const { fetchDailyPick, refresh } = useDailyPick()
      await fetchDailyPick('2026-04-22')

      vi.clearAllMocks()
      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { date: '2026-04-22', cases: mockCases } }
      })
      await refresh()
      expect(mockCallFunction).toHaveBeenCalledWith({
        name: 'getDailyPick',
        data: { date: '2026-04-22' }
      })
    })
  })
})
