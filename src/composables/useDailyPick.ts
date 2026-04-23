import { ref } from 'vue'
import { CF, CACHE_TTL } from '@/utils/constants'
import { useCache } from '@/composables/useCache'
import { getCurrentDate } from '@/utils/format'

export interface DailyCase {
  id: string
  title: string
  summary: string
  score_total: number
  cost: string
  source_account: string
  suitable_for: string | string[]
}

export interface DailyPickData {
  date: string
  cases: DailyCase[]
}

export function useDailyPick() {
  const cases = ref<DailyCase[]>([])
  const date = ref('')
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const cache = useCache()

  const fetchDailyPick = async (targetDate?: string) => {
    isLoading.value = true
    error.value = null

    const queryDate = targetDate || getCurrentDate()
    const cacheKey = `daily_${queryDate}`

    // Check cache first
    const cached = cache.getCache<DailyPickData>(cacheKey)
    if (cached) {
      cases.value = cached.cases
      date.value = cached.date
      isLoading.value = false
      return
    }

    try {
      const res = await wx.cloud.callFunction({
        name: CF.GET_DAILY_PICK,
        data: { date: queryDate }
      })

      if (res.result?.errCode === 0 && res.result?.data) {
        const data = res.result.data as DailyPickData
        cases.value = data.cases || []
        date.value = data.date || queryDate
        // Cache for 1 hour
        cache.setCache(cacheKey, data, CACHE_TTL.HOUR)
      } else {
        error.value = '获取数据失败'
      }
    } catch {
      error.value = '网络错误，请稍后重试'
    } finally {
      isLoading.value = false
    }
  }

  const refresh = () => {
    const queryDate = date.value || getCurrentDate()
    const cacheKey = `daily_${queryDate}`
    cache.clearCache(cacheKey)
    return fetchDailyPick(queryDate)
  }

  return { cases, date, isLoading, error, fetchDailyPick, refresh }
}
