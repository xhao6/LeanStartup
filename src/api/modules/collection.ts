// 收藏 API
import { callFunction } from '../core/cloud'
import type { FavoriteItem } from '@/types/favorites'

export interface CollectionItem extends FavoriteItem {}

// getUserCollections already exists - just ensure the return type is updated
export const getUserCollections = async (params: { page?: number; pageSize?: number } = {}): Promise<{ success: boolean; data?: { total: number; list: CollectionItem[] } }> => {
  return callFunction('getUserCollections', params)
}

// toggleCollection - cloud will return full case data (title, tags, desc, score_total, etc.)
export const toggleCollection = async (params: {
  case_id: string
  action: 'collect' | 'uncollect'
  progress?: Record<string, boolean>
}): Promise<{ success: boolean; data?: CollectionItem }> => {
  return callFunction('toggleCollection', params)
}