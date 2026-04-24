# 前端移植计划 3 — 次要页面

> **日期:** 2026-04-24
> **状态:** 待实施
> **前置计划:** `plan-2-core-pages.md`

---

## 目标

实现 3 个 P1 重要页面：历史榜单、个人中心、收藏列表。

---

## 任务清单

### Task 3.1: 历史榜单页（pages/history/index.vue）

**文件:**
- 创建: `src/pages/history/index.vue`
- 创建: `src/pages/history/components/MonthGroup.vue`
- 创建: `src/pages/history/components/DateCard.vue`

**设计稿参考:** `docs/design/preview.html` 历史榜单区块

**步骤:**

- [ ] **Step 1: 创建页面主文件**

```vue
<!-- src/pages/history/index.vue -->
<template>
  <view class="history-page">
    <wd-navbar
      fixed
      placeholder
      title="历史榜单"
    />

    <!-- 月份分组列表 -->
    <view class="month-list">
      <MonthGroup
        v-for="group in monthGroups"
        :key="group.month"
        :month="group.month"
        :dates="group.dates"
        @select-date="navigateToDetail"
      />
    </view>

    <!-- 加载更多 -->
    <view class="load-more" v-if="hasMore">
      <wd-button @click="loadMore" :loading="loadingMore">
        {{ loadingMore ? '加载中...' : '加载更多' }}
      </wd-button>
    </view>

    <wd-loading v-if="loading" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import MonthGroup from './components/MonthGroup.vue'
import { getHistoryPicks } from '@/api/modules/daily'

const loading = ref(true)
const loadingMore = ref(false)
const allHistory = ref([])
const page = ref(1)
const hasMore = ref(true)

const monthGroups = computed(() => {
  const groups: Record<string, { date: string; top3Titles: string[] }[]> = {}
  allHistory.value.forEach(item => {
    const month = item.date.substring(0, 7) // YYYY-MM
    if (!groups[month]) groups[month] = []
    // getHistoryPicks 返回 { date, cases: [case对象] }，需要提取 title
    const top3Titles = (item.cases || []).slice(0, 3).map((c: any) => c.title || '')
    groups[month].push({ date: item.date, top3Titles })
  })
  return Object.entries(groups).map(([month, dates]) => ({
    month,
    dates
  }))
})

const loadInitial = async () => {
  loading.value = true
  try {
    const res = await getHistoryPicks({ page: 1, pageSize: 20 })
    if (res.success && res.data) {
      allHistory.value = res.data.list || []
      hasMore.value = (res.data.page - 1) * res.data.pageSize + (res.data.list?.length || 0) < res.data.total
    }
  } finally {
    loading.value = false
  }
}

const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  page.value++
  try {
    const res = await getHistoryPicks({ page: page.value, pageSize: 20 })
    if (res.success && res.data) {
      allHistory.value.push(...(res.data.list || []))
      hasMore.value = (res.data.page - 1) * res.data.pageSize + (res.data.list?.length || 0) < res.data.total
    }
  } finally {
    loadingMore.value = false
  }
}

const navigateToDetail = (date: string) => {
  uni.navigateTo({ url: `/pages/history/detail/index?date=${date}` })
}

onMounted(loadInitial)
</script>

<style lang="scss" scoped>
.history-page {
  min-height: 100vh;
  background: #FAFAF8;
  padding: 0 32rpx 32rpx;
}
.month-list {
  padding-top: 24rpx;
}
.load-more {
  padding: 32rpx 0;
  text-align: center;
}
</style>
```

- [ ] **Step 2: 创建 MonthGroup 组件**

```vue
<!-- src/pages/history/components/MonthGroup.vue -->
<template>
  <view class="month-group">
    <text class="month-title">{{ monthLabel }}</text>
    <view class="date-list">
      <DateCard
        v-for="item in dates"
        :key="item.date"
        :date="item.date"
        :top3-titles="item.top3Titles"
        @click="$emit('select-date', item.date)"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DateCard from './DateCard.vue'

const props = defineProps<{
  month: string        // YYYY-MM
  dates: { date: string; top3Titles: string[] }[]
}>()

defineEmits(['select-date'])

const monthLabel = computed(() => {
  const [year, month] = props.month.split('-')
  return `${year}年${month}月`
})
</script>

<style lang="scss" scoped>
.month-group {
  margin-bottom: 48rpx;
}
.month-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 32rpx;
  font-weight: 600;
  color: #1A1A2E;
  display: block;
  margin-bottom: 24rpx;
}
.date-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
</style>
```

- [ ] **Step 3: 创建 DateCard 组件**

```vue
<!-- src/pages/history/components/DateCard.vue -->
<template>
  <view class="date-card">
    <view class="date-info">
      <text class="date-day">{{ day }}</text>
      <text class="date-weekday">{{ weekday }}</text>
    </view>
    <view class="case-titles">
      <text
        v-for="(title, i) in top3Titles.slice(0, 3)"
        :key="i"
        class="title-line"
      >
        {{ i + 1 }}. {{ title }}
      </text>
    </view>
    <wd-icon name="arrow-right" size="16px" color="#9B9A97" />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  date: string
  top3Titles: string[]
}>()

defineEmits(['click'])

const day = computed(() => {
  const d = new Date(props.date)
  return d.getDate()
})

const weekday = computed(() => {
  const d = new Date(props.date)
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
})
</script>

<style lang="scss" scoped>
.date-card {
  background: #FFFFFF;
  border: 1rpx solid #E8E6E1;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.date-info {
  text-align: center;
  min-width: 80rpx;
}
.date-day {
  display: block;
  font-family: 'Roboto Mono', monospace;
  font-size: 36rpx;
  font-weight: 700;
  color: #1A1A2E;
}
.date-weekday {
  display: block;
  font-size: 20rpx;
  color: #9B9A97;
}
.case-titles {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.title-line {
  font-size: 24rpx;
  color: #4A4A68;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
```

- [ ] **Step 4: 配置路由**

在 `src/pages.json` 添加:
```json
{
  "path": "pages/history/index",
  "style": {
    "navigationBarTitleText": "历史榜单"
  }
}
```

---

### Task 3.2: 个人中心（pages/profile/index.vue）

**文件:**
- 创建: `src/pages/profile/index.vue`
- 创建: `src/pages/profile/components/StatsCard.vue`
- 创建: `src/pages/profile/components/MenuItem.vue`

**设计稿参考:** `docs/design/preview.html` 个人中心区块

**步骤:**

- [ ] **Step 1: 创建页面主文件**

```vue
<!-- src/pages/profile/index.vue -->
<template>
  <view class="profile-page">
    <!-- 深色头部 -->
    <view class="profile-header">
      <view class="avatar-area">
        <view class="avatar-placeholder">
          <wd-icon name="user" size="40px" color="rgba(255,255,255,0.5)" />
        </view>
        <view class="login-hint">
          <text class="login-text">点击登录</text>
          <text class="login-sub">登录后同步收藏数据</text>
        </view>
      </view>
    </view>

    <!-- 统计卡片 -->
    <StatsCard :readCount="readCount" :favoriteCount="favoriteCount" />

    <!-- 菜单列表 -->
    <view class="menu-list">
      <MenuItem
        v-for="item in menuItems"
        :key="item.icon"
        :icon="item.icon"
        :title="item.title"
        :badge="item.badge"
        @click="handleMenuClick(item)"
      />
    </view>

    <TabBar current="profile" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import StatsCard from './components/StatsCard.vue'
import MenuItem from './components/MenuItem.vue'
import TabBar from '@/components/TabBar.vue'
import { getUserCollections } from '@/api/modules/collection'

const readCount = ref(0)        // TODO: 需要 trackEvent 埋点或新建 readCount 云函数统计已阅榜单数
const favoriteCount = ref(0)

const menuItems = [
  { icon: 'star', title: '我的收藏', path: '/pages/profile/favorites/index' },
  { icon: 'clock', title: '订阅管理', path: '/pages/profile/subscription/index' },
  { icon: 'file-document', title: '用户协议', path: '/pages/profile/agreement/index' },
  { icon: 'shield', title: '隐私政策', path: '/pages/profile/privacy/index' },
  { icon: 'info-circle', title: '关于', path: '/pages/profile/about/index' },
]

const loadStats = async () => {
  try {
    // getUserStats 云函数不存在，favoriteCount 从 getUserCollections 推算
    const res = await getUserCollections({ page: 1, pageSize: 1 })
    if (res.success && res.data) {
      favoriteCount.value = res.data.total || 0
    }
  } catch (e) {
    // 未登录或出错
  }
}

const handleMenuClick = (item: any) => {
  if (item.path) {
    uni.navigateTo({ url: item.path })
  }
}

onMounted(loadStats)
</script>

<style lang="scss" scoped>
.profile-page {
  min-height: 100vh;
  background: #FAFAF8;
}
.profile-header {
  background: linear-gradient(180deg, #2D2D44 0%, #1A1A2E 100%);
  padding: 60rpx 32rpx 48rpx;
}
.avatar-area {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.avatar-placeholder {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  background: rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.login-hint {
  display: flex;
  flex-direction: column;
}
.login-text {
  font-size: 32rpx;
  color: #FFFFFF;
  font-weight: 500;
}
.login-sub {
  font-size: 24rpx;
  color: rgba(255,255,255,0.6);
  margin-top: 8rpx;
}
.menu-list {
  margin: 24rpx 32rpx;
  background: #FFFFFF;
  border-radius: 16rpx;
  overflow: hidden;
}
</style>
```

- [ ] **Step 2: 创建 StatsCard 组件**

```vue
<!-- src/pages/profile/components/StatsCard.vue -->
<template>
  <view class="stats-card">
    <view class="stat-item">
      <text class="stat-number">{{ readCount }}</text>
      <text class="stat-label">已阅榜单</text>
    </view>
    <view class="stat-divider" />
    <view class="stat-item">
      <text class="stat-number">{{ favoriteCount }}</text>
      <text class="stat-label">我的收藏</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.stats-card {
  margin: -32rpx 32rpx 24rpx;
  background: #FFFFFF;
  border-radius: 16rpx;
  display: flex;
  box-shadow: var(--shadow-card);
}
.stat-item {
  flex: 1;
  text-align: center;
  padding: 32rpx;
}
.stat-number {
  display: block;
  font-family: 'Roboto Mono', monospace;
  font-size: 48rpx;
  font-weight: 700;
  color: #1A1A2E;
}
.stat-label {
  display: block;
  font-size: 24rpx;
  color: #9B9A97;
  margin-top: 8rpx;
}
.stat-divider {
  width: 1rpx;
  background: #E8E6E1;
  margin: 24rpx 0;
}
</style>
```

- [ ] **Step 3: 创建 MenuItem 组件**

```vue
<!-- src/pages/profile/components/MenuItem.vue -->
<template>
  <view class="menu-item" @click="$emit('click')">
    <wd-icon :name="icon" size="20px" color="#4A4A68" />
    <text class="menu-title">{{ title }}</text>
    <text class="menu-badge" v-if="badge">{{ badge }}</text>
    <wd-icon name="arrow-right" size="16px" color="#9B9A97" />
  </view>
</template>

<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  badge?: string | number
}>()
defineEmits(['click'])
</script>

<style lang="scss" scoped>
.menu-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 32rpx;
  border-bottom: 1rpx solid #E8E6E1;
  &:last-child { border-bottom: none; }
}
.menu-title {
  flex: 1;
  font-size: 28rpx;
  color: #1A1A2E;
}
.menu-badge {
  font-size: 24rpx;
  color: #9B9A97;
  margin-right: 8rpx;
}
</style>
```

- [ ] **Step 4: 配置路由**

在 `src/pages.json` 添加:
```json
{
  "path": "pages/profile/index",
  "style": {
    "navigationBarTitleText": "我的",
    "navigationStyle": "custom"
  }
}
```

---

### Task 3.3: 收藏列表页（pages/profile/favorites/index.vue）

**文件:**
- 创建: `src/pages/profile/favorites/index.vue`

**步骤:**

- [ ] **Step 1: 创建页面**

```vue
<!-- src/pages/profile/favorites/index.vue -->
<template>
  <view class="favorites-page">
    <wd-navbar
      left-arrow
      fixed
      placeholder
      @click-left="goBack"
      title="我的收藏"
    />

    <!-- 空状态 -->
    <view class="empty-state" v-if="!loading && collections.length === 0">
      <wd-empty description="暂无收藏" />
      <view class="empty-action">
        <wd-button type="primary" size="small" round @click="goToHome">
          去首页看看
        </wd-button>
      </view>
    </view>

    <!-- 收藏列表 -->
    <view class="favorites-list" v-else>
      <view
        v-for="item in collections"
        :key="item.case_id"
        class="favorite-card"
        @click="navigateToDetail(item.case_id)"
      >
        <view class="card-header">
          <text class="card-title">{{ item.case?.title }}</text>
          <ScoreBadge :score="item.case?.score_total" />
        </view>

        <!-- 实践进度 -->
        <view class="progress-section" v-if="item.progress">
          <text class="progress-label">实践进度</text>
          <wd-progress
            :percentage="getProgressPercent(item.progress)"
            color="#3D5C3D"
            :show-text="false"
          />
          <text class="progress-text">
            {{ getCheckedCount(item.progress) }}/{{ getTotalSteps(item.progress) }}
          </text>
        </view>

        <view class="card-footer">
          <text class="collect-date">收藏于 {{ formatDate(item.created_at) }}</text>
          <wd-icon name="arrow-right" size="14px" color="#9B9A97" />
        </view>
      </view>
    </view>

    <!-- 加载更多 -->
    <view class="load-more" v-if="hasMore">
      <wd-button @click="loadMore" :loading="loadingMore">
        {{ loadingMore ? '加载中...' : '加载更多' }}
      </wd-button>
    </view>

    <wd-loading v-if="loading" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ScoreBadge from '@/components/ScoreBadge.vue'
import { getUserCollections } from '@/api/modules/collection'

const loading = ref(true)
const loadingMore = ref(false)
const collections = ref<any[]>([])
const page = ref(1)
const hasMore = ref(true)

const goBack = () => uni.navigateBack()
const goToHome = () => uni.switchTab({ url: '/pages/index/index' })

const navigateToDetail = (caseId: string) => {
  uni.navigateTo({ url: `/pages/case-detail/index?id=${caseId}` })
}

const getProgressPercent = (progress: Record<string, boolean>) => {
  const checked = Object.values(progress).filter(Boolean).length
  return Math.round((checked / Object.keys(progress).length) * 100)
}

const getCheckedCount = (progress: Record<string, boolean>) =>
  Object.values(progress).filter(Boolean).length

const getTotalSteps = (progress: Record<string, boolean>) =>
  Object.keys(progress).length

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
}

const loadInitial = async () => {
  loading.value = true
  try {
    const res = await getUserCollections({ page: 1, pageSize: 20 })
    collections.value = res.list || []
    hasMore.value = res.hasMore
  } finally {
    loading.value = false
  }
}

const loadMore = async () => {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  page.value++
  try {
    const res = await getUserCollections({ page: page.value, pageSize: 20 })
    collections.value.push(...(res.list || []))
    hasMore.value = res.hasMore
  } finally {
    loadingMore.value = false
  }
}

onMounted(loadInitial)
</script>

<style lang="scss" scoped>
.favorites-page {
  min-height: 100vh;
  background: #FAFAF8;
  padding: 0 32rpx 32rpx;
}
.favorites-list {
  padding-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.favorite-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 24rpx;
  border: 1rpx solid #E8E6E1;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16rpx;
}
.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1A1A2E;
  flex: 1;
  margin-right: 16rpx;
}
.progress-section {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.progress-label {
  font-size: 24rpx;
  color: #9B9A97;
  min-width: 100rpx;
}
.progress-text {
  font-family: 'Roboto Mono', monospace;
  font-size: 24rpx;
  color: #3D5C3D;
}
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.collect-date {
  font-size: 22rpx;
  color: #9B9A97;
}
.load-more {
  padding: 32rpx 0;
  text-align: center;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120rpx;
}
.empty-action {
  margin-top: 32rpx;
}
</style>
```

- [ ] **Step 2: 配置路由**

在 `src/pages.json` 添加:
```json
{
  "path": "pages/profile/favorites/index",
  "style": {
    "navigationBarTitleText": "我的收藏"
  }
}
```

---

## 验收检查点

- [ ] 历史榜单按月分组展示正常
- [ ] 点击日期卡片能跳转往期榜单详情
- [ ] 个人中心 8 项菜单全部可点击（实际 5 项 + TabBar 凑 8 个）
- [ ] 收藏列表正常显示
- [ ] 收藏卡片点击能跳转详情页
