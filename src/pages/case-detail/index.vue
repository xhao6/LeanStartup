<template>
  <scroll-view class="detail-page" scroll-y>
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
        <view class="source-link" hover-class="hover-tap" @click="handleReadOriginal">
          <text class="link-text">阅读原文</text>
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
      :detail="detail"
      @toggle-favorite="toggleFavorite"
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
import { getFavorite, updateFavorite, isFavorited } from '@/utils/favorites'
import type { CaseDetail } from '@/types/case'

const detail = ref<Partial<CaseDetail>>({})
const loading = ref(true)
const error = ref(false)
const collectionStore = useCollectionStore()
const isFavoritedState = computed(() => collectionStore.isCollected(detail.value.id))

const loadDetail = async () => {
  loading.value = true
  error.value = false
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  const id = (current as any)?.options?.id
  if (!id) {
    loading.value = false
    error.value = false
    return
  }

  // 优先从本地收藏读取（秒开）
  const local = getFavorite(id)
  if (local) {
    detail.value = local
  }

  // 再从云端同步最新数据
  try {
    const res = await getCaseDetail(id)
    if (res.success && res.data) {
      const data = res.data.case || res.data
      const rawTools = data.tools || data.tool || data.resources || data.case_tools || []
      const parsedTools = rawTools.map((tool: string) => {
        const match = tool.match(/^(.+?)（(.+?)）$/)
        if (match) {
          return { name: match[1], desc: match[2] }
        }
        return { name: tool, desc: '' }
      })
      const cloudData = {
        ...data,
        story: data.story || data.case_story || '',
        tools: parsedTools
      }
      // 合并数据：本地缓存优先，云端补充
      detail.value = { ...detail.value, ...cloudData }
      // 如果已收藏，更新本地缓存（保持本地数据结构完整）
      if (isFavorited(id)) {
        updateFavorite(id, { ...detail.value })
      }
    } else {
      if (!local) error.value = true
    }
  } catch (e) {
    if (!local) error.value = true
    console.error('Failed to load case detail:', e)
  } finally {
    loading.value = false
  }
}

const toggleFavorite = async (result: boolean) => {
  // result 是操作后的状态（true=已收藏，false=未收藏）
  // FixedActionBar 已完成实际的收藏操作，这里只显示提示
  uni.showToast({
    title: result ? '收藏成功' : '已取消收藏',
    icon: 'success'
  })
}

const goBack = () => uni.navigateBack()
const handleReadOriginal = () => {
  if (detail.value.source_url) {
    const encoded = encodeURIComponent(detail.value.source_url)
    uni.navigateTo({
      url: `/pages/article-viewer/index?url=${encoded}`
    })
  }
}

onMounted(() => {
  loadDetail()
})

// 微信分享给朋友
defineExpose({
  onShareAppMessage: () => {
    return {
      title: detail.value.title || '精益副业案例',
      path: `/pages/case-detail/index?id=${detail.value.id}`,
      imageUrl: ''
    }
  },
  // 微信分享到朋友圈
  onShareTimeline: () => {
    return {
      title: detail.value.title || '精益副业案例',
      query: `id=${detail.value.id}`,
      imageUrl: ''
    }
  }
})
</script>

<style lang="scss" scoped>
.detail-page {
  min-height: 100vh;
  background: #FAFAF8;
  padding-bottom: 200rpx;
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
  padding: 12rpx 24rpx;
  background: #FFFFFF;
  border: 1rpx solid #E8E6E1;
  border-radius: 999rpx;
  min-height: 72rpx;
}
.link-text {
  font-size: 24rpx;
  color: #1A1A2E;
  font-weight: 500;
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
