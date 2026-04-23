import { ref, computed } from 'vue'
import { CF, PAGE_SIZE } from '@/utils/constants'

export interface DailyPickRecord {
  id: string
  date: string
  case_ids: string[]
  created_at?: string
}

export interface MonthGroup {
  month: string // "2026年4月"
  records: DailyPickRecord[]
  count: number
}

export function useHistory() {
  const records = ref<DailyPickRecord[]>([])
  const total = ref(0)
  const currentPage = ref(1)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const hasMore = computed(() => records.value.length < total.value)

  const monthGroups = computed<MonthGroup[]>(() => {
    const groups: Record<string, DailyPickRecord[]> = {}
    for (const record of records.value) {
      const d = new Date(record.date)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!groups[key]) groups[key] = []
      groups[key].push(record)
    }
    return Object.entries(groups).map(([, recs]) => {
      const d = new Date(recs[0].date)
      return {
        month: `${d.getFullYear()}年${d.getMonth() + 1}月`,
        records: recs,
        count: recs.length
      }
    })
  })

  const fetchHistory = async (page = 1) => {
    isLoading.value = true
    error.value = null
    try {
      const res = await wx.cloud.callFunction({
        name: CF.GET_DAILY_PICK,
        data: { page, pageSize: PAGE_SIZE }
      })
      if (res.result?.errCode === 0 && res.result?.data) {
        const data = res.result.data as {
          total: number
          list: DailyPickRecord[]
          page: number
          pageSize: number
        }
        total.value = data.total || 0
        if (page === 1) {
          records.value = data.list || []
        } else {
          records.value = [...records.value, ...(data.list || [])]
        }
        currentPage.value = page
      } else {
        error.value = '获取历史数据失败'
      }
    } catch {
      error.value = '网络错误，请稍后重试'
    } finally {
      isLoading.value = false
    }
  }

  const loadMore = () => {
    if (hasMore.value && !isLoading.value) {
      return fetchHistory(currentPage.value + 1)
    }
  }

  const refresh = () => fetchHistory(1)

  return {
    records,
    total,
    currentPage,
    isLoading,
    error,
    hasMore,
    monthGroups,
    fetchHistory,
    loadMore,
    refresh
  }
}
