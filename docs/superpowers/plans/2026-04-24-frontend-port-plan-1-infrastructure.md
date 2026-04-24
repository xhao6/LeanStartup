# Plan 1: 基础设施搭建

> **前置依赖:** 无
> **后续计划:** Plan 2（核心页面）

---

## 目标

完成技术栈迁移，搭建前端基础设施：依赖安装、UnoCSS 配置、API 层、Pinia Store、Composables、设计系统。

---

## 文件清单

### 新建文件（9 个）

```
src/
├── styles/
│   ├── design-tokens.scss          # 设计变量（颜色/字体/间距）
│   └── global.scss               # 全局样式
├── api/
│   ├── core/
│   │   ├── cloud.ts              # wx.cloud.callFunction 封装
│   │   ├── tcbWeb.ts            # CloudBase HTTP trigger 封装
│   │   ├── handlers.ts           # 请求拦截器
│   │   └── middleware.ts         # 全局中间件
│   └── modules/
│       ├── daily.ts              # getDailyPick API
│       ├── case.ts               # getCaseDetail API
│       ├── collection.ts          # 收藏相关 API
│       └── analytics.ts          # 埋点 API
├── composables/
│   ├── useCache.ts              # 缓存逻辑
│   ├── useShare.ts             # 分享配置
│   └── useLogin.ts             # 静默登录
├── store/
│   ├── index.ts                # Pinia 入口
│   ├── user.ts                # 用户状态
│   └── collection.ts          # 收藏状态
├── utils/
│   ├── constants.ts            # 常量（颜色/莫兰迪色/排名色）
│   ├── format.ts              # 格式化工具
│   ├── cache.ts               # 缓存工具（TTL prefix）
│   └── hash.ts                # 哈希（标签颜色分布）
├── components/
│   ├── CaseCard.vue           # 案例卡片组件
│   ├── ScoreBadge.vue         # 评分徽章组件
│   └── TagMor.vue             # 莫兰迪标签组件
└── config/
    └── index.ts               # CloudBase envId 配置
```

### 修改文件（2 个）

```
uno.config.ts                    # UnoCSS 配置（颜色主题覆盖）
vite.config.ts                  # 添加 UnoCSS/Pinia/AutoImport 插件
```

---

## Task 1.1: 安装依赖

- [ ] **Step 1: 安装 wot-design-uni**

```bash
cd D:\MyWork\LeanMind\LeanStartup
npm install wot-design-uni@1.3.3
```

Run: `npm list wot-design-uni`
Expected: `wot-design-uni@1.3.3`

- [ ] **Step 2: 安装 Pinia**

```bash
npm install pinia@2.2.6
```

- [ ] **Step 3: 安装 UnoCSS + 预设**

```bash
npm install -D unocss@0.58.5 @uni-helper/unocss-preset-uni@0.58.5
```

- [ ] **Step 4: 安装 alova（API mock 层）**

```bash
npm install alova@3.2.5 @alova/adapter-uniapp@1.0.2
```

- [ ] **Step 5: 安装 AutoImport 插件**

```bash
npm install -D unplugin-auto-import@0.17.5
npm install -D unplugin-vue-components@0.26.0
```

- [ ] **Step 6: 验证 package.json**

Run: `npm list wot-design-uni pinia unocss alova @alova/adapter-uniapp unplugin-auto-import unplugin-vue-components`
Expected: 所有依赖已安装

- [ ] **Step 7: 提交**

```bash
git add package.json package-lock.json
git commit -m "deps: install wot-design-uni, pinia, unocss, alova"
```

---

## Task 1.2: 配置 UnoCSS

- [ ] **Step 1: 创建 uno.config.ts**

```typescript
import { defineConfig, presetTypography, transformerDirectives, transformerVariantGroup } from 'unocss'
import { presetUni } from '@uni-helper/unocss-preset-uni'

export default defineConfig({
  presets: [
    presetUni(),
    presetTypography(),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
  theme: {
    colors: {
      primary: '#1A1A2E',
      secondary: '#4A4A68',
      accent: '#E94560',
      gold: '#F5A623',
      background: '#FAFAF8',
      surface: '#FFFFFF',
      border: '#E8E6E1',
      muted: '#9B9A97',
    },
  },
  shortcuts: {
    'flex-center': 'flex items-center justify-center',
    'flex-col-center': 'flex flex-col items-center justify-center',
    'text-h1': 'text-xl font-bold text-primary',
    'text-h2': 'text-base font-bold text-primary',
    'text-body': 'text-sm text-secondary',
    'text-caption': 'text-xs text-muted',
    'card': 'bg-surface rounded-lg shadow-card',
    'card-lg': 'bg-surface rounded-xl shadow-card',
  },
})
```

- [ ] **Step 2: 修改 vite.config.ts**

找到 Vite 配置，添加 UnoCSS 插件：

```typescript
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'

// 在 plugins 数组中添加：
UnoCSS(),
AutoImport({
  imports: [
    'vue',
    'uni-app',
    'pinia',
  ],
  dts: 'src/auto-import.d.ts',
}),
Components({
  dirs: ['src/components'],
  dts: 'src/components.d.ts',
}),
```

- [ ] **Step 3: 提交**

```bash
git add uno.config.ts vite.config.ts
git commit -m "feat: configure UnoCSS with design tokens"
```

---

## Task 1.3: 创建设计系统样式

- [ ] **Step 1: 创建 src/styles/design-tokens.scss**

```scss
// Design Tokens — 精益副业案例库
// 从 preview.html 提取

:root {
  // 颜色
  --color-primary: #1A1A2E;
  --color-secondary: #4A4A68;
  --color-accent: #E94560;
  --color-gold: #F5A623;
  --color-bg: #FAFAF8;
  --color-surface: #FFFFFF;
  --color-border: #E8E6E1;
  --color-muted: #9B9A97;

  // 字体
  --font-display: 'Noto Serif SC', 'Georgia', serif;
  --font-body: 'Noto Sans SC', 'PingFang SC', sans-serif;
  --font-mono: 'Roboto Mono', monospace;

  // 间距
  --spacing-2xs: 2px;
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
  --spacing-2xl: 32px;

  // 圆角
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  // 阴影
  --shadow-card: 0 2px 12px rgba(26, 26, 46, 0.06);
  --shadow-card-hover: 0 8px 32px rgba(26, 26, 46, 0.12);
  --shadow-sm: 0 1px 4px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.12);

  // 过渡
  --transition-fast: 150ms ease-out;
  --transition-base: 200ms ease-out;
  --transition-slow: 250ms ease-out;
}

// 莫兰迪标签色
$tag-mor-1-bg: #E8D5C4;
$tag-mor-1-text: #5D4E37;
$tag-mor-2-bg: #D4E2D4;
$tag-mor-2-text: #3D5C3D;
$tag-mor-3-bg: #D5D4E2;
$tag-mor-3-text: #4A4D6E;
$tag-mor-4-bg: #E2D4D5;
$tag-mor-4-text: #6E4A4D;
$tag-mor-5-bg: #DFDBD0;
$tag-mor-5-text: #5C5A4F;

// 排名徽章渐变
$rank-gold: linear-gradient(180deg, #FBBF24, #F97316);
$rank-silver: linear-gradient(180deg, #94A3B8, #64748B);
$rank-bronze: linear-gradient(180deg, #D4A574, #B8956C);
```

- [ ] **Step 2: 创建 src/styles/global.scss**

```scss
@import './design-tokens.scss';

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

page {
  font-family: var(--font-body);
  background: var(--color-bg);
  color: var(--color-primary);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 3: 提交**

```bash
git add src/styles/
git commit -m "feat: add design tokens and global styles"
```

---

## Task 1.4: 创建 API 层

- [ ] **Step 1: 创建 src/config/index.ts（envId 从 .env 读取）**

```typescript
// CloudBase 环境配置
// 注意：.env 文件中 CLOUDBASE_ENV_ID=lean-startup-d2gkuop3af0aed5c0
export const config = {
  cloud: {
    envId: 'lean-startup-d2gkuop3af0aed5c0',
  }
}
```

- [ ] **Step 2: 创建 src/api/core/cloud.ts**

```typescript
// wx.cloud.callFunction 封装

export interface CloudResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

const isWxCloud = () => typeof wx !== 'undefined' && wx.cloud != null
const isUniCloud = () => typeof uni !== 'undefined' && uni.cloud != null

export const callFunction = async <T = any>(
  name: string,
  data: Record<string, any> = {}
): Promise<CloudResult<T>> => {
  if (!isWxCloud() && !isUniCloud()) {
    return { success: false, error: 'Cloud environment not available' }
  }
  try {
    let res: any
    if (isWxCloud()) {
      res = await wx.cloud.callFunction({ name, data })
    } else {
      res = await uni.cloud.callFunction({ name, data })
    }
    const result = res.result
    if (result && typeof result === 'object' && 'success' in result && !result.success) {
      return { success: false, error: (result as any).error || (result as any).message || 'Cloud function failed' }
    }
    return { success: true, data: result as T }
  } catch (err: any) {
    console.error(`[Cloud] ${name} failed:`, err)
    return { success: false, error: err.message || 'Cloud function error' }
  }
}
```

- [ ] **Step 3: 创建 src/api/modules/daily.ts**

```typescript
// 今日精选 + 历史榜单 API
import { callFunction } from '../core/cloud'

export interface DailyCase {
  id: string
  title: string
  summary: string
  score_total: number
  cost: string
  source_account: string
  suitable_for: string
}

export interface DailyPickResponse {
  date: string
  cases: DailyCase[]
}

export interface HistoryItem {
  date: string
  case_ids: string[]
}

export const getDailyPick = async (date?: string): Promise<{ success: boolean; data?: DailyPickResponse }> => {
  return callFunction('getDailyPick', date ? { date } : {})
}

export const getHistoryPicks = async (params: { page?: number; pageSize?: number } = {}): Promise<{ success: boolean; data?: { total: number; list: { date: string; case_ids: string[] }[]; page: number; pageSize: number } }> => {
  // 注意：云函数 getDailyPick 有 page 参数时走分页模式，返回 { total, list, page, pageSize }
  // list 中每项只有 { date, case_ids }，需要额外查 Case 才能拿到 top3Titles（见 Plan 3 Task 3.1 注意）
  return callFunction('getDailyPick', params)
}
```

- [ ] **Step 4: 创建 src/api/modules/case.ts**

```typescript
// 案例详情 API
import { callFunction, type CloudResult } from '../core/cloud'

export interface CaseDetail {
  id: string
  title: string
  summary: string
  story?: string
  source_account: string
  source_url: string
  score_total: number
  score_feasibility: number
  score_profit: number
  score_timeliness: number
  score_detail: number
  score_fitness: number
  cost: string
  expected_revenue: string
  cycle: string
  suitable_for: string
  steps?: { step: string; order: number }[]
  tools?: { name: string; desc: string }[]
  pitfalls?: string
  risk_tags?: string[]
}

export const getCaseDetail = async (caseId: string): Promise<CloudResult<CaseDetail>> => {
  return callFunction<CaseDetail>('getCaseDetail', { case_id: caseId })
}
```

- [ ] **Step 5: 创建 src/api/modules/collection.ts**

```typescript
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
```

- [ ] **Step 6: 创建 src/api/modules/analytics.ts**

（已在前面完成）

- [ ] **Step 6b: 创建 src/api/modules/subscription.ts**

```typescript
// 订阅管理 API（注意：云函数 subscribe/unsubscribe/getSubscriptionStatus 尚未创建，MVP 阶段先用 localStorage 占位）
import { callFunction } from '../core/cloud'

export interface SubscriptionStatus {
  isSubscribed: boolean
  history: { date: string; status: string }[]
}

export const getSubscriptionStatus = async (): Promise<{ isSubscribed: boolean; history: { date: string; status: string }[] }> => {
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
```

```typescript
// 埋点 API
import { callFunction } from '../core/cloud'

export const trackEvent = async (event: string, caseId?: string, extra?: Record<string, any>): Promise<void> => {
  try {
    await callFunction('trackEvent', { event, case_id: caseId, extra })
  } catch (e) {
    // 埋点失败不阻塞主流程
    console.warn('[Analytics] trackEvent failed:', e)
  }
}
```

- [ ] **Step 7: 提交**

```bash
git add src/api/ src/config/
git commit -m "feat: add API layer (daily, case, collection, analytics)"
```

---

## Task 1.5: 创建 Pinia Store

- [ ] **Step 1: 创建 src/store/index.ts**

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<{ id: string; name?: string; avatar?: string } | null>(null)
  const isLoggedIn = ref(false)
  const viewedCount = ref(0)
  const favoritesCount = ref(0)

  const setUser = (info: typeof userInfo.value) => { userInfo.value = info; isLoggedIn.value = !!info }
  const incrementViewed = () => viewedCount.value++
  const setFavoritesCount = (n: number) => favoritesCount.value = n
  const logout = () => { userInfo.value = null; isLoggedIn.value = false }

  return { userInfo, isLoggedIn, viewedCount, favoritesCount, setUser, incrementViewed, setFavoritesCount, logout }
})
```

- [ ] **Step 2: 创建 src/store/collection.ts**

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getUserCollections, toggleCollection as apiToggleCollection } from '@/api/modules/collection'

export const useCollectionStore = defineStore('collection', () => {
  const collections = ref<string[]>([]) // caseId list
  const collectionMap = ref<Record<string, { title: string; score_total: number; progress: Record<string, boolean>; steps_count: number; completed_count: number }>>({})
  const loading = ref(false)
  const hasMore = ref(true)
  const page = ref(1)

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

  const toggle = async (caseId: string): Promise<boolean> => {
    const isCollected = collections.value.includes(caseId)
    const action = isCollected ? 'uncollect' : 'collect'
    const res = await apiToggleCollection(caseId, action)
    if (res.success) {
      if (!isCollected) {
        collections.value.push(caseId)
        collectionMap.value[caseId] = { title: '', score_total: 0, progress: {}, steps_count: 0, completed_count: 0 }
      } else {
        collections.value = collections.value.filter(id => id !== caseId)
        delete collectionMap.value[caseId]
      }
      return !isCollected
    }
    return isCollected
  }

  const isCollected = (caseId: string) => collections.value.includes(caseId)
  const getCollection = (caseId: string) => collectionMap.value[caseId]
  const loadMore = () => fetchCollections(false)
  const refresh = () => fetchCollections(true)

  return { collections, collectionMap, loading, hasMore, fetchCollections, toggle, isCollected, getCollection, loadMore, refresh }
})
```

- [ ] **Step 3: 提交**

```bash
git add src/store/
git commit -m "feat: add Pinia stores (user, collection)"
```

---

## Task 1.6: 创建 Composables

- [ ] **Step 1: 创建 src/composables/useCache.ts**

```typescript
// 缓存逻辑（TTL prefix: leanstartup_）
import { CACHE_KEYS, CACHE_TTL } from '@/utils/constants'

const PREFIX = 'leanstartup_'

interface CacheEntry<T> { value: T; expire: number | null }

export const getCache = <T = any>(key: string): T | null => {
  try {
    const raw = uni.getStorageSync(PREFIX + key)
    if (!raw) return null
    const entry: CacheEntry<T> = JSON.parse(raw)
    if (entry.expire && Date.now() > entry.expire) {
      uni.removeStorageSync(PREFIX + key)
      return null
    }
    return entry.value
  } catch { return null }
}

export const setCache = <T = any>(key: string, value: T, expireMs?: number): void => {
  try {
    uni.setStorageSync(PREFIX + key, JSON.stringify({ value, expire: expireMs ? Date.now() + expireMs : null }))
  } catch {}
}

export const removeCache = (key: string): void => {
  try { uni.removeStorageSync(PREFIX + key) } catch {}
}

export const useCache = () => ({
  get: getCache,
  set: setCache,
  remove: removeCache,
})
```

- [ ] **Step 2: 创建 src/composables/useShare.ts**

```typescript
// 分享配置
import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'

const defaultConfig = { title: '精益副业案例库', path: '/pages/index/index', imageUrl: '' }

export const useShare = (custom?: { title?: string; path?: string; imageUrl?: string }) => {
  const cfg = { ...defaultConfig, ...custom }

  onShareAppMessage(() => ({ title: cfg.title, path: cfg.path, imageUrl: cfg.imageUrl }))
  onShareTimeline(() => ({ title: cfg.title, path: cfg.path, imageUrl: cfg.imageUrl }))

  const triggerShare = () => { /* UniApp 自动处理 */ }

  return { triggerShare }
}
```

- [ ] **Step 3: 创建 src/composables/useLogin.ts**

```typescript
// 静默登录
// 注意：微信小程序天然免登录，openid 由云函数通过 context 自动获取，无需前端显式登录
// 此 composable 仅用于需要获取用户 openid 的场景（openid 通过各云函数的 context.openid 参数自动注入）
import { useUserStore } from '@/store'
import { callFunction } from '@/api/core/cloud'

export const useLogin = () => {
  const userStore = useUserStore()

  // 微信小程序场景：openid 在云函数 context 中自动获取，无需前端发起登录
  // 如需在本地缓存用户标识，可调用任意云函数（云函数会自动注入 openid）
  const silentLogin = async (): Promise<boolean> => {
    try {
      // 尝试调用一个带 openid 的云函数来验证连通性
      const res = await callFunction('getUserCollections', { page: 1, pageSize: 1 })
      if (res.success) {
        userStore.setUser({ id: 'wechat_user' })
        return true
      }
    } catch {}
    return false
  }

  return { silentLogin }
}
```

- [ ] **Step 4: 提交**

```bash
git add src/composables/
git commit -m "feat: add composables (useCache, useShare, useLogin)"
```

---

## Task 1.7: 创建 Utils

- [ ] **Step 1: 创建 src/utils/constants.ts**

```typescript
// 常量
export const COLORS = {
  PRIMARY: '#1A1A2E',
  SECONDARY: '#4A4A68',
  ACCENT: '#E94560',
  GOLD: '#F5A623',
  BG: '#FAFAF8',
  SURFACE: '#FFFFFF',
  BORDER: '#E8E6E1',
  MUTED: '#9B9A97',
}

export const MORANDI_TAGS = [
  { bg: '#E8D5C4', text: '#5D4E37' },
  { bg: '#D4E2D4', text: '#3D5C3D' },
  { bg: '#D5D4E2', text: '#4A4D6E' },
  { bg: '#E2D4D5', text: '#6E4A4D' },
  { bg: '#DFDBD0', text: '#5C5A4F' },
]

export const RANK_COLORS: Record<number, string> = {
  1: 'linear-gradient(180deg, #FBBF24, #F97316)',
  2: 'linear-gradient(180deg, #94A3B8, #64748B)',
  3: 'linear-gradient(180deg, #D4A574, #B8956C)',
}

export const CACHE_KEYS = {
  DAILY_PICK: 'daily-pick',
  USER_INFO: 'user-info',
}

export const CACHE_TTL = {
  MINUTE: 60_000,
  HOUR: 3_600_000,
  DAY: 86_400_000,
}
```

- [ ] **Step 2: 创建 src/utils/format.ts**

```typescript
export const formatDate = (d: Date | string): string => {
  const date = typeof d === 'string' ? new Date(d) : d
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const formatDateShort = (d: Date | string): string => {
  const date = typeof d === 'string' ? new Date(d) : d
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const getCurrentDate = (): string => formatDate(new Date())

export const getWeekday = (d: Date | string): string => {
  const date = typeof d === 'string' ? new Date(d) : d
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
}

export const truncate = (text: string, maxLen: number): string => {
  if (text.length <= maxLen) return text
  return text.substring(0, maxLen) + '...'
}
```

- [ ] **Step 3: 创建 src/utils/hash.ts**

```typescript
// 标签颜色分布哈希
export const hashCode = (str: string): number => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  return Math.abs(hash)
}
```

- [ ] **Step 4: 提交**

```bash
git add src/utils/
git commit -m "feat: add utils (constants, format, hash)"
```

---

## Task 1.8: 创建公共组件

- [ ] **Step 1: 创建 src/components/CaseCard.vue**

```vue
<template>
  <view class="case-card" :class="`rank-${rank}`" @click="emit('click', props.case.id)">
    <view class="rank-badge" :style="{ background: rankColor }">{{ rank }}</view>
    <view class="card-content">
      <text class="card-title">{{ props.case.title }}</text>
      <view class="card-meta">
        <text class="score-inline">★ {{ props.case.score_total }}</text>
        <text class="cost-tag" :style="{ background: costColor.bg, color: costColor.text }">{{ props.case.cost }}</text>
      </view>
      <text class="card-summary">{{ props.case.summary }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RANK_COLORS, MORANDI_TAGS } from '@/utils/constants'

interface CaseItem { id: string; title: string; summary: string; score_total: number; cost: string }
interface Props { case: CaseItem; rank: number }
const props = defineProps<Props>()
const emit = defineEmits<{ click: [id: string] }>()

const rankColor = computed(() => RANK_COLORS[props.rank] || RANK_COLORS[4])
const costColor = computed(() => {
  if (props.case.cost === '零成本') return { bg: '#D1FAE5', text: '#059669' }
  if (props.case.cost === '低门槛') return { bg: '#DBEAFE', text: '#2563EB' }
  return { bg: MORANDI_TAGS[0].bg, color: MORANDI_TAGS[0].text }
})
</script>

<style scoped>
.case-card { display: flex; gap: 12px; background: var(--color-surface); border-radius: var(--radius-lg); padding: 16px; box-shadow: var(--shadow-card); transition: all var(--transition-base); cursor: pointer; }
.case-card:active { transform: scale(0.99); }
.rank-badge { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: white; flex-shrink: 0; }
.card-content { flex: 1; min-width: 0; }
.card-title { display: block; font-family: var(--font-display); font-size: 16px; font-weight: 600; line-height: 1.4; margin-bottom: 8px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.card-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.score-inline { font-family: var(--font-mono); font-size: 13px; font-weight: 700; color: var(--color-gold); }
.cost-tag { padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
.card-summary { font-size: 13px; color: var(--color-secondary); line-height: 1.5; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
</style>
```

- [ ] **Step 2: 创建 src/components/ScoreBadge.vue**

```vue
<template>
  <view class="score-badge">
    <text class="score-num">{{ Math.floor(score) }}</text>
    <text class="score-decimal">.{{ decimal }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ score: number }>()
const decimal = computed(() => ((props.score % 1) * 10).toFixed(0))
</script>

<style scoped>
.score-badge { display: inline-flex; align-items: baseline; padding: 4px 10px; border-radius: 20px; background: linear-gradient(135deg, var(--color-gold), var(--color-gold)); box-shadow: var(--shadow-sm); }
.score-num { font-family: var(--font-mono); font-size: 18px; font-weight: 700; color: white; }
.score-decimal { font-family: var(--font-mono); font-size: 12px; font-weight: 700; color: white; opacity: 0.9; }
</style>
```

- [ ] **Step 3: 创建 src/components/TagMor.vue**

```vue
<template>
  <view class="tag-mor" :style="{ background: tag.bg, color: tag.text }">
    <text>{{ text }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MORANDI_TAGS } from '@/utils/constants'
const props = defineProps<{ text: string; variant?: 1 | 2 | 3 | 4 | 5 }>()
const tag = computed(() => MORANDI_TAGS[(props.variant || 1) - 1])
</script>

<style scoped>
.tag-mor { display: inline-flex; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
</style>
```

- [ ] **Step 4: 提交**

```bash
git add src/components/
git commit -m "feat: add common components (CaseCard, ScoreBadge, TagMor)"
```

---

## Task 1.8b: 创建 SubscribeBanner 组件

- [ ] **Step 1: 创建 src/components/SubscribeBanner.vue**

```vue
<!-- src/components/SubscribeBanner.vue -->
<template>
  <view class="subscribe-banner" @click="handleClick">
    <view class="banner-content">
      <wd-icon name="bell" size="20px" color="#FFFFFF" />
      <text class="banner-title">订阅每日推送</text>
      <text class="banner-desc">每天早上 9 点，3 个新案例送上门</text>
    </view>
    <view class="banner-cta">立即订阅</view>
  </view>
</template>

<script setup lang="ts">
const handleClick = () => {
  uni.navigateTo({ url: '/pages/profile/subscription/index' })
}
</script>

<style lang="scss" scoped>
.subscribe-banner {
  margin: 24rpx 32rpx;
  background: linear-gradient(135deg, #1A1A2E 0%, #2D2D44 100%);
  border-radius: 12rpx;
  padding: 28rpx 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  overflow: hidden;

  // shimmer 动画
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 200%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255,255,255,0.05) 50%,
      transparent 100%
    );
    animation: shimmer 3s infinite;
  }
}

@keyframes shimmer {
  0% { transform: translateX(0); }
  100% { transform: translateX(50%); }
}

.banner-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #FFFFFF;
  display: block;
}
.banner-desc {
  font-size: 24rpx;
  color: rgba(255,255,255,0.6);
  display: block;
  margin-top: 4rpx;
}
.banner-cta {
  background: #E94560;
  color: #FFFFFF;
  font-size: 24rpx;
  padding: 12rpx 24rpx;
  border-radius: 24rpx;
  flex-shrink: 0;
}
</style>
```

- [ ] **Step 2: 提交**

```bash
git add src/components/SubscribeBanner.vue
git commit -m "feat: add SubscribeBanner component"
```

---

## Task 1.8c: 创建 src/utils/cache.ts

- [ ] **Step 1: 创建 src/utils/cache.ts**

```typescript
// 缓存工具（TTL 支持）
const PREFIX = 'leanstartup_'

interface CacheEntry<T> { value: T; expire: number | null }

export const getCache = <T = any>(key: string): T | null => {
  try {
    const raw = uni.getStorageSync(PREFIX + key)
    if (!raw) return null
    const entry: CacheEntry<T> = JSON.parse(raw)
    if (entry.expire && Date.now() > entry.expire) {
      uni.removeStorageSync(PREFIX + key)
      return null
    }
    return entry.value
  } catch { return null }
}

export const setCache = <T = any>(key: string, value: T, expireMs?: number): void => {
  try {
    uni.setStorageSync(PREFIX + key, JSON.stringify({
      value,
      expire: expireMs ? Date.now() + expireMs : null
    }))
  } catch {}
}

export const removeCache = (key: string): void => {
  try { uni.removeStorageSync(PREFIX + key) } catch {}
}
```

- [ ] **Step 2: 提交**

```bash
git add src/utils/cache.ts
git commit -m "feat: add cache util with TTL support"
```

---

## Task 1.9: 配置 TabBar

- [ ] **Step 1: 创建 TabBar 图标目录**

```bash
mkdir -p src/static/tabbar
```

- [ ] **Step 2: 下载 TabBar 图标**

使用 `downloadRemoteFile` 下载 6 个图标（首页、首页选中、榜单、榜单选中、我的、我的选中）。图标需 PNG 格式，64x64px。

推荐从 `https://raw.githubusercontent.com/...` 或其他 CDN 获取开源图标，或使用 emoji 临时占位。

- [ ] **Step 3: 修改 src/pages.json 的 tabBar 配置**

```json
{
  "tabBar": {
    "color": "#9B9A97",
    "selectedColor": "#E94560",
    "backgroundColor": "#FFFFFF",
    "borderStyle": "black",
    "list": [
      { "pagePath": "pages/index/index", "text": "首页", "iconPath": "static/tabbar/today.png", "selectedIconPath": "static/tabbar/today-active.png" },
      { "pagePath": "pages/history/index", "text": "榜单", "iconPath": "static/tabbar/history.png", "selectedIconPath": "static/tabbar/history-active.png" },
      { "pagePath": "pages/profile/favorites/index", "text": "收藏", "iconPath": "static/tabbar/favorites.png", "selectedIconPath": "static/tabbar/favorites-active.png" },
      { "pagePath": "pages/profile/index", "text": "我的", "iconPath": "static/tabbar/profile.png", "selectedIconPath": "static/tabbar/profile-active.png" }
    ]
  }
}
```

- [ ] **Step 4: 提交**

```bash
git add src/pages.json src/static/tabbar/
git commit -m "feat: add TabBar configuration and icons"
```

---

## Task 1.10: 更新 main.ts

- [ ] **Step 1: 修改 src/main.ts**

```typescript
import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import 'uno.css'
import './styles/global.scss'

export function createApp() {
  const app = createSSRApp(App)
  app.use(createPinia())
  return { app }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/main.ts
git commit -m "feat: init Pinia and UnoCSS in main.ts"
```

---

## 完成检查

- [ ] `npm install` 无报错
- [ ] `npm run dev:mp-weixin` 能启动（至少到编译阶段）
- [ ] UnoCSS utility classes 可用（如 `flex`, `p-4`, `text-center`）
- [ ] TabBar 正常显示 3 个 Tab
- [ ] 云函数调用通道已建立
- [ ] Pinia stores 已创建

**Plan 1 完成后 → 开始 Plan 2（核心页面）**
