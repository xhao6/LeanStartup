import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock wx before importing the store
const mockCallFunction = vi.fn()
vi.stubGlobal('wx', {
  cloud: {
    callFunction: mockCallFunction
  }
})

import { useUserStore } from '@/store/user'
import { CF } from '@/utils/constants'

describe('useUserStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  describe('initial state', () => {
    it('has correct default state', () => {
      const store = useUserStore()
      expect(store.isLoggedIn).toBe(false)
      expect(store.openid).toBe('')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('login', () => {
    it('calls trackEvent cloud function and sets isLoggedIn on success', async () => {
      mockCallFunction.mockResolvedValueOnce({
        result: { errCode: 0, data: { openid: 'test_openid_123' } }
      })

      const store = useUserStore()
      await store.login()

      expect(mockCallFunction).toHaveBeenCalledWith({
        name: CF.TRACK_EVENT,
        data: { event: 'login' }
      })
      expect(store.isLoggedIn).toBe(true)
      expect(store.openid).toBe('test_openid_123')
    })

    it('sets isLoading during login and resets after', async () => {
      let resolveLogin: (value: any) => void
      const loginPromise = new Promise(resolve => { resolveLogin = resolve })

      mockCallFunction.mockReturnValueOnce(loginPromise)

      const store = useUserStore()
      const loginTask = store.login()

      // isLoading should be true while waiting
      expect(store.isLoading).toBe(true)

      resolveLogin!({ result: { errCode: 0, data: { openid: 'openid_456' } } })
      await loginTask

      expect(store.isLoading).toBe(false)
    })

    it('resets isLoading even when cloud function fails', async () => {
      mockCallFunction.mockRejectedValueOnce(new Error('network error'))

      const store = useUserStore()
      await expect(store.login()).rejects.toThrow('network error')

      expect(store.isLoading).toBe(false)
      expect(store.isLoggedIn).toBe(false)
    })

    it('does not set isLoggedIn when errCode is non-zero', async () => {
      mockCallFunction.mockResolvedValueOnce({
        result: { errCode: -1, errMsg: 'something wrong' }
      })

      const store = useUserStore()
      await store.login()

      expect(store.isLoggedIn).toBe(false)
    })

    it('sets openid from cloud function response', async () => {
      mockCallFunction.mockResolvedValueOnce({
        result: { errCode: 0, data: { openid: 'unique_openid_789' } }
      })

      const store = useUserStore()
      await store.login()

      expect(store.openid).toBe('unique_openid_789')
    })
  })

  describe('logout', () => {
    it('resets state to defaults', () => {
      const store = useUserStore()
      // Simulate logged-in state
      store.$patch({ isLoggedIn: true, openid: 'some_openid' })

      store.logout()

      expect(store.isLoggedIn).toBe(false)
      expect(store.openid).toBe('')
    })
  })

  describe('edge cases', () => {
    it('handles missing data field in response gracefully', async () => {
      mockCallFunction.mockResolvedValueOnce({
        result: { errCode: 0 }
      })

      const store = useUserStore()
      await store.login()

      expect(store.isLoggedIn).toBe(true)
      expect(store.openid).toBe('')
    })

    it('login can be called multiple times (re-login)', async () => {
      mockCallFunction.mockResolvedValue({
        result: { errCode: 0, data: { openid: 'openid_relogin' } }
      })

      const store = useUserStore()
      await store.login()
      await store.login()

      expect(store.isLoggedIn).toBe(true)
      expect(mockCallFunction).toHaveBeenCalledTimes(2)
    })
  })
})
