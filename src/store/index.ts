import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login as apiLogin, getProfile, updateProfile } from '@/api/modules/user'

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<{ id: string; name?: string; avatar?: string } | null>(null)
  const isLoggedIn = ref(false)
  const viewedCount = ref(0)
  const favoritesCount = ref(0)

  const setUser = (info: typeof userInfo.value) => { userInfo.value = info; isLoggedIn.value = !!info }
  const incrementViewed = () => viewedCount.value++
  const setFavoritesCount = (n: number) => favoritesCount.value = n
  const logout = () => { userInfo.value = null; isLoggedIn.value = false }

  const fetchProfile = async () => {
    const res = await getProfile()
    if (res.success && res.data) {
      userInfo.value = res.data
    }
    return res
  }

  const updateUserInfo = async (updates: { name?: string; avatar?: string }) => {
    const res = await updateProfile(updates)
    if (res.success && res.data) {
      userInfo.value = { ...userInfo.value, ...res.data }
    }
    return { success: res.success, message: res.msg }
  }

  const login = async (wechatUserInfo?: any) => {
    const res = await apiLogin({ userInfo: wechatUserInfo })
    if (res.success && res.data) {
      userInfo.value = res.data
      isLoggedIn.value = true
    }
    return res
  }

  return { userInfo, isLoggedIn, viewedCount, favoritesCount, setUser, incrementViewed, setFavoritesCount, logout, fetchProfile, updateUserInfo, login }
})
