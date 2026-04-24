import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<{ id: string; name?: string; avatar?: string } | null>(null)
  const isLoggedIn = ref(false)
  const viewedCount = ref(0)
  const favoritesCount = ref(0)

  const setUser = (info: typeof userInfo.value) => { userInfo.value = info; isLoggedIn.value = !!info }
  const incrementViewed = () => viewedCount.value++
  const setFavoritesCount = (n: number) => favoritesCount.value = n
  const logout = () => { userInfo.value = null; isLoggedIn.value = false }

  return { userInfo, isLoggedIn, viewedCount, favoritesCount, setUser, incrementViewed, setFavoritesCount, logout }
})
