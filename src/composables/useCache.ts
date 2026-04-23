import { CACHE_PREFIX, CACHE_TTL } from '@/utils/constants'

interface CacheEntry<T> {
  data: T
  expiry: number
}

export function useCache() {
  const fullKey = (key: string) => `${CACHE_PREFIX}${key}`

  function setCache<T>(key: string, data: T, ttl: number = CACHE_TTL.HOUR): void {
    const entry: CacheEntry<T> = {
      data,
      expiry: Date.now() + ttl
    }
    uni.setStorageSync(fullKey(key), JSON.stringify(entry))
  }

  function getCache<T>(key: string): T | null {
    const raw = uni.getStorageSync(fullKey(key))
    if (!raw) return null
    try {
      const entry: CacheEntry<T> = JSON.parse(raw)
      if (Date.now() > entry.expiry) {
        uni.removeStorageSync(fullKey(key))
        return null
      }
      return entry.data
    } catch {
      return null
    }
  }

  async function fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = CACHE_TTL.HOUR
  ): Promise<T> {
    const cached = getCache<T>(key)
    if (cached !== null) return cached

    const data = await fetcher()
    setCache(key, data, ttl)
    return data
  }

  function clearCache(key?: string): void {
    if (key) {
      uni.removeStorageSync(fullKey(key))
      return
    }
    const info = uni.getStorageInfoSync()
    for (const k of info.keys) {
      if (k.startsWith(CACHE_PREFIX)) {
        uni.removeStorageSync(k)
      }
    }
  }

  function clearExpiredCache(): void {
    const info = uni.getStorageInfoSync()
    for (const k of info.keys) {
      if (!k.startsWith(CACHE_PREFIX)) continue
      const raw = uni.getStorageSync(k)
      if (!raw) continue
      try {
        const entry: CacheEntry<unknown> = JSON.parse(raw)
        if (Date.now() > entry.expiry) {
          uni.removeStorageSync(k)
        }
      } catch {
        // Malformed entry, remove it
        uni.removeStorageSync(k)
      }
    }
  }

  return { setCache, getCache, fetchWithCache, clearCache, clearExpiredCache }
}
