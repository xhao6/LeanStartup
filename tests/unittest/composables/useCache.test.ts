import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock uni before importing
const storage: Record<string, string> = {}
const mockUni = {
  setStorageSync: vi.fn((key: string, value: string) => { storage[key] = value }),
  getStorageSync: vi.fn((key: string) => storage[key] || ''),
  removeStorageSync: vi.fn((key: string) => { delete storage[key] }),
  getStorageInfoSync: vi.fn(() => ({ keys: Object.keys(storage) }))
}

vi.stubGlobal('uni', mockUni)

// Now import
import { useCache } from '@/composables/useCache'

describe('useCache', () => {
  beforeEach(() => {
    // Clear storage and mocks
    Object.keys(storage).forEach(k => delete storage[k])
    vi.clearAllMocks()
  })

  it('sets and gets cache', () => {
    const { setCache, getCache } = useCache()
    setCache('test', { name: 'hello' }, 60000)
    const result = getCache('test')
    expect(result).toEqual({ name: 'hello' })
  })

  it('returns null for expired cache', () => {
    const { setCache, getCache } = useCache()
    setCache('test', 'data', -1) // already expired
    expect(getCache('test')).toBeNull()
  })

  it('returns null for missing cache', () => {
    const { getCache } = useCache()
    expect(getCache('nonexistent')).toBeNull()
  })

  it('fetchWithCache returns cached data when available', async () => {
    const { setCache, fetchWithCache } = useCache()
    setCache('key', 'cached', 60000)
    const fetcher = vi.fn().mockResolvedValue('fresh')
    const result = await fetchWithCache('key', fetcher, 60000)
    expect(result).toBe('cached')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('fetchWithCache calls fetcher on cache miss', async () => {
    const { fetchWithCache } = useCache()
    const fetcher = vi.fn().mockResolvedValue('fresh')
    const result = await fetchWithCache('key', fetcher, 60000)
    expect(result).toBe('fresh')
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('clearCache removes specific key', () => {
    const { setCache, clearCache, getCache } = useCache()
    setCache('a', '1', 60000)
    setCache('b', '2', 60000)
    clearCache('a')
    expect(getCache('a')).toBeNull()
    expect(getCache('b')).toEqual('2')
  })

  it('clearCache removes all cache when no key', () => {
    const { setCache, clearCache, getCache } = useCache()
    setCache('a', '1', 60000)
    setCache('b', '2', 60000)
    clearCache()
    expect(getCache('a')).toBeNull()
    expect(getCache('b')).toBeNull()
  })

  it('clearExpiredCache removes only expired entries', () => {
    const { setCache, clearExpiredCache, getCache } = useCache()
    setCache('fresh', 'data', 60000)
    setCache('stale', 'data', -1)
    clearExpiredCache()
    expect(getCache('fresh')).toEqual('data')
    expect(getCache('stale')).toBeNull()
  })
})
