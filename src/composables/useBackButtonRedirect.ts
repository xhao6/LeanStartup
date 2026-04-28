/**
 * 返回键拦截跳转到首页 Composable
 * 用于在 TabBar 页面拦截返回键并跳转到首页
 */

import { onBackPress } from '@dcloudio/uni-app'

/**
 * 拦截返回键并跳转到首页
 * @param targetPagePath 目标页面路径（默认首页）
 */
export function useBackButtonRedirect(targetPagePath: string = '/pages/index/index') {
  // 处理返回键事件
  const handleBackPress = (): boolean => {
    // 使用 redirectTo 跳转到首页，替换当前页面栈
    uni.redirectTo({
      url: targetPagePath,
      fail: (err) => {
        console.error('redirectTo 失败:', err)
        // 如果 redirectTo 失败，尝试使用 reLaunch
        uni.reLaunch({
          url: targetPagePath,
          fail: (reLaunchErr) => {
            console.error('reLaunch 也失败:', reLaunchErr)
          },
        })
      },
    })
    // 返回 true 表示阻止默认返回行为
    return true
  }

  // 注册返回键监听
  // onBackPress 是页面级生命周期钩子，会自动清理
  onBackPress(() => {
    return handleBackPress()
  })

  return {
    handleBackPress,
  }
}
