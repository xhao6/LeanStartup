<template>
  <view class="tag-mor" :style="{ background: tag.bg, color: tag.text }">
    <text>{{ text }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MORANDI_TAGS } from '@/utils/constants'
const props = defineProps<{ text: string; variant?: 1 | 2 | 3 | 4 | 5 }>()
const tag = computed(() => MORANDI_TAGS[(props.variant || 1) - 1])
</script>

<style scoped>
.tag-mor { display: inline-flex; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; }
</style>
