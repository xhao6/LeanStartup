/**
 * @deprecated 收藏功能已迁移到 src/utils/favorites.ts
 * 本文件仅保留以防止现有代码引用崩溃
 * 请使用以下方式替代：
 *   import { getFavorites, isFavorited, toggleFavorite } from '@/utils/favorites'
 */
import { getFavorites, isFavorited, toggleFavorite } from '@/utils/favorites'

export const useCollectionStore = () => {
  return {
    collections: getFavorites().map(f => f.id),
    loading: false,
    hasMore: false,
    isCollected: isFavorited,
    toggle: async (caseId: string) => {
      // 尝试从本地获取进度（如果存在）
      const item = getFavorites().find(f => f.id === caseId)
      return toggleFavorite(caseId, {
        title: item?.title || '',
        desc: item?.desc || '',
        tags: item?.tags || [],
        score_total: item?.score_total || 0,
        url: item?.url || '',
        image: item?.image || '',
        progress: item?.progress || {},
        steps_count: item?.steps_count || 0,
        completed_count: item?.completed_count || 0
      })
    },
    getCollection: (id: string) => getFavorites().find(f => f.id === id),
    refresh: () => {},
    loadMore: () => {}
  }
}