<template>
  <view
    class="inline-flex items-center rounded-full"
    :style="{ backgroundColor: color.bg, padding: '4px 10px' }"
  >
    <text
      class="font-semibold leading-none"
      style="font-size: 11px"
      :style="{ color: color.text }"
    >
      {{ text }}
    </text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getMorandiColor } from './helpers'

const props = withDefaults(
  defineProps<{
    text: string
    colorIndex?: number
  }>(),
  {
    colorIndex: 0
  }
)

const color = computed(() => getMorandiColor(props.colorIndex))
</script>
