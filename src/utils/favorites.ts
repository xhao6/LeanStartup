// src/utils/favorites.ts
import type { FavoriteItem } from '@/types/favorites'

const STORAGE_KEY = 'favorites'

// 获取收藏列表
export const getFavorites = (): FavoriteItem[] => {
  try {
    const data = uni.getStorageSync(STORAGE_KEY)
    if (data && Array.isArray(data)) return data as FavoriteItem[]
  } catch (e) {
    console.error('[favorites] 获取失败:', e)
  }
  return []
}

// 保存收藏列表
const saveFavorites = (favorites: FavoriteItem[]): void => {
  try {
    uni.setStorageSync(STORAGE_KEY, favorites)
  } catch (e) {
    console.error('[favorites] 保存失败:', e)
  }
}

// 添加收藏
export const addFavorite = (item: FavoriteItem): boolean => {
  const favorites = getFavorites()
  if (favorites.some(f => f.id === item.id)) return false
  favorites.unshift({ ...item, addedAt: Date.now(), lastModifiedAt: Date.now() })
  saveFavorites(favorites)
  return true
}

// 移除收藏
export const removeFavorite = (id: string): boolean => {
  const favorites = getFavorites()
  const idx = favorites.findIndex(f => f.id === id)
  if (idx === -1) return false
  favorites.splice(idx, 1)
  saveFavorites(favorites)
  return true
}

// 切换收藏状态（本地优先，云端同步）
export const toggleFavorite = async (id: string, item: Omit<FavoriteItem, 'id' | 'addedAt' | 'lastModifiedAt'>): Promise<boolean> => {
  const favorites = getFavorites()
  const isFav = favorites.some(f => f.id === id)
  if (isFav) {
    removeFavorite(id)
    // 云端取消
    const { toggleCollection } = await import('@/api/modules/collection')
    toggleCollection({ case_id: id, action: 'uncollect' }).catch(e => console.warn('[favorites] 云端移除失败', e))
    return false
  } else {
    addFavorite({ ...item, id })
    // 云端添加
    const { toggleCollection } = await import('@/api/modules/collection')
    toggleCollection({ case_id: id, action: 'collect', progress: item.progress }).catch(e => console.warn('[favorites] 云端添加失败', e))
    return true
  }
}

// 是否已收藏
export const isFavorited = (id: string): boolean => {
  return getFavorites().some(f => f.id === id)
}

// 获取单个收藏
export const getFavorite = (id: string): FavoriteItem | undefined => {
  return getFavorites().find(f => f.id === id)
}

// 更新收藏项（如进度变更）
export const updateFavorite = (id: string, updates: Partial<FavoriteItem>): boolean => {
  const favorites = getFavorites()
  const idx = favorites.findIndex(f => f.id === id)
  if (idx === -1) return false
  favorites[idx] = { ...favorites[idx], ...updates, lastModifiedAt: Date.now() }
  saveFavorites(favorites)
  return true
}

// 清空所有收藏（仅本地）
export const clearFavorites = (): void => {
  saveFavorites([])
}