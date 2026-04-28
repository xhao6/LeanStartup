// src/utils/favorites.ts
import type { FavoriteItem, CloudFavoriteItem } from '@/types/favorites'
import { toggleCollection } from '@/api/modules/collection'
import { login as loginApi } from '@/api/modules/user'
import { reactive, shallowRef } from 'vue'
import { useUserStore } from '@/store'

// 静默登录状态追踪（避免重复登录）
let isLoggingIn = false

const STORAGE_KEY = 'favorites'

// 响应式收藏状态追踪器
const favoriteIds = shallowRef<Set<string>>(new Set())
const favoritesVersion = reactive({ value: 0 })

// 初始化加载收藏 ID
const loadFavoriteIds = () => {
  const list = getFavorites()
  favoriteIds.value = new Set(list.map(item => item.id))
}

// 触发收藏状态更新
export const refreshFavoriteStatus = () => {
  loadFavoriteIds()
  favoritesVersion.value++
}

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
  refreshFavoriteStatus()
  return true
}

// 移除收藏
export const removeFavorite = (id: string): boolean => {
  const favorites = getFavorites()
  const idx = favorites.findIndex(f => f.id === id)
  if (idx === -1) return false
  favorites.splice(idx, 1)
  saveFavorites(favorites)
  refreshFavoriteStatus()
  return true
}

// 切换收藏状态（本地优先，云端同步）
export const toggleFavorite = async (id: string, item: Omit<FavoriteItem, 'id' | 'addedAt' | 'lastModifiedAt'>): Promise<boolean> => {
  // 静默登录检查（仅在添加收藏时）
  const favorites = getFavorites()
  const isFav = favorites.some(f => f.id === id)

  if (!isFav) {
    // 添加收藏时检查登录状态
    try {
      const userStore = useUserStore()
      if (!userStore.isLoggedIn && !isLoggingIn) {
        isLoggingIn = true
        try {
          const loginResult = await loginApi()
          if (loginResult.success) {
            await userStore.login()
            console.log('[favorites] 静默登录成功')
          }
        } catch (e) {
          console.warn('[favorites] 静默登录失败:', e)
        } finally {
          isLoggingIn = false
        }
      }
    } catch (e) {
      // useUserStore 可能失败（如在非 Vue 环境），继续执行
      console.warn('[favorites] 检查登录状态失败:', e)
    }
  }

  if (isFav) {
    removeFavorite(id)
    toggleCollection({ case_id: id, action: 'uncollect' }).catch(e => console.warn('[favorites] 云端移除失败', e))
    return false
  } else {
    addFavorite({ ...item, id, addedAt: Date.now(), lastModifiedAt: Date.now() })
    toggleCollection({ case_id: id, action: 'collect', progress: item.progress }).catch(e => console.warn('[favorites] 云端添加失败', e))
    return true
  }
}

// 是否已收藏
export const isFavorited = (id: string): boolean => {
  // 访问 favoritesVersion 以追踪依赖
  void favoritesVersion.value
  return favoriteIds.value.has(id)
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
  refreshFavoriteStatus()
  return true
}

// 获取收藏数量（过滤掉没有标题的无效收藏）
export const getFavoritesCount = (): number => {
  return getFavorites().filter(item => item.title).length
}

// 清空所有收藏（仅本地）
export const clearFavorites = (): void => {
  saveFavorites([])
  refreshFavoriteStatus()
}

// 初始化（在模块加载时执行）
if (typeof uni !== 'undefined') {
  loadFavoriteIds()
}

// 从云端同步收藏数据
// 云端返回完整数据（包括 title, desc, url, image, tags）
// 合并云端和本地数据（取并集），使用时间戳比较解决冲突
export const syncFavorites = (cloudData: CloudFavoriteItem[]): void => {
  const localFavorites = getFavorites()
  const cloudMap = new Map(cloudData.map(item => [item.resourceId, item]))
  const localMap = new Map(localFavorites.map(item => [item.id, item]))

  const merged: FavoriteItem[] = []

  // 1. 本地独有的收藏（云端没有的）：直接添加
  localFavorites.forEach(item => {
    if (!cloudMap.has(item.id)) {
      merged.push(item)
    }
  })

  // 2. 云端数据：与本地比较，保留较新的（时间戳比较）
  cloudData.forEach(item => {
    const local = localMap.get(item.resourceId)
    const cloudTime = item.createdAt ? new Date(item.createdAt).getTime() : 0
    const localTime = local?.lastModifiedAt || local?.addedAt || 0

    if (!local || cloudTime > localTime) {
      // 云端更新或本地不存在，使用云端数据
      merged.push({
        id: item.resourceId,
        title: item.title || '',
        desc: item.desc || '',
        tags: item.tags || [],
        score_total: item.score_total || 0,
        url: item.url,
        image: item.image,
        addedAt: cloudTime || Date.now(),
        lastModifiedAt: cloudTime || Date.now()
      })
    } else {
      // 本地更新，使用本地数据
      merged.push(local)
    }
  })

  // 3. 按添加时间排序（新的在前）
  merged.sort((a, b) => b.addedAt - a.addedAt)

  // 4. 保存合并结果
  uni.setStorageSync(STORAGE_KEY, merged)
  refreshFavoriteStatus()
}