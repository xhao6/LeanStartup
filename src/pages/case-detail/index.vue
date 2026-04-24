<template>
  <scroll-view class="detail-page" scroll-y>
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

    <ScoreOverview v-if="detail.id" :caseData="detail" />

    <view class="source-row" v-if="detail.id">
      <text class="source-account">来源：{{ detail.source_account }}</text>
    </view>

    <view class="tag-list" v-if="detail.tags?.length">
      <TagMor
        v-for="(tag, i) in detail.tags"
        :key="i"
        :text="tag"
        :variant="((i % 5) + 1) as 1 | 2 | 3 | 4 | 5"
      />
    </view>

    <view class="summary-section" v-if="detail.summary">
      <text class="section-title">核心摘要</text>
      <text class="summary-text">{{ detail.summary }}</text>
    </view>

    <view class="story-section" v-if="detail.story">
      <text class="section-title">案例故事</text>
      <view class="story-quote">{{ detail.story }}</view>
    </view>

    <BaseInfoGrid v-if="detail.id" :caseData="detail" />

    <ChecklistSection
      v-if="detail.steps?.length"
      :case-id="detail.id"
      :steps="detail.steps"
    />

    <ToolsSection v-if="detail.tools?.length" :tools="detail.tools" />

    <PitfallWarning v-if="detail.pitfalls" :content="detail.pitfalls" />

    <RiskTags v-if="detail.risk_tags?.length" :tags="detail.risk_tags" />

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
const collectionStore = useCollectionStore()
const isFavorited = computed(() => collectionStore.isCollected(detail.value.id))

const loadDetail = async () => {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  const id = (current as any)?.options?.id
  if (!id) return
  const res = await getCaseDetail(id)
  if (res.success && res.data) {
    detail.value = res.data
  }
}

const toggleFavorite = async () => {
  await collectionStore.toggle(detail.value.id)
}

const goBack = () => uni.navigateBack()
const handleShare = () => {}

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
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 0 32rpx 32rpx;
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