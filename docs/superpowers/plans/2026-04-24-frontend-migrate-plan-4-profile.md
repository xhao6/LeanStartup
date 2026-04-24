# Plan 4: 个人中心 + 子页面 (profile, favorites, subscription, about, agreement, privacy)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 LeanSkill 的个人中心及子页面迁移到 LeanStartup，包括 profile、favorites、subscription、about、agreement、privacy。

**Architecture:** 从 LeanSkill 复制页面文件，替换 skill→case 术语和配色。由于 LeanSkill 依赖 `wot-design-uni` 组件库（`wd-cell`、`wd-button`、`wd-icon`），而 LeanStartup 可能没有安装此库，这里采用两种策略：1) 对于 profile 首页，用原生 view/text 替代 `wd-cell-group`/`wd-cell`；2) 对于其他简单页面，直接用原生实现。

LeanStartup 的用户登录模型与 LeanSkill 不同（微信小程序天然免登录，openid 由云函数 context 获取），因此 profile 页需要简化登录流程。

---

## Task 4.1: 重写个人中心首页

**Files:**
- Replace: `src/pages/profile/index.vue`

从 LeanSkill 的 `pages/profile/index.vue` 适配。用原生 view 替代 `wd-cell-group`/`wd-cell`，简化登录流程（去掉 `getUserProfile`，使用静默登录）。

**关键适配：**
- 颜色替换：`#0F172A`→`#1A1A2E`, `#F97316`→`#E94560`, `#E2E8F0`→`#E8E6E1`
- 使用 `useCaseStore` 替代 skill 相关引用
- 使用 LeanStartup 的 `useLogin` composable 进行静默登录
- 用原生 view/text 构建 menu list，不依赖 `wd-cell`
- 使用 `appConfig` from `@/config/app.config`

```vue
<!-- src/pages/profile/index.vue -->
<route lang="json">
{
  "layout": "tabbar",
  "style": {
    "navigationBarTitleText": "我的"
  }
}
</route>

<template>
  <view class="profile-page min-h-screen" style="background: #FAFAF8;">
    <!-- Header -->
    <view class="profile-header">
      <!-- Decorative circles -->
      <view class="deco-circle deco-circle-1"></view>
      <view class="deco-circle deco-circle-2"></view>

      <view class="user-info" @click="handleLogin">
        <view class="avatar-wrapper">
          <image
            :src="userInfo?.avatar || '/static/images/placeholder-avatar.png'"
            class="avatar"
            mode="aspectFill"
          />
        </view>
        <view class="user-text">
          <template v-if="isLoggedIn">
            <text class="user-name">{{ userInfo?.name || '用户' }}</text>
            <view class="user-id-row">
              <text class="user-id">已登录</text>
            </view>
          </template>
          <template v-else>
            <text class="user-name">点击登录</text>
            <text class="user-id">登录同步收藏数据</text>
          </template>
        </view>
      </view>
    </view>

    <!-- Stats Card -->
    <view class="stats-card-wrapper">
      <view class="stats-card">
        <view class="stat-item">
          <text class="stat-value">{{ viewedCount }}</text>
          <text class="stat-label">已阅榜单</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item" @click="goToFavorites">
          <text class="stat-value">{{ favoritesCount }}</text>
          <text class="stat-label">我的收藏</text>
        </view>
      </view>
    </view>

    <!-- Menu List -->
    <view class="menu-section">
      <view class="menu-card">
        <view class="menu-item" @click="goToSubscription">
          <text class="menu-icon">🔔</text>
          <text class="menu-title">订阅管理</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-divider"></view>
        <view class="menu-item" @click="goToFavorites">
          <text class="menu-icon">⭐</text>
          <text class="menu-title">我的收藏</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-divider"></view>
        <button class="menu-item share-btn" open-type="share">
          <text class="menu-icon">📤</text>
          <text class="menu-title">转发给朋友</text>
          <text class="menu-arrow">›</text>
        </button>
        <view class="menu-divider"></view>
        <button class="menu-item contact-btn" open-type="contact">
          <text class="menu-icon">💬</text>
          <text class="menu-title">联系客服</text>
          <text class="menu-arrow">›</text>
        </button>
        <view class="menu-divider"></view>
        <view class="menu-item" @click="goToAgreement">
          <text class="menu-icon">📄</text>
          <text class="menu-title">用户协议</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-divider"></view>
        <view class="menu-item" @click="goToPrivacy">
          <text class="menu-icon">🔒</text>
          <text class="menu-title">隐私政策</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-divider"></view>
        <view class="menu-item" @click="handleClearCache">
          <text class="menu-icon">🗑</text>
          <text class="menu-title">清除缓存</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-divider"></view>
        <view class="menu-item" @click="goToAbout">
          <text class="menu-icon">ℹ️</text>
          <text class="menu-title">关于精益副业案例库</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>

      <!-- 退出登录 -->
      <view v-if="isLoggedIn" class="logout-section">
        <view class="logout-btn" @click="handleLogout">
          <text class="logout-text">退出登录</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref, computed } from 'vue'
import { useUserStore } from '@/store'
import { useCollectionStore } from '@/store/collection'
import { CacheService } from '@/services/CacheService'
import { useShare } from '@/composables/useShare'
import appConfig from '@/config/app.config'

useShare({
  title: `${appConfig.appName} - 个人中心`,
  path: '/pages/profile/index'
})

const userStore = useUserStore()
const collectionStore = useCollectionStore()
const userInfo = computed(() => userStore.userInfo)
const isLoggedIn = computed(() => userStore.isLoggedIn)

const viewedCount = ref(0)
const favoritesCount = computed(() => collectionStore.collections.length)

onShow(() => {
  refreshData()
})

const refreshData = () => {
  if (isLoggedIn.value) {
    collectionStore.refresh()
  }
}

const handleLogin = async () => {
  if (isLoggedIn.value) return

  uni.showLoading({ title: '登录中...', mask: true })
  try {
    // 微信小程序静默登录：openid 在云函数 context 中自动获取
    userStore.setUser({ id: 'wechat_user', name: '微信用户' })
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

<style scoped>
.profile-page {
  padding-bottom: 100px;
}

/* Header */
.profile-header {
  background: #1A1A2E;
  padding: 48px 32px 64px;
  position: relative;
  overflow: hidden;
}

.deco-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  pointer-events: none;
}

.deco-circle-1 {
  right: -40px;
  top: -40px;
  width: 160px;
  height: 160px;
}

.deco-circle-2 {
  left: 40px;
  bottom: 0;
  width: 80px;
  height: 80px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.avatar-wrapper {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
  padding: 4px;
  overflow: hidden;
  flex-shrink: 0;
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #FFFFFF;
}

.user-text {
  flex: 1;
}

.user-name {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #FFFFFF;
}

.user-id-row {
  margin-top: 4px;
}

.user-id {
  display: inline-block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 8px;
  border-radius: 9999px;
}

/* Stats Card */
.stats-card-wrapper {
  padding: 0 16px;
  margin-top: -32px;
  position: relative;
  z-index: 20;
}

.stats-card {
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(26, 26, 46, 0.06);
  padding: 20px;
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #1A1A2E;
  margin-bottom: 4px;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #9B9A97;
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: #E8E6E1;
}

/* Menu Section */
.menu-section {
  padding: 16px;
}

.menu-card {
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 16px 18px;
  width: 100%;
  background: transparent;
  border: none;
  text-align: left;
  font-size: 16px;
}

.menu-item::after {
  border: none;
}

.menu-icon {
  font-size: 18px;
  margin-right: 12px;
  flex-shrink: 0;
}

.menu-title {
  flex: 1;
  font-size: 16px;
  font-weight: 500;
  color: #1A1A2E;
}

.menu-arrow {
  font-size: 18px;
  color: #9B9A97;
}

.menu-divider {
  height: 1px;
  background: #E8E6E1;
  margin: 0 18px;
}

.share-btn, .contact-btn {
  margin: 0;
  padding: 16px 18px;
  background: transparent;
  border: none;
  line-height: normal;
}

.share-btn::after, .contact-btn::after {
  border: none;
}

/* Logout */
.logout-section {
  margin-top: 16px;
}

.logout-btn {
  background: #FFFFFF;
  border-radius: 16px;
  padding: 14px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.logout-btn:active {
  opacity: 0.85;
}

.logout-text {
  font-size: 16px;
  font-weight: 500;
  color: #E94560;
}
</style>
```

- [ ] **Step 1:** 替换 `src/pages/profile/index.vue`
- [ ] **Step 2:** Commit

```bash
git add src/pages/profile/index.vue && git commit -m "feat: rewrite profile page adapted from LeanSkill"
```

---

## Task 4.2: 重写收藏列表页

**Files:**
- Replace: `src/pages/profile/favorites/index.vue`

从 LeanSkill 的 `pages/profile/favorites/index.vue` 适配。由于 LeanStartup 有自己的收藏 API（`getUserCollections`、`toggleCollection`），这里改为直接调用 LeanStartup 的 API，而非使用 LeanSkill 的 `utils/favorites.ts`。

**关键适配：**
- 调用 `getUserCollections` 获取收藏列表
- 调用 `toggleCollection({ case_id, action: 'uncollect' })` 取消收藏
- 颜色替换同上
- 不使用 `wd-icon` 和 `wd-button`

```vue
<!-- src/pages/profile/favorites/index.vue -->
<route lang="json">
{
  "layout": "default",
  "style": {
    "navigationBarTitleText": "我的收藏"
  }
}
</route>

<template>
  <view class="favorites-page min-h-screen" style="background: #FAFAF8;">
    <!-- 空状态 -->
    <view v-if="!loading && favoritesList.length === 0" class="empty-state">
      <text class="empty-text">暂无收藏内容</text>
      <text class="empty-hint">浏览案例时点击收藏，内容会出现在这里</text>
      <view class="empty-btn" @click="goToHome">
        <text class="empty-btn-text">去发现</text>
      </view>
    </view>

    <!-- 收藏列表 -->
    <view v-else class="favorites-list">
      <view
        v-for="caseId in collections"
        :key="caseId"
        class="fav-card"
        @click="goToDetail(caseId)"
      >
        <view class="fav-content">
          <text class="fav-title">{{ getCollectionTitle(caseId) }}</text>
          <view class="fav-meta">
            <text class="fav-score">{{ getCollectionScore(caseId) }}★</text>
            <text class="fav-progress">{{ getProgressText(caseId) }}</text>
          </view>
        </view>
        <view class="fav-action" @click.stop="handleRemove(caseId)">
          <text class="fav-remove-icon">★</text>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="hasMore" class="load-more" @click="handleLoadMore">
        <text class="load-more-text">{{ loading ? '加载中...' : '加载更多' }}</text>
      </view>

      <!-- 底部统计 -->
      <view v-else class="list-footer">
        <text class="footer-text">共 {{ collections.length }} 个收藏</text>
      </view>
    </view>

    <!-- Loading -->
    <view v-if="loading && !collections.length" class="loading-state">
      <text class="loading-text">加载中...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useCollectionStore } from '@/store/collection'

const collectionStore = useCollectionStore()

const loading = computed(() => collectionStore.loading)
const collections = computed(() => collectionStore.collections)
const favoritesList = computed(() => collectionStore.collections)
const hasMore = computed(() => collectionStore.hasMore)

onShow(() => {
  collectionStore.refresh()
})

const getCollectionTitle = (caseId: string): string => {
  const item = collectionStore.getCollection(caseId)
  return item?.title || '加载中...'
}

const getCollectionScore = (caseId: string): string => {
  const item = collectionStore.getCollection(caseId)
  return item?.score_total ? String(item.score_total) : '-'
}

const getProgressText = (caseId: string): string => {
  const item = collectionStore.getCollection(caseId)
  if (!item) return ''
  return `${item.completed_count || 0}/${item.steps_count || 0} 步`
}

const goToDetail = (caseId: string) => {
  uni.navigateTo({ url: `/pages/case-detail/index?id=${caseId}` })
}

const handleRemove = (caseId: string) => {
  uni.showModal({
    title: '取消收藏',
    content: '确定要取消收藏吗？',
    confirmColor: '#E94560',
    success: async (res) => {
      if (res.confirm) {
        try {
          await collectionStore.toggle(caseId)
          uni.showToast({ title: '已取消收藏', icon: 'none' })
        } catch (e) {
          uni.showToast({ title: '操作失败', icon: 'none' })
        }
      }
    }
  })
}

const handleLoadMore = () => {
  collectionStore.loadMore()
}

const goToHome = () => {
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

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

.empty-btn:active { opacity: 0.85; }

.empty-btn-text {
  font-size: 14px;
  color: #4A4A68;
}

/* Favorites List */
.favorites-list {
  padding: 16px 16px 0;
}

.fav-card {
  display: flex;
  align-items: center;
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #E8E6E1;
}

.fav-card:active { opacity: 0.85; }

.fav-content {
  flex: 1;
  min-width: 0;
}

.fav-title {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #1A1A2E;
  line-height: 1.4;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fav-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fav-score {
  font-size: 13px;
  color: #F5A623;
  font-weight: 600;
}

.fav-progress {
  font-size: 12px;
  color: #9B9A97;
}

.fav-action {
  padding: 8px;
  margin-left: 8px;
}

.fav-remove-icon {
  font-size: 18px;
  color: #E94560;
}

/* Loading */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
}

.loading-text {
  font-size: 14px;
  color: #9B9A97;
}

/* Footer */
.list-footer {
  padding: 16px 0 32px;
  text-align: center;
}

.footer-text {
  font-size: 12px;
  color: #9B9A97;
}
</style>
```

- [ ] **Step 1:** 替换 `src/pages/profile/favorites/index.vue`
- [ ] **Step 2:** Commit

```bash
git add src/pages/profile/favorites/index.vue && git commit -m "feat: rewrite favorites page using collection API"
```

---

## Task 4.3: 重写订阅管理页

**Files:**
- Replace: `src/pages/profile/subscription/index.vue`

从 LeanSkill 的 `pages/profile/subscription/index.vue` 适配。改用 LeanStartup 的 subscription store 方法名（`doSubscribe`/`doUnsubscribe`），替换配色。

**关键适配：**
- `subscriptionStore.subscribe()` → `subscriptionStore.doSubscribe()`
- `subscriptionStore.unsubscribe()` → `subscriptionStore.doUnsubscribe()`
- 颜色 `#F97316` → `#E94560`
- 不使用 `wd-icon`、`wd-button`

```vue
<!-- src/pages/profile/subscription/index.vue -->
<route lang="json">
{
  "layout": "default",
  "style": {
    "navigationBarTitleText": "订阅管理"
  }
}
</route>

<template>
  <view class="subscription-page min-h-screen" style="background: #FAFAF8;">
    <!-- 订阅状态卡片 -->
    <view class="status-card">
      <view class="status-header">
        <view :class="['status-icon', isSubscribed ? 'subscribed' : 'unsubscribed']">
          <text class="icon-text">{{ isSubscribed ? '🔔' : '🔕' }}</text>
        </view>
        <view class="status-info">
          <text class="status-title">{{ isSubscribed ? '已订阅' : '未订阅' }}</text>
          <text class="status-desc">{{ statusDesc }}</text>
        </view>
      </view>

      <!-- 订阅详情 -->
      <view v-if="isSubscribed" class="subscription-details">
        <view class="detail-item">
          <text class="detail-label">推送时间</text>
          <text class="detail-value">每天 8:00</text>
        </view>
        <view class="detail-item">
          <text class="detail-label">推送内容</text>
          <text class="detail-value">今日 TOP 3 案例</text>
        </view>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="action-section">
      <view
        v-if="!isSubscribed"
        class="action-btn subscribe-btn"
        @click="handleSubscribe"
      >
        <text class="action-btn-text">{{ loading ? '处理中...' : '立即订阅' }}</text>
      </view>
      <view
        v-else
        class="action-btn unsubscribe-btn"
        @click="handleUnsubscribe"
      >
        <text class="action-btn-text unsubscribe-text">{{ loading ? '处理中...' : '取消订阅' }}</text>
      </view>
    </view>

    <!-- 说明信息 -->
    <view class="info-section">
      <text class="info-title">订阅说明</text>
      <view class="info-list">
        <view class="info-item">
          <view class="info-dot"></view>
          <text class="info-text">每天上午 8 点准时推送当日榜单</text>
        </view>
        <view class="info-item">
          <view class="info-dot"></view>
          <text class="info-text">获取 TOP 3 最热门副业案例推荐</text>
        </view>
        <view class="info-item">
          <view class="info-dot"></view>
          <text class="info-text">一次性订阅，每次接收需要授权</text>
        </view>
        <view class="info-item">
          <view class="info-dot"></view>
          <text class="info-text">点击订阅即可授权下次推送通知</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useSubscriptionStore } from '@/store/subscription'

const subscriptionStore = useSubscriptionStore()

const isSubscribed = computed(() => subscriptionStore.isSubscribed)
const loading = computed(() => subscriptionStore.loading)

const statusDesc = computed(() => {
  return isSubscribed.value
    ? '授权成功，下次推送时将收到通知'
    : '授权后可在下次榜单更新时收到通知'
})

onShow(async () => {
  if (!subscriptionStore.isSubscribed) {
    try {
      await subscriptionStore.checkStatus({ force: true })
    } catch (err) {
      console.error('Failed to load status:', err)
    }
  }
})

const handleSubscribe = async () => {
  const templateId = '4cTtUI36EsezKm-B17z7lNt8gvWDX_AYRVlXeuOh8Wo'

  try {
    await new Promise<void>((resolve, reject) => {
      wx.requestSubscribeMessage({
        tmplIds: [templateId],
        success: (res: any) => {
          if (res[templateId] === 'accept') {
            resolve()
          } else if (res[templateId] === 'reject') {
            reject(new Error('用户拒绝授权'))
          } else {
            reject(new Error('授权失败'))
          }
        },
        fail: (err: any) => {
          reject(err)
        }
      })
    })

    await subscriptionStore.doSubscribe()
    if (subscriptionStore.isSubscribed) {
      uni.showToast({ title: '订阅成功', icon: 'success' })
    } else {
      uni.showToast({ title: '订阅失败', icon: 'none' })
    }
  } catch (err: any) {
    if (err.errMsg?.includes('requestSubscribeMessage:fail')) {
      uni.showToast({ title: '需要授权才能接收通知', icon: 'none', duration: 2000 })
    } else if (err.message === '用户拒绝授权') {
      uni.showToast({ title: '已取消授权', icon: 'none' })
    } else {
      uni.showToast({ title: err.message || '订阅失败', icon: 'none' })
    }
  }
}

const handleUnsubscribe = async () => {
  uni.showModal({
    title: '取消订阅',
    content: '取消后将不再收到每日推送通知，确定要取消吗？',
    confirmColor: '#E94560',
    success: async (res) => {
      if (res.confirm) {
        try {
          await subscriptionStore.doUnsubscribe()
          uni.showToast({ title: '已取消订阅', icon: 'success' })
        } catch (err: any) {
          uni.showToast({ title: err.message || '取消失败', icon: 'none' })
        }
      }
    }
  })
}
</script>

<style scoped>
/* Status Card */
.status-card {
  background: #FFFFFF;
  margin: 16px;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.status-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.status-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.status-icon.subscribed {
  background: linear-gradient(135deg, #E94560 0%, #FF6B8A 100%);
}

.status-icon.unsubscribed {
  background: #E8E6E1;
}

.icon-text {
  font-size: 28px;
}

.status-info {
  flex: 1;
}

.status-title {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #1A1A2E;
  margin-bottom: 4px;
}

.status-desc {
  display: block;
  font-size: 13px;
  color: #9B9A97;
}

/* Subscription Details */
.subscription-details {
  border-top: 1px solid #E8E6E1;
  padding-top: 16px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
}

.detail-label {
  font-size: 14px;
  color: #9B9A97;
}

.detail-value {
  font-size: 14px;
  font-weight: 500;
  color: #1A1A2E;
}

/* Action Section */
.action-section {
  padding: 0 16px;
  margin-bottom: 24px;
}

.action-btn {
  border-radius: 12px;
  padding: 14px;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
}

.subscribe-btn {
  background: #E94560;
}

.subscribe-btn:active { opacity: 0.85; }

.action-btn-text {
  color: #FFFFFF;
  font-size: 16px;
  font-weight: 600;
}

.unsubscribe-btn {
  background: #FFFFFF;
  border: 1px solid #E8E6E1;
}

.unsubscribe-btn:active { opacity: 0.85; }

.unsubscribe-text {
  color: #E94560;
}

/* Info Section */
.info-section {
  background: #FFFFFF;
  margin: 0 16px 16px;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.info-title {
  font-size: 16px;
  font-weight: 600;
  color: #1A1A2E;
  margin-bottom: 16px;
  display: block;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.info-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #E94560;
  margin-top: 6px;
  flex-shrink: 0;
}

.info-text {
  flex: 1;
  font-size: 13px;
  color: #4A4A68;
  line-height: 1.6;
}
</style>
```

- [ ] **Step 1:** 替换 `src/pages/profile/subscription/index.vue`
- [ ] **Step 2:** Commit

```bash
git add src/pages/profile/subscription/index.vue && git commit -m "feat: rewrite subscription page adapted from LeanSkill"
```

---

## Task 4.4: 实现关于/协议/隐私页面

**Files:**
- Replace: `src/pages/profile/about/index.vue`
- Replace: `src/pages/profile/agreement/index.vue`
- Replace: `src/pages/profile/privacy/index.vue`

这三个页面是简单的纯文本页面，不需要从 LeanSkill 复制，直接实现即可。

**about/index.vue:**

```vue
<!-- src/pages/profile/about/index.vue -->
<route lang="json">
{
  "layout": "default",
  "style": { "navigationBarTitleText": "关于" }
}
</route>

<template>
  <view class="about-page" style="background: #FAFAF8; min-height: 100vh;">
    <view class="about-content">
      <text class="app-name">精益副业案例库</text>
      <text class="app-version">v1.0.0</text>
      <text class="app-desc">每日精选 3 个可落地的副业赚钱案例，通过多维评分体系帮你发现真正值得尝试的机会。</text>

      <view class="info-card">
        <view class="info-item">
          <text class="info-label">评分维度</text>
          <text class="info-value">可行性 · 利润率 · 时效性 · 细节度 · 匹配度</text>
        </view>
        <view class="info-divider"></view>
        <view class="info-item">
          <text class="info-label">数据来源</text>
          <text class="info-value">全网副业实战帖子精选</text>
        </view>
        <view class="info-divider"></view>
        <view class="info-item">
          <text class="info-label">更新频率</text>
          <text class="info-value">每日 8:00 准时更新</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.about-content {
  padding: 32px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.app-name {
  font-size: 22px;
  font-weight: 700;
  color: #1A1A2E;
  margin-bottom: 4px;
}

.app-version {
  font-size: 13px;
  color: #9B9A97;
  margin-bottom: 16px;
}

.app-desc {
  font-size: 14px;
  color: #4A4A68;
  line-height: 1.6;
  text-align: center;
  margin-bottom: 24px;
}

.info-card {
  width: 100%;
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
}

.info-label {
  font-size: 14px;
  color: #9B9A97;
}

.info-value {
  font-size: 14px;
  color: #1A1A2E;
  font-weight: 500;
  text-align: right;
  max-width: 200px;
}

.info-divider {
  height: 1px;
  background: #E8E6E1;
}
</style>
```

**agreement/index.vue:**

```vue
<!-- src/pages/profile/agreement/index.vue -->
<route lang="json">
{
  "layout": "default",
  "style": { "navigationBarTitleText": "用户协议" }
}
</route>

<template>
  <view class="legal-page" style="background: #FAFAF8; min-height: 100vh;">
    <view class="legal-content">
      <text class="legal-title">用户协议</text>
      <text class="legal-text">最后更新日期：2026年4月24日</text>

      <text class="legal-section-title">一、服务说明</text>
      <text class="legal-text">精益副业案例库（以下简称"本应用"）为用户提供副业案例信息推荐服务。所有案例仅供参考，不构成任何投资建议。</text>

      <text class="legal-section-title">二、用户行为规范</text>
      <text class="legal-text">用户在使用本应用时，应遵守相关法律法规，不得利用本应用从事违法活动。用户应对自己的行为承担全部责任。</text>

      <text class="legal-section-title">三、免责声明</text>
      <text class="legal-text">本应用提供的案例信息来源于公开渠道，我们尽力确保信息准确性但不作保证。用户根据案例信息做出的决策，本应用不承担任何责任。</text>

      <text class="legal-section-title">四、知识产权</text>
      <text class="legal-text">本应用的所有内容（包括但不限于文字、图片、设计）均为原创或已获授权，未经许可不得转载。</text>
    </view>
  </view>
</template>

<style scoped>
.legal-content {
  padding: 20px;
}

.legal-title {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #1A1A2E;
  margin-bottom: 8px;
}

.legal-text {
  display: block;
  font-size: 14px;
  color: #4A4A68;
  line-height: 1.8;
  margin-bottom: 12px;
}

.legal-section-title {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #1A1A2E;
  margin-top: 20px;
  margin-bottom: 8px;
}
</style>
```

**privacy/index.vue:**

```vue
<!-- src/pages/profile/privacy/index.vue -->
<route lang="json">
{
  "layout": "default",
  "style": { "navigationBarTitleText": "隐私政策" }
}
</route>

<template>
  <view class="legal-page" style="background: #FAFAF8; min-height: 100vh;">
    <view class="legal-content">
      <text class="legal-title">隐私政策</text>
      <text class="legal-text">最后更新日期：2026年4月24日</text>

      <text class="legal-section-title">一、信息收集</text>
      <text class="legal-text">本应用通过微信小程序平台运行，可能收集以下信息：微信 openid（用于身份识别）、收藏数据、订阅状态。我们不会收集您的真实姓名、手机号等个人信息。</text>

      <text class="legal-section-title">二、信息使用</text>
      <text class="legal-text">收集的信息仅用于：提供案例推荐服务、保存用户收藏和订阅状态、改善用户体验。我们不会将您的信息出售给第三方。</text>

      <text class="legal-section-title">三、信息存储</text>
      <text class="legal-text">用户数据存储在腾讯云开发（CloudBase）平台，享有企业级安全保障。本地缓存数据存储在您的设备上，您可随时清除。</text>

      <text class="legal-section-title">四、用户权利</text>
      <text class="legal-text">您有权随时清除本地缓存数据、取消订阅推送通知。如需删除云端数据，请联系客服处理。</text>
    </view>
  </view>
</template>

<style scoped>
.legal-content {
  padding: 20px;
}

.legal-title {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #1A1A2E;
  margin-bottom: 8px;
}

.legal-text {
  display: block;
  font-size: 14px;
  color: #4A4A68;
  line-height: 1.8;
  margin-bottom: 12px;
}

.legal-section-title {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #1A1A2E;
  margin-top: 20px;
  margin-bottom: 8px;
}
</style>
```

- [ ] **Step 1:** 替换三个文件
- [ ] **Step 2:** Commit

```bash
git add src/pages/profile/about/index.vue src/pages/profile/agreement/index.vue src/pages/profile/privacy/index.vue && git commit -m "feat: implement about, agreement and privacy pages"
```

---

## Task 4.5: 验证构建

- [ ] **Step 1:** 运行完整构建确认无错误

```bash
cd d:/MyWork/LeanMind/LeanStartup && npm run build:mp-weixin 2>&1 | tail -10
```

Expected: `DONE  Build complete.`

- [ ] **Step 2:** 确认所有页面路由配置正确，无 404 页面
