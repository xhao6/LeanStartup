// src/utils/syncFavorites.ts
/**
 * 云端收藏同步工具
 * 在用户登录后调用,将本地收藏与云端合并
 */

import { syncFavorites, refreshFavoriteStatus } from './favorites'
import { getFavorites as apiGetFavorites } from '@/api/modules/user'

/**
 * 从云端下载收藏数据并同步到本地
 * @param limit 限制获取数量,默认100条
 * @throws 网络或 API 错误时向上传播,由调用方决定处理方式
 */
export const downloadCloudFavorites = async (limit: number = 100): Promise<void> => {
  const res = await apiGetFavorites({ limit })

  if (!res.success) {
    throw new Error(`Failed to download favorites: ${res.msg || 'Unknown error'}`)
  }

  if (!res.data || !Array.isArray(res.data)) {
    throw new Error('Invalid API response: expected data array')
  }

  console.log('[Sync] 从云端同步收藏:', res.data.length, '/', limit)

  if (res.data.length >= limit) {
    console.warn('[Sync] 云端收藏数量达到限制,可能存在更多未同步的收藏')
  }

  syncFavorites(res.data)
}

/**
 * 完整同步流程
 */
export const fullSyncFavorites = async (): Promise<void> => {
  try {
    console.log('[Sync] 开始完整同步...')
    await downloadCloudFavorites()
    refreshFavoriteStatus()
    console.log('[Sync] 同步完成')
  } catch (error) {
    console.error('[Sync] 同步失败:', error)
    throw error // Re-throw for caller to handle
  }
}
