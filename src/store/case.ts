// src/store/case.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getDailyPick, getHistoryPicks } from '@/api/modules/daily'
import { getCaseDetail } from '@/api/modules/case'
import type { DailyCase, HistoryItem } from '@/api/modules/daily'
import type { CaseDetail } from '@/api/modules/case'
import { getCache, setCache, removeCache } from '@/utils/cache'

const CASE_CACHE_KEY = 'cases_cache'
const CASE_CACHE_TTL = 30 * 60 * 1000 // 30分钟

export const useCaseStore = defineStore('case', () => {
  // State
  const todayCases = ref<DailyCase[]>([])
  const casesMap = ref<Record<string, DailyCase | CaseDetail>>({})
  const historyList = ref<HistoryItem[]>([])
  const historyPage = ref(1)
  const historyPageSize = ref(10)
  const historyTotal = ref(0)
  const todayLoading = ref(false)
  const historyLoading = ref(false)
  const displayDate = ref('')

  // 今日榜单缓存（按北京日期分区，解决跨时区缓存错乱）
  // 注意：微信小程序不支持 Intl.DateTimeFormat，用 UTC 偏移量代替
  const getBeijingDate = (date?: Date) => {
    const d = date || new Date()
    const utc = d.getTime() + d.getTimezoneOffset() * 60000
    const beijing = new Date(utc + 8 * 3600000)
    const y = beijing.getFullYear()
    const m = String(beijing.getMonth() + 1).padStart(2, '0')
    const day = String(beijing.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  const getBeijingToday = () => getBeijingDate()
  const getBeijingYesterday = () => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return getBeijingDate(d)
  }
  const CACHE_KEY_TODAY = () => `today_cases_${getBeijingToday()}`
  const CACHE_EXPIRE = 5 * 60 * 1000
  const initCaseCache = () => {
    const cached = getCache<Record<string, DailyCase>>(CASE_CACHE_KEY)
    if (cached) casesMap.value = cached
  }

  const saveCaseCache = () => {
    setCache(CASE_CACHE_KEY, casesMap.value, CASE_CACHE_TTL)
  }

  const clearAllCaseCache = () => {
    removeCache(CASE_CACHE_KEY)
    casesMap.value = {}
  }

  initCaseCache()

  // Getters
  const hasMoreHistory = computed(() => {
    return historyList.value.length < historyTotal.value
  })

  const loading = computed(() => todayLoading.value || historyLoading.value)

  // Actions
  const fetchTodayCases = async () => {
    // 1. 尝试从缓存加载（按北京日期分区）
    const cached = getCache<DailyCase[]>(CACHE_KEY_TODAY())
    if (cached && cached.length > 0) {
      todayCases.value = cached
      const now = new Date()
      displayDate.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      return
    }

    // 2. 从网络加载（含重试和兜底）
    try {
      todayLoading.value = true
      const res = await getDailyPick()
      if (res.success && res.data) {
        todayCases.value = res.data.cases || []

        // 空数据兜底：尝试昨天的数据
        if (todayCases.value.length === 0) {
          const yesterday = getBeijingYesterday()
          const fallbackRes = await getDailyPick(yesterday)
          if (fallbackRes.success && fallbackRes.data?.cases?.length) {
            todayCases.value = fallbackRes.data.cases
            displayDate.value = fallbackRes.data.date || ''
          } else {
            displayDate.value = res.data.date || ''
          }
        } else {
          displayDate.value = res.data.date || ''
        }

        setCache(CACHE_KEY_TODAY(), todayCases.value, CACHE_EXPIRE)
        todayCases.value.forEach(c => { casesMap.value[c.id] = c })
        saveCaseCache()
      } else if (!todayCases.value.length) {
        // 首次加载失败，延迟重试一次
        console.warn('[fetchTodayCases] 首次加载失败，2秒后重试')
        setTimeout(async () => {
          try {
            const retryRes = await getDailyPick()
            if (retryRes.success && retryRes.data?.cases?.length) {
              todayCases.value = retryRes.data.cases
              displayDate.value = retryRes.data.date || ''
              setCache(CACHE_KEY_TODAY(), todayCases.value, CACHE_EXPIRE)
            } else {
              // 重试仍无数据，尝试昨天的数据
              const yesterday = getBeijingYesterday()
              const fallbackRes = await getDailyPick(yesterday)
              if (fallbackRes.success && fallbackRes.data?.cases?.length) {
                todayCases.value = fallbackRes.data.cases
                displayDate.value = fallbackRes.data.date || ''
                setCache(CACHE_KEY_TODAY(), todayCases.value, CACHE_EXPIRE)
              }
            }
          } catch (e) {
            console.error('[fetchTodayCases] 重试失败:', e)
          }
        }, 2000)
      }
    } finally {
      todayLoading.value = false
    }
  }

  const fetchCaseDetail = async (caseId: string) => {
    if (casesMap.value[caseId]) return casesMap.value[caseId]
    try {
      const res = await getCaseDetail(caseId)
      if (res.success && res.data) {
        casesMap.value[caseId] = res.data
        saveCaseCache()
        return res.data
      }
    } catch (err) {
      console.error(`Failed to fetch case detail: ${caseId}`, err)
    }
    return null
  }

  const fetchHistoryList = async (options?: { page?: number; pageSize?: number }) => {
    try {
      historyLoading.value = true
      const page = options?.page ?? historyPage.value
      const pageSize = options?.pageSize ?? historyPageSize.value

      const res = await getHistoryPicks({ page, pageSize })
      if (res.success && res.data) {
        if (page === 1) {
          historyList.value = res.data.list
        } else {
          historyList.value = [...historyList.value, ...res.data.list]
        }
        historyPage.value = res.data.page || page
        historyPageSize.value = res.data.pageSize || pageSize
        historyTotal.value = res.data.total || 0

        // 加载历史案例详情到 casesMap
        const newCaseIds = new Set<string>()
        for (const item of res.data.list) {
          for (const caseId of item.case_ids || []) {
            // 只加载尚未缓存的案例
            if (!casesMap.value[caseId]) {
              newCaseIds.add(caseId)
            }
          }
        }

        // 批量加载案例详情（并发，但控制并发数）
        if (newCaseIds.size > 0) {
          const caseIds = Array.from(newCaseIds)
          // 分批加载，每批3个，避免过快请求
          for (let i = 0; i < caseIds.length; i += 3) {
            const batch = caseIds.slice(i, i + 3)
            await Promise.all(
              batch.map(async (caseId) => {
                try {
                  const caseRes = await getCaseDetail(caseId)
                  if (caseRes.success && caseRes.data) {
                    casesMap.value[caseId] = caseRes.data
                  }
                } catch (err) {
                  console.warn(`Failed to fetch case ${caseId}:`, err)
                }
              })
            )
          }
          saveCaseCache()
        }
      }
    } finally {
      historyLoading.value = false
    }
  }

  const getCaseById = (id: string): DailyCase | CaseDetail | undefined => {
    return casesMap.value[id]
  }

  const clearTodayCache = () => {
    removeCache(CACHE_KEY_TODAY())
  }

  return {
    todayCases, casesMap, historyList, historyPage, historyPageSize,
    historyTotal, todayLoading, historyLoading, loading, displayDate,
    hasMoreHistory,
    fetchTodayCases, fetchCaseDetail, fetchHistoryList, getCaseById,
    clearTodayCache, clearAllCaseCache
  }
})
