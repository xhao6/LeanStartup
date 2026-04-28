# Profile Page Features & Favorites Sync

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance profile page with nickname editing, WeChat getUserProfile integration, back button redirect, and favorites sync after login.

**Architecture:** Local-first favorites with cloud sync via userFunctions, wx.getUserProfile for user info, composable pattern for reusable logic.

**Tech Stack:** uni-app / Vue 3 Composition API / TypeScript / Pinia

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/utils/syncFavorites.ts` | Cloud favorites sync utilities |
| `src/composables/useBackButtonRedirect.ts` | Back button redirect composable |
| `src/pages/profile/index.vue` | Enhanced profile page with login/nickname editing |

---

## Task 1: Add getFavoritesCount to favorites.ts

**Files:**
- Modify: `src/utils/favorites.ts`

- [ ] **Step 1: Add getFavoritesCount function**

```typescript
// src/utils/favorites.ts
// Add this function at the end of the file, before clearFavorites

// 获取收藏数量（过滤掉没有标题的无效收藏）
export const getFavoritesCount = (): number => {
  return getFavorites().filter(item => item.title).length
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/favorites.ts
git commit -m "feat(favorites): add getFavoritesCount utility"
```

---

## Task 2: Create Favorites Sync Utilities

**Files:**
- Create: `src/utils/syncFavorites.ts`

- [ ] **Step 1: Create syncFavorites utility**

```typescript
// src/utils/syncFavorites.ts
/**
 * 云端收藏同步工具
 * 在用户登录后调用，将本地收藏与云端合并
 */

import { syncFavorites, refreshFavoriteStatus } from './favorites'
import { getFavorites as apiGetFavorites } from '@/api/modules/user'

/**
 * 从云端下载收藏数据并同步到本地
 * @param limit 限制获取数量，默认100条
 * @throws 网络或 API 错误时向上传播，由调用方决定处理方式
 */
export const downloadCloudFavorites = async (limit: number = 100): Promise<void> => {
  const res = await apiGetFavorites({ limit })

  if (res.success && res.data && Array.isArray(res.data)) {
    console.log('[Sync] 从云端同步收藏:', res.data.length, '/', limit)

    if (res.data.length >= limit) {
      console.warn('[Sync] 云端收藏数量达到限制，可能存在更多未同步的收藏')
    }

    syncFavorites(res.data)
  }
}

/**
 * 完整同步流程
 */
export const fullSyncFavorites = async (): Promise<void> => {
  console.log('[Sync] 开始完整同步...')
  await downloadCloudFavorites()
  refreshFavoriteStatus()
  console.log('[Sync] 同步完成')
}
```

Wait - `syncFavorites` function doesn't exist yet in LeanStartup's favorites.ts. We need to add it first.

- [ ] **Step 2: Add syncFavorites and refreshFavoriteStatus to favorites.ts**

```typescript
// src/utils/favorites.ts
// Add at the top of the file, after the imports:

import { reactive, shallowRef } from 'vue'

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

// 修改 isFavorited to use reactive tracking:
export const isFavorited = (id: string): boolean => {
  // 访问 favoritesVersion 以追踪依赖
  void favoritesVersion.value
  return favoriteIds.value.has(id)
}

// 初始化（在模块加载时执行）
if (typeof uni !== 'undefined') {
  loadFavoriteIds()
}

// 云端收藏数据接口（与云端返回一致）
interface CloudFavoriteItem {
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
```

- [ ] **Step 3: Now create syncFavorites.ts**

```typescript
// src/utils/syncFavorites.ts
/**
 * 云端收藏同步工具
 * 在用户登录后调用，将本地收藏与云端合并
 */

import { syncFavorites, refreshFavoriteStatus } from './favorites'
import { getFavorites as apiGetFavorites } from '@/api/modules/user'

/**
 * 从云端下载收藏数据并同步到本地
 * @param limit 限制获取数量，默认100条
 * @throws 网络或 API 错误时向上传播，由调用方决定处理方式
 */
export const downloadCloudFavorites = async (limit: number = 100): Promise<void> => {
  const res = await apiGetFavorites({ limit })

  if (res.success && res.data && Array.isArray(res.data)) {
    console.log('[Sync] 从云端同步收藏:', res.data.length, '/', limit)

    if (res.data.length >= limit) {
      console.warn('[Sync] 云端收藏数量达到限制，可能存在更多未同步的收藏')
    }

    syncFavorites(res.data)
  }
}

/**
 * 完整同步流程
 */
export const fullSyncFavorites = async (): Promise<void> => {
  console.log('[Sync] 开始完整同步...')
  await downloadCloudFavorites()
  refreshFavoriteStatus()
  console.log('[Sync] 同步完成')
}
```

- [ ] **Step 4: Commit**

```bash
git add src/utils/favorites.ts src/utils/syncFavorites.ts
git commit -m "feat(favorites): add syncFavorites utility and reactive tracking"
```

---

## Task 3: Create useBackButtonRedirect Composable

**Files:**
- Create: `src/composables/useBackButtonRedirect.ts`

- [ ] **Step 1: Create the composable**

```typescript
// src/composables/useBackButtonRedirect.ts
/**
 * 返回键拦截跳转到首页 Composable
 * 用于在 TabBar 页面拦截返回键并跳转到首页
 */

import { onUnmounted } from 'vue'
import { onBackPress } from '@dcloudio/uni-app'

/**
 * 拦截返回键并跳转到首页
 * @param targetPagePath 目标页面路径（默认首页）
 */
export function useBackButtonRedirect(targetPagePath: string = '/pages/index/index') {
  // 处理返回键事件
  const handleBackPress = (): boolean => {
    // 使用 redirectTo 跳转到首页，替换当前页面栈
    uni.redirectTo({
      url: targetPagePath,
      fail: (err) => {
        console.error('redirectTo 失败:', err)
        // 如果 redirectTo 失败，尝试使用 reLaunch
        uni.reLaunch({
          url: targetPagePath,
          fail: (reLaunchErr) => {
            console.error('reLaunch 也失败:', reLaunchErr)
          },
        })
      },
    })
    // 返回 true 表示阻止默认返回行为
    return true
  }

  // 自动注册返回键监听
  onBackPress(() => {
    return handleBackPress()
  })

  return {
    handleBackPress,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/composables/useBackButtonRedirect.ts
git commit -m "feat(composable): add useBackButtonRedirect for TabBar pages"
```

---

## Task 4: Update Profile Page with Enhanced Features

**Files:**
- Modify: `src/pages/profile/index.vue`

- [ ] **Step 1: Update script section imports and setup**

```vue
<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/store'
import { CacheService } from '@/services/CacheService'
import { useBackButtonRedirect } from '@/composables/useBackButtonRedirect'
import { useShare } from '@/composables/useShare'
import { getFavoritesCount } from '@/utils/favorites'
import { fullSyncFavorites } from '@/utils/syncFavorites'
import appConfig from '@/config/app.config'

// 拦截返回键，跳转到首页
useBackButtonRedirect('/pages/index/index')

// 启用分享功能
useShare({
  title: `${appConfig.appName} - 个人中心`,
  path: '/pages/profile/index'
})

const userStore = useUserStore()
const { userInfo, isLoggedIn } = storeToRefs(userStore)

// 收藏数量
const favoritesCount = ref(getFavoritesCount())
const viewedCount = computed(() => userInfo.value.viewedRankingsCount || 0)

onShow(() => {
  // 每次页面显示时刷新收藏数量
  favoritesCount.value = getFavoritesCount()
  if (isLoggedIn.value) {
    userStore.fetchProfile()
  }
})

const handleLogin = async () => {
  if (isLoggedIn.value) return

  uni.showLoading({ title: '登录中...', mask: true })

  try {
    let wechatUserInfo = null

    // #ifdef MP-WEIXIN
    try {
      wechatUserInfo = await new Promise<any>((resolve) => {
        wx.getUserProfile({
          desc: '用于完善用户资料',
          success: (res: any) => {
            resolve(res.userInfo)
          },
          fail: () => {
            resolve(null)
          }
        })
      })
    } catch (e) {
      console.log('获取授权失败，继续登录:', e)
    }
    // #endif

    await userStore.login(wechatUserInfo)
    // 登录后等待收藏同步完成再刷新数量
    await fullSyncFavorites().catch(() => {})
    favoritesCount.value = getFavoritesCount()
    uni.showToast({ title: '登录成功', icon: 'success' })
  } catch (e) {
    console.error('登录失败:', e)
    uni.showToast({ title: '登录失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

const handleLogout = () => {
  userStore.logout()
  favoritesCount.value = 0
  uni.showToast({ title: '已退出', icon: 'none' })
}

// 修改昵称
const handleEditNickname = () => {
  uni.showModal({
    title: '修改昵称',
    editable: true,
    placeholderText: '请输入新昵称',
    content: userInfo.value.name,
    success: async (res) => {
      if (res.confirm && res.content) {
        const newName = res.content.trim()
        if (!newName) {
          uni.showToast({ title: '昵称不能为空', icon: 'none' })
          return
        }
        if (newName.length > 20) {
          uni.showToast({ title: '昵称不能超过20个字符', icon: 'none' })
          return
        }

        uni.showLoading({ title: '保存中...', mask: true })
        const result = await userStore.updateUserInfo({ name: newName })
        uni.hideLoading()

        if (result.success) {
          uni.showToast({ title: '修改成功', icon: 'success' })
        } else {
          uni.showToast({ title: result.message || '修改失败', icon: 'none' })
        }
      }
    }
  })
}

const goToFavorites = () => {
  uni.navigateTo({ url: '/pages/profile/favorites/index' })
}

const goToSubscription = () => {
  uni.navigateTo({ url: '/pages/profile/subscription/index' })
}

const goToAgreement = () => {
  uni.navigateTo({ url: '/pages/profile/agreement/index' })
}

const goToPrivacy = () => {
  uni.navigateTo({ url: '/pages/profile/privacy/index' })
}

const goToAbout = () => {
  uni.navigateTo({ url: '/pages/profile/about/index' })
}

const handleClearCache = () => {
  CacheService.confirmAndClear()
}
</script>
```

- [ ] **Step 2: Update template section - Add edit icon to nickname**

Find this section in the template:
```vue
<text class="user-name">{{ userInfo?.name || '用户' }}</text>
```

Replace with:
```vue
<view class="user-name-row">
  <text class="user-name">{{ userInfo?.name || '用户' }}</text>
  <wd-icon v-if="isLoggedIn" name="edit" size="16px" class="edit-icon" @click.stop="handleEditNickname" />
</view>
```

- [ ] **Step 3: Update template section - Add user ID display**

Find the user-id-row section and update to show ID:
```vue
<view class="user-id-row">
  <text class="user-id">ID: {{ userInfo?.id ? userInfo.id.substring(0, 8) : '...' }}</text>
</view>
```

- [ ] **Step 4: Update template section - Update stats card to use local favorites count**

Replace the stats value:
```vue
<view class="stat-item" @click="goToFavorites">
  <text class="stat-value">{{ favoritesCount }}</text>
  <text class="stat-label">我的收藏</text>
</view>
```

- [ ] **Step 5: Add CSS for edit icon**

```scss
.user-name-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.edit-icon {
  opacity: 0.7;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/profile/index.vue
git commit -m "feat(profile): add nickname editing and wx.getUserProfile login"
```

---

## Verification Steps

After completing all tasks:

1. **Test favorites sync flow**:
   - Add some favorites while logged out
   - Login via profile page
   - Verify favorites are preserved and synced

2. **Test nickname editing**:
   - Click edit icon next to nickname
   - Enter new nickname (test validation: empty, >20 chars)
   - Verify nickname updates

3. **Test back button redirect**:
   - Open profile page
   - Press Android back button
   - Verify it redirects to index instead of exiting app

4. **Test getFavoritesCount**:
   ```typescript
   import { getFavoritesCount } from '@/utils/favorites'
   console.log('Favorites count:', getFavoritesCount())
   ```

---

**Plan complete.** This plan enhances the profile page with user-friendly features while maintaining the local-first architecture.
