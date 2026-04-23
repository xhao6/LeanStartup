<template>
  <view
    class="bg-surface rounded-2xl p-4 transition-transform"
    :style="{
      border: '1px solid #E8E6E1',
      boxShadow: '0 2px 12px rgba(26,26,46,0.06)'
    }"
    @tap="handleTap"
  >
    <view class="flex gap-3">
      <!-- Rank badge (left side) -->
      <view
        v-if="showRank && rank > 0"
        class="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg"
        :style="rankBadgeStyle"
      >
        <text class="text-sm font-bold" :style="{ color: rankTextColor }">
          {{ rank }}
        </text>
      </view>

      <!-- Content area -->
      <view class="flex-1 min-w-0">
        <!-- Title -->
        <text
          class="text-base font-semibold leading-snug line-clamp-2"
          :style="{ color: '#1A1A2E' }"
        >
          {{ caseData.title }}
        </text>

        <!-- Summary -->
        <text
          class="text-sm mt-1 leading-snug line-clamp-2"
          :style="{ color: '#4A4A68' }"
        >
          {{ caseData.summary }}
        </text>

        <!-- Tags row: Score + Cost + Suitable tags -->
        <view class="flex flex-wrap items-center gap-2 mt-3">
          <ScoreBadge :score="caseData.score_total" size="sm" />

          <!-- Cost tag -->
          <view
            class="inline-flex items-center rounded-full"
            :style="{ backgroundColor: costStyle.bg, padding: '4px 10px' }"
          >
            <text
              class="font-semibold"
              style="font-size: 11px"
              :style="{ color: costStyle.text }"
            >
              {{ caseData.cost }}
            </text>
          </view>

          <!-- Suitable-for tags -->
          <TagMor
            v-for="(tag, i) in suitableTags"
            :key="i"
            :text="tag"
            :color-index="colorIndices[i]"
          />
        </view>

        <!-- Source -->
        <text
          v-if="caseData.source_account"
          class="text-xs mt-2"
          :style="{ color: '#9B9A97' }"
        >
          来源: {{ caseData.source_account }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ScoreBadge from './ScoreBadge.vue'
import TagMor from './TagMor.vue'
import {
  isTopRank,
  getRankGradient,
  getCostTagStyle,
  parseSuitableFor,
  distributeTagColors,
  type CaseData
} from './helpers'
import { COLORS } from '@/utils/constants'

const props = withDefaults(
  defineProps<{
    case: CaseData
    rank?: number
    showRank?: boolean
  }>(),
  {
    rank: 0,
    showRank: true
  }
)

const emit = defineEmits<{
  click: []
}>()

const caseData = computed(() => props.case)

const rankBadgeStyle = computed(() => {
  const gradient = getRankGradient(props.rank)
  if (gradient) {
    return { background: gradient }
  }
  return { backgroundColor: COLORS.BG }
})

const rankTextColor = computed(() => {
  return isTopRank(props.rank) ? '#FFFFFF' : COLORS.SECONDARY
})

const costStyle = computed(() => getCostTagStyle(props.case.cost))

const suitableTags = computed(() => parseSuitableFor(props.case.suitable_for))

const colorIndices = computed(() => distributeTagColors(suitableTags.value.length))

function handleTap() {
  emit('click')
}
</script>
