import { ref, computed } from 'vue'
import { useUserStore } from '@/store'

export function useLogin() {
  const userStore = useUserStore()
  const isLoggedIn = computed(() => userStore.isLoggedIn)
  const isLoading = ref(false)

  const ensureLoggedIn = async (): Promise<boolean> => {
    if (isLoggedIn.value) return true
    return new Promise((resolve) => {
      uni.showModal({
        title: '需要登录',
        content: '请先登录以使用此功能',
        confirmText: '去登录',
        cancelText: '取消',
        success: async (res) => {
          if (res.confirm) {
            isLoading.value = true
            try {
              await userStore.login()
              resolve(true)
            } catch {
              uni.showToast({ title: '登录失败', icon: 'none' })
              resolve(false)
            } finally {
              isLoading.value = false
            }
          } else {
            resolve(false)
          }
        }
      })
    })
  }

  const loginAndDo = async (callback: () => void | Promise<void>): Promise<boolean> => {
    const loggedIn = await ensureLoggedIn()
    if (loggedIn) {
      await callback()
      return true
    }
    return false
  }

  return { isLoggedIn, isLoading, ensureLoggedIn, loginAndDo }
}
