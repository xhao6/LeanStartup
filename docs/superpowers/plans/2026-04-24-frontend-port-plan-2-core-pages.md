# 前端移植计划 2 — 核心页面

> **日期:** 2026-04-24
> **状态:** review完成 ✅
> **前置计划:** `plan-1-infrastructure.md`

---

## 目标

实现 3 个 P0 核心页面：首页、案例详情、往期榜单详情。

---

## 任务清单

### Task 2.1: 首页（pages/index/index.vue）

**文件:**
- 创建: `src/pages/index/index.vue`

**设计稿参考:** `docs/design/preview.html` 首页区块

**步骤:**

- [ ] **Step 1: 创建页面文件结构**

```vue
<template>
  <view class="index-page">
    <!-- Hero 区域 -->
    <HeroSection />

    <!-- 今日精选 -->
    <DailyPickSection />

    <!-- 订阅横幅 -->
    <SubscribeBanner />
  </view>
</template>

<script setup lang="ts">
import HeroSection from './components/HeroSection.vue'
import DailyPickSection from './components/DailyPickSection.vue'
import SubscribeBanner from '@/components/SubscribeBanner.vue'
</script>
```

- [ ] **Step 2: 实现 HeroSection 组件**

```vue
<!-- src/pages/index/components/HeroSection.vue -->
<template>
  <view class="hero">
    <text class="hero-title">搞钱案例榜</text>
    <text class="hero-slogan">每天拆解 3 个搞钱案例</text>
  </view>
</template>

<style lang="scss" scoped>
.hero {
  padding: 48rpx 32rpx 32rpx;
  text-align: center;
  background: linear-gradient(180deg, #FAFAF8 0%, #FFFFFF 100%);
}
.hero-title {
  display: block;
  font-family: 'Noto Serif SC', serif;
  font-size: 56rpx;
  font-weight: 700;
  color: #1A1A2E;
  letter-spacing: 8rpx;
}
.hero-slogan {
  display: block;
  margin-top: 16rpx;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 28rpx;
  color: #9B9A97;
}
</style>
```

- [ ] **Step 3: 实现 DailyPickSection 组件（调用 API + 渲染 CaseCard）**

```vue
<!-- src/pages/index/components/DailyPickSection.vue -->
<template>
  <view class="daily-pick">
    <view class="section-header">
      <text class="section-title">今日精选</text>
      <text class="section-date">{{ today }}</text>
    </view>

    <view class="case-list">
      <CaseCard
        v-for="(item, index) in cases"
        :key="item.id"
        :case="item"
        :rank="index + 1"
        @click="navigateToDetail(item.id)"
      />
    </view>

    <wd-loading v-if="loading" />
    <wd-status-tip v-if="!loading && cases.length === 0" type="empty" text="暂无数据" />
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import CaseCard from '@/components/CaseCard.vue'
import { getDailyPick } from '@/api/modules/daily'

const loading = ref(true)
const cases = ref([])
const today = new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })

const loadDailyPick = async () => {
  loading.value = true
  try {
    const res = await getDailyPick()
    cases.value = res.cases || []
  } catch (e) {
    console.error('加载今日精选失败', e)
  } finally {
    loading.value = false
  }
}

const navigateToDetail = (id: string) => {
  uni.navigateTo({ url: `/pages/case-detail/index?id=${id}` })
}

onMounted(loadDailyPick)
</script>

<style lang="scss" scoped>
.daily-pick {
  padding: 0 32rpx;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}
.section-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 36rpx;
  font-weight: 600;
  color: #1A1A2E;
}
.section-date {
  font-family: 'Roboto Mono', monospace;
  font-size: 24rpx;
  color: #9B9A97;
}
.case-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
</style>
```

- [ ] **Step 4: 配置页面路由**

在 `src/pages.json` 添加:
```json
{
  "path": "pages/index/index",
  "style": {
    "navigationBarTitleText": "搞钱案例榜",
    "navigationStyle": "custom"
  }
}
```

---

### Task 2.2: 案例详情页（pages/case-detail/index.vue）

**文件:**
- 创建: `src/pages/case-detail/index.vue`
- 创建: `src/pages/case-detail/components/ScoreOverview.vue`
- 创建: `src/pages/case-detail/components/ChecklistSection.vue`
- 创建: `src/pages/case-detail/components/ToolsSection.vue`
- 创建: `src/pages/case-detail/components/PitfallWarning.vue`

**设计稿参考:** `docs/design/preview.html` 案例详情区块

**步骤:**

- [ ] **Step 1: 创建案例详情页主文件**

```vue
<!-- src/pages/case-detail/index.vue -->
<template>
  <scroll-view class="detail-page" scroll-y>
    <!-- 顶部导航 -->
    <wd-navbar
      left-arrow
      fixed
      placeholder
      @click-left="goBack"
      title="案例详情"
    >
      <template #right>
        <wd-icon name="share" size="20px" @click="handleShare" />
      </template>
    </wd-navbar>

    <!-- 评分总览 -->
    <ScoreOverview :case="detail" />

    <!-- 来源信息 -->
    <view class="source-row">
      <text class="source-account">来源：{{ detail.source_account }}</text>
      <text class="source-date">{{ detail.created_at }}</text>
    </view>

<!-- 莫兰迪标签 -->
    <view class="tag-list">
      <TagMor
        v-for="(tag, i) in (detail.tags || [])"
        :key="i"
        :text="tag"
        :variant="((i % 5) + 1) as 1 | 2 | 3 | 4 | 5"
      />

    <!-- 核心摘要 -->
    <view class="summary-section">
      <text class="section-title">核心摘要</text>
      <text class="summary-text">{{ detail.summary }}</text>
    </view>

    <!-- 案例故事 -->
    <view class="story-section" v-if="detail.story">
      <text class="section-title">案例故事</text>
      <view class="story-quote">{{ detail.story }}</view>
    </view>

    <!-- 基础信息网格 -->
    <BaseInfoGrid :case="detail" />

    <!-- 实践步骤 Checklist -->
    <ChecklistSection :case-id="detail.id" :steps="detail.steps" />

    <!-- 工具/资源 -->
    <ToolsSection :tools="detail.tools" />

    <!-- 避坑指南 -->
    <PitfallWarning v-if="detail.pitfalls" :content="detail.pitfalls" />

    <!-- 风险标签 -->
    <RiskTags v-if="detail.risk_tags?.length" :tags="detail.risk_tags" />

    <!-- 底部操作栏 -->
    <FixedActionBar
      :case-id="detail.id"
      :is-favorited="isFavorited"
      @toggle-favorite="toggleFavorite"
      @share="handleShare"
    />
  </scroll-view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ScoreOverview from './components/ScoreOverview.vue'
import TagMor from '@/components/TagMor.vue'
import BaseInfoGrid from './components/BaseInfoGrid.vue'
import ChecklistSection from './components/ChecklistSection.vue'
import ToolsSection from './components/ToolsSection.vue'
import PitfallWarning from './components/PitfallWarning.vue'
import RiskTags from './components/RiskTags.vue'
import FixedActionBar from './components/FixedActionBar.vue'
import { getCaseDetail } from '@/api/modules/case'
import { toggleCollection } from '@/api/modules/collection'

const detail = ref({})
const isFavorited = ref(false)

const loadDetail = async () => {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  const id = current?.options?.id

  if (!id) return
  const res = await getCaseDetail(id)
  detail.value = res
}

const toggleFavorite = async () => {
  await toggleCollection({ case_id: detail.value.id })
  isFavorited.value = !isFavorited.value
}

const goBack = () => uni.navigateBack()
const handleShare = () => { /* 原生分享 */ }

onMounted(loadDetail)
</script>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  background: #FAFAF8;
  padding-bottom: 140rpx;
}
.source-row {
  display: flex;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  font-size: 24rpx;
  color: #9B9A97;
}
.summary-section, .story-section {
  padding: 32rpx;
}
.section-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 32rpx;
  font-weight: 600;
  color: #1A1A2E;
  margin-bottom: 16rpx;
  display: block;
}
.summary-text {
  font-size: 28rpx;
  color: #4A4A68;
  line-height: 1.8;
}
.story-quote {
  background: #F0F7FF;
  border-left: 6rpx solid #4A90D9;
  padding: 24rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #4A4A68;
  line-height: 1.8;
}
</style>
```

- [ ] **Step 2: 实现 ScoreOverview 组件（五维度进度条）**

```vue
<!-- src/pages/case-detail/components/ScoreOverview.vue -->
<template>
  <view class="score-overview">
    <!-- 总分大字 -->
    <view class="score-main">
      <text class="score-number">{{ case.score_total }}</text>
      <text class="score-max">/10</text>
    </view>

    <!-- 五维度进度条 -->
    <view class="score-dimensions">
      <view class="dim-item">
        <text class="dim-label">落地可行性</text>
        <wd-progress
          :percentage="(case.score_feasibility / 3) * 100"
          color="#E94560"
          hide-text
        />
        <text class="dim-value">{{ case.score_feasibility }}/3</text>
      </view>
      <view class="dim-item">
        <text class="dim-label">收益潜力</text>
        <wd-progress
          :percentage="(case.score_profit / 2) * 100"
          color="#F5A623"
          hide-text
        />
        <text class="dim-value">{{ case.score_profit }}/2</text>
      </view>
      <view class="dim-item">
        <text class="dim-label">时效性</text>
        <wd-progress
          :percentage="(case.score_timeliness / 2) * 100"
          color="#4A90D9"
          hide-text
        />
        <text class="dim-value">{{ case.score_timeliness }}/2</text>
      </view>
      <view class="dim-item">
        <text class="dim-label">实操细节</text>
        <wd-progress
          :percentage="(case.score_detail / 2) * 100"
          color="#3D5C3D"
          hide-text
        />
        <text class="dim-value">{{ case.score_detail }}/2</text>
      </view>
      <view class="dim-item">
        <text class="dim-label">用户适配度</text>
        <wd-progress
          :percentage="(case.score_fitness / 1) * 100"
          color="#9B9A97"
          hide-text
        />
        <text class="dim-value">{{ case.score_fitness }}/1</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.score-overview {
  background: linear-gradient(135deg, #1A1A2E 0%, #2D2D44 100%);
  padding: 48rpx 32rpx;
  border-radius: 0 0 32rpx 32rpx;
}
.score-main {
  display: flex;
  align-items: baseline;
  justify-content: center;
  margin-bottom: 40rpx;
}
.score-number {
  font-family: 'Roboto Mono', monospace;
  font-size: 96rpx;
  font-weight: 700;
  color: #F5A623;
}
.score-max {
  font-family: 'Roboto Mono', monospace;
  font-size: 36rpx;
  color: rgba(255,255,255,0.5);
  margin-left: 8rpx;
}
.score-dimensions {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.dim-item {
  display: grid;
  grid-template-columns: 140rpx 1fr 80rpx;
  align-items: center;
  gap: 16rpx;
}
.dim-label {
  font-size: 24rpx;
  color: rgba(255,255,255,0.7);
}
.dim-value {
  font-family: 'Roboto Mono', monospace;
  font-size: 24rpx;
  color: rgba(255,255,255,0.9);
  text-align: right;
}
</style>
```

- [ ] **Step 3: 实现 ChecklistSection 组件（可勾选 + 进度）**

```vue
<!-- src/pages/case-detail/components/ChecklistSection.vue -->
<template>
  <view class="checklist-section">
    <view class="section-header">
      <text class="section-title">实践步骤</text>
      <text class="progress-text">{{ checkedCount }}/{{ steps.length }}</text>
    </view>

    <view class="checklist">
      <view
        v-for="(step, index) in steps"
        :key="index"
        class="checklist-item"
        :class="{ checked: progress[getStepKey(index + 1)] }"
        @click="toggleStep(index + 1)"
      >
        <wd-icon
          :name="progress[getStepKey(index + 1)] ? 'check-circle-fill' : 'circle'"
          :color="progress[getStepKey(index + 1)] ? '#3D5C3D' : '#9B9A97'"
          size="20px"
        />
        <text class="step-text">{{ step }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getUserCollections, toggleCollection } from '@/api/modules/collection'

const props = defineProps<{
  caseId: string
  steps: string[]
}>()

const progress = ref<Record<string, boolean>>({})

const checkedCount = computed(() =>
  Object.values(progress.value).filter(Boolean).length
)

const getStepKey = (order: number) => `step_${order}`

let debounceTimer: ReturnType<typeof setTimeout> | null = null
const pendingUpdates: Record<string, boolean> = {}

const toggleStep = async (order: number) => {
  const key = getStepKey(order)
  const newValue = !progress.value[key]
  // 先乐观更新 UI
  progress.value[key] = newValue
  pendingUpdates[key] = newValue

  // debounce 500ms，避免快速连击
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    try {
      const res = await toggleCollection({
        case_id: props.caseId,
        action: 'collect',
        progress: { ...pendingUpdates }
      })
      if (!res.success) {
        // 失败回滚
        Object.keys(pendingUpdates).forEach(k => {
          progress.value[k] = !pendingUpdates[k]
        })
        uni.showToast({ title: '保存失败', icon: 'error' })
      } else if (res.data?.progress) {
        // 云函数返回合并后的 progress，同步本地
        progress.value = { ...res.data.progress }
      }
    } catch (e) {
      // 失败回滚
      Object.keys(pendingUpdates).forEach(k => {
        progress.value[k] = !pendingUpdates[k]
      })
    } finally {
      pendingUpdates = {}
    }
  }, 500)
}

onMounted(async () => {
  const collections = await getUserCollections()
  const myCollection = collections.find(c => c.case_id === props.caseId)
  if (myCollection?.progress) {
    progress.value = myCollection.progress
  }
})
</script>

<style lang="scss" scoped>
.checklist-section {
  padding: 32rpx;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}
.section-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 32rpx;
  font-weight: 600;
  color: #1A1A2E;
}
.progress-text {
  font-family: 'Roboto Mono', monospace;
  font-size: 28rpx;
  color: #E94560;
}
.checklist-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #E8E6E1;
  &.checked .step-text {
    text-decoration: line-through;
    color: #9B9A97;
  }
}
.step-text {
  font-size: 28rpx;
  color: #1A1A2E;
  line-height: 1.6;
  flex: 1;
}
</style>
```

- [ ] **Step 4: 实现 ToolsSection、BaseInfoGrid、PitfallWarning、RiskTags、FixedActionBar 组件**

ToolsSection:
```vue
<!-- src/pages/case-detail/components/ToolsSection.vue -->
<template>
  <view class="tools-section">
    <text class="section-title">工具/资源</text>
    <view class="tools-grid">
      <view v-for="tool in tools" :key="tool.name" class="tool-card">
        <text class="tool-name">{{ tool.name }}</text>
        <text class="tool-desc">{{ tool.desc }}</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.tools-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24rpx;
  margin-top: 16rpx;
}
.tool-card {
  background: #FFFFFF;
  border: 1rpx solid #E8E6E1;
  border-radius: 12rpx;
  padding: 24rpx;
}
.tool-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #1A1A2E;
  display: block;
  margin-bottom: 8rpx;
}
.tool-desc {
  font-size: 24rpx;
  color: #9B9A97;
}
</style>
```

BaseInfoGrid:
```vue
<!-- src/pages/case-detail/components/BaseInfoGrid.vue -->
<template>
  <view class="base-info-grid">
    <view class="info-item">
      <text class="info-label">启动成本</text>
      <text class="info-value">{{ case.cost }}</text>
    </view>
    <view class="info-item">
      <text class="info-label">预期收益</text>
      <text class="info-value">{{ case.expected_revenue }}</text>
    </view>
    <view class="info-item">
      <text class="info-label">变现周期</text>
      <text class="info-value">{{ case.cycle }}</text>
    </view>
    <view class="info-item">
      <text class="info-label">适合人群</text>
      <text class="info-value">{{ case.suitable_for }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.base-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rpx;
  background: #E8E6E1;
  margin: 32rpx;
  border-radius: 12rpx;
  overflow: hidden;
}
.info-item {
  background: #FFFFFF;
  padding: 24rpx;
}
.info-label {
  font-size: 24rpx;
  color: #9B9A97;
  display: block;
  margin-bottom: 8rpx;
}
.info-value {
  font-size: 28rpx;
  color: #1A1A2E;
  font-weight: 500;
}
</style>
```

PitfallWarning:
```vue
<!-- src/pages/case-detail/components/PitfallWarning.vue -->
<template>
  <view class="pitfall-warning">
    <wd-icon name="warning-circle" color="#F5A623" size="20px" />
    <view class="pitfall-content">
      <text class="pitfall-title">避坑指南</text>
      <text class="pitfall-text">{{ content }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.pitfall-warning {
  margin: 0 32rpx 32rpx;
  background: #FFF8E6;
  border: 1rpx solid #F5A623;
  border-radius: 12rpx;
  padding: 24rpx;
  display: flex;
  gap: 16rpx;
}
.pitfall-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #F5A623;
  display: block;
  margin-bottom: 8rpx;
}
.pitfall-text {
  font-size: 26rpx;
  color: #4A4A68;
  line-height: 1.6;
}
</style>
```

RiskTags:
```vue
<!-- src/pages/case-detail/components/RiskTags.vue -->
<template>
  <view class="risk-tags">
    <view v-for="tag in tags" :key="tag" class="risk-tag">
      {{ tag }}
    </view>
  </view>
</template>

<style lang="scss" scoped>
.risk-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 0 32rpx 32rpx;
}
.risk-tag {
  background: #FFEAEA;
  color: #E94560;
  font-size: 24rpx;
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
}
</style>
```

FixedActionBar:
```vue
<!-- src/pages/case-detail/components/FixedActionBar.vue -->
<template>
  <view class="fixed-action-bar">
    <button class="action-btn" @click="onSaveImage">
      <wd-icon name="image" size="18px" />
      <text>存图</text>
    </button>
    <button class="action-btn" @click="onShare">
      <wd-icon name="share" size="18px" />
      <text>分享</text>
    </button>
    <button
      class="action-btn favorite-btn"
      :class="{ active: isFavorited }"
      @click="$emit('toggle-favorite')"
    >
      <wd-icon :name="isFavorited ? 'star-fill' : 'star'" size="18px" />
      <text>收藏</text>
    </button>
  </view>
</template>

<style lang="scss" scoped>
.fixed-action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 120rpx;
  background: #FFFFFF;
  border-top: 1rpx solid #E8E6E1;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding-bottom: env(safe-area-inset-bottom);
}
.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  font-size: 22rpx;
  color: #4A4A68;
  background: none;
  &.active {
    color: #E94560;
  }
}
</style>
```

- [ ] **Step 5: 配置路由**

在 `src/pages.json` 添加:
```json
{
  "path": "pages/case-detail/index",
  "style": {
    "navigationBarTitleText": "案例详情"
  }
}
```

---

### Task 2.3: 往期榜单详情页（pages/history/detail/index.vue）

**文件:**
- 创建: `src/pages/history/detail/index.vue`

**设计稿参考:** `docs/design/preview.html` 往期榜单详情区块

**步骤:**

- [ ] **Step 1: 创建页面**

```vue
<!-- src/pages/history/detail/index.vue -->
<template>
  <view class="history-detail-page">
    <wd-navbar
      left-arrow
      fixed
      placeholder
      @click-left="goBack"
      title="往期榜单"
    />

    <!-- 日期横幅 -->
    <view class="date-banner">
      <view class="date-dot" />
      <text class="date-text">{{ displayDate }}</text>
      <text class="weekday-text">{{ weekday }}</text>
    </view>

    <!-- Top3 案例列表 -->
    <view class="case-list">
      <CaseCard
        v-for="(item, index) in cases"
        :key="item.id"
        :case="item"
        :rank="index + 1"
        @click="navigateToDetail(item.id)"
      />
    </view>

    <wd-loading v-if="loading" />

    <!-- 底部提示 -->
    <view class="footer-tip">
      <text>查看更多案例可前往「历史榜单」</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CaseCard from '@/components/CaseCard.vue'
import { getDailyPick } from '@/api/modules/daily'

const loading = ref(true)
const cases = ref([])

const pages = getCurrentPages()
const current = pages[pages.length - 1]
const date = current?.options?.date || new Date().toISOString().split('T')[0]

const displayDate = computed(() => {
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })
})

const weekday = computed(() => {
  const d = new Date(date)
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
})

const loadData = async () => {
  loading.value = true
  try {
    const res = await getDailyPick(date)
    cases.value = res.cases || []
  } finally {
    loading.value = false
  }
}

const goBack = () => uni.navigateBack()
const navigateToDetail = (id: string) => {
  uni.navigateTo({ url: `/pages/case-detail/index?id=${id}` })
}

onMounted(loadData)
</script>

<style lang="scss" scoped>
.history-detail-page {
  min-height: 100vh;
  background: #FAFAF8;
  padding: 0 32rpx 32rpx;
}
.date-banner {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 40rpx 0 32rpx;
}
.date-dot {
  width: 12rpx;
  height: 12rpx;
  background: #E94560;
  border-radius: 50%;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}
.date-text {
  font-family: 'Noto Serif SC', serif;
  font-size: 40rpx;
  font-weight: 600;
  color: #1A1A2E;
}
.weekday-text {
  font-size: 28rpx;
  color: #9B9A97;
}
.case-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.footer-tip {
  text-align: center;
  padding: 40rpx 0;
  font-size: 26rpx;
  color: #9B9A97;
}
</style>
```

- [ ] **Step 2: 配置路由**

在 `src/pages.json` 添加:
```json
{
  "path": "pages/history/detail/index",
  "style": {
    "navigationBarTitleText": "往期榜单"
  }
}
```

---

## 验收检查点

- [ ] 首页显示今日 Top 3 卡片
- [ ] 首页 Hero 标题「搞钱案例榜」正常显示
- [ ] TabBar 切换正常
- [ ] 案例详情页五维度评分条可见
- [ ] Checklist 可勾选并同步云端
- [ ] 往期榜单详情页正常显示
- [ ] 点击卡片能正常跳转详情页
