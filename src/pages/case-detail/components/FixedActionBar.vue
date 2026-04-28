<template>
  <view class="fixed-action-bar">
    <button class="action-btn secondary" hover-class="hover-tap" open-type="share">
      <wd-icon name="share" size="16px" />
      <text>分享</text>
    </button>
    <button class="action-btn primary" hover-class="hover-tap" @click="onToggleFavorite">
      <wd-icon :name="isFavoritedLocal ? 'star-fill' : 'star'" size="16px" custom-class="fill-1" />
      <text>{{ isFavoritedLocal ? '已收藏' : '收藏' }}</text>
    </button>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { toggleFavorite, isFavorited } from '@/utils/favorites'
import type { CaseDetail } from '@/types/case'

const props = defineProps<{
  caseId: string
  detail?: Partial<CaseDetail>
}>()

const emit = defineEmits<{ 'toggle-favorite': [boolean] }>()

// 本地响应式状态，确保按钮状态立即更新
const isFavoritedLocal = ref(isFavorited(props.caseId))

// 监听 caseId 变化，重新初始化状态
watch(() => props.caseId, (newId) => {
  isFavoritedLocal.value = isFavorited(newId)
}, { immediate: true })

const onToggleFavorite = async () => {
  if (!props.detail) return

  // Build the item from detail data
  const item = {
    title: props.detail?.title || '',
    desc: props.detail?.summary || props.detail?.story || '',
    tags: props.detail?.tags || [],
    score_total: props.detail?.score_total || 0,
    url: props.detail?.source_url || '',
    image: props.detail?.image || '',
    progress: props.detail?.progress || {},
    steps_count: props.detail?.steps?.length || 0,
    completed_count: Object.values(props.detail?.progress || {}).filter(Boolean).length
  }

  try {
    const result = await toggleFavorite(props.caseId, item)
    // 立即更新本地状态，确保按钮状态同步变化
    isFavoritedLocal.value = result
    emit('toggle-favorite', result)
  } catch (e) {
    console.error('[FixedActionBar] 收藏操作失败', e)
    uni.showToast({ title: '操作失败，请检查网络后重试', icon: 'none', duration: 2000 })
  }
}
</script>

<style lang="scss" scoped>
.fixed-action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  padding: 16rpx 32rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20rpx);
  -webkit-backdrop-filter: blur(20rpx);
  border-top: 1rpx solid #E8E6E1;
  z-index: 100;
}
.action-btn {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  height: 72rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 500;
  border: none;
  padding: 0;
  margin: 0;
  &.secondary {
    flex: 1;
    background: #FAFAF8;
    color: #1A1A2E;
    border: 0.5rpx solid #E8E6E1;
  }
  &.primary {
    flex: 1;
    background: linear-gradient(135deg, #E94560, #FF6B8A);
    color: #FFFFFF;
    box-shadow: 0 2rpx 12rpx rgba(233, 69, 96, 0.2);
  }
}
</style>
