<template>
  <view class="min-h-screen" :style="{ backgroundColor: '#FAFAF8' }">
    <!-- Header -->
    <view class="px-4 pt-6 pb-3">
      <text
        class="text-xl font-bold"
        :style="{ color: '#1A1A2E', fontFamily: 'Noto Serif SC, serif' }"
      >
        {{ headerText }}
      </text>
    </view>

    <!-- Loading state -->
    <view v-if="isLoading && collections.length === 0" class="flex flex-col items-center justify-center py-20">
      <view
        class="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        :style="{ borderColor: '#E8E6E1', borderTopColor: 'transparent' }"
      />
      <text class="text-sm mt-4" :style="{ color: '#9B9A97' }">加载中...</text>
    </view>

    <!-- Empty state -->
    <view v-else-if="isEmpty" class="flex flex-col items-center justify-center py-24">
      <text class="text-5xl mb-4">📭</text>
      <text class="text-base mb-6" :style="{ color: '#4A4A68' }">还没有收藏案例</text>
      <view
        class="rounded-full px-6 py-3"
        :style="{ backgroundColor: '#1A1A2E' }"
        @tap="goHome"
      >
        <text class="text-sm font-medium" :style="{ color: '#FFFFFF' }">去首页看看</text>
      </view>
    </view>

    <!-- Collection list -->
    <view v-else class="px-4">
      <view
        v-for="item in collections"
        :key="item.case_id"
        class="mb-3 rounded-xl p-4"
        :style="{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E8E6E1',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }"
        @tap="goCaseDetail(item.case_id)"
      >
        <!-- Title row -->
        <view class="flex flex-row items-center justify-between">
          <text
            class="font-medium flex-1 mr-2"
            style="font-size: 15px"
            :style="{
              color: '#1A1A2E',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lines: 1
            }"
          >
            {{ item.title }}
          </text>
          <!-- Chevron -->
          <text class="text-lg" :style="{ color: '#9B9A97' }">›</text>
        </view>

        <!-- Info row -->
        <view class="flex flex-row items-center mt-2">
          <!-- Score -->
          <text class="text-sm font-bold mr-4" :style="{ color: '#F5A623' }">
            ★ {{ item.score_total }}
          </text>
          <!-- Progress -->
          <text class="text-sm" :style="{ color: '#9B9A97' }">
            进度 {{ formatProgress(item) }}
          </text>
        </view>
      </view>

      <!-- Load more button -->
      <view v-if="hasMore" class="flex items-center justify-center py-6">
        <view
          class="rounded-full px-8 py-3"
          :style="{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E8E6E1'
          }"
          @tap="handleLoadMore"
        >
          <text class="text-sm" :style="{ color: '#4A4A68' }">
            {{ isLoading ? '加载中...' : '加载更多' }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useCollectionStore } from '@/store'
import { useLogin } from '@/composables/useLogin'
import { formatProgress, buildCaseDetailUrl, buildHeaderText, canLoadMore } from './helpers'

const collectionStore = useCollectionStore()
const { isLoggedIn, ensureLoggedIn } = useLogin()

onShow(async () => {
  if (!isLoggedIn.value) {
    const ok = await ensureLoggedIn()
    if (!ok) {
      // Fallback to home if no page history (e.g. direct entry via share link)
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack()
      } else {
        uni.switchTab({ url: '/pages/index/index' })
      }
      return
    }
  }
  collectionStore.fetchCollections(1)
})

const collections = computed(() => collectionStore.collectionList)
const total = computed(() => collectionStore.total)
const isLoading = computed(() => collectionStore.isLoading)
const isEmpty = computed(() => !isLoading.value && total.value === 0)
const hasMore = computed(() => canLoadMore(collections.value.length, total.value, isLoading.value))
const headerText = computed(() => buildHeaderText(total.value))

const goCaseDetail = (caseId: string) => {
  uni.navigateTo({ url: buildCaseDetailUrl(caseId) })
}

const goHome = () => {
  uni.switchTab({ url: '/pages/index/index' })
}

const handleLoadMore = () => {
  if (hasMore.value && !isLoading.value) {
    collectionStore.loadMore()
  }
}
</script>
