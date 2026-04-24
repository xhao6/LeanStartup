// 订阅管理 API（注意：云函数 subscribe/unsubscribe/getSubscriptionStatus 尚未创建，MVP 阶段先用 localStorage 占位）
import { callFunction } from '../core/cloud'

export interface SubscriptionStatus {
  isSubscribed: boolean
  history: { date: string; status: string }[]
}

export const getSubscriptionStatus = async (): Promise<SubscriptionStatus> => {
  // TODO: 云函数未创建前使用 localStorage 模拟
  try {
    const res = await callFunction('getSubscriptionStatus', {})
    if (res.success && res.data) return res.data
  } catch (e) {
    // 云函数不存在
  }
  const cached = uni.getStorageSync('leanstartup_subscription')
  return cached ? JSON.parse(cached) : { isSubscribed: false, history: [] }
}

export const subscribe = async (): Promise<void> => {
  try {
    await callFunction('subscribe', {})
  } catch (e) {
    // 云函数不存在时用 localStorage 模拟
    uni.setStorageSync('leanstartup_subscription', JSON.stringify({ isSubscribed: true, history: [] }))
  }
}

export const unsubscribe = async (): Promise<void> => {
  try {
    await callFunction('unsubscribe', {})
  } catch (e) {
    uni.setStorageSync('leanstartup_subscription', JSON.stringify({ isSubscribed: false, history: [] }))
  }
}
