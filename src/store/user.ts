import { defineStore } from 'pinia'
import { CF } from '@/utils/constants'

interface UserState {
  isLoggedIn: boolean
  openid: string
  isLoading: boolean
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    isLoggedIn: false,
    openid: '',
    isLoading: false
  }),

  actions: {
    async login() {
      this.isLoading = true
      try {
        const res = await wx.cloud.callFunction({
          name: CF.TRACK_EVENT,
          data: { event: 'login' }
        }) as any

        if (res.result?.errCode === 0) {
          this.isLoggedIn = true
          this.openid = res.result.data?.openid ?? ''
        }
      } finally {
        this.isLoading = false
      }
    },

    logout() {
      this.isLoggedIn = false
      this.openid = ''
    }
  }
})
