# Plan 1: 基础设施迁移 (Config, Store, Utils, Composables, Services)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 LeanSkill 的基础设施代码迁移到 LeanStartup，包括 config、store、utils、composables 和 services。

**Architecture:** 从 LeanSkill 复制并适配，将 skill→case 术语替换，保留 LeanStartup 已有的 API 层和配色。

---

## Task 1.1: 创建 app.config.ts

**Files:**
- Create: `src/config/app.config.ts`

从 LeanSkill 复制 `config/app.config.ts`，将应用名改为"精益副业案例库"，集合名改为 cases 相关。

```typescript
// src/config/app.config.ts
interface TabBarItem {
  pagePath: string
  text: string
  iconPath: string
  selectedIconPath: string
}

interface AppConfig {
  appName: string
  appid: string
  tabBar: {
    color: string
    selectedColor: string
    backgroundColor: string
    borderStyle: string
    list: TabBarItem[]
  }
  features: {
    share: boolean
    favorites: boolean
  }
  collections: {
    users: string
    favorites: string
    cases: string
    dailyPicks: string
  }
}

const appConfig: AppConfig = {
  appName: '精益副业案例库',
  appid: 'wxc65f29000694748f',
  tabBar: {
    color: '#9B9A97',
    selectedColor: '#E94560',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: 'static/tabbar/home.png',
        selectedIconPath: 'static/tabbar/home-active.png'
      },
      {
        pagePath: 'pages/history/index',
        text: '榜单',
        iconPath: 'static/tabbar/ranking.png',
        selectedIconPath: 'static/tabbar/ranking-active.png'
      },
      {
        pagePath: 'pages/profile/favorites/index',
        text: '收藏',
        iconPath: 'static/tabbar/favorites.png',
        selectedIconPath: 'static/tabbar/favorites-active.png'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'static/tabbar/profile.png',
        selectedIconPath: 'static/tabbar/profile-active.png'
      }
    ]
  },
  features: {
    share: true,
    favorites: true
  },
  collections: {
    users: 'users',
    favorites: 'user_favorites',
    cases: 'cases',
    dailyPicks: 'daily_picks'
  }
}

export default appConfig
```

- [ ] **Step 1:** 创建 `src/config/app.config.ts`，内容如上
- [ ] **Step 2:** 验证编译无错误

```bash
cd d:/MyWork/LeanMind/LeanStartup && npm run build:mp-weixin 2>&1 | tail -5
```

- [ ] **Step 3:** Commit

```bash
git add src/config/app.config.ts && git commit -m "feat: add app.config.ts adapted from LeanSkill"
```

---

## Task 1.2: 创建 case store

**Files:**
- Create: `src/store/case.ts`

从 LeanSkill 的 `store/skill.ts` 适配，将 Skill→Case，改用 LeanStartup 的 API。

```typescript
// src/store/case.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getDailyPick, getHistoryPicks } from '@/api/modules/daily'
import { getCaseDetail } from '@/api/modules/case'
import type { DailyCase, HistoryItem } from '@/api/modules/daily'
import type { CaseDetail } from '@/api/modules/case'
import { getCache, setCache, removeCache } from '@/utils/cache'

const CASE_CACHE_KEY = 'cases_cache'
const CASE_CACHE_TTL = 30 * 60 * 1000 // 30分钟

export const useCaseStore = defineStore('case', () => {
  // State
  const todayCases = ref<DailyCase[]>([])
  const casesMap = ref<Record<string, DailyCase | CaseDetail>>({})
  const historyList = ref<HistoryItem[]>([])
  const historyPage = ref(1)
  const historyPageSize = ref(10)
  const historyTotal = ref(0)
  const todayLoading = ref(false)
  const historyLoading = ref(false)
  const displayDate = ref('')

  // 今日榜单缓存
  const CACHE_KEY_TODAY = 'today_cases'
  const CACHE_EXPIRE = 5 * 60 * 1000

  // 持久化
  const initCaseCache = () => {
    const cached = getCache<Record<string, DailyCase>>(CASE_CACHE_KEY)
    if (cached) casesMap.value = cached
  }

  const saveCaseCache = () => {
    setCache(CASE_CACHE_KEY, casesMap.value, CASE_CACHE_TTL)
  }

  const clearAllCaseCache = () => {
    removeCache(CASE_CACHE_KEY)
    casesMap.value = {}
  }

  initCaseCache()

  // Getters
  const hasMoreHistory = computed(() => {
    return historyList.value.length < historyTotal.value
  })

  const loading = computed(() => todayLoading.value || historyLoading.value)

  // Actions
  const fetchTodayCases = async () => {
    // 1. 尝试从缓存加载
    const cached = getCache<DailyCase[]>(CACHE_KEY_TODAY)
    if (cached && cached.length > 0) {
      todayCases.value = cached
      const now = new Date()
      displayDate.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      return
    }

    // 2. 从网络加载
    try {
      todayLoading.value = true
      const res = await getDailyPick()
      if (res.success && res.data) {
        todayCases.value = res.data.cases || []
        displayDate.value = res.data.date || ''
        setCache(CACHE_KEY_TODAY, todayCases.value, CACHE_EXPIRE)
        // 缓存每个 case
        todayCases.value.forEach(c => {
          casesMap.value[c.id] = c
        })
        saveCaseCache()
      }
    } finally {
      todayLoading.value = false
    }
  }

  const fetchCaseDetail = async (caseId: string) => {
    if (casesMap.value[caseId]) return casesMap.value[caseId]
    try {
      const res = await getCaseDetail(caseId)
      if (res.success && res.data) {
        casesMap.value[caseId] = res.data
        saveCaseCache()
        return res.data
      }
    } catch (err) {
      console.error(`Failed to fetch case detail: ${caseId}`, err)
    }
    return null
  }

  const fetchHistoryList = async (options?: { page?: number; pageSize?: number }) => {
    try {
      historyLoading.value = true
      const page = options?.page ?? historyPage.value
      const pageSize = options?.pageSize ?? historyPageSize.value

      const res = await getHistoryPicks({ page, pageSize })
      if (res.success && res.data) {
        if (page === 1) {
          historyList.value = res.data.list
        } else {
          historyList.value = [...historyList.value, ...res.data.list]
        }
        historyPage.value = res.data.page || page
        historyPageSize.value = res.data.pageSize || pageSize
        historyTotal.value = res.data.total || 0
      }
    } finally {
      historyLoading.value = false
    }
  }

  const getCaseById = (id: string): DailyCase | CaseDetail | undefined => {
    return casesMap.value[id]
  }

  const clearTodayCache = () => {
    removeCache(CACHE_KEY_TODAY)
  }

  return {
    todayCases, casesMap, historyList, historyPage, historyPageSize,
    historyTotal, todayLoading, historyLoading, loading, displayDate,
    hasMoreHistory,
    fetchTodayCases, fetchCaseDetail, fetchHistoryList, getCaseById,
    clearTodayCache, clearAllCaseCache
  }
})
```

- [ ] **Step 1:** 创建 `src/store/case.ts`
- [ ] **Step 2:** 验证 TypeScript 编译

```bash
cd d:/MyWork/LeanMind/LeanStartup && npm run build:mp-weixin 2>&1 | tail -5
```

- [ ] **Step 3:** Commit

```bash
git add src/store/case.ts && git commit -m "feat: add case store adapted from LeanSkill skill store"
```

---

## Task 1.3: 创建 subscription store

**Files:**
- Create: `src/store/subscription.ts`

从 LeanSkill 的 `store/subscription.ts` 复制，改用 LeanStartup 的 API。

```typescript
// src/store/subscription.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { subscribe, unsubscribe, getSubscriptionStatus } from '@/api/modules/subscription'
import { getCache, setCache, removeCache } from '@/utils/cache'

const CACHE_KEY = 'subscription_status'
const CACHE_TTL = 5 * 60 * 1000
const DEBOUNCE_DELAY = 1000

export const useSubscriptionStore = defineStore('subscription', () => {
  const isSubscribed = ref(false)
  const loading = ref(false)
  const lastCheckTime = ref(0)
  const lastActionTime = ref(0)

  const shouldRefreshCache = computed(() => Date.now() - lastCheckTime.value > CACHE_TTL)
  const canPerformAction = computed(() => Date.now() - lastActionTime.value > DEBOUNCE_DELAY)

  const checkStatus = async (options?: { force?: boolean }) => {
    const { force = false } = options || {}
    if (!force && !shouldRefreshCache.value) {
      return
    }
    try {
      loading.value = true
      const status = await getSubscriptionStatus()
      isSubscribed.value = status.isSubscribed
      lastCheckTime.value = Date.now()
      setCache(CACHE_KEY, { isSubscribed: status.isSubscribed, lastCheckTime: lastCheckTime.value }, CACHE_TTL)
    } finally {
      loading.value = false
    }
  }

  const doSubscribe = async () => {
    if (!canPerformAction.value) return
    try {
      loading.value = true
      lastActionTime.value = Date.now()
      await subscribe()
      isSubscribed.value = true
      lastCheckTime.value = Date.now()
      setCache(CACHE_KEY, { isSubscribed: true, lastCheckTime: lastCheckTime.value }, CACHE_TTL)
    } finally {
      loading.value = false
    }
  }

  const doUnsubscribe = async () => {
    if (!canPerformAction.value) return
    try {
      loading.value = true
      lastActionTime.value = Date.now()
      await unsubscribe()
      isSubscribed.value = false
      lastCheckTime.value = Date.now()
      setCache(CACHE_KEY, { isSubscribed: false, lastCheckTime: lastCheckTime.value }, CACHE_TTL)
    } finally {
      loading.value = false
    }
  }

  const initStatus = async () => {
    const cached = getCache<{ isSubscribed: boolean; lastCheckTime: number }>(CACHE_KEY)
    if (cached) {
      isSubscribed.value = cached.isSubscribed
      lastCheckTime.value = cached.lastCheckTime
      // 后台刷新，不阻塞
      checkStatus().catch(() => {})
      return
    }
    await checkStatus()
  }

  return {
    isSubscribed, loading, lastCheckTime, lastActionTime,
    shouldRefreshCache, canPerformAction,
    checkStatus, doSubscribe, doUnsubscribe, initStatus
  }
})
```

- [ ] **Step 1:** 创建 `src/store/subscription.ts`
- [ ] **Step 2:** 验证编译
- [ ] **Step 3:** Commit

```bash
git add src/store/subscription.ts && git commit -m "feat: add subscription store"
```

---

## Task 1.4: 创建 useTagColors composable

**Files:**
- Create: `src/composables/useTagColors.ts`

从 LeanSkill 复制，不改动（标签色与业务无关）：

```typescript
// src/composables/useTagColors.ts
const TAG_COLORS = [
  'tag-pink', 'tag-yellow', 'tag-blue', 'tag-green', 'tag-purple',
  'tag-mint', 'tag-peach', 'tag-lavender', 'tag-coral', 'tag-lemon',
  'tag-sky', 'tag-rose', 'tag-olive', 'tag-wine'
]

const hashCode = (str: string): number => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export const getTagClass = (tag: string): string => {
  const index = hashCode(tag) % TAG_COLORS.length
  return TAG_COLORS[index]
}
```

- [ ] **Step 1:** 创建 `src/composables/useTagColors.ts`
- [ ] **Step 2:** Commit

```bash
git add src/composables/useTagColors.ts && git commit -m "feat: add useTagColors composable"
```

---

## Task 1.5: 创建 CacheService

**Files:**
- Create: `src/services/CacheService.ts`

从 LeanSkill 复制 `services/CacheService.ts`，适配 LeanStartup 的缓存前缀。

```typescript
// src/services/CacheService.ts
const PRESERVED_KEYS = ['uni-id-token', 'uni-id-token-expire']

export class CacheService {
  static getCacheSize(): string {
    try {
      const info = uni.getStorageInfoSync()
      const size = info.currentSize
      if (size < 1024) return `${size} KB`
      return `${(size / 1024).toFixed(1)} MB`
    } catch {
      return '未知'
    }
  }

  static getClearedItemsList(): string[] {
    try {
      const info = uni.getStorageInfoSync()
      return info.keys.filter(key => !PRESERVED_KEYS.includes(key))
    } catch {
      return []
    }
  }

  static clearCache(): void {
    const keys = this.getClearedItemsList()
    keys.forEach(key => {
      try { uni.removeStorageSync(key) } catch {}
    })
  }

  static confirmAndClear(): void {
    uni.showModal({
      title: '清除缓存',
      content: `当前缓存大小: ${this.getCacheSize()}。确定要清除吗？`,
      confirmColor: '#E94560',
      success: (res) => {
        if (res.confirm) {
          this.clearCache()
          uni.showToast({ title: '缓存已清除', icon: 'success' })
        }
      }
    })
  }
}
```

- [ ] **Step 1:** 创建 `src/services/` 目录（如不存在）和文件
- [ ] **Step 2:** Commit

```bash
mkdir -p src/services && git add src/services/CacheService.ts && git commit -m "feat: add CacheService"
```

---

## Task 1.6: 验证构建

- [ ] **Step 1:** 运行完整构建确认无错误

```bash
cd d:/MyWork/LeanMind/LeanStartup && npm run build:mp-weixin 2>&1 | tail -10
```

Expected: `DONE  Build complete.`

- [ ] **Step 2:** 确认新增 store 无明显类型错误（检查构建日志中无 TS 相关 warning）
