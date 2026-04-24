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
