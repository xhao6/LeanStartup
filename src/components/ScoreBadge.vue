<template>
  <view class="flex flex-col items-center">
    <view
      class="flex items-center justify-center rounded-[20px] px-[10px] py-[4px]"
      :style="{ background: 'linear-gradient(135deg, #F5A623, #FF8C00)' }"
    >
      <text
        class="font-bold text-white font-mono"
        :style="{ fontSize: displaySize }"
      >
        {{ displayScore }}
      </text>
    </view>
    <text v-if="showLabel" class="text-[11px] mt-[4px]" :style="{ color: '#9B9A97' }">
      AI评分
    </text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatScoreDisplay, getScoreFontSize, type ScoreSize } from './helpers'

const props = withDefaults(
  defineProps<{
    score: number
    size?: ScoreSize
    showLabel?: boolean
  }>(),
  {
    size: 'md',
    showLabel: false
  }
)

const displayScore = computed(() => formatScoreDisplay(props.score))
const displaySize = computed(() => getScoreFontSize(props.size))
</script>
