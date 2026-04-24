<template>
  <view class="score-badge">
    <text class="score-num">{{ Math.floor(score) }}</text>
    <text class="score-decimal">.{{ decimal }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ score: number }>()
const decimal = computed(() => ((props.score % 1) * 10).toFixed(0))
</script>

<style scoped>
.score-badge { display: inline-flex; align-items: baseline; padding: 4px 10px; border-radius: 20px; background: linear-gradient(135deg, var(--color-gold), var(--color-gold)); box-shadow: var(--shadow-sm); }
.score-num { font-family: var(--font-mono); font-size: 18px; font-weight: 700; color: white; }
.score-decimal { font-family: var(--font-mono); font-size: 12px; font-weight: 700; color: white; opacity: 0.9; }
</style>
