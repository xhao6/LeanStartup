// 收藏 API
import { callFunction } from '../core/cloud'

export interface CollectionItem {
  case_id: string
  title: string
  score_total: number
  progress: Record<string, boolean>
  steps_count: number
  completed_count: number
}

export const getUserCollections = async (params: { page?: number; pageSize?: number } = {}): Promise<{ success: boolean; data?: { total: number; list: CollectionItem[] } }> => {
  return callFunction('getUserCollections', params)
}

export const toggleCollection = async (params: {
  case_id: string
  action: 'collect' | 'uncollect'
  progress?: Record<string, boolean>
}): Promise<{ success: boolean; data?: { action: 'created' | 'updated' | 'uncollected'; progress?: Record<string, boolean> } }> => {
  return callFunction('toggleCollection', params)
}
