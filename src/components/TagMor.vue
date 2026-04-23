<template>
  <view
    class="inline-flex items-center rounded-full px-[10px] py-[4px]"
    :style="{ backgroundColor: color.bg }"
  >
    <text
      class="text-[11px] font-semibold leading-none"
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
