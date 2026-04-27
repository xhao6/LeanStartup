import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getUserCollections, toggleCollection as apiToggleCollection } from '@/api/modules/collection'
import { useUserStore } from '@/store'

export const useCollectionStore = defineStore('collection', () => {
  const userStore = useUserStore()
  const collections = ref<string[]>([]) // caseId list
  const collectionMap = ref<Record<string, { title: string; score_total: number; progress: Record<string, boolean>; steps_count: number; completed_count: number }>>({})
  const loading = ref(false)
  const hasMore = ref(true)
  const page = ref(1)

  // 自动登录：确保用户上下文已建立（微信环境下 openid 由云函数自动获取）
  const ensureLogin = async (): Promise<boolean> => {
    if (userStore.isLoggedIn) return true
    try {
      const res = await getUserCollections({ page: 1, pageSize: 1 })
      if (res.success) {
        userStore.setUser({ id: 'wechat_user' })
        return true
      }
    } catch {}
    return false
  }

  const fetchCollections = async (reset = false) => {
    if (loading.value) return
    if (reset) { collections.value = []; collectionMap.value = {}; page.value = 1; hasMore.value = true }
    loading.value = true
    try {
      const res = await getUserCollections({ page: page.value, pageSize: 20 })
      if (res.success && res.data) {
        res.data.list.forEach(item => {
          collections.value.push(item.case_id)
          collectionMap.value[item.case_id] = { title: item.title, score_total: item.score_total, progress: item.progress, steps_count: item.steps_count, completed_count: item.completed_count }
        })
        hasMore.value = res.data.list.length === 20
        page.value++
      }
    } finally { loading.value = false }
  }

  // toggle 重载：支持传入 step progress 用于增量更新
  // 自动登录：未登录状态下会自动初始化用户上下文并重试
  const toggle = async (caseId: string, progress?: Record<string, boolean>): Promise<boolean> => {
    const isCollected = collections.value.includes(caseId)
    const action = isCollected ? 'uncollect' : 'collect'

    let res = await apiToggleCollection({ case_id: caseId, action, progress })

    // 如果是未登录错误，自动登录后重试（微信环境下 openid 由云函数自动获取）
    if (!res.success && (res.error?.includes('UNAUTHORIZED') || res.error?.includes('用户身份'))) {
      const loginOk = await ensureLogin()
      if (loginOk) {
        res = await apiToggleCollection({ case_id: caseId, action, progress })
      }
    }

    if (res.success) {
      if (!isCollected) {
        collections.value.push(caseId)
        collectionMap.value[caseId] = { title: '', score_total: 0, progress: progress || {}, steps_count: 0, completed_count: 0 }
      } else {
        collections.value = collections.value.filter(id => id !== caseId)
        delete collectionMap.value[caseId]
      }
      return !isCollected
    }

    console.error('[Collection Store] 操作失败，返回原状态', isCollected, '错误:', res.error)
    return isCollected
  }

  const isCollected = (caseId: string) => collections.value.includes(caseId)
  const getCollection = (caseId: string) => collectionMap.value[caseId]
  const loadMore = () => fetchCollections(false)
  const refresh = () => fetchCollections(true)

  return { collections, collectionMap, loading, hasMore, fetchCollections, toggle, isCollected, getCollection, loadMore, refresh }
})
