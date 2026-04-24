# Plan 2: 首页 + 核心组件 (case-card, skeleton-card, subscribe-banner, index page)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 LeanSkill 的首页及核心组件迁移到 LeanStartup，包括 case-card、skeleton-card、subscribe-banner 和首页 index。

**Architecture:** 从 LeanSkill 复制组件文件到 LeanStartup 的 `components/` 目录（使用子目录结构如 `components/case-card/index.vue`），替换 skill→case 术语，替换配色（`#0F172A`→`#1A1A2E`, `#F97316`→`#E94560`, `#E2E8F0`→`#E8E6E1`），替换 API 调用。首页从 LeanSkill 的单文件结构迁移，删除当前 LeanStartup 的子组件拆分（HeroSection + DailyPickSection → 合并为一个 index.vue）。

---

## Task 2.1: 创建 case-card 组件

**Files:**
- Create: `src/components/case-card/index.vue`
- Delete: `src/components/CaseCard.vue`

从 LeanSkill 的 `components/skill-card/index.vue` 适配，将 Skill→Case 术语替换，改用 LeanStartup 配色。

**数据映射：**
- `skill._id` → `caseData.id`
- `skill.name` → `caseData.title`
- `skill.value` → `caseData.score_total` (显示为 `${score_total}★`)
- `skill.description` → `caseData.summary`
- `skill.tags` → `[caseData.cost, caseData.source_account]` (最多3个标签)

```vue
<!-- src/components/case-card/index.vue -->
<template>
  <view class="case-card" :class="`rank-${rank}`" @click="handleClick">
    <!-- 排名数字 -->
    <view :class="['rank-number', `rank-${rank}`]">
      <text class="rank-text">{{ rankText }}</text>
    </view>

    <!-- 内容区 -->
    <view class="rank-content">
      <!-- 案例名 -->
      <view class="case-name-row">
        <text class="case-name">{{ caseData.title }}</text>
      </view>

      <!-- 评分 - 独立一行 -->
      <view class="score-row">
        <text class="score-value">{{ caseData.score_total }}★</text>
      </view>

      <!-- 描述 -->
      <view v-if="caseData.summary" class="description-row">
        <text class="description">{{ caseData.summary }}</text>
      </view>

      <!-- 标签 -->
      <view class="tags-row">
        <view v-if="caseData.cost" class="tag-item tag-cost">
          <text class="tag-text">{{ caseData.cost }}</text>
        </view>
        <view v-if="caseData.source_account" class="tag-item tag-source">
          <text class="tag-text">{{ caseData.source_account }}</text>
        </view>
        <view v-if="caseData.suitable_for" class="tag-item tag-suitable">
          <text class="tag-text">{{ caseData.suitable_for }}</text>
        </view>
      </view>
    </view>

    <!-- 箭头 -->
    <view class="rank-arrow">
      <text class="arrow-icon">›</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DailyCase } from '@/api/modules/daily'

interface Props {
  caseData: DailyCase
  rank: number
}

const props = defineProps<Props>()
const emit = defineEmits<{
  click: [caseData: DailyCase]
}>()

const rankText = computed(() => String(props.rank))

const handleClick = () => emit('click', props.caseData)
</script>

<style scoped>
/* 悬浮式圆角卡片 */
.case-card {
  display: flex;
  align-items: stretch;
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.03);
  border: 1px solid #E8E6E1;
  overflow: hidden;
  position: relative;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.case-card:active {
  transform: translateY(0) scale(0.99);
  background: #F8F8F6;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06), 0 2px 10px rgba(0, 0, 0, 0.04);
}

/* 排名数字 - 左侧徽章 */
.rank-number {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 50px;
  padding: 20px 8px;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: white;
  background: #E8E6E1;
  border-radius: 16px 0 0 16px;
  position: relative;
  flex-shrink: 0;
}

/* #01 - 金橙渐变 */
.rank-1 .rank-number {
  background: linear-gradient(180deg, #FBBF24 0%, #F97316 100%);
}

/* #02 - 银灰渐变 */
.rank-2 .rank-number {
  background: linear-gradient(180deg, #94A3B8 0%, #64748B 100%);
}

/* #03 - 铜棕渐变 */
.rank-3 .rank-number {
  background: linear-gradient(180deg, #D4A574 0%, #B8956C 100%);
}

.rank-text {
  color: white;
}

/* 内容区 */
.rank-content {
  flex: 1;
  padding: 16px 4px 16px 10px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

/* 案例名 */
.case-name-row {
  margin-bottom: 6px;
}

.case-name {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #1A1A2E;
  line-height: 1.35;
}

/* 评分 */
.score-row {
  margin-bottom: 8px;
}

.score-value {
  font-size: 13px;
  color: #F5A623;
  font-weight: 700;
  line-height: 1.5;
}

/* 描述 */
.description-row {
  margin-bottom: 10px;
}

.description {
  font-size: 13px;
  color: #4A4A68;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 标签 */
.tags-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  overflow: hidden;
}

.tag-item {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  font-family: 'Noto Sans SC', sans-serif;
  letter-spacing: 0.02em;
  flex-shrink: 0;
}

.tag-text {
  color: inherit;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  max-width: 100%;
}

.tag-cost { background: #D1FAE5; color: #059669; }
.tag-source { background: #FAFAF8; color: #4A4A68; border: 1px solid #E8E6E1; }
.tag-suitable { background: #DBEAFE; color: #2563EB; }

/* 右侧箭头 */
.rank-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  color: #9B9A97;
  font-size: 20px;
  border-radius: 0 16px 16px 0;
  flex-shrink: 0;
}

.arrow-icon {
  color: inherit;
}
</style>
```

- [ ] **Step 1:** 创建 `src/components/case-card/index.vue`
- [ ] **Step 2:** 删除旧 `src/components/CaseCard.vue`
- [ ] **Step 3:** Commit

```bash
git add src/components/case-card/index.vue && git rm src/components/CaseCard.vue && git commit -m "feat: add case-card component adapted from LeanSkill skill-card"
```

---

## Task 2.2: 创建 skeleton-card 组件

**Files:**
- Create: `src/components/skeleton-card/index.vue`

从 LeanSkill 的 `components/skeleton-card/index.vue` 复制，替换配色。

```vue
<!-- src/components/skeleton-card/index.vue -->
<template>
  <view class="skeleton-card">
    <view class="skeleton-header">
      <view class="skeleton-rank"></view>
      <view class="skeleton-content">
        <view class="skeleton-name"></view>
        <view class="skeleton-value"></view>
        <view class="skeleton-tags">
          <view class="skeleton-tag"></view>
          <view class="skeleton-tag"></view>
          <view class="skeleton-tag"></view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.skeleton-card {
  display: flex;
  background: #FFFFFF;
  border-radius: 16px;
  border: 1px solid #E8E6E1;
  overflow: hidden;
  height: 120px;
}

.skeleton-header {
  display: flex;
  width: 100%;
  padding: 16px;
  gap: 12px;
}

.skeleton-rank {
  width: 50px;
  height: 88px;
  border-radius: 12px;
  background: linear-gradient(90deg, #F5F5F3 25%, #E8E6E1 50%, #F5F5F3 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
}

.skeleton-name {
  width: 60%;
  height: 20px;
  border-radius: 4px;
  background: linear-gradient(90deg, #F5F5F3 25%, #E8E6E1 50%, #F5F5F3 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-value {
  width: 80%;
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(90deg, #F5F5F3 25%, #E8E6E1 50%, #F5F5F3 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite 0.1s;
}

.skeleton-tags {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}

.skeleton-tag {
  width: 50px;
  height: 22px;
  border-radius: 9999px;
  background: linear-gradient(90deg, #F5F5F3 25%, #E8E6E1 50%, #F5F5F3 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite 0.2s;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
```

- [ ] **Step 1:** 创建 `src/components/skeleton-card/index.vue`
- [ ] **Step 2:** Commit

```bash
git add src/components/skeleton-card/index.vue && git commit -m "feat: add skeleton-card component"
```

---

## Task 2.3: 创建 subscribe-banner 组件

**Files:**
- Create: `src/components/subscribe-banner/index.vue`
- Delete: `src/components/SubscribeBanner.vue`

从 LeanSkill 的 `components/subscribe-banner/index.vue` 适配，改用 LeanStartup 的配色（`#F97316`→`#E94560`），改用 LeanStartup 的 API（`subscriptionStore.subscribe()`→`subscriptionStore.doSubscribe()`，因为 LeanStartup 的 subscription store 方法名不同）。

**关键适配：**
- 渐变色：`#F97316→#FB923C→#FBBF24` → `#E94560→#FF6B8A→#F5A623`
- 按钮文字色：`#F97316` → `#E94560`
- Store 方法：`subscribe()` → `doSubscribe()`，`unsubscribe()` → `doUnsubscribe()`，`initStatus()` 不变
- 不使用 wot-design-uni 的 `wd-icon`，用纯文本替代

```vue
<!-- src/components/subscribe-banner/index.vue -->
<template>
  <view v-if="showBanner" class="subscribe-banner" @click="handleClick">
    <!-- Shimmer overlay -->
    <view class="shimmer-overlay"></view>

    <!-- Content -->
    <view class="subscribe-content">
      <view class="subscribe-text">
        <text class="subscribe-title">{{ titleText }}</text>
        <text class="subscribe-desc">{{ descText }}</text>
      </view>
      <view class="subscribe-btn">
        <text class="btn-text">{{ btnText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useSubscriptionStore } from '@/store/subscription'

const subscriptionStore = useSubscriptionStore()

const isSubscribed = computed(() => subscriptionStore.isSubscribed)
const loading = computed(() => subscriptionStore.loading)

const showBanner = computed(() => true)

const titleText = computed(() => {
  return isSubscribed.value ? '已授权订阅' : '订阅每日提醒'
})

const descText = computed(() => {
  return isSubscribed.value
    ? '下次榜单更新时将收到通知'
    : '第一时间收到最新 TOP3 推送'
})

const btnText = computed(() => {
  return isSubscribed.value ? '已订阅' : '立即订阅'
})

const handleClick = async () => {
  if (loading.value) return

  if (isSubscribed.value) {
    showManageOptions()
  } else {
    await handleSubscribe()
  }
}

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
      uni.showToast({ title: '已取消订阅', icon: 'none' })
    } else {
      uni.showToast({ title: err.message || '订阅失败', icon: 'none' })
    }
  }
}

const showManageOptions = () => {
  uni.showActionSheet({
    itemList: ['查看订阅状态', '取消订阅'],
    success: async (res) => {
      if (res.tapIndex === 0) {
        uni.showToast({ title: '订阅状态：已订阅', icon: 'success' })
      } else if (res.tapIndex === 1) {
        await handleUnsubscribe()
      }
    }
  })
}

const handleUnsubscribe = async () => {
  try {
    await subscriptionStore.doUnsubscribe()
    uni.showToast({ title: '已取消订阅', icon: 'success' })
  } catch (err: any) {
    uni.showToast({ title: err.message || '取消失败', icon: 'none' })
  }
}

onMounted(async () => {
  try {
    await subscriptionStore.checkStatus()
  } catch {}
})
</script>

<style scoped>
.subscribe-banner {
  background: linear-gradient(135deg, #E94560 0%, #FF6B8A 50%, #F5A623 100%);
  border-radius: 16px;
  padding: 18px 20px;
  box-shadow: 0 4px 20px rgba(233, 69, 96, 0.25);
  position: relative;
  overflow: hidden;
  margin: 0 15px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.subscribe-banner:active {
  opacity: 0.9;
}

/* Shimmer animation overlay */
.shimmer-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.15) 50%, transparent 100%);
  animation: shimmer 3s ease-in-out infinite;
  pointer-events: none;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.subscribe-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.subscribe-text {
  flex: 1;
}

.subscribe-title {
  display: block;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: white;
  margin-bottom: 3px;
}

.subscribe-desc {
  display: block;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
}

.subscribe-btn {
  background: white;
  border-radius: 12px;
  padding: 10px 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.btn-text {
  display: block;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: #E94560;
}
</style>
```

- [ ] **Step 1:** 创建 `src/components/subscribe-banner/index.vue`
- [ ] **Step 2:** 删除旧 `src/components/SubscribeBanner.vue`
- [ ] **Step 3:** Commit

```bash
git add src/components/subscribe-banner/index.vue && git rm src/components/SubscribeBanner.vue && git commit -m "feat: add subscribe-banner component adapted from LeanSkill"
```

---

## Task 2.4: 重写首页 index.vue

**Files:**
- Replace: `src/pages/index/index.vue`
- Delete: `src/pages/index/components/HeroSection.vue`
- Delete: `src/pages/index/components/DailyPickSection.vue`
- Delete: `src/components/LoadingSpinner.vue`
- Delete: `src/components/EmptyTip.vue`

从 LeanSkill 的 `pages/index/index.vue` 适配。将当前首页从"子组件拆分"改为"单文件结构"（与 LeanSkill 一致）。

**关键适配：**
- `useSkillStore` → `useCaseStore`
- `todaySkills` → `todayCases`
- `Skill` type → `DailyCase` type
- `skill._id` → `caseData.id`
- 颜色 `#0F172A` → `#1A1A2E`，`#F97316` → `#E94560`，`#E2E8F0` → `#E8E6E1`
- 路由标题改为 `精益副业案例库 · 今日热门`
- Hero 标题改为 `搞钱案例榜`，副标题改为 `每日 3 个可落地副业案例`

```vue
<!-- src/pages/index/index.vue -->
<route lang="json">
{
  "style": { "navigationBarTitleText": "精益副业案例库 · 今日热门" }
}
</route>

<template>
  <view class="index-page min-h-screen" style="background: #FAFAF8;">
    <!-- Hero区域 -->
    <view class="hero-section">
      <text class="hero-title">搞钱案例榜</text>
      <text class="hero-subtitle">每日 3 个可落地副业案例</text>
    </view>

    <!-- 产品容器 -->
    <view class="product-container">
      <!-- 页面标题栏 -->
      <view class="product-header">
        <view class="header-left">
          <view class="dot"></view>
          <text class="header-label">今日</text>
        </view>
        <view class="header-center">
          <text class="header-title">每日更新</text>
        </view>
        <view class="header-right">
          <text class="header-date">{{ todayText }}</text>
        </view>
      </view>

      <!-- 案例卡片列表 -->
      <view class="card-list">
        <!-- 骨架屏（首次加载） -->
        <template v-if="loading && !todayCases.length">
          <skeleton-card v-for="i in 3" :key="i" />
        </template>

        <!-- 案例卡片 -->
        <case-card
          v-for="(caseItem, index) in todayCases"
          :key="caseItem.id"
          :case-data="caseItem"
          :rank="index + 1"
          @click="handleCardClick"
        />

        <!-- 空状态 -->
        <view v-if="!loading && !todayCases.length" class="empty-state">
          <text class="empty-text">暂无今日榜单</text>
        </view>
      </view>
    </view>

    <!-- 订阅横幅 -->
    <view class="subscribe-section">
      <subscribe-banner />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useCaseStore } from '@/store/case'
import CaseCard from '@/components/case-card/index.vue'
import SkeletonCard from '@/components/skeleton-card/index.vue'
import SubscribeBanner from '@/components/subscribe-banner/index.vue'
import type { DailyCase } from '@/api/modules/daily'

const store = useCaseStore()

const loading = computed(() => store.loading)
const todayCases = computed(() => store.todayCases)
const todayText = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
})

onMounted(async () => {
  await store.fetchTodayCases()
})

const handleCardClick = (caseItem: DailyCase) => {
  uni.navigateTo({ url: `/pages/case-detail/index?id=${caseItem.id}` })
}
</script>

<style lang="scss" scoped>
/* Hero区域 */
.hero-section {
  text-align: center;
  padding: 5px 0 8px;
}

.hero-title {
  display: block;
  font-family: 'Noto Serif SC', serif;
  font-size: 38px;
  font-weight: 800;
  letter-spacing: -0.025em;
  margin-bottom: 2px;
  color: #1A1A2E;
}

.hero-subtitle {
  display: block;
  font-size: 15px;
  color: #4A4A68;
  font-weight: 500;
  margin-top: 1px;
  margin-bottom: 8px;
}

/* 产品容器 */
.product-container {
  background: #FFFFFF;
  border-radius: 0;
  border: 1px solid #E8E6E1;
  overflow: hidden;
}

/* 产品标题栏 */
.product-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  background: #F5F5F3;
  border-bottom: 1px solid #E8E6E1;
  margin-bottom: 8px;
  position: relative;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.header-left .dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #E94560;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.header-left .header-label {
  font-size: 12px;
  font-weight: 500;
  color: #4A4A68;
}

.header-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.header-title {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #1A1A2E;
}

.header-right {
  flex: 1;
  text-align: right;
}

.header-date {
  font-size: 12px;
  font-weight: 500;
  color: #4A4A68;
}

/* 卡片列表 */
.card-list {
  padding: 0 15px 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 0;
  gap: 16px;
}

.empty-text {
  font-size: 16px;
  color: #9B9A97;
  font-weight: 500;
}

/* 订阅横幅区域 */
.subscribe-section {
  margin-top: 16px;
}
</style>
```

- [ ] **Step 1:** 替换 `src/pages/index/index.vue`
- [ ] **Step 2:** 删除旧子组件和 LoadingSpinner/EmptyTip

```bash
rm -f src/pages/index/components/HeroSection.vue src/pages/index/components/DailyPickSection.vue src/components/LoadingSpinner.vue src/components/EmptyTip.vue
```

- [ ] **Step 3:** Commit

```bash
git add -A src/pages/index/ src/components/ && git commit -m "feat: rewrite home page with LeanSkill-style layout, remove sub-components"
```

---

## Task 2.5: 验证构建

- [ ] **Step 1:** 运行完整构建确认无错误

```bash
cd d:/MyWork/LeanMind/LeanStartup && npm run build:mp-weixin 2>&1 | tail -10
```

Expected: `DONE  Build complete.`

- [ ] **Step 2:** 检查首页引用是否正确（无遗漏的旧组件 import）
