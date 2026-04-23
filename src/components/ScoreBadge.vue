<template>
  <view class="flex flex-col items-center">
    <view
      class="flex items-center justify-center"
      :style="{ background: 'linear-gradient(135deg, #F5A623, #FF8C00)', padding: '4px 10px', borderRadius: '20px' }"
    >
      <text
        class="font-bold text-white font-mono"
        :style="{ fontSize: displaySize }"
      >
        {{ displayScore }}
      </text>
    </view>
    <text v-if="showLabel" class="text-xs mt-1" :style="{ color: '#9B9A97' }">
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
