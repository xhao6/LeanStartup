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
    <view v-if="favoritesList.length === 0" class="empty-state">
      <text class="empty-text">暂无收藏内容</text>
      <text class="empty-hint">浏览案例时点击收藏，内容会出现在这里</text>
      <view class="empty-btn" @click="goToHome">
        <text class="empty-btn-text">去发现</text>
      </view>
    </view>

    <!-- 收藏列表 -->
    <view v-else class="favorites-list">
      <view
        v-for="item in favoritesList"
        :key="item.id"
        class="fav-card"
        @click="goToDetail(item.id)"
      >
        <view class="fav-content">
          <text class="fav-title">{{ item.title }}</text>
          <text v-if="item.desc" class="fav-desc">{{ item.desc }}</text>
          <view v-if="item.tags?.length" class="fav-tags">
            <view
              v-for="tag in item.tags.slice(0, 3)"
              :key="tag"
              :class="['tag-item', getTagClass(tag)]"
            >
              <text class="tag-text">{{ tag }}</text>
            </view>
          </view>
          <view class="fav-meta">
            <text class="fav-score">{{ item.score_total }}★</text>
            <text v-if="item.steps_count" class="fav-progress">{{ item.completed_count || 0 }}/{{ item.steps_count }} 步</text>
          </view>
        </view>
        <view class="fav-action" @click.stop="handleRemove(item.id)">
          <text class="fav-remove-icon">★</text>
        </view>
      </view>

      <!-- 底部统计 -->
      <view class="list-footer">
        <text class="footer-text">共 {{ favoritesList.length }} 个收藏</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getFavorites, removeFavorite, toggleFavorite } from '@/utils/favorites'
import { getTagClass } from '@/composables/useTagColors'
import type { FavoriteItem } from '@/types/favorites'

const favoritesList = ref<FavoriteItem[]>([])

onShow(() => {
  favoritesList.value = getFavorites()
})

const goToDetail = (id: string) => {
  uni.navigateTo({ url: `/pages/case-detail/index?id=${id}` })
}

const handleRemove = async (id: string) => {
  uni.showModal({
    title: '取消收藏',
    content: '确定要取消收藏吗？',
    confirmColor: '#E94560',
    success: async (res) => {
      if (res.confirm) {
        const item = favoritesList.value.find(f => f.id === id)
        if (item) {
          await toggleFavorite(id, item)
        }
        favoritesList.value = getFavorites()
        uni.showToast({ title: '已取消收藏', icon: 'none' })
      }
    }
  })
}

const goToHome = () => {
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<style lang="scss" scoped>
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
.empty-btn-text { font-size: 14px; color: #4A4A68; }

/* Favorites List */
.favorites-list { padding: 16px 16px 0; }
.fav-card {
  display: flex;
  align-items: center;
  background: #FFFFFF;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  border: 1px solid #E8E6E1;
}
.fav-content { flex: 1; min-width: 0; }
.fav-title {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #1A1A2E;
  line-height: 1.4;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fav-desc {
  display: block;
  font-size: 13px;
  color: #6B7280;
  line-height: 1.5;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fav-tags { display: flex; flex-wrap: nowrap; gap: 6px; overflow: hidden; }
.tag-item {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;
}
.tag-text { color: inherit; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; max-width: 100%; }

/* Tag Colors - Macaron */
.tag-pink    { background: #FDF2F8; color: #DB2777; }
.tag-yellow  { background: #FEF3C7; color: #B45309; }
.tag-blue    { background: #DBEAFE; color: #2563EB; }
.tag-green   { background: #D1FAE5; color: #059669; }
.tag-purple  { background: #EDE9FE; color: #7C3AED; }
.tag-mint    { background: #CCFBF1; color: #0D9488; }
.tag-peach   { background: #FFEDD5; color: #EA580C; }
.tag-lavender { background: #E0E7FF; color: #4F46E5; }
.tag-coral   { background: #FFE4E6; color: #E11D48; }
.tag-lemon   { background: #FEF9C3; color: #CA8A04; }
.tag-sky     { background: #E0F2FE; color: #0284C7; }
.tag-rose    { background: #FCE7F3; color: #DB2777; }
.tag-olive   { background: #ECFCCB; color: #65A30D; }
.tag-wine    { background: #FAE8F0; color: #9F1239; }

.fav-meta { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.fav-score { font-size: 13px; color: #F5A623; font-weight: 600; }
.fav-progress { font-size: 12px; color: #9B9A97; }
.fav-action { padding: 8px; margin-left: 8px; }
.fav-remove-icon { font-size: 18px; color: #E94560; }
.list-footer { padding: 16px 0 32px; text-align: center; }
.footer-text { font-size: 12px; color: #9B9A97; }
</style>
