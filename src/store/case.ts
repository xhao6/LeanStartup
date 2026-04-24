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

  // 今日榜单缓存
  const CACHE_KEY_TODAY = 'today_cases'
  const CACHE_EXPIRE = 5 * 60 * 1000

  // 持久化
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
    // 1. 尝试从缓存加载
    const cached = getCache<DailyCase[]>(CACHE_KEY_TODAY)
    if (cached && cached.length > 0) {
      todayCases.value = cached
      const now = new Date()
      displayDate.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      return
    }

    // 2. 从网络加载
    try {
      todayLoading.value = true
      const res = await getDailyPick()
      if (res.success && res.data) {
        todayCases.value = res.data.cases || []
        displayDate.value = res.data.date || ''
        setCache(CACHE_KEY_TODAY, todayCases.value, CACHE_EXPIRE)
        // 缓存每个 case
        todayCases.value.forEach(c => {
          casesMap.value[c.id] = c
        })
        saveCaseCache()
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
      }
    } finally {
      historyLoading.value = false
    }
  }

  const getCaseById = (id: string): DailyCase | CaseDetail | undefined => {
    return casesMap.value[id]
  }

  const clearTodayCache = () => {
    removeCache(CACHE_KEY_TODAY)
  }

  return {
    todayCases, casesMap, historyList, historyPage, historyPageSize,
    historyTotal, todayLoading, historyLoading, loading, displayDate,
    hasMoreHistory,
    fetchTodayCases, fetchCaseDetail, fetchHistoryList, getCaseById,
    clearTodayCache, clearAllCaseCache
  }
})
