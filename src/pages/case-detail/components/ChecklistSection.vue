<template>
  <view class="checklist-section">
    <view class="section-header">
      <text class="section-title">实践步骤</text>
      <text class="progress-text">{{ checkedCount }}/{{ steps.length }}</text>
    </view>
    <view class="checklist">
      <view
        v-for="(step, index) in steps"
        :key="index"
        class="checklist-item"
        :class="{ checked: progress[`step_${index + 1}`] }"
        @click="toggleStep(index + 1)"
      >
        <wd-icon
          :name="progress[`step_${index + 1}`] ? 'check-circle-fill' : 'circle'"
          :color="progress[`step_${index + 1}`] ? '#3D5C3D' : '#9B9A97'"
          size="20px"
        />
        <text class="step-text">{{ step.step }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getUserCollections, toggleCollection } from '@/api/modules/collection'

const props = defineProps<{ caseId: string; steps: string[] }>()
const progress = ref<Record<string, boolean>>({})
const checkedCount = computed(() => Object.values(progress.value).filter(Boolean).length)

let debounceTimer: ReturnType<typeof setTimeout> | null = null
const pendingUpdates: Record<string, boolean> = {}

const toggleStep = async (order: number) => {
  const key = `step_${order}`
  const newValue = !progress.value[key]
  progress.value[key] = newValue
  pendingUpdates[key] = newValue

  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(async () => {
    try {
      const res = await toggleCollection({ case_id: props.caseId, action: 'collect', progress: { ...pendingUpdates } })
      if (res.success && res.data?.progress) {
        progress.value = { ...res.data.progress }
      }
    } finally {
      Object.keys(pendingUpdates).forEach(k => { delete pendingUpdates[k] })
    }
  }, 500)
}

onMounted(async () => {
  const res = await getUserCollections({ page: 1, pageSize: 50 })
  if (res.success && res.data) {
    const myCollection = res.data.list.find((c: any) => c.case_id === props.caseId)
    if (myCollection?.progress) {
      progress.value = myCollection.progress
    }
  }
})
</script>

<style lang="scss" scoped>
.checklist-section { padding: 32rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.section-title { font-family: 'Noto Serif SC', serif; font-size: 32rpx; font-weight: 600; color: #1A1A2E; }
.progress-text { font-family: 'Roboto Mono', monospace; font-size: 28rpx; color: #E94560; }
.checklist-item {
  display: flex; align-items: flex-start; gap: 16rpx; padding: 20rpx 0;
  border-bottom: 1rpx solid #E8E6E1;
  &.checked .step-text { text-decoration: line-through; color: #9B9A97; }
}
.step-text { font-size: 28rpx; color: #1A1A2E; line-height: 1.6; flex: 1; }
</style>