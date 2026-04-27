# 收藏系统迁移计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 LeanStartup 收藏系统迁移到本地优先架构，与 LeanSkill 保持一致，支持标签展示。

**Architecture:** 收藏数据完整存储在本地 `uni.setStorageSync`，云端仅作备份同步。详情页优先读取本地缓存，同时按需从云端同步最新数据。

**Tech Stack:** uni.setStorageSync / Pinia (废弃) / CloudBase NoSQL / macaron tag colors

---

## 文件变更总览

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/utils/favorites.ts` | 创建 | 本地收藏核心模块 |
| `src/types/favorites.d.ts` | 创建 | 类型定义 |
| `src/pages/profile/favorites/index.vue` | 修改 | 重写：支持标签、描述 |
| `src/pages/case-detail/index.vue` | 修改 | 优先读本地缓存 |
| `src/store/collection.ts` | 修改 | 废弃 collectionMap，改为代理 favorites.ts |
| `src/api/modules/collection.ts` | 修改 | toggleCollection 返回完整 case 数据 |
| `cloudfunctions/toggleCollection/index.js` | 修改 | 返回完整 case 详情（title, tags, desc, score 等） |
| `cloudfunctions/getUserCollections/index.js` | 修改 | 返回完整 case 列表 |

---

## Task 1: 创建类型定义

**Files:**
- Create: `src/types/favorites.d.ts`

- [ ] **Step 1: 创建类型文件**

```typescript
// src/types/favorites.d.ts
export interface FavoriteItem {
  id: string           // case_id
  title: string
  desc: string
  tags: string[]
  score_total: number
  url?: string
  image?: string
  progress?: Record<string, boolean>  // 步骤完成状态
  steps_count?: number
  completed_count?: number
  addedAt: number      // timestamp
  lastModifiedAt: number
}

export interface CloudFavoriteItem {
  _id?: string
  resourceId: string
  resourceType?: string
  title?: string
  desc?: string
  url?: string
  image?: string
  tags?: string[]
  score_total?: number
  createdAt?: any
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/favorites.d.ts
git commit -m "feat(favorites): add FavoriteItem type definitions"
```

---

## Task 2: 创建本地收藏核心模块

**Files:**
- Create: `src/utils/favorites.ts`
- Test: `src/utils/__tests__/favorites.test.ts` (create dir if not exists)

- [ ] **Step 1: 创建 favorites.ts**

```typescript
// src/utils/favorites.ts
import type { FavoriteItem, CloudFavoriteItem } from '@/types/favorites'
import { toggleCollection as apiToggleCollection } from '@/api/modules/collection'

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

// 切换收藏状态
export const toggleFavorite = async (id: string, item: Omit<FavoriteItem, 'id' | 'addedAt' | 'lastModifiedAt'>): Promise<boolean> => {
  const favorites = getFavorites()
  const isFav = favorites.some(f => f.id === id)

  if (isFav) {
    removeFavorite(id)
    await apiToggleCollection({ case_id: id, action: 'uncollect' }).catch(e => console.warn('[favorites] 云端移除失败', e))
    return false
  } else {
    addFavorite({ ...item, id })
    await apiToggleCollection({ case_id: id, action: 'collect', progress: item.progress }).catch(e => console.warn('[favorites] 云端添加失败', e))
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
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/favorites.ts
git commit -m "feat(favorites): add local-first favorites utility module"
```

---

## Task 3: 更新 API 层

**Files:**
- Modify: `src/api/modules/collection.ts`

- [ ] **Step 1: 更新 API 类型和实现**

```typescript
// src/api/modules/collection.ts
import { callFunction } from '../core/cloud'
import type { FavoriteItem } from '@/types/favorites'

export interface CollectionItem extends FavoriteItem {}

export const getUserCollections = async (params: { page?: number; pageSize?: number } = {}): Promise<{ success: boolean; data?: { total: number; list: CollectionItem[] } }> => {
  return callFunction('getUserCollections', params)
}

// toggleCollection 云端返回完整 case 数据
export const toggleCollection = async (params: {
  case_id: string
  action: 'collect' | 'uncollect'
  progress?: Record<string, boolean>
}): Promise<{ success: boolean; data?: CollectionItem }> => {
  return callFunction('toggleCollection', params)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/api/modules/collection.ts
git commit -m "feat(api): update CollectionItem to extend FavoriteItem"
```

---

## Task 4: 修改云函数 toggleCollection 返回完整数据

**Files:**
- Modify: `cloudfunctions/toggleCollection/index.js`
- Modify: `cloudfunctions/toggleCollection/package.json` (添加 db.js 依赖)

- [ ] **Step 1: 修改 toggleCollection 云函数**

在 `collect` 和 `update` 返回中增加完整 case 数据：

```javascript
// 在文件顶部添加获取 case 详情的辅助函数（放在 ERROR_MESSAGES 之后）
const getCaseDetail = async (case_id) => {
  try {
    const caseData = await db.collection('Case').doc(case_id).get()
    if (caseData.data) {
      return {
        title: caseData.data.title || '',
        desc: caseData.data.summary || caseData.data.story || '',
        tags: caseData.data.tags || [],
        score_total: caseData.data.score_total || 0,
        url: caseData.data.url || '',
        image: caseData.data.image || '',
        steps_count: Array.isArray(caseData.data.steps) ? caseData.data.steps.length : 0
      }
    }
  } catch (e) {
    console.warn('[toggleCollection] 获取case详情失败', e)
  }
  return null
}
```

然后修改 `action === 'collect'` 时的返回：

```javascript
// collect 新增时
const caseDetail = await getCaseDetail(case_id)
await UserCollection.doc(docId).set({
  data: {
    ...recordData,
    created_at: now
  }
})
console.log('[toggleCollection] 新增收藏', { docId, case_id })
return {
  success: true,
  data: {
    case_id,
    action: 'created',
    progress: progress || {},
    ...(caseDetail || {})
  }
}
```

同样修改 `updated` 返回。

- [ ] **Step 2: Commit**

```bash
git add cloudfunctions/toggleCollection/index.js
git commit -m "feat(cloud): toggleCollection returns full case detail data"
```

---

## Task 5: 重写收藏页组件

**Files:**
- Modify: `src/pages/profile/favorites/index.vue`
- Create: `src/composables/useTagColors.ts` (如果没有)

- [ ] **Step 1: 如果 useTagColors.ts 不存在，创建它**

```typescript
// src/composables/useTagColors.ts
const TAG_COLORS = [
  { bg: '#FDF2F8', color: '#DB2777' }, // pink
  { bg: '#FEF3C7', color: '#B45309' }, // yellow
  { bg: '#DBEAFE', color: '#2563EB' }, // blue
  { bg: '#D1FAE5', color: '#059669' }, // green
  { bg: '#EDE9FE', color: '#7C3AED' }, // purple
  { bg: '#CCFBF1', color: '#0D9488' }, // mint
  { bg: '#FFEDD5', color: '#EA580C' }, // peach
  { bg: '#E0E7FF', color: '#4F46E5' }, // lavender
  { bg: '#FFE4E6', color: '#E11D48' }, // coral
  { bg: '#FEF9C3', color: '#CA8A04' }, // lemon
  { bg: '#E0F2FE', color: '#0284C7' }, // sky
  { bg: '#FCE7F3', color: '#DB2777' }, // rose
  { bg: '#ECFCCB', color: '#65A30D' }, // olive
  { bg: '#FAE8F0', color: '#9F1239' }, // wine
]

const hashCode = (str: string): number => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  return Math.abs(hash)
}

export const getTagClass = (tag: string): string => {
  const colorNames = ['pink', 'yellow', 'blue', 'green', 'purple', 'mint', 'peach', 'lavender', 'coral', 'lemon', 'sky', 'rose', 'olive', 'wine']
  const index = hashCode(tag) % TAG_COLORS.length
  return `tag-${colorNames[index]}`
}
```

- [ ] **Step 2: 重写收藏页**

将 `favorites/index.vue` 替换为 LeanSkill 风格：

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getFavorites, removeFavorite, isFavorited } from '@/utils/favorites'
import { toggleFavorite } from '@/utils/favorites'
import { getTagClass } from '@/composables/useTagColors'
import type { FavoriteItem } from '@/types/favorites'

const favoritesList = ref<FavoriteItem[]>([])

onShow(() => {
  favoritesList.value = getFavorites()
})

const goToDetail = (id: string) => {
  uni.navigateTo({ url: `/pages/case-detail/index?id=${id}` })
}

const handleRemove = async (id: string) => {
  uni.showModal({
    title: '取消收藏',
    content: '确定要取消收藏吗？',
    confirmColor: '#E94560',
    success: async (res) => {
      if (res.confirm) {
        await toggleFavorite(id, favoritesList.value.find(f => f.id === id)!)
        favoritesList.value = getFavorites()
        uni.showToast({ title: '已取消收藏', icon: 'none' })
      }
    }
  })
}

const goToHome = () => {
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<template>
  <view class="favorites-page min-h-screen" style="background: #FAFAF8;">
    <!-- 空状态 -->
    <view v-if="favoritesList.length === 0" class="empty-state">
      <text class="empty-text">暂无收藏内容</text>
      <text class="empty-hint">浏览案例时点击收藏，内容会出现在这里</text>
      <view class="empty-btn" @click="goToHome">
        <text class="empty-btn-text">去发现</text>
      </view>
    </view>

    <!-- 收藏列表 -->
    <view v-else class="favorites-list">
      <view
        v-for="item in favoritesList"
        :key="item.id"
        class="fav-card"
        @click="goToDetail(item.id)"
      >
        <view class="fav-content">
          <text class="fav-title">{{ item.title }}</text>
          <text v-if="item.desc" class="fav-desc">{{ item.desc }}</text>
          <view v-if="item.tags?.length" class="fav-tags">
            <view
              v-for="tag in item.tags.slice(0, 3)"
              :key="tag"
              :class="['tag-item', getTagClass(tag)]"
            >
              <text class="tag-text">{{ tag }}</text>
            </view>
          </view>
          <view class="fav-meta">
            <text class="fav-score">{{ item.score_total }}★</text>
            <text v-if="item.steps_count" class="fav-progress">{{ item.completed_count || 0 }}/{{ item.steps_count }} 步</text>
          </view>
        </view>
        <view class="fav-action" @click.stop="handleRemove(item.id)">
          <text class="fav-remove-icon">★</text>
        </view>
      </view>

      <!-- 底部统计 -->
      <view class="list-footer">
        <text class="footer-text">共 {{ favoritesList.length }} 个收藏</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100px 20px 40px;
}
.empty-text {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A2E;
}
.empty-hint {
  font-size: 13px;
  color: #9B9A97;
  margin-top: 6px;
}
.empty-btn {
  margin-top: 20px;
  padding: 10px 24px;
  border: 1px solid #E8E6E1;
  border-radius: 20px;
}
.empty-btn-text { font-size: 14px; color: #4A4A68; }

/* Favorites List */
.favorites-list { padding: 16px 16px 0; }
.fav-card {
  display: flex;
  align-items: center;
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  border: 1px solid #E8E6E1;
}
.fav-content { flex: 1; min-width: 0; }
.fav-title {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #1A1A2E;
  line-height: 1.4;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fav-desc {
  display: block;
  font-size: 13px;
  color: #6B7280;
  line-height: 1.5;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fav-tags { display: flex; flex-wrap: nowrap; gap: 6px; overflow: hidden; }
.tag-item {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;
}
.tag-text { color: inherit; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; max-width: 100%; }

/* Tag Colors - Macaron */
.tag-pink    { background: #FDF2F8; color: #DB2777; }
.tag-yellow  { background: #FEF3C7; color: #B45309; }
.tag-blue    { background: #DBEAFE; color: #2563EB; }
.tag-green   { background: #D1FAE5; color: #059669; }
.tag-purple  { background: #EDE9FE; color: #7C3AED; }
.tag-mint    { background: #CCFBF1; color: #0D9488; }
.tag-peach   { background: #FFEDD5; color: #EA580C; }
.tag-lavender { background: #E0E7FF; color: #4F46E5; }
.tag-coral   { background: #FFE4E6; color: #E11D48; }
.tag-lemon   { background: #FEF9C3; color: #CA8A04; }
.tag-sky     { background: #E0F2FE; color: #0284C7; }
.tag-rose    { background: #FCE7F3; color: #DB2777; }
.tag-olive   { background: #ECFCCB; color: #65A30D; }
.tag-wine    { background: #FAE8F0; color: #9F1239; }

.fav-meta { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.fav-score { font-size: 13px; color: #F5A623; font-weight: 600; }
.fav-progress { font-size: 12px; color: #9B9A97; }
.fav-action { padding: 8px; margin-left: 8px; }
.fav-remove-icon { font-size: 18px; color: #E94560; }
.list-footer { padding: 16px 0 32px; text-align: center; }
.footer-text { font-size: 12px; color: #9B9A97; }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/profile/favorites/index.vue src/composables/useTagColors.ts
git commit -m "feat(favorites): rewrite with tags, desc, and macaron color scheme"
```

---

## Task 6: 更新收藏操作入口（FixedActionBar）

**Files:**
- Modify: `src/pages/case-detail/components/FixedActionBar.vue`

- [ ] **Step 1: 更新收藏逻辑**

修改 `FixedActionBar.vue` 的 `onToggleFavorite`：

```typescript
import { toggleFavorite, isFavorited } from '@/utils/favorites'

// 替换原来的 collectionStore.toggle
const onToggleFavorite = async () => {
  const fav = isFavorited(props.caseId)
  await toggleFavorite(props.caseId, {
    title: '...', // 需要从 detail 传入
    desc: detail.value?.summary || '',
    tags: detail.value?.tags || [],
    score_total: detail.value?.score_total || 0
  })
  emit('toggle-favorite')
}
```

需要同时更新父组件传递的 detail 数据。

- [ ] **Step 2: Commit**

```bash
git add src/pages/case-detail/components/FixedActionBar.vue
git commit -m "feat(favorites): use local-first toggleFavorite in detail page"
```

---

## Task 7: 更新详情页数据加载

**Files:**
- Modify: `src/pages/case-detail/index.vue`

- [ ] **Step 1: 详情页优先读本地收藏**

```typescript
import { getFavorite, addFavorite } from '@/utils/favorites'
import { getCaseDetail } from '@/api/modules/case'

const loadDetail = async () => {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  const id = (current as any)?.options?.id
  if (!id) return

  // 优先从本地收藏读取
  const local = getFavorite(id)
  if (local) {
    detail.value = local
  }

  // 再从云端同步最新数据
  const res = await getCaseDetail(id)
  if (res.success && res.data) {
    detail.value = { ...detail.value, ...res.data }
    // 如果已收藏，更新本地缓存
    if (isFavorited(id)) {
      updateFavorite(id, res.data)
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/case-detail/index.vue
git commit -m "feat(detail): prioritize local favorites cache, sync from cloud"
```

---

## Task 8: 废弃 collectionStore

**Files:**
- Modify: `src/store/collection.ts`

- [ ] **Step 1: 将 collectionStore 代理到 favorites.ts**

```typescript
// src/store/collection.ts
// 废弃：保留对旧接口的兼容，代理到 favorites.ts
import { getFavorites, isFavorited, removeFavorite } from '@/utils/favorites'

export const useCollectionStore = () => {
  return {
    collections: getFavorites().map(f => f.id),
    loading: false,
    hasMore: false,
    isCollected: isFavorited,
    toggle: async (caseId: string) => {
      const { toggleFavorite } = await import('@/utils/favorites')
      return toggleFavorite(caseId, {} as any)
    },
    getCollection: (id: string) => getFavorites().find(f => f.id === id),
    refresh: () => {},
    loadMore: () => {}
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/store/collection.ts
git commit -m "refactor(collection): deprecate store, delegate to favorites.ts"
```

---

## Task 9: 清空云端收藏数据

**Files:**
- 使用 CloudBase MCP 工具清空 `UserCollection` 集合

- [ ] **Step 1: 查询并删除所有 UserCollection 记录**

使用 `readNoSqlDatabaseContent` 查看记录，然后逐批删除。

- [ ] **Step 2: 无需 commit（操作类任务）**

---

## 依赖关系

```
Task 1 (类型) → Task 2 (favorites.ts) → Task 3 (API) → Task 4 (云函数)
                                                         ↓
Task 5 (收藏页) ← Task 2 ← Task 3 ← ← ← ← ← ← ← ← ← ← ←
                    ↓
Task 6 (FixedActionBar) ← Task 5
          ↓
Task 7 (详情页) ← Task 2
          ↓
Task 8 (废弃 store)
```

---

## 验证步骤

1. 收藏一个案例 → 本地存储有完整数据（含 tags）
2. 打开收藏页 → 卡片显示标题 + 描述 + 标签（macaron配色）+ 评分
3. 杀掉小程序重开 → 收藏数据仍存在（本地持久化）
4. 详情页打开收藏项 → 秒开（本地数据），同时云端同步
5. 取消收藏 → 本地和云端同时删除

---

**Plan complete.** Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
