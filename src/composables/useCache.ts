// 缓存逻辑（TTL prefix: leanstartup_）
import { CACHE_KEYS, CACHE_TTL } from '@/utils/constants'

const PREFIX = 'leanstartup_'

interface CacheEntry<T> { value: T; expire: number | null }

export const getCache = <T = any>(key: string): T | null => {
  try {
    const raw = uni.getStorageSync(PREFIX + key)
    if (!raw) return null
    const entry: CacheEntry<T> = JSON.parse(raw)
    if (entry.expire && Date.now() > entry.expire) {
      uni.removeStorageSync(PREFIX + key)
      return null
    }
    return entry.value
  } catch { return null }
}

export const setCache = <T = any>(key: string, value: T, expireMs?: number): void => {
  try {
    uni.setStorageSync(PREFIX + key, JSON.stringify({ value, expire: expireMs ? Date.now() + expireMs : null }))
  } catch {}
}

export const removeCache = (key: string): void => {
  try { uni.removeStorageSync(PREFIX + key) } catch {}
}

export const useCache = () => ({
  get: getCache,
  set: setCache,
  remove: removeCache,
})
