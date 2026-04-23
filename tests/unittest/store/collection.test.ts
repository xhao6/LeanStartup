import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock wx before importing the store
const mockCallFunction = vi.fn()
vi.stubGlobal('wx', {
  cloud: {
    callFunction: mockCallFunction
  }
})

import { useCollectionStore } from '@/store/collection'
import { CF } from '@/utils/constants'
import { PAGE_SIZE } from '@/utils/constants'

describe('useCollectionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  describe('initial state', () => {
    it('has correct default state', () => {
      const store = useCollectionStore()
      expect(store.favorites).toEqual({})
      expect(store.collectionList).toEqual([])
      expect(store.total).toBe(0)
      expect(store.currentPage).toBe(0)
      expect(store.isLoading).toBe(false)
    })
  })

  describe('getters', () => {
    describe('isCollected', () => {
      it('returns false for non-collected case', () => {
        const store = useCollectionStore()
        expect(store.isCollected('100001')).toBe(false)
      })

      it('returns true for collected case', () => {
        const store = useCollectionStore()
        store.$patch({ favorites: { '100001': { case_id: '100001' } } })
        expect(store.isCollected('100001')).toBe(true)
      })
    })

    describe('hasMore', () => {
      it('returns true when there are more pages', () => {
        const store = useCollectionStore()
        store.$patch({ total: 50, currentPage: 1 })
        expect(store.hasMore).toBe(true)
      })

      it('returns false when all loaded', () => {
        const store = useCollectionStore()
        store.$patch({ total: 10, collectionList: Array(10).fill({}), currentPage: 1 })
        expect(store.hasMore).toBe(false)
      })

      it('returns false when total is 0', () => {
        const store = useCollectionStore()
        expect(store.hasMore).toBe(false)
      })
    })
  })

  describe('toggleFavorite', () => {
    it('collects a case that is not in favorites', async () => {
      mockCallFunction.mockResolvedValueOnce({
        result: { errCode: 0, data: { case_id: '100001', action: 'created', progress: {} } }
      })

      const store = useCollectionStore()
      await store.toggleFavorite('100001')

      expect(mockCallFunction).toHaveBeenCalledWith({
        name: CF.TOGGLE_COLLECTION,
        data: { case_id: '100001', action: 'collect' }
      })
      // Optimistic update: favorites should include the case
      expect(store.isCollected('100001')).toBe(true)
    })

    it('uncollects a case that is already in favorites', async () => {
      const store = useCollectionStore()
      // Simulate already collected
      store.$patch({ favorites: { '100001': { case_id: '100001' } } })

      mockCallFunction.mockResolvedValueOnce({
        result: { errCode: 0, data: { case_id: '100001', action: 'uncollected' } }
      })

      await store.toggleFavorite('100001')

      expect(mockCallFunction).toHaveBeenCalledWith({
        name: CF.TOGGLE_COLLECTION,
        data: { case_id: '100001', action: 'uncollect' }
      })
      expect(store.isCollected('100001')).toBe(false)
    })

    it('passes progress when collecting', async () => {
      mockCallFunction.mockResolvedValueOnce({
        result: { errCode: 0, data: { case_id: '100001', action: 'created', progress: { step_1: true } } }
      })

      const store = useCollectionStore()
      await store.toggleFavorite('100001', { step_1: true })

      expect(mockCallFunction).toHaveBeenCalledWith({
        name: CF.TOGGLE_COLLECTION,
        data: { case_id: '100001', action: 'collect', progress: { step_1: true } }
      })
    })

    it('reverts optimistic update on failure', async () => {
      const store = useCollectionStore()
      // Case not collected yet
      expect(store.isCollected('100001')).toBe(false)

      mockCallFunction.mockRejectedValueOnce(new Error('network error'))

      await expect(store.toggleFavorite('100001')).rejects.toThrow('network error')
      // Should revert back to not collected
      expect(store.isCollected('100001')).toBe(false)
    })

    it('reverts optimistic uncollect on failure', async () => {
      const store = useCollectionStore()
      store.$patch({ favorites: { '100001': { case_id: '100001' } } })

      mockCallFunction.mockRejectedValueOnce(new Error('network error'))

      await expect(store.toggleFavorite('100001')).rejects.toThrow('network error')
      // Should revert back to collected
      expect(store.isCollected('100001')).toBe(true)
    })
  })

  describe('fetchCollections', () => {
    const mockCollectionsResponse = {
      total: 25,
      list: [
        { case_id: '100001', title: 'Case 1', score_total: 90, progress: {}, steps_count: 5, completed_count: 0 },
        { case_id: '100002', title: 'Case 2', score_total: 85, progress: { step_1: true }, steps_count: 3, completed_count: 1 }
      ]
    }

    it('fetches first page with default parameters', async () => {
      mockCallFunction.mockResolvedValueOnce({
        result: { errCode: 0, data: mockCollectionsResponse }
      })

      const store = useCollectionStore()
      await store.fetchCollections()

      expect(mockCallFunction).toHaveBeenCalledWith({
        name: CF.GET_USER_COLLECTIONS,
        data: { page: 1, pageSize: PAGE_SIZE }
      })
      expect(store.collectionList).toEqual(mockCollectionsResponse.list)
      expect(store.total).toBe(25)
      expect(store.currentPage).toBe(1)
    })

    it('fetches specific page', async () => {
      mockCallFunction.mockResolvedValueOnce({
        result: { errCode: 0, data: mockCollectionsResponse }
      })

      const store = useCollectionStore()
      await store.fetchCollections(3)

      expect(mockCallFunction).toHaveBeenCalledWith({
        name: CF.GET_USER_COLLECTIONS,
        data: { page: 3, pageSize: PAGE_SIZE }
      })
      expect(store.currentPage).toBe(3)
    })

    it('updates favorites map from fetched list', async () => {
      mockCallFunction.mockResolvedValueOnce({
        result: { errCode: 0, data: mockCollectionsResponse }
      })

      const store = useCollectionStore()
      await store.fetchCollections()

      expect(store.isCollected('100001')).toBe(true)
      expect(store.isCollected('100002')).toBe(true)
    })

    it('sets isLoading during fetch', async () => {
      let resolveFetch: (value: any) => void
      const fetchPromise = new Promise(resolve => { resolveFetch = resolve })

      mockCallFunction.mockReturnValueOnce(fetchPromise)

      const store = useCollectionStore()
      const task = store.fetchCollections()

      expect(store.isLoading).toBe(true)

      resolveFetch!({ result: { errCode: 0, data: mockCollectionsResponse } })
      await task

      expect(store.isLoading).toBe(false)
    })

    it('resets isLoading on error', async () => {
      mockCallFunction.mockRejectedValueOnce(new Error('fail'))

      const store = useCollectionStore()
      await expect(store.fetchCollections()).rejects.toThrow('fail')

      expect(store.isLoading).toBe(false)
    })

    it('replaces collectionList on each fetch (not appends)', async () => {
      mockCallFunction.mockResolvedValueOnce({
        result: { errCode: 0, data: { total: 1, list: [{ case_id: 'old' }] } }
      })

      const store = useCollectionStore()
      await store.fetchCollections()
      expect(store.collectionList).toHaveLength(1)

      mockCallFunction.mockResolvedValueOnce({
        result: { errCode: 0, data: mockCollectionsResponse }
      })

      await store.fetchCollections(2)
      expect(store.collectionList).toEqual(mockCollectionsResponse.list)
      expect(store.collectionList).toHaveLength(2)
    })
  })

  describe('loadMore', () => {
    it('fetches next page and appends to list', async () => {
      // First page
      mockCallFunction.mockResolvedValueOnce({
        result: { errCode: 0, data: { total: 40, list: [
          { case_id: '100001', title: 'Case 1', score_total: 90, progress: {}, steps_count: 5, completed_count: 0 }
        ]}}
      })

      const store = useCollectionStore()
      await store.fetchCollections()
      expect(store.currentPage).toBe(1)
      expect(store.collectionList).toHaveLength(1)

      // Second page
      mockCallFunction.mockResolvedValueOnce({
        result: { errCode: 0, data: { total: 40, list: [
          { case_id: '100002', title: 'Case 2', score_total: 85, progress: {}, steps_count: 3, completed_count: 0 }
        ]}}
      })

      await store.loadMore()
      expect(store.currentPage).toBe(2)
      expect(store.collectionList).toHaveLength(2)
    })

    it('does nothing when hasMore is false', async () => {
      mockCallFunction.mockResolvedValueOnce({
        result: { errCode: 0, data: { total: 1, list: [{ case_id: '100001' }] } }
      })

      const store = useCollectionStore()
      await store.fetchCollections()

      vi.clearAllMocks()
      await store.loadMore()

      expect(mockCallFunction).not.toHaveBeenCalled()
    })
  })

  describe('checkCollected', () => {
    it('updates favorites for given case IDs from server', async () => {
      mockCallFunction.mockResolvedValueOnce({
        result: {
          errCode: 0,
          data: {
            total: 2,
            list: [
              { case_id: '100001', title: 'Case 1', score_total: 90, progress: {}, steps_count: 5, completed_count: 0 },
              { case_id: '100003', title: 'Case 3', score_total: 75, progress: {}, steps_count: 2, completed_count: 0 }
            ]
          }
        }
      })

      const store = useCollectionStore()
      await store.checkCollected(['100001', '100002', '100003'])

      expect(store.isCollected('100001')).toBe(true)
      expect(store.isCollected('100002')).toBe(false)
      expect(store.isCollected('100003')).toBe(true)
    })
  })
})
