// 静默登录
// 注意：微信小程序天然免登录，openid 由云函数通过 context 自动获取，无需前端显式登录
// 此 composable 仅用于需要获取用户 openid 的场景（openid 通过各云函数的 context.openid 参数自动注入）
import { useUserStore } from '@/store'
import { callFunction } from '@/api/core/cloud'

export const useLogin = () => {
  const userStore = useUserStore()

  // 微信小程序场景：openid 在云函数 context 中自动获取，无需前端发起登录
  // 如需在本地缓存用户标识，可调用任意云函数（云函数会自动注入 openid）
  const silentLogin = async (): Promise<boolean> => {
    try {
      // 尝试调用一个带 openid 的云函数来验证连通性
      const res = await callFunction('getUserCollections', { page: 1, pageSize: 1 })
      if (res.success) {
        userStore.setUser({ id: 'wechat_user' })
        return true
      }
    } catch {}
    return false
  }

  return { silentLogin }
}
