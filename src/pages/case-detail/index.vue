<template>
  <view class="min-h-screen pb-24" :style="{ backgroundColor: '#FAFAF8' }">
    <!-- Loading state -->
    <view v-if="isLoading" class="flex flex-col items-center justify-center py-20">
      <view class="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        :style="{ borderColor: '#E8E6E1', borderTopColor: 'transparent' }" />
      <text class="text-sm mt-4" :style="{ color: '#9B9A97' }">加载中...</text>
    </view>

    <!-- Error state -->
    <view v-else-if="error" class="flex flex-col items-center justify-center py-20 px-6">
      <text class="text-base" :style="{ color: '#DC2626' }">{{ error }}</text>
      <view
        class="mt-4 rounded-full px-6 py-3"
        :style="{ backgroundColor: '#FFFFFF', border: '1px solid #E8E6E1' }"
        @tap="retryFetch"
      >
        <text class="text-sm font-medium" :style="{ color: '#1A1A2E' }">重试</text>
      </view>
    </view>

    <!-- Content -->
    <view v-else-if="caseData" class="px-4">
      <!-- Title area -->
      <view class="pt-4 pb-3">
        <text
          class="text-xl font-bold leading-[1.4]"
          :style="{ color: '#1A1A2E', fontFamily: 'Noto Serif SC, serif' }"
        >
          {{ caseData.title }}
        </text>
        <text
          v-if="caseData.summary"
          class="block text-sm mt-2 leading-relaxed"
          :style="{ color: '#4A4A68' }"
        >
          {{ caseData.summary }}
        </text>
      </view>

      <!-- Source info row -->
      <view
        v-if="caseData.source_account || caseData.source_url"
        class="flex items-center justify-between mt-2 px-1"
      >
        <text class="text-sm" :style="{ color: '#4A4A68' }">
          📌 {{ caseData.source_account || '' }}
        </text>
        <text
          v-if="caseData.source_url"
          class="text-sm"
          :style="{ color: '#0369A1' }"
          @tap="openUrl(caseData.source_url)"
        >
          ↗ 阅读原文
        </text>
      </view>

      <!-- Case story (blue quote box) -->
      <view
        v-if="caseData.case_story"
        class="mt-3 rounded-xl p-4"
        :style="{
          backgroundColor: '#F0F9FF',
          border: '1px solid #BAE6FD'
        }"
      >
        <text class="text-sm font-semibold block mb-2" :style="{ color: '#0369A1' }">📖 案例故事</text>
        <text class="text-sm block leading-relaxed" :style="{ color: '#4A4A68' }">
          {{ caseData.case_story }}
        </text>
      </view>

      <!-- Score visualization -->
      <view
        class="rounded-2xl p-4 mt-2"
        :style="{ backgroundColor: '#FFFFFF', border: '1px solid #E8E6E1', boxShadow: '0 2px 12px rgba(26,26,46,0.06)' }"
      >
        <view class="flex items-center gap-4">
          <!-- Large score badge -->
          <view class="flex flex-col items-center flex-shrink-0">
            <view
              class="flex items-center justify-center rounded-[20px] px-3 py-1"
              :style="{ background: 'linear-gradient(135deg, #F5A623, #FF8C00)' }"
            >
              <text
                class="font-bold text-white"
                :style="{ fontSize: '48px', fontFamily: 'Roboto Mono, monospace' }"
              >
                {{ Math.round(caseData.score_total) }}
              </text>
            </view>
            <text style="font-size: 11px" class="mt-1" :style="{ color: '#9B9A97' }">AI评分</text>
          </view>

          <!-- Dimension progress bars -->
          <view class="flex-1">
            <view v-for="(dim, i) in scoreDimensions" :key="dim.key" class="flex items-center mb-2" :class="{ 'mb-0': i === scoreDimensions.length - 1 }">
              <text class="text-xs w-12 flex-shrink-0" :style="{ color: '#4A4A68' }">
                {{ dim.label }}
              </text>
              <view class="flex-1 h-2 rounded-full mx-2" :style="{ backgroundColor: '#F0EFE9' }">
                <view
                  class="h-full rounded-full"
                  :style="{
                    width: (getScoreValue(caseData, dim.key) / dim.max * 100) + '%',
                    background: 'linear-gradient(90deg, #F5A623, #FF8C00)'
                  }"
                />
              </view>
              <text
                class="text-xs font-semibold w-6 text-right"
                :style="{ color: '#1A1A2E', fontFamily: 'Roboto Mono, monospace' }"
              >
                {{ getScoreValue(caseData, dim.key) }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- Basic info grid -->
      <view
        class="rounded-2xl p-4 mt-3"
        :style="{ backgroundColor: '#FFFFFF', border: '1px solid #E8E6E1', boxShadow: '0 2px 12px rgba(26,26,46,0.06)' }"
      >
        <view class="grid grid-cols-2 gap-3">
          <!-- Cost -->
          <view class="flex items-center gap-2">
            <text class="text-sm" :style="{ color: '#F5A623' }">&#x1F4B0;</text>
            <view class="flex-1 min-w-0">
              <text class="text-xs block" :style="{ color: '#9B9A97' }">成本</text>
              <text class="text-sm truncate" :style="{ color: '#1A1A2E' }">{{ caseData.cost || '--' }}</text>
            </view>
          </view>

          <!-- Source -->
          <view class="flex items-center gap-2">
            <text class="text-sm" :style="{ color: '#F5A623' }">&#x1F4F0;</text>
            <view class="flex-1 min-w-0">
              <text class="text-xs block" :style="{ color: '#9B9A97' }">来源</text>
              <text class="text-sm truncate" :style="{ color: '#1A1A2E' }">{{ caseData.source_account || '--' }}</text>
            </view>
          </view>

          <!-- Expected revenue -->
          <view class="flex items-center gap-2">
            <text class="text-sm" :style="{ color: '#F5A623' }">&#x1F4C8;</text>
            <view class="flex-1 min-w-0">
              <text class="text-xs block" :style="{ color: '#9B9A97' }">预期收益</text>
              <text class="text-sm truncate" :style="{ color: '#1A1A2E' }">{{ caseData.expected_revenue || '--' }}</text>
            </view>
          </view>

          <!-- Cycle -->
          <view class="flex items-center gap-2">
            <text class="text-sm" :style="{ color: '#F5A623' }">&#x23F0;</text>
            <view class="flex-1 min-w-0">
              <text class="text-xs block" :style="{ color: '#9B9A97' }">变现周期</text>
              <text class="text-sm truncate" :style="{ color: '#1A1A2E' }">{{ caseData.cycle || '--' }}</text>
            </view>
          </view>

          <!-- Suitable for -->
          <view v-if="suitableForList.length" class="col-span-2 flex items-start gap-2">
            <text class="text-sm flex-shrink-0" :style="{ color: '#F5A623' }">&#x1F465;</text>
            <view class="flex-1 min-w-0">
              <text class="text-xs block" :style="{ color: '#9B9A97' }">适合人群</text>
              <view class="flex flex-wrap gap-1 mt-1">
                <view
                  v-for="(tag, i) in suitableForList"
                  :key="i"
                  class="inline-flex items-center rounded-full px-[10px] py-[4px]"
                  :style="{ backgroundColor: morandiColors[i % 5].bg }"
                >
                  <text class="text-xs font-semibold" :style="{ color: morandiColors[i % 5].text }">
                    {{ tag }}
                  </text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- Practice steps -->
      <view v-if="caseData.steps?.length" class="mt-3">
        <text class="text-base font-semibold mb-2 block" :style="{ color: '#1A1A2E' }">
          实践步骤
        </text>
        <view
          class="rounded-2xl p-4"
          :style="{ backgroundColor: '#FFFFFF', border: '1px solid #E8E6E1', boxShadow: '0 2px 12px rgba(26,26,46,0.06)' }"
        >
          <view
            v-for="(step, i) in caseData.steps"
            :key="i"
            class="flex items-start gap-3"
            :class="{ 'mt-3': i > 0 }"
          >
            <!-- Circular checkbox -->
            <view
              class="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
              :style="{
                border: completedSteps[i] ? 'none' : '2px solid #E8E6E1',
                backgroundColor: completedSteps[i] ? '#059669' : 'transparent'
              }"
              @tap="toggleStep(i)"
            >
              <text v-if="completedSteps[i]" class="text-white" style="font-size: 10px">&#10003;</text>
            </view>

            <view class="flex-1 min-w-0">
              <text class="text-sm font-medium" :style="{ color: '#1A1A2E' }">
                {{ step.title }}
              </text>
              <text v-if="step.description" class="text-xs mt-0.5 block leading-relaxed" :style="{ color: '#4A4A68' }">
                {{ step.description }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- Tools -->
      <view v-if="caseData.tools?.length" class="mt-3">
        <text class="text-base font-semibold mb-2 block" :style="{ color: '#1A1A2E' }">
          推荐工具
        </text>
        <view class="grid grid-cols-2 gap-2">
          <view
            v-for="(tool, i) in caseData.tools"
            :key="i"
            class="rounded-xl p-3"
            :style="{ backgroundColor: '#FFFFFF', border: '1px solid #E8E6E1' }"
          >
            <text class="text-sm font-medium block" :style="{ color: '#1A1A2E' }">{{ tool.name }}</text>
            <text v-if="tool.description" class="text-xs mt-1 block" :style="{ color: '#4A4A68' }">
              {{ tool.description }}
            </text>
          </view>
        </view>
      </view>

      <!-- Resources -->
      <view v-if="caseData.resources?.length" class="mt-3">
        <text class="text-base font-semibold mb-2 block" :style="{ color: '#1A1A2E' }">
          相关资源
        </text>
        <view class="grid grid-cols-2 gap-2">
          <view
            v-for="(resource, i) in caseData.resources"
            :key="i"
            class="rounded-xl p-3"
            :style="{ backgroundColor: '#FFFFFF', border: '1px solid #E8E6E1' }"
          >
            <text class="text-sm font-medium block truncate" :style="{ color: '#1A1A2E' }">
              {{ resource.name }}
            </text>
            <text
              v-if="resource.url"
              class="text-xs mt-1 block"
              :style="{ color: '#0369A1' }"
              @tap="openUrl(resource.url)"
            >
              查看链接
            </text>
          </view>
        </view>
      </view>

      <!-- Pitfall guide (orange warning box) -->
      <view
        v-if="caseData.pitfalls"
        class="mt-3 rounded-xl p-4"
        :style="{
          backgroundColor: '#FFF3E0',
          border: '1px solid #FFE0B2'
        }"
      >
        <text class="text-sm font-semibold block mb-2" :style="{ color: '#E65100' }">⚠️ 避坑指南</text>
        <text class="text-sm block leading-relaxed" :style="{ color: '#BF360C' }">
          {{ caseData.pitfalls }}
        </text>
      </view>

      <!-- Risk tags (red pills) -->
      <view
        v-if="caseData.risk_tags?.length"
        class="mt-3 flex flex-wrap gap-2"
      >
        <view
          v-for="(tag, i) in caseData.risk_tags"
          :key="i"
          class="inline-flex items-center rounded-full px-[10px] py-[4px]"
          :style="{ backgroundColor: '#FEE2E2' }"
        >
          <text class="text-xs font-semibold" :style="{ color: '#DC2626' }">{{ tag }}</text>
        </view>
      </view>
    </view>

    <!-- Share Card Modal -->
    <view
      v-if="showShareCard && caseData"
      class="fixed inset-0 z-50 flex items-center justify-center"
      :style="{ backgroundColor: 'rgba(0,0,0,0.5)' }"
      @tap="showShareCard = false"
    >
      <view @tap.stop>
        <ShareCard
          :title="caseData.title"
          :summary="caseData.summary || ''"
          :score-total="Math.round(caseData.score_total)"
          @saved="showShareCard = false"
        />
      </view>
    </view>

    <!-- Fixed bottom action bar -->
    <view
      v-if="caseData"
      class="fixed bottom-0 left-0 right-0 flex items-center px-4 py-3"
      :style="{
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #E8E6E1',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.04)'
      }"
    >
      <!-- Share -->
      <view
        class="flex-1 flex flex-col items-center py-2"
        @tap="handleShare"
      >
        <text class="text-lg" :style="{ color: '#4A4A68' }">&#x2197;</text>
        <text class="text-xs mt-1" :style="{ color: '#4A4A68' }">分享</text>
      </view>

      <!-- Favorite -->
      <view
        class="flex-1 flex flex-col items-center py-2"
        @tap="handleFavorite"
      >
        <text class="text-lg" :style="{ color: isFavorited ? '#E94560' : '#4A4A68' }">
          {{ isFavorited ? '&#9829;' : '&#9825;' }}
        </text>
        <text class="text-xs mt-1" :style="{ color: isFavorited ? '#E94560' : '#4A4A68' }">
          {{ isFavorited ? '已收藏' : '收藏' }}
        </text>
      </view>

      <!-- Start doing -->
      <view
        class="flex-1 flex flex-col items-center py-2"
        @tap="handleStart"
      >
        <view
          class="rounded-full px-5 py-2"
          :style="{ background: 'linear-gradient(135deg, #E94560, #FF6B8A)' }"
        >
          <text class="text-sm font-medium text-white">开始做</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useCaseDetail, getScoreValue } from '@/composables/useCaseDetail'
import { useCollectionStore } from '@/store'
import { useLogin } from '@/composables/useLogin'
import { useShare } from '@/composables/useShare'
import { SCORE_DIMENSIONS, MORANDI_TAGS } from '@/utils/constants'
import { parseSuitableFor } from '@/components/helpers'
import ShareCard from '@/components/ShareCard.vue'

const { caseData, isLoading, error, fetchDetail } = useCaseDetail()
const collectionStore = useCollectionStore()
const { loginAndDo } = useLogin()

let caseId = ''

// Steps completion tracking
const completedSteps = ref<Record<number, boolean>>({})

// Share card visibility
const showShareCard = ref(false)

// Score dimensions from constants
const scoreDimensions = SCORE_DIMENSIONS

// Morandi colors for tags
const morandiColors = MORANDI_TAGS

// Parsed suitable_for list
const suitableForList = computed(() => {
  if (!caseData.value) return []
  return parseSuitableFor(caseData.value.suitable_for)
})

// Is current case favorited
const isFavorited = computed(() => {
  if (!caseId) return false
  return collectionStore.isCollected(caseId)
})

// Page load handler
onLoad((options) => {
  const id = options?.case_id
  if (id) {
    caseId = id
    fetchDetail(id)
  }
})

// Setup share with case-specific info
useShare(computed(() => ({
  title: caseData.value ? `${caseData.value.title} - 精益副业案例库` : '精益副业案例库',
  path: caseId ? `/pages/case-detail/index?case_id=${caseId}` : '/pages/index/index'
})))

function retryFetch() {
  if (caseId) fetchDetail(caseId)
}

function toggleStep(index: number) {
  completedSteps.value[index] = !completedSteps.value[index]
}

async function handleFavorite() {
  if (!caseId) return
  await loginAndDo(async () => {
    try {
      await collectionStore.toggleFavorite(caseId, completedSteps.value)
    } catch {
      uni.showToast({ title: '操作失败', icon: 'none' })
    }
  })
}

function handleShare() {
  if (!caseData.value) return
  showShareCard.value = true
}

function handleStart() {
  uni.showToast({ title: '功能开发中', icon: 'none' })
}

function openUrl(url: string) {
  // #ifdef H5
  window.open(url, '_blank')
  // #endif

  // #ifndef H5
  uni.setClipboardData({
    data: url,
    success: () => {
      uni.showToast({ title: '链接已复制', icon: 'success' })
    }
  })
  // #endif
}
</script>
