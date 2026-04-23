# 前端实现设计文档 — 精益副业案例库

> **创建日期**: 2026-04-23
> **项目类型**: 微信小程序（UniApp + Vue3 + TypeScript）
> **UI 框架**: wot-design-uni
> **设计系统**: 参考 DESIGN.md

---

## 1. 设计决策确认

### 1.1 转发功能
**方案**: 微信小程序原生分享（`onShareAppMessage`）
- 自定义分享标题、路径、图片
- 无需额外云函数
- 详情页分享按钮 + 个人中心"转发给朋友"菜单项

### 1.2 订阅管理
**方案**: 简单订阅提醒
- 首页订阅横幅 → 点击调用 `requestSubscribeMessage`
- 使用 `subscribeMessage` 云函数（已实现）记录订阅
- 每日6:00定时任务推送（`generateDailyPick` 已集成）

### 1.3 客服功能
**方案**: 微信小程序原生客服
- `<button open-type="contact">`
- 使用微信客服消息后台
- 无需额外开发

### 1.4 UI组件库
**方案**: wot-design-uni
- 与 LeanSkill 保持一致
- 主要组件：`wd-cell`, `wd-button`, `wd-icon`, `wd-toast`, `wd-loading`

### 1.5 数据缓存
**方案**: 简单缓存（1小时）
- 首页数据缓存1小时
- 支持下拉刷新强制更新

---

## 2. 技术栈

```json
{
  "框架": "UniApp + Vue3 + TypeScript",
  "UI库": "wot-design-uni",
  "状态管理": "Pinia",
  "HTTP": "Alova (参考 LeanSkill)",
  "样式": "TailwindCSS + 自定义Design Tokens",
  "字体": "Noto Serif SC + Noto Sans SC + Roboto Mono",
  "云开发": "wx.cloud (微信小程序)"
}
```

---

## 3. 项目结构

```
src/
├── api/                    # API 模块
│   ├── modules/
│   │   ├── case.ts        # 案例相关API
│   │   ├── collection.ts  # 收藏相关API
│   │   ├── user.ts        # 用户相关API
│   │   └── subscribe.ts   # 订阅相关API
│   └── index.ts
├── components/             # 公共组件
│   ├── CaseCard.vue       # 案例卡片
│   ├── ScoreBadge.vue     # 评分徽章
│   ├── TagMor.vue         # 莫兰迪标签
│   └── ShareCard.vue      # 分享卡片生成器
├── composables/           # 组合式函数
│   ├── useShare.ts        # 分享功能
│   ├── useLogin.ts        # 登录逻辑
│   └── useCache.ts        # 缓存逻辑
├── pages/                 # 页面
│   ├── index/             # 首页（今日精选Top3）
│   ├── case-detail/       # 案例详情页
│   ├── history/           # 历史榜单页
│   └── profile/           # 个人中心页
│       ├── favorites/     # 我的收藏
│       └── subscription/  # 订阅管理
├── store/                 # Pinia Store
│   ├── user.ts           # 用户状态
│   ├── collection.ts     # 收藏状态
│   └── cache.ts          # 缓存状态
├── services/             # 服务层
│   ├── CacheService.ts   # 缓存服务
│   └── ShareService.ts   # 分享服务
├── styles/               # 样式
│   ├── design-tokens.scss  # Design Tokens
│   └── global.scss
└── utils/                # 工具函数
    ├── format.ts         # 格式化工具
    └── constants.ts      # 常量定义
```

---

## 4. 核心功能实现

### 4.1 首页（今日精选Top3）

**布局结构**:
```
┌─────────────────────────────────┐
│  今日精选  ● 2026-04-23          │
├─────────────────────────────────┤
│  ┌─────┐                         │
│  │  1  │  案例标题...           │
│  │金徽章│  ★★★★★  零成本      │
│  └─────┘  [摘要文字...]          │
├─────────────────────────────────┤
│  ┌─────┐                         │
│  │  2  │  案例标题...           │
│  │银徽章│  ★★★☆☆  低门槛      │
│  └─────┘  [摘要文字...]          │
├─────────────────────────────────┤
│  ┌─────┐                         │
│  │  3  │  案例标题...           │
│  │铜徽章│  ★★★★☆  零成本      │
│  └─────┘  [摘要文字...]          │
├─────────────────────────────────┤
│  ┌─────────────────────────────┐│
│  │ 📅 每日推送，不错过精彩案例  ││
│  │         [立即订阅]           ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

**关键代码**:
```vue
<template>
  <view class="bg-bg min-h-screen">
    <!-- 今日精选横幅 -->
    <view class="px-4 py-3 flex items-center justify-between">
      <view class="flex items-center gap-2">
        <view class="w-2 h-2 rounded-full bg-accent animate-pulse"></view>
        <text class="text-sm font-semibold">今日精选</text>
      </view>
      <text class="text-xs text-secondary">{{ currentDate }}</text>
    </view>

    <!-- 案例列表 -->
    <view class="px-4 space-y-3">
      <case-card
        v-for="(item, index) in todayCases"
        :key="item.id"
        :case="item"
        :rank="index + 1"
        @click="goToDetail(item.id)"
      />
    </view>

    <!-- 订阅横幅 -->
    <view class="mx-4 mt-6 bg-gradient-to-r from-accent to-pink-500 rounded-2xl p-5 text-white">
      <view class="flex items-center justify-between">
        <view>
          <view class="text-lg font-bold mb-1">每日推送</view>
          <view class="text-sm opacity-90">不错过每一个精彩案例</view>
        </view>
        <wd-button type="success" custom-class="!bg-white !text-accent" @click="handleSubscribe">
          立即订阅
        </wd-button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useCache } from '@/composables/useCache'

const { getCachedData, fetchWithCache } = useCache()
const todayCases = ref([])

onMounted(async () => {
  // 1小时缓存
  const data = await fetchWithCache('daily-pick', () => getDailyPick(), 3600_000)
  todayCases.value = data.cases
})

const handleSubscribe = async () => {
  uni.requestSubscribeMessage({
    tmplIds: ['模板消息ID'],
    success: () => {
      // 调用 subscribeMessage 云函数记录订阅
      wx.cloud.callFunction({
        name: 'subscribeMessage',
        data: { action: 'subscribe' }
      })
    }
  })
}
</script>
```

### 4.2 案例详情页

**布局结构**:
```
┌─────────────────────────────────┐
│ ← 案例详情              ⋯ 分享  │
├─────────────────────────────────┤
│  AI评分: 85.2                   │
│  ████████████░░░░ 85分         │
│                                 │
│  【案例标题】                   │
│  一句话摘要...                  │
│                                 │
│  ━━ 基础信息 ━━                │
│  💰 预期收益: 500-2000元/月     │
│  ⏱️ 启动周期: 1-2周             │
│  💵 成本: 零成本                │
│                                 │
│  ━━ 实践步骤 ━━                │
│  ☞ 第一步：注册账号             │
│  ☞ 第二步：发布内容             │
│  ☞ 第三步：持续优化             │
│                                 │
│  ━━ 推荐工具 ━━                │
│  📱 工具名称                    │
│     工具描述...                 │
│                                 │
│  ━━ 来源 ━━                    │
│  公众号名称 | 2024-04-20        │
└─────────────────────────────────┤
│ [收藏] [我在做] [分享]          │
└─────────────────────────────────┘
```

**关键代码**:
```vue
<template>
  <view class="bg-bg min-h-screen pb-20">
    <!-- 导航栏 -->
    <view class="fixed top-0 left-0 right-0 bg-surface z-50 px-4 py-3 flex items-center justify-between border-b">
      <wd-icon name="arrow-left" @click="goBack" />
      <text class="font-bold">案例详情</text>
      <wd-icon name="share" @click="handleShare" />
    </view>

    <!-- 内容区 -->
    <view class="pt-14 px-4">
      <!-- 评分可视化 -->
      <view class="bg-surface rounded-2xl p-5 mb-4 shadow-card">
        <view class="flex items-baseline gap-2 mb-4">
          <text class="text-5xl font-bold font-mono text-gold">{{ caseDetail.score_total }}</text>
          <text class="text-sm text-secondary">AI评分</text>
        </view>
        <!-- 维度评分进度条 -->
        <view class="space-y-2">
          <view v-for="dim in dimensions" :key="dim.key" class="flex items-center gap-3">
            <text class="text-xs w-16">{{ dim.label }}</text>
            <view class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <view class="h-full bg-accent rounded-full" :style="{ width: dim.percent }"></view>
            </view>
            <text class="text-xs font-mono w-8 text-right">{{ caseDetail[dim.key] }}</text>
          </view>
        </view>
      </view>

      <!-- 标题 + 摘要 -->
      <view class="mb-6">
        <text class="text-xl font-bold font-display leading-tight">{{ caseDetail.title }}</text>
        <text class="text-sm text-secondary mt-2 block">{{ caseDetail.summary }}</text>
      </view>

      <!-- 基础信息网格 -->
      <view class="bg-surface rounded-2xl p-4 mb-4">
        <view class="grid grid-cols-2 gap-4">
          <view class="flex items-center gap-2">
            <text class="text-lg">💰</text>
            <view>
              <text class="text-xs text-secondary block">预期收益</text>
              <text class="text-sm font-semibold">{{ caseDetail.expected_revenue }}</text>
            </view>
          </view>
          <view class="flex items-center gap-2">
            <text class="text-lg">⏱️</text>
            <view>
              <text class="text-xs text-secondary block">启动周期</text>
              <text class="text-sm font-semibold">{{ caseDetail.cycle }}</text>
            </view>
          </view>
          <view class="flex items-center gap-2">
            <text class="text-lg">💵</text>
            <view>
              <text class="text-xs text-secondary block">成本</text>
              <text class="text-sm font-semibold">{{ caseDetail.cost }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 来源信息 -->
      <view class="bg-surface rounded-2xl p-4 mb-4">
        <text class="text-xs text-secondary">来源：{{ caseDetail.source_account }} | {{ formatDate(caseDetail.source_date) }}</text>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <view class="fixed bottom-0 left-0 right-0 bg-surface border-t px-4 py-3 flex gap-3">
      <wd-button type="success" plain block @click="toggleCollection">
        {{ isCollected ? '已收藏' : '收藏' }}
      </wd-button>
      <wd-button type="primary" plain block @click="handleShare">
        分享
      </wd-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useShare } from '@/composables/useShare'
import { useLogin } from '@/composables/useLogin'

const caseDetail = ref(null)
const { onShareAppMessage } = useShare()
const { ensureLoggedIn } = useLogin()

onMounted(async () => {
  const res = await wx.cloud.callFunction({
    name: 'getCaseDetail',
    data: { caseId: caseId }
  })
  caseDetail.value = res.result.data
})

const toggleCollection = async () => {
  await ensureLoggedIn() // 确保已登录
  await wx.cloud.callFunction({
    name: 'toggleCollection',
    data: { caseId: caseId, action: 'toggle' }
  })
}

// 分享配置
onShareAppMessage({
  title: caseDetail.value?.title,
  path: `/pages/case-detail/index?id=${caseId}`,
  imageUrl: caseDetail.value?.cover_image
})
</script>
```

### 4.3 历史榜单页

**布局结构**:
```
┌─────────────────────────────────┐
│  历史榜单 ●              22期   │
├─────────────────────────────────┤
│  ━━ 2026年4月 ━━               │
│  ┌─────────────────────────────┐│
│  │ 04-20 (3期)                 ││
│  │ • 案例标题显示2行...        ││
│  │ • 案例标题显示2行...        ││
│  │ • 案例标题显示2行...        ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ 04-19 (3期)                 ││
│  │ • 案例标题...               ││
│  │ • 案例标题...               ││
│  │ • 案例标题...               ││
│  └─────────────────────────────┘│
├─────────────────────────────────┤
│        [加载更多]               │
└─────────────────────────────────┘
```

**关键代码**:
```vue
<template>
  <view class="bg-bg min-h-screen">
    <!-- 顶部导航 -->
    <view class="px-4 py-3 flex items-center justify-between border-b bg-surface">
      <view class="flex items-center gap-2">
        <view class="w-2 h-2 rounded-full bg-accent animate-pulse"></view>
        <text class="font-bold">历史榜单</text>
      </view>
      <text class="text-xs text-secondary">{{ totalCount }}期</text>
    </view>

    <!-- 月份分组列表 -->
    <scroll-view
      scroll-y
      class="h-screen"
      @scrolltolower="loadMore"
    >
      <view v-for="month in groupedHistory" :key="month.key" class="px-4 py-3">
        <text class="text-xs font-bold text-secondary mb-2 block">{{ month.label }}</text>
        <view v-for="day in month.days" :key="day.date" class="bg-surface rounded-2xl p-4 mb-3 shadow-card">
          <view class="flex items-center justify-between mb-2">
            <text class="text-sm font-semibold">{{ formatDate(day.date) }}</text>
            <text class="text-xs text-secondary">{{ day.count }}期</text>
          </view>
          <view class="space-y-1">
            <view v-for="item in day.cases" :key="item.id" class="text-sm text-secondary line-clamp-2">
              • {{ item.title }}
            </view>
          </view>
        </view>
      </view>
      <view class="py-4 text-center">
        <wd-button v-if="hasMore" @click="loadMore" loading="{{ loading }}">
          加载更多
        </wd-button>
        <text v-else class="text-xs text-muted">没有更多了</text>
      </view>
    </scroll-view>
  </view>
</template>
```

### 4.4 个人中心页

**布局结构**:
```
┌─────────────────────────────────┐
│  ┌─────────────────────────────┐│ ← 深色渐变背景
│  │   😊                        ││
│  │   点击登录                  ││
│  │   登录同步收藏数据           ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│ ← 统计卡片
│  │  已阅榜单  |  我的收藏       ││
│  │     0      |      0         ││
│  └─────────────────────────────┘│
│  ┌─────────────────────────────┐│
│  │ ⬡  订阅管理        ›       ││
│  │ ★  我的收藏        ›       ││
│  │ ↗  转发给朋友      ›       ││ ← button open-type="share"
│  │ 🎧  联系客服        ›       ││ ← button open-type="contact"
│  │ 📄  用户协议        ›       ││
│  │ 🔒  隐私政策        ›       ││
│  │ 🗑  清除缓存        ›       ││
│  │ ℹ  关于精益副业    ›       ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

**关键代码**:
```vue
<template>
  <view class="bg-gray-50 min-h-screen pb-20">
    <!-- 顶部登录区 -->
    <view class="bg-gradient-to-br from-[#2D2D44] to-[#1A1A2E] p-8 pt-12 pb-16 flex items-center space-x-4">
      <view class="border-2 border-white/30 rounded-full p-1" @click="handleLogin">
        <image :src="userInfo.avatar || '/static/images/avatar.svg'" class="w-16 h-16 rounded-full bg-white/20" />
      </view>
      <view class="text-white flex-1" @click="handleLogin">
        <template v-if="isLoggedIn">
          <text class="text-xl font-bold block">{{ userInfo.name }}</text>
          <text class="text-xs text-white/70">ID: {{ userInfo.id?.substring(0, 8) }}</text>
        </template>
        <template v-else>
          <text class="text-xl font-bold block">点击登录</text>
          <text class="text-xs text-white/70">登录同步收藏数据</text>
        </template>
      </view>
    </view>

    <!-- 统计卡片 -->
    <view class="px-4 -mt-8">
      <view class="bg-white rounded-2xl shadow-lg p-5 flex justify-around">
        <view class="text-center">
          <text class="text-xl font-bold text-primary">{{ viewedCount }}</text>
          <text class="text-xs text-gray-400 block">已阅榜单</text>
        </view>
        <view class="w-px bg-gray-100"></view>
        <view class="text-center">
          <text class="text-xl font-bold text-primary">{{ favoritesCount }}</text>
          <text class="text-xs text-gray-400 block">我的收藏</text>
        </view>
      </view>
    </view>

    <!-- 菜单列表 -->
    <view class="p-4 mt-2">
      <view class="bg-white rounded-2xl overflow-hidden">
        <wd-cell-group border>
          <wd-cell title="订阅管理" is-link icon="setting" size="large" @click="goToSubscription" />
          <wd-cell title="我的收藏" is-link icon="star" size="large" @click="goToFavorites" />
          <button class="share-btn" open-type="share">
            <wd-cell title="转发给朋友" is-link icon="share" size="large" />
          </button>
          <button class="contact-btn" open-type="contact">
            <wd-cell title="联系客服" is-link icon="service" size="large" />
          </button>
          <wd-cell title="用户协议" is-link icon="file" size="large" @click="goToAgreement" />
          <wd-cell title="隐私政策" is-link icon="lock-on" size="large" @click="goToPrivacy" />
          <wd-cell title="清除缓存" is-link icon="delete" size="large" @click="handleClearCache" />
          <wd-cell title="关于精益副业" is-link icon="info-circle" size="large" @click="goToAbout" />
        </wd-cell-group>
      </view>

      <view v-if="isLoggedIn" class="pt-4">
        <wd-button block type="error" plain @click="handleLogout">退出登录</wd-button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/store'

const userStore = useUserStore()
const { userInfo, isLoggedIn } = storeToRefs(userStore)

const handleLogin = async () => {
  if (isLoggedIn.value) return
  uni.showLoading({ title: '登录中...', mask: true })
  try {
    await userStore.login()
    uni.showToast({ title: '登录成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '登录失败', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}
</script>

<style scoped>
.share-btn, .contact-btn {
  width: 100%;
  padding: 0;
  background: transparent;
  border: none;
  text-align: left;
}
.share-btn::after, .contact-btn::after {
  border: none;
}
</style>
```

---

## 5. 核心Composables

### 5.1 useShare.ts - 分享功能
```typescript
import { onShareAppMessage } from '@dcloudio/uni-app'

export function useShare(customShare?: any) {
  onShareAppMessage(() => ({
    title: customShare?.title || '精益副业案例库 - 每日精选副业案例',
    path: customShare?.path || '/pages/index/index',
    imageUrl: customShare?.imageUrl || '/static/images/share-cover.png'
  }))

  return {
    triggerShare: () => {
      // 触发分享（小程序会自动处理）
    }
  }
}
```

### 5.2 useLogin.ts - 登录逻辑
```typescript
import { ref } from 'vue'
import { useUserStore } from '@/store'

export function useLogin() {
  const userStore = useUserStore()
  const { isLoggedIn } = storeToRefs(userStore)

  const ensureLoggedIn = async (): Promise<boolean> => {
    if (isLoggedIn.value) return true

    return new Promise((resolve) => {
      uni.showModal({
        title: '需要登录',
        content: '请先登录以使用此功能',
        confirmText: '去登录',
        success: async (res) => {
          if (res.confirm) {
            try {
              await userStore.login()
              resolve(true)
            } catch {
              resolve(false)
            }
          } else {
            resolve(false)
          }
        }
      })
    })
  }

  return {
    ensureLoggedIn,
    isLoggedIn
  }
}
```

### 5.3 useCache.ts - 缓存逻辑
```typescript
const CACHE_PREFIX = 'leanstartup_cache_'

export function useCache() {
  const setCache = (key: string, data: any, ttl: number) => {
    const expiry = Date.now() + ttl
    uni.setStorageSync(CACHE_PREFIX + key, JSON.stringify({ data, expiry }))
  }

  const getCache = (key: string) => {
    try {
      const raw = uni.getStorageSync(CACHE_PREFIX + key)
      if (!raw) return null
      const { data, expiry } = JSON.parse(raw)
      if (Date.now() > expiry) {
        uni.removeStorageSync(CACHE_PREFIX + key)
        return null
      }
      return data
    } catch {
      return null
    }
  }

  const fetchWithCache = async (key: string, fetcher: () => Promise<any>, ttl: number) => {
    const cached = getCache(key)
    if (cached) return cached

    const data = await fetcher()
    setCache(key, data, ttl)
    return data
  }

  const clearCache = (key?: string) => {
    if (key) {
      uni.removeStorageSync(CACHE_PREFIX + key)
    } else {
      uni.clearStorageSync()
    }
  }

  return {
    setCache,
    getCache,
    fetchWithCache,
    clearCache
  }
}
```

---

## 6. Pinia Store

### 6.1 user.ts - 用户状态
```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const userInfo = ref<{
    id: string
    name: string
    avatar: string
    openid: string
  } | null>(null)

  const isLoggedIn = ref(false)
  const favoritesCount = ref(0)
  const viewedRankingsCount = ref(0)

  const login = async (wechatUserInfo?: any) => {
    // 调用云函数获取 openid
    const res = await wx.cloud.callFunction({
      name: 'login',
      data: { wechatUserInfo }
    })

    userInfo.value = res.result.userInfo
    isLoggedIn.value = true
    await fetchProfile()
  }

  const fetchProfile = async () => {
    const res = await wx.cloud.callFunction({
      name: 'getUserProfile'
    })
    favoritesCount.value = res.result.favoritesCount
    viewedRankingsCount.value = res.result.viewedRankingsCount
  }

  const logout = () => {
    userInfo.value = null
    isLoggedIn.value = false
    favoritesCount.value = 0
    viewedRankingsCount.value = 0
  }

  return {
    userInfo,
    isLoggedIn,
    favoritesCount,
    viewedRankingsCount,
    login,
    fetchProfile,
    logout
  }
})
```

### 6.2 collection.ts - 收藏状态
```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useCollectionStore = defineStore('collection', () => {
  const collections = ref<string[]>([])
  const isLoading = ref(false)

  const fetchCollections = async () => {
    isLoading.value = true
    const res = await wx.cloud.callFunction({
      name: 'getUserCollections',
      data: { page: 1, pageSize: 100 }
    })
    collections.value = res.result.list.map((c: any) => c.caseId)
    isLoading.value = false
  }

  const toggleCollection = async (caseId: string) => {
    const res = await wx.cloud.callFunction({
      name: 'toggleCollection',
      data: { caseId, action: 'toggle' }
    })
    if (res.result.collected) {
      collections.value.push(caseId)
    } else {
      collections.value = collections.value.filter(id => id !== caseId)
    }
    return res.result.collected
  }

  const isCollected = (caseId: string) => {
    return collections.value.includes(caseId)
  }

  return {
    collections,
    isLoading,
    fetchCollections,
    toggleCollection,
    isCollected
  }
})
```

---

## 7. API 模块

### 7.1 case.ts - 案例相关API
```typescript
import { alova } from '@/api'

export const caseApi = {
  // 获取今日精选
  getDailyPick: (date?: string) =>
    alova.Get('/cloudfunctions/getDailyPick', {
      params: { date }
    }),

  // 获取案例详情
  getDetail: (caseId: string) =>
    alova.Get('/cloudfunctions/getCaseDetail', {
      params: { caseId }
    }),

  // 获取历史榜单
  getHistory: (page: number, pageSize: number) =>
    alova.Get('/cloudfunctions/getHistoryRankings', {
      params: { page, pageSize }
    })
}
```

### 7.2 collection.ts - 收藏相关API
```typescript
import { alova } from '@/api'

export const collectionApi = {
  // 切换收藏状态
  toggle: (caseId: string, action: 'collect' | 'uncollect' | 'toggle') =>
    alova.Post('/cloudfunctions/toggleCollection', {
      caseId,
      action
    }),

  // 获取用户收藏列表
  getList: (page: number, pageSize: number) =>
    alova.Get('/cloudfunctions/getUserCollections', {
      params: { page, pageSize }
    })
}
```

---

## 8. Design Tokens (SCSS)

```scss
// src/styles/design-tokens.scss
:root {
  // Colors
  --color-primary: #1A1A2E;
  --color-secondary: #4A4A68;
  --color-accent: #E94560;
  --color-gold: #F5A623;
  --color-bg: #FAFAF8;
  --color-surface: #FFFFFF;
  --color-border: #E8E6E1;
  --color-muted: #9B9A97;

  // Fonts
  --font-display: 'Noto Serif SC', serif;
  --font-body: 'Noto Sans SC', sans-serif;
  --font-mono: 'Roboto Mono', monospace;

  // Spacing
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;

  // Radius
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;

  // Shadows
  --shadow-card: 0 2px 12px rgba(26, 26, 46, 0.06);
  --shadow-card-hover: 0 8px 32px rgba(26, 26, 46, 0.12);
  --shadow-sm: 0 1px 4px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.12);

  // Transitions
  --transition-fast: 150ms ease-out;
  --transition-base: 200ms ease-out;
  --transition-slow: 250ms ease-out;
}

// Dark mode
[data-theme="dark"] {
  --color-primary: #FAFAF8;
  --color-secondary: #B8B8B8;
  --color-accent: #FF6B8A;
  --color-gold: #FFC857;
  --color-bg: #1A1A2E;
  --color-surface: #252538;
  --color-border: #3A3A52;
  --color-muted: #6B6B7B;
}
```

---

## 9. 开发优先级

### Phase 1: 基础框架 + 首页 (P0)
1. 项目初始化（UniApp + wot-design-uni）
2. Design Tokens + 全局样式
3. 首页布局 + 今日精选卡片
4. 云函数集成（getDailyPick）
5. 缓存逻辑

### Phase 2: 详情页 (P0)
1. 详情页布局
2. 评分可视化组件
3. 收藏功能（含登录触发）
4. 分享功能

### Phase 3: 历史榜单 + 个人中心 (P0)
1. 历史榜单页（分组列表）
2. 个人中心页
3. 登录逻辑
4. 收藏列表页

### Phase 4: 订阅 + 客服 (P1)
1. 订阅横幅
2. 订阅消息申请
3. 客服按钮

### Phase 5: 优化 + 测试 (P1)
1. 性能优化
2. 无障碍测试
3. 真机测试

---

## 10. 关键注意事项

### 10.1 登录触发时机
- 点击收藏按钮时触发登录
- 登录后自动完成收藏操作
- 使用微信小程序 `wx.cloud.getOpenId()` 获取 openid

### 10.2 分享实现
- 使用 `onShareAppMessage` 生命周期
- 详情页分享时动态设置标题和路径
- 分享卡片图片可使用 Canvas 生成（可选）

### 10.3 订阅消息
- 需要在微信公众平台配置订阅消息模板
- 用户主动触发才能申请订阅权限
- 一次性订阅：用户触发后可推送1条
- 永久订阅：需用户主动订阅（仅特定场景）

### 10.4 客服功能
- 使用 `<button open-type="contact">` 原生组件
- 需在微信公众平台启用客服功能
- 客服消息在微信公众平台后台回复

### 10.5 缓存策略
- 首页数据缓存1小时
- 下拉刷新时清除缓存重新请求
- 跨日期自动失效（可选优化）

---

## 11. 待确认问题

1. **订阅消息模板ID**: 需要在微信公众平台配置并获取模板ID
2. **AppID**: 微信小程序 AppID 需要在 project.config.json 中配置
3. **云环境ID**: 需要在 cloudbaserc.json 中配置正确的环境ID
4. **分享图片**: 分享卡片的默认图片资源

---

**文档状态**: ✅ 已完成用户确认，可进入实施计划阶段
