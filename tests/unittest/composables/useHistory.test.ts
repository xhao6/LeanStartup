import { describe, it, expect, beforeEach, vi } from 'vitest'

// ─── Mock setup (before imports) ─────────────────────────────────────

const mockCallFunction = vi.fn()
const mockWx = {
  cloud: {
    callFunction: mockCallFunction
  }
}

vi.stubGlobal('wx', mockWx)

// Now import the composable
import { useHistory } from '@/composables/useHistory'

// ─── Test fixtures ────────────────────────────────────────────────────

const makeRecord = (date: string, caseIds: string[] = ['c1', 'c2', 'c3']) => ({
  id: `dp-${date}`,
  date,
  case_ids: caseIds,
  created_at: date
})

// ─── Tests ────────────────────────────────────────────────────────────

describe('useHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── Initial state ──────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts with empty records', () => {
      const { records } = useHistory()
      expect(records.value).toEqual([])
    })

    it('starts with total 0', () => {
      const { total } = useHistory()
      expect(total.value).toBe(0)
    })

    it('starts with currentPage 1', () => {
      const { currentPage } = useHistory()
      expect(currentPage.value).toBe(1)
    })

    it('starts with isLoading false', () => {
      const { isLoading } = useHistory()
      expect(isLoading.value).toBe(false)
    })

    it('starts with error null', () => {
      const { error } = useHistory()
      expect(error.value).toBeNull()
    })

    it('starts with hasMore false', () => {
      const { hasMore } = useHistory()
      expect(hasMore.value).toBe(false)
    })

    it('starts with empty monthGroups', () => {
      const { monthGroups } = useHistory()
      expect(monthGroups.value).toEqual([])
    })
  })

  // ─── fetchHistory page 1 success ────────────────────────────────────

  describe('fetchHistory - page 1 success', () => {
    const mockList = [
      makeRecord('2026-04-23'),
      makeRecord('2026-04-22'),
      makeRecord('2026-04-21')
    ]

    it('calls cloud function with correct params', async () => {
      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { total: 23, list: mockList, page: 1, pageSize: 20 } }
      })
      const { fetchHistory } = useHistory()
      await fetchHistory(1)
      expect(mockCallFunction).toHaveBeenCalledWith({
        name: 'getDailyPick',
        data: { page: 1, pageSize: 20 }
      })
    })

    it('populates records from response', async () => {
      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { total: 23, list: mockList, page: 1, pageSize: 20 } }
      })
      const { fetchHistory, records } = useHistory()
      await fetchHistory(1)
      expect(records.value).toEqual(mockList)
    })

    it('sets total from response', async () => {
      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { total: 23, list: mockList, page: 1, pageSize: 20 } }
      })
      const { fetchHistory, total } = useHistory()
      await fetchHistory(1)
      expect(total.value).toBe(23)
    })

    it('sets currentPage', async () => {
      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { total: 23, list: mockList, page: 1, pageSize: 20 } }
      })
      const { fetchHistory, currentPage } = useHistory()
      await fetchHistory(1)
      expect(currentPage.value).toBe(1)
    })

    it('sets isLoading to false after completion', async () => {
      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { total: 23, list: mockList, page: 1, pageSize: 20 } }
      })
      const { fetchHistory, isLoading } = useHistory()
      await fetchHistory(1)
      expect(isLoading.value).toBe(false)
    })

    it('computes hasMore correctly', async () => {
      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { total: 23, list: mockList, page: 1, pageSize: 20 } }
      })
      const { fetchHistory, hasMore } = useHistory()
      await fetchHistory(1)
      expect(hasMore.value).toBe(true)
    })
  })

  // ─── fetchHistory default page ──────────────────────────────────────

  describe('fetchHistory - default page', () => {
    it('defaults to page 1 when no argument given', async () => {
      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { total: 0, list: [], page: 1, pageSize: 20 } }
      })
      const { fetchHistory } = useHistory()
      await fetchHistory()
      expect(mockCallFunction).toHaveBeenCalledWith({
        name: 'getDailyPick',
        data: { page: 1, pageSize: 20 }
      })
    })
  })

  // ─── fetchHistory pagination (loadMore) ──────────────────────────────

  describe('fetchHistory - pagination', () => {
    const page1 = Array.from({ length: 20 }, (_, i) =>
      makeRecord(`2026-04-${String(23 - i).padStart(2, '0')}`)
    )
    const page2 = Array.from({ length: 3 }, (_, i) =>
      makeRecord(`2026-04-${String(3 - i).padStart(2, '0')}`)
    )

    it('appends records on page 2', async () => {
      mockCallFunction.mockResolvedValueOnce({
        result: { errCode: 0, data: { total: 23, list: page1, page: 1, pageSize: 20 } }
      })
      mockCallFunction.mockResolvedValueOnce({
        result: { errCode: 0, data: { total: 23, list: page2, page: 2, pageSize: 20 } }
      })

      const { fetchHistory, records } = useHistory()
      await fetchHistory(1)
      expect(records.value.length).toBe(20)

      await fetchHistory(2)
      expect(records.value.length).toBe(23)
      expect(records.value[20]).toEqual(page2[0])
    })

    it('hasMore becomes false on last page', async () => {
      mockCallFunction.mockResolvedValueOnce({
        result: { errCode: 0, data: { total: 23, list: page1, page: 1, pageSize: 20 } }
      })
      mockCallFunction.mockResolvedValueOnce({
        result: { errCode: 0, data: { total: 23, list: page2, page: 2, pageSize: 20 } }
      })

      const { fetchHistory, hasMore } = useHistory()
      await fetchHistory(1)
      expect(hasMore.value).toBe(true)

      await fetchHistory(2)
      expect(hasMore.value).toBe(false)
    })
  })

  // ─── fetchHistory API error ─────────────────────────────────────────

  describe('fetchHistory - API error', () => {
    it('sets error when errCode is not 0', async () => {
      mockCallFunction.mockResolvedValue({
        result: { errCode: 1, data: null }
      })
      const { fetchHistory, error } = useHistory()
      await fetchHistory(1)
      expect(error.value).toBe('获取历史数据失败')
    })

    it('sets error when result is null', async () => {
      mockCallFunction.mockResolvedValue({
        result: null
      })
      const { fetchHistory, error } = useHistory()
      await fetchHistory(1)
      expect(error.value).toBe('获取历史数据失败')
    })

    it('sets isLoading to false on error', async () => {
      mockCallFunction.mockResolvedValue({
        result: { errCode: 1, data: null }
      })
      const { fetchHistory, isLoading } = useHistory()
      await fetchHistory(1)
      expect(isLoading.value).toBe(false)
    })
  })

  // ─── fetchHistory network exception ─────────────────────────────────

  describe('fetchHistory - network exception', () => {
    it('sets error on exception', async () => {
      mockCallFunction.mockRejectedValue(new Error('Network error'))
      const { fetchHistory, error } = useHistory()
      await fetchHistory(1)
      expect(error.value).toBe('网络错误，请稍后重试')
    })

    it('sets isLoading to false on exception', async () => {
      mockCallFunction.mockRejectedValue(new Error('Network error'))
      const { fetchHistory, isLoading } = useHistory()
      await fetchHistory(1)
      expect(isLoading.value).toBe(false)
    })
  })

  // ─── hasMore computed ───────────────────────────────────────────────

  describe('hasMore', () => {
    it('is true when records < total', async () => {
      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { total: 50, list: [makeRecord('2026-04-23')], page: 1, pageSize: 20 } }
      })
      const { fetchHistory, hasMore } = useHistory()
      await fetchHistory(1)
      expect(hasMore.value).toBe(true)
    })

    it('is false when records === total', async () => {
      const list = [makeRecord('2026-04-23'), makeRecord('2026-04-22')]
      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { total: 2, list, page: 1, pageSize: 20 } }
      })
      const { fetchHistory, hasMore } = useHistory()
      await fetchHistory(1)
      expect(hasMore.value).toBe(false)
    })

    it('is false when total is 0', async () => {
      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { total: 0, list: [], page: 1, pageSize: 20 } }
      })
      const { fetchHistory, hasMore } = useHistory()
      await fetchHistory(1)
      expect(hasMore.value).toBe(false)
    })
  })

  // ─── monthGroups computed ───────────────────────────────────────────

  describe('monthGroups', () => {
    it('groups records by month', async () => {
      const list = [
        makeRecord('2026-04-23'),
        makeRecord('2026-04-22'),
        makeRecord('2026-03-15'),
        makeRecord('2026-03-10')
      ]
      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { total: 4, list, page: 1, pageSize: 20 } }
      })
      const { fetchHistory, monthGroups } = useHistory()
      await fetchHistory(1)

      expect(monthGroups.value.length).toBe(2)
      expect(monthGroups.value[0].month).toBe('2026年4月')
      expect(monthGroups.value[0].records.length).toBe(2)
      expect(monthGroups.value[0].count).toBe(2)
      expect(monthGroups.value[1].month).toBe('2026年3月')
      expect(monthGroups.value[1].records.length).toBe(2)
      expect(monthGroups.value[1].count).toBe(2)
    })

    it('returns empty array when no records', () => {
      const { monthGroups } = useHistory()
      expect(monthGroups.value).toEqual([])
    })

    it('handles single month correctly', async () => {
      const list = [makeRecord('2026-04-23'), makeRecord('2026-04-22')]
      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { total: 2, list, page: 1, pageSize: 20 } }
      })
      const { fetchHistory, monthGroups } = useHistory()
      await fetchHistory(1)

      expect(monthGroups.value.length).toBe(1)
      expect(monthGroups.value[0].month).toBe('2026年4月')
      expect(monthGroups.value[0].count).toBe(2)
    })

    it('handles cross-year grouping', async () => {
      const list = [
        makeRecord('2026-01-05'),
        makeRecord('2025-12-25'),
        makeRecord('2025-12-20')
      ]
      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { total: 3, list, page: 1, pageSize: 20 } }
      })
      const { fetchHistory, monthGroups } = useHistory()
      await fetchHistory(1)

      expect(monthGroups.value.length).toBe(2)
      expect(monthGroups.value[0].month).toBe('2026年1月')
      expect(monthGroups.value[1].month).toBe('2025年12月')
    })
  })

  // ─── refresh ────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('resets to page 1', async () => {
      const page1 = Array.from({ length: 20 }, (_, i) =>
        makeRecord(`2026-04-${String(23 - i).padStart(2, '0')}`)
      )
      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { total: 23, list: page1, page: 1, pageSize: 20 } }
      })

      const { fetchHistory, refresh, currentPage, records } = useHistory()
      // Simulate being on page 2
      await fetchHistory(2)
      expect(currentPage.value).toBe(2)

      // Refresh should go back to page 1
      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { total: 25, list: page1, page: 1, pageSize: 20 } }
      })
      await refresh()
      expect(currentPage.value).toBe(1)
      expect(mockCallFunction).toHaveBeenLastCalledWith({
        name: 'getDailyPick',
        data: { page: 1, pageSize: 20 }
      })
    })

    it('replaces records on refresh', async () => {
      const oldRecords = [makeRecord('2026-04-20')]
      const newRecords = [makeRecord('2026-04-23'), makeRecord('2026-04-22')]

      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { total: 1, list: oldRecords, page: 1, pageSize: 20 } }
      })
      const { fetchHistory, refresh, records } = useHistory()
      await fetchHistory(1)
      expect(records.value).toEqual(oldRecords)

      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { total: 2, list: newRecords, page: 1, pageSize: 20 } }
      })
      await refresh()
      expect(records.value).toEqual(newRecords)
      expect(records.value.length).toBe(2)
    })
  })

  // ─── loadMore ───────────────────────────────────────────────────────

  describe('loadMore', () => {
    it('fetches next page when hasMore is true', async () => {
      const page1 = Array.from({ length: 20 }, (_, i) =>
        makeRecord(`2026-04-${String(23 - i).padStart(2, '0')}`)
      )
      const page2 = [makeRecord('2026-04-02')]

      mockCallFunction.mockResolvedValueOnce({
        result: { errCode: 0, data: { total: 21, list: page1, page: 1, pageSize: 20 } }
      })
      mockCallFunction.mockResolvedValueOnce({
        result: { errCode: 0, data: { total: 21, list: page2, page: 2, pageSize: 20 } }
      })

      const { fetchHistory, loadMore, records } = useHistory()
      await fetchHistory(1)
      await loadMore()

      expect(records.value.length).toBe(21)
      expect(mockCallFunction).toHaveBeenCalledTimes(2)
      expect(mockCallFunction).toHaveBeenLastCalledWith({
        name: 'getDailyPick',
        data: { page: 2, pageSize: 20 }
      })
    })

    it('does nothing when hasMore is false', async () => {
      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { total: 1, list: [makeRecord('2026-04-23')], page: 1, pageSize: 20 } }
      })

      const { fetchHistory, loadMore } = useHistory()
      await fetchHistory(1)
      vi.clearAllMocks()

      await loadMore()
      expect(mockCallFunction).not.toHaveBeenCalled()
    })

    it('does nothing when isLoading is true', async () => {
      const page1 = Array.from({ length: 20 }, (_, i) =>
        makeRecord(`2026-04-${String(23 - i).padStart(2, '0')}`)
      )

      // Make the first call slow so isLoading stays true
      let resolveFirst: (v: unknown) => void
      mockCallFunction.mockImplementation(() => new Promise(r => { resolveFirst = r }))

      const { fetchHistory, loadMore } = useHistory()
      const fetchPromise = fetchHistory(1)

      // While loading, loadMore should be a no-op
      await loadMore()
      // Only 1 call (the initial fetchHistory)
      expect(mockCallFunction).toHaveBeenCalledTimes(1)

      // Clean up the pending promise
      resolveFirst!({
        result: { errCode: 0, data: { total: 23, list: page1, page: 1, pageSize: 20 } }
      })
      await fetchPromise
    })
  })
})
