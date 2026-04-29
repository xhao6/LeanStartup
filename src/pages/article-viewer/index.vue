<route lang="json">
{
  "style": {
    "navigationBarTitleText": "阅读原文",
    "navigationBarBackgroundColor": "#FFFFFF",
    "navigationBarTextStyle": "black"
  }
}
</route>

<template>
  <web-view :src="encodedUrl" />
</template>

<script setup lang="ts">
import { computed } from 'vue'

const url = computed(() => {
  const pages = getCurrentPages()
  const current = pages[pages.length - 1]
  const query = (current as any)?.options?.url || ''
  return decodeURIComponent(query)
})

// 微信公众平台文章 URL 需要 encode
const encodedUrl = computed(() => {
  const raw = url.value
  if (!raw) return ''
  // 已经是完整 URL，直接使用
  if (raw.startsWith('http')) return raw
  return raw
})
</script>
