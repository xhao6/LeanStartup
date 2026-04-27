<template>
  <scroll-view class="detail-page" scroll-y>
    <!-- Top Navigation -->
    <view class="nav-bar">
      <view class="nav-btn safe-left" @click="goBack" aria-label="返回">
        <wd-icon name="arrow-left" size="20px" color="#E94560" />
      </view>
      <text class="nav-title">案例详情</text>
      <view class="nav-btn safe-right" @click="handleShare" aria-label="分享">
        <wd-icon name="share" size="18px" color="#E94560" />
      </view>
    </view>

    <!-- Loading State -->
    <view v-if="loading" class="loading-state">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- Error State -->
    <view v-else-if="error" class="error-state">
      <text class="error-text">加载失败</text>
      <button class="retry-btn" @click="loadDetail">重试</button>
    </view>

    <!-- Main Content -->
    <view v-else class="content-wrap">
      <!-- Title -->
      <text class="detail-title">{{ detail.title }}</text>

      <!-- Source Info -->
      <view class="source-row">
        <text class="source-account">
          <svg class="source-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M5.5 8a.5.5 0 0 1 .5-.5h8.5a.5.5 0 0 1 0 1H5.5a.5.5 0 0 1-.5-.5v-8a.5.5 0 0 1 .5-.5h8.5a.5.5 0 0 1 0 1H5.5a.5.5 0 0 1-.5-.5v-8ZM8 6a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1H8a.5.5 0 0 1-.5-.5V6Z"/>
          </svg>
          {{ detail.source_account }}
        </text>
        <view class="source-link" @click="handleReadOriginal">
          <text class="link-text">阅读原文</text>
          <text class="link-arrow">→</text>
        </view>
      </view>

      <!-- Tags -->
      <view class="tag-list" v-if="detail.tags?.length">
        <TagMor
          v-for="(tag, i) in detail.tags"
          :key="i"
          :text="tag"
          :variant="((i % 5) + 1) as 1 | 2 | 3 | 4 | 5"
        />
      </view>

      <!-- Summary -->
      <view v-if="detail.summary" class="summary-section">
        <text class="summary-text">{{ detail.summary }}</text>
      </view>

      <!-- Story -->
      <StorySection v-if="detail.story" :content="detail.story" />

      <!-- Score Overview -->
      <ScoreOverview v-if="detail.id" :caseData="detail" />

      <!-- Base Info Grid -->
      <BaseInfoGrid v-if="detail.id" :caseData="detail" />

      <!-- Practice Steps -->
      <ChecklistSection
        v-if="detail.steps?.length"
        :case-id="detail.id"
        :steps="detail.steps"
      />

      <!-- Tools & Resources -->
      <ToolsSection v-if="detail.tools?.length" :tools="detail.tools" />

      <!-- Pitfall Warning -->
      <PitfallWarning v-if="detail.pitfalls" :content="detail.pitfalls" />

      <!-- Risk Tags -->
      <RiskTags v-if="detail.risk_tags?.length" :tags="detail.risk_tags" />
    </view>

    <!-- Fixed Footer Actions -->
    <FixedActionBar
      v-if="detail.id"
      :case-id="detail.id"
      :is-favorited="isFavorited"
      @toggle-favorite="toggleFavorite"
      @share="handleShare"
    />
  </scroll-view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import ScoreOverview from './components/ScoreOverview.vue'
import StorySection from './components/StorySection.vue'
import TagMor from '@/components/TagMor.vue'
import BaseInfoGrid from './components/BaseInfoGrid.vue'
import ChecklistSection from './components/ChecklistSection.vue'
import ToolsSection from './components/ToolsSection.vue'
import PitfallWarning from './components/PitfallWarning.vue'
import RiskTags from './components/RiskTags.vue'
import FixedActionBar from './components/FixedActionBar.vue'
import { getCaseDetail } from '@/api/modules/case'
import { useCollectionStore } from '@/store/collection'

const detail = ref<any>({})
const loading = ref(true)
const error = ref(false)
const collectionStore = useCollectionStore()
const isFavorited = computed(() => collectionStore.isCollected(detail.value.id))

const loadDetail = async () => {
  loading.value = true
  error.value = false
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  const id = (current as any)?.options?.id
  if (!id) {
    loading.value = false
    return
  }
  try {
    const res = await getCaseDetail(id)
    if (res.success && res.data) {
      const data = res.data.case || res.data
      // 兼容处理：case_story -> story, tool -> tools
      detail.value = {
        ...data,
        story: data.story || data.case_story || '',
        tools: data.tools || data.tool || data.resources || []
      }
    } else {
      error.value = true
    }
  } catch (e) {
    error.value = true
    console.error('Failed to load case detail:', e)
  } finally {
    loading.value = false
  }
}

const toggleFavorite = async () => {
  await collectionStore.toggle(detail.value.id)
}

const goBack = () => uni.navigateBack()
const handleShare = () => {}
const handleReadOriginal = () => {
  if (detail.value.source_url) {
    // 复制链接或打开浏览器
    uni.setClipboardData({
      data: detail.value.source_url,
      success: () => {
        uni.showToast({ title: '链接已复制', icon: 'none' })
      }
    })
  }
}

onMounted(() => {
  loadDetail()
})
</script>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  background: #FAFAF8;
  padding-bottom: 140rpx;
}
.nav-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 32rpx;
  height: 96rpx;
  padding-top: calc(env(safe-area-inset-top) + 8rpx);
  background: #FFFFFF;
  border-bottom: 1rpx solid #E8E6E1;
}
.nav-btn {
  display: flex;
  align-items: center;
  width: 64rpx;
  height: 64rpx;
  flex-shrink: 0;
  transition: all 150ms ease-out;
  &.safe-left {
    margin-left: env(safe-area-inset-left);
  }
  &.safe-right {
    margin-right: env(safe-area-inset-right);
  }
  &:active {
    transform: scale(0.95);
    opacity: 0.7;
  }
}
.nav-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #1A1A2E;
  flex: 1;
  text-align: center;
}
.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400rpx;
  gap: 24rpx;
}
.loading-text,
.error-text {
  font-size: 30rpx;
  color: #4A4A68;
}
.retry-btn {
  padding: 16rpx 32rpx;
  background: #E94560;
  color: #FFFFFF;
  border-radius: 999rpx;
  font-size: 28rpx;
  border: none;
}
.content-wrap {
  padding: 24rpx 32rpx 0;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}
.detail-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 44rpx;
  font-weight: 600;
  color: #1A1A2A;
  line-height: 1.4;
}
.source-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #E8E6E1;
}
.source-account {
  font-size: 24rpx;
  color: #4A4A68;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.source-icon {
  width: 20rpx;
  height: 20rpx;
  color: #E94560;
  flex-shrink: 0;
}
.source-link {
  display: flex;
  align-items: center;
  gap: 4rpx;
  transition: opacity 150ms ease-out;
  &:active {
    opacity: 0.7;
  }
}
.link-text {
  font-size: 24rpx;
  color: #1A1A2E;
  font-weight: 500;
}
.link-arrow {
  width: 20rpx;
  height: 20rpx;
  color: #E94560;
  flex-shrink: 0;
}
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}
.summary-section {
  padding: 0;
}
.summary-text {
  font-size: 30rpx;
  color: #4A4A68;
  line-height: 1.6;
}
</style>
