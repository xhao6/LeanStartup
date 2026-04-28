/**
 * 用户相关 API 模块
 * 提供用户登录、资料管理、收藏和排行榜功能
 */

import { callFunction } from '../core/cloud'

/**
 * 用户登录
 * @param data.loginData - 用户信息（可选）
 * @returns 登录结果
 */
export const login = async (data?: { userInfo?: Record<string, any> }) => {
  try {
    return await callFunction('userFunctions', {
      type: 'login',
      data
    })
  } catch (error: any) {
    console.error('[login] 登录失败', error)
    return { success: false, error: error.message || '登录失败' }
  }
}

/**
 * 获取用户资料
 * @returns 用户资料信息
 */
export const getProfile = async () => {
  return await callFunction('userFunctions', {
    type: 'getProfile'
  })
}

/**
 * 更新用户资料
 * @param data.name - 用户名（可选）
 * @param data.avatar - 头像 URL（可选）
 * @returns 更新结果
 */
export const updateProfile = async (data: { name?: string; avatar?: string }) => {
  return await callFunction('userFunctions', {
    type: 'updateProfile',
    data
  })
}

/**
 * 获取用户收藏列表
 * @param params.limit - 返回数量限制（可选）
 * @returns 收藏列表
 */
export const getFavorites = async (params?: { limit?: number }) => {
  return await callFunction('userFunctions', {
    type: 'getFavorites',
    data: params
  })
}

/**
 * 查看排行榜
 * @param date - 日期字符串（如 "2026-04-28"）
 * @returns 排行榜数据
 */
export const viewRanking = async (date: string) => {
  return await callFunction('userFunctions', {
    type: 'viewRanking',
    data: { date }
  })
}
