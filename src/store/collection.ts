import { defineStore } from 'pinia'
import { CF, PAGE_SIZE } from '@/utils/constants'

export interface CollectionItem {
  case_id: string
  title: string
  score_total: number
  progress: Record<string, boolean>
  steps_count: number
  completed_count: number
}

interface CollectionState {
  favorites: Record<string, { case_id: string } | undefined>
  collectionList: CollectionItem[]
  total: number
  currentPage: number
  isLoading: boolean
}

export const useCollectionStore = defineStore('collection', {
  state: (): CollectionState => ({
    favorites: {},
    collectionList: [],
    total: 0,
    currentPage: 0,
    isLoading: false
  }),

  getters: {
    isCollected: (state) => (caseId: string): boolean => {
      return !!state.favorites[caseId]
    },

    hasMore: (state): boolean => {
      if (state.total === 0) return false
      return state.collectionList.length < state.total
    }
  },

  actions: {
    /** Remove a case from favorites reactively */
    _removeFavorite(caseId: string) {
      const { [caseId]: _, ...rest } = this.favorites
      this.favorites = rest
    },

    async toggleFavorite(caseId: string, progress?: Record<string, boolean>) {
      const wasCollected = this.isCollected(caseId)
      const action = wasCollected ? 'uncollect' : 'collect'

      // Optimistic update
      if (wasCollected) {
        const backup = { ...this.favorites }
        this._removeFavorite(caseId)
        try {
          await wx.cloud.callFunction({
            name: CF.TOGGLE_COLLECTION,
            data: { case_id: caseId, action }
          })
        } catch (e) {
          // Revert on failure
          this.favorites = backup
          throw e
        }
      } else {
        this.favorites[caseId] = { case_id: caseId }
        try {
          const data: Record<string, any> = { case_id: caseId, action }
          if (progress) data.progress = progress
          await wx.cloud.callFunction({
            name: CF.TOGGLE_COLLECTION,
            data
          })
        } catch (e) {
          // Revert on failure
          this._removeFavorite(caseId)
          throw e
        }
      }
    },

    async fetchCollections(page: number = 1) {
      this.isLoading = true
      try {
        const res = await wx.cloud.callFunction({
          name: CF.GET_USER_COLLECTIONS,
          data: { page, pageSize: PAGE_SIZE }
        }) as any

        if (res.result?.errCode === 0) {
          this.collectionList = res.result.data.list
          this.total = res.result.data.total
          this.currentPage = page

          // Update favorites from fetched list
          for (const item of res.result.data.list) {
            this.favorites[item.case_id] = { case_id: item.case_id }
          }
        }
      } finally {
        this.isLoading = false
      }
    },

    async loadMore() {
      if (!this.hasMore) return
      const nextPage = this.currentPage + 1
      this.isLoading = true
      try {
        const res = await wx.cloud.callFunction({
          name: CF.GET_USER_COLLECTIONS,
          data: { page: nextPage, pageSize: PAGE_SIZE }
        }) as any

        if (res.result?.errCode === 0) {
          this.collectionList = [...this.collectionList, ...res.result.data.list]
          this.total = res.result.data.total
          this.currentPage = nextPage

          for (const item of res.result.data.list) {
            this.favorites[item.case_id] = { case_id: item.case_id }
          }
        }
      } finally {
        this.isLoading = false
      }
    },

    async checkCollected(caseIds: string[]) {
      // Fetch user collections and check which IDs are present
      const res = await wx.cloud.callFunction({
        name: CF.GET_USER_COLLECTIONS,
        data: { page: 1, pageSize: 1000 }
      }) as any

      if (res.result?.errCode === 0) {
        const collectedIds = new Set(res.result.data.list.map((item: CollectionItem) => item.case_id))
        const updated = { ...this.favorites }
        for (const id of caseIds) {
          if (collectedIds.has(id)) {
            updated[id] = { case_id: id }
          } else {
            const { [id]: _, ...rest } = updated
            Object.keys(updated).length = 0 // clear
            Object.assign(updated, rest)
          }
        }
        this.favorites = updated
      }
    }
  }
})
