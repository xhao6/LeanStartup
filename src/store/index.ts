import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login as apiLogin, getProfile as apiGetProfile, updateProfile as apiUpdateProfile } from '@/api/modules/user'

interface WeChatUserInfo {
  nickName?: string
  avatarUrl?: string
  [key: string]: unknown
}

interface ErrorResponse {
  success: false
  error: string
}

interface SuccessResponse {
  success: true
}

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<{ id: string; name?: string; avatar?: string; level?: number; exp?: number; viewedRankingsCount?: number } | null>(null)
  const isLoggedIn = ref(false)
  const viewedCount = ref(0)
  const favoritesCount = ref(0)

  const setUser = (info: typeof userInfo.value) => { userInfo.value = info; isLoggedIn.value = !!info }
  const incrementViewed = () => viewedCount.value++
  const setFavoritesCount = (n: number) => favoritesCount.value = n
  const logout = () => { userInfo.value = null; isLoggedIn.value = false }

  /**
   * Fetch user profile from cloud and update local state
   */
  const fetchProfile = async () => {
    try {
      const response = await apiGetProfile()
      if (response.success && response.data) {
        const data = response.data
        userInfo.value = {
          id: data._id || data._openid || data.id,
          name: data.name,
          avatar: data.avatar,
          level: data.level,
          exp: data.exp,
          viewedRankingsCount: data.viewedRankingsCount
        }
        isLoggedIn.value = true
      }
      return response
    } catch (error) {
      const message = error instanceof Error ? error.message : '获取资料失败'
      console.error('[fetchProfile] Failed to fetch profile', error)
      return { success: false, error: message } as ErrorResponse
    }
  }

  /**
   * User login with optional WeChat user info
   * Filters out default WeChat avatar and nickname
   */
  const login = async (wechatUserInfo?: WeChatUserInfo) => {
    try {
      // Filter default WeChat avatar/nickname
      let loginData: WeChatUserInfo | undefined = undefined
      if (wechatUserInfo) {
        const { nickName, avatarUrl } = wechatUserInfo
        const isDefaultWeChat = nickName === '微信用户' || nickName === 'WeChat' || (avatarUrl && avatarUrl.includes('wx.qlogo.cn'))

        if (!isDefaultWeChat) {
          loginData = wechatUserInfo
        }
      }

      const response = await apiLogin({ userInfo: loginData })
      if (response.success && response.data) {
        const data = response.data
        userInfo.value = {
          id: data._id || data._openid || data.id,
          name: data.name,
          avatar: data.avatar,
          level: data.level,
          exp: data.exp,
          viewedRankingsCount: data.viewedRankingsCount
        }
        isLoggedIn.value = true
      }
      return response
    } catch (error) {
      const message = error instanceof Error ? error.message : '登录失败'
      console.error('[login] Login failed', error)
      return { success: false, error: message } as ErrorResponse
    }
  }

  /**
   * Update user profile
   */
  const updateUserInfo = async (info: { name?: string; avatar?: string }) => {
    try {
      const response = await apiUpdateProfile(info)
      if (response.success) {
        if (userInfo.value) {
          if (info.name !== undefined) userInfo.value.name = info.name
          if (info.avatar !== undefined) userInfo.value.avatar = info.avatar
        }
        return { success: true }
      }
      return { success: false, error: response.error || '更新失败' }
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新失败'
      console.error('[updateUserInfo] Failed to update profile', error)
      return { success: false, error: message } as ErrorResponse
    }
  }

  return {
    userInfo,
    isLoggedIn,
    viewedCount,
    favoritesCount,
    setUser,
    incrementViewed,
    setFavoritesCount,
    logout,
    fetchProfile,
    login,
    updateUserInfo
  }
})
