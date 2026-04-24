// src/store/subscription.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { subscribe, unsubscribe, getSubscriptionStatus } from '@/api/modules/subscription'
import { getCache, setCache, removeCache } from '@/utils/cache'

const CACHE_KEY = 'subscription_status'
const CACHE_TTL = 5 * 60 * 1000
const DEBOUNCE_DELAY = 1000

export const useSubscriptionStore = defineStore('subscription', () => {
  const isSubscribed = ref(false)
  const loading = ref(false)
  const lastCheckTime = ref(0)
  const lastActionTime = ref(0)

  const shouldRefreshCache = computed(() => Date.now() - lastCheckTime.value > CACHE_TTL)
  const canPerformAction = computed(() => Date.now() - lastActionTime.value > DEBOUNCE_DELAY)

  const checkStatus = async (options?: { force?: boolean }) => {
    const { force = false } = options || {}
    if (!force && !shouldRefreshCache.value) {
      return
    }
    try {
      loading.value = true
      const status = await getSubscriptionStatus()
      isSubscribed.value = status.isSubscribed
      lastCheckTime.value = Date.now()
      setCache(CACHE_KEY, { isSubscribed: status.isSubscribed, lastCheckTime: lastCheckTime.value }, CACHE_TTL)
    } finally {
      loading.value = false
    }
  }

  const doSubscribe = async () => {
    if (!canPerformAction.value) return
    try {
      loading.value = true
      lastActionTime.value = Date.now()
      await subscribe()
      isSubscribed.value = true
      lastCheckTime.value = Date.now()
      setCache(CACHE_KEY, { isSubscribed: true, lastCheckTime: lastCheckTime.value }, CACHE_TTL)
    } finally {
      loading.value = false
    }
  }

  const doUnsubscribe = async () => {
    if (!canPerformAction.value) return
    try {
      loading.value = true
      lastActionTime.value = Date.now()
      await unsubscribe()
      isSubscribed.value = false
      lastCheckTime.value = Date.now()
      setCache(CACHE_KEY, { isSubscribed: false, lastCheckTime: lastCheckTime.value }, CACHE_TTL)
    } finally {
      loading.value = false
    }
  }

  const initStatus = async () => {
    const cached = getCache<{ isSubscribed: boolean; lastCheckTime: number }>(CACHE_KEY)
    if (cached) {
      isSubscribed.value = cached.isSubscribed
      lastCheckTime.value = cached.lastCheckTime
      // 后台刷新，不阻塞
      checkStatus().catch(() => {})
      return
    }
    await checkStatus()
  }

  return {
    isSubscribed, loading, lastCheckTime, lastActionTime,
    shouldRefreshCache, canPerformAction,
    checkStatus, doSubscribe, doUnsubscribe, initStatus
  }
})
