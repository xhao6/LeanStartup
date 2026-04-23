import { defineStore } from 'pinia'
import { CF } from '@/utils/constants'

interface SubscriptionState {
  isSubscribed: boolean
  loading: boolean
  lastCheckTime: number
}

export const useSubscriptionStore = defineStore('subscription', {
  state: (): SubscriptionState => ({
    isSubscribed: false,
    loading: false,
    lastCheckTime: 0
  }),

  actions: {
    async checkStatus(options?: { force?: boolean }) {
      const { force = false } = options || {}
      // Cache for 5 minutes
      if (!force && this.lastCheckTime && Date.now() - this.lastCheckTime < 5 * 60 * 1000) {
        return
      }

      this.loading = true
      try {
        const res = await wx.cloud.callFunction({
          name: CF.SUBSCRIBE_MESSAGE,
          data: { action: 'getStatus' }
        }) as any
        if (res.result?.errCode === 0) {
          this.isSubscribed = res.result.data?.isSubscribed ?? false
          this.lastCheckTime = Date.now()
        }
      } catch {
        // Silent fail
      } finally {
        this.loading = false
      }
    },

    async subscribe() {
      this.loading = true
      try {
        const res = await wx.cloud.callFunction({
          name: CF.SUBSCRIBE_MESSAGE,
          data: { action: 'subscribe' }
        }) as any
        if (res.result?.errCode === 0) {
          this.isSubscribed = true
          this.lastCheckTime = Date.now()
          return { success: true, message: '订阅成功' }
        }
        return { success: false, message: '订阅失败' }
      } catch {
        return { success: false, message: '网络错误' }
      } finally {
        this.loading = false
      }
    },

    async unsubscribe() {
      this.loading = true
      try {
        const res = await wx.cloud.callFunction({
          name: CF.SUBSCRIBE_MESSAGE,
          data: { action: 'unsubscribe' }
        }) as any
        if (res.result?.errCode === 0) {
          this.isSubscribed = false
          this.lastCheckTime = Date.now()
          return { success: true, message: '已取消订阅' }
        }
        return { success: false, message: '取消失败' }
      } catch {
        return { success: false, message: '网络错误' }
      } finally {
        this.loading = false
      }
    }
  }
})
