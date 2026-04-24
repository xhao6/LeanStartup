// src/api/modules/subscription.ts
import { callFunction } from '../core/cloud'

export interface SubscribeResponse {
  success: boolean
  message?: string
  alreadySubscribed?: boolean
}

export interface UnsubscribeResponse {
  success: boolean
  message?: string
}

export interface GetStatusResponse {
  success: boolean
  isSubscribed?: boolean
}

/**
 * 用户订阅每日榜单提醒
 */
export const subscribe = async (): Promise<SubscribeResponse> => {
  try {
    const res = await callFunction('subscription', {
      action: 'subscribe',
      template_id: 'POdB9EzzVCyvfHrJSgmG8vnXLkKiiIWPRC35qjv4wH4'
    })

    if (res.success) {
      return {
        success: true,
        message: res.data?.message || '订阅成功',
        alreadySubscribed: res.data?.alreadySubscribed || false
      }
    }

    return { success: false, message: res.error || '订阅失败' }
  } catch (err: any) {
    console.error('[subscribe] error:', err)
    return { success: false, message: err.message || '订阅失败' }
  }
}

/**
 * 取消订阅
 */
export const unsubscribe = async (): Promise<UnsubscribeResponse> => {
  try {
    const res = await callFunction('subscription', {
      action: 'unsubscribe'
    })

    if (res.success) {
      return {
        success: true,
        message: res.data?.message || '已取消订阅'
      }
    }

    return { success: false, message: res.error || '取消失败' }
  } catch (err: any) {
    console.error('[unsubscribe] error:', err)
    return { success: false, message: err.message || '取消失败' }
  }
}

/**
 * 查询订阅状态
 */
export const getSubscriptionStatus = async (): Promise<GetStatusResponse> => {
  try {
    const res = await callFunction('subscription', {
      action: 'getStatus'
    })

    if (res.success) {
      return {
        success: true,
        isSubscribed: res.data?.isSubscribed || false
      }
    }

    return { success: false, isSubscribed: false }
  } catch (err: any) {
    console.error('[getSubscriptionStatus] error:', err)
    return { success: false, isSubscribed: false }
  }
}
