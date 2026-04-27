<template>
  <view class="checklist-section">
    <view class="section-header">
      <text class="section-title">实践步骤</text>
      <text class="progress-text">{{ checkedCount }}/{{ steps.length }} 完成</text>
    </view>
    <view class="checklist">
      <view
        v-for="(step, index) in steps"
        :key="index"
        class="checklist-item"
        @click="toggleStep(index + 1)"
      >
        <view class="check-circle" :class="{ checked: progress[`step_${index + 1}`] }">
          <text v-if="progress[`step_${index + 1}`]" class="check-icon">✓</text>
          <text v-else class="step-num">{{ index + 1 }}</text>
        </view>
        <text class="step-text" :class="{ checked: progress[`step_${index + 1}`] }">{{ step.step || step }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCollectionStore } from '@/store/collection'
import { toggleCollection } from '@/api/modules/collection'

const props = defineProps<{ caseId: string; steps: string[] | any[] }>()
const collectionStore = useCollectionStore()
const progress = ref<Record<string, boolean>>({})
const checkedCount = computed(() => Object.values(progress.value).filter(Boolean).length)

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let pendingUpdates: Record<string, boolean> = {}

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
        Object.keys(res.data.progress).forEach(k => {
          progress.value[k] = res.data.progress[k]
        })
      }
    } catch (e) {
      Object.keys(pendingUpdates).forEach(k => {
        progress.value[k] = !pendingUpdates[k]
      })
    } finally {
      Object.keys(pendingUpdates).forEach(k => { delete pendingUpdates[k] })
    }
  }, 500)
}

onMounted(() => {
  const myCollection = collectionStore.getCollection(props.caseId)
  if (myCollection?.progress) {
    progress.value = myCollection.progress
  }
})
</script>

<style lang="scss" scoped>
.checklist-section {
  background: #FFFFFF;
  border: 1rpx solid #E8E6E1;
  border-radius: 24rpx;
  padding: 24rpx;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}
.section-title {
  font-size: 24rpx;
  font-weight: 700;
  color: #1A1A2E;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.progress-text {
  font-size: 22rpx;
  font-weight: 600;
  color: #E94560;
}
.checklist-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 12rpx 0;
}
.check-circle {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  border: 1rpx solid #E8E6E1;
  background: #FAFAF8;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &.checked {
    background: #E94560;
    border-color: #E94560;
  }
}
.check-icon {
  font-size: 16rpx;
  color: #FFFFFF;
  font-weight: 700;
}
.step-num {
  font-size: 18rpx;
  color: #9B9A97;
  font-weight: 700;
}
.step-text {
  font-size: 30rpx;
  color: #1A1A2E;
  line-height: 1.6;
  flex: 1;
  padding-top: 4rpx;
  &.checked {
    text-decoration: line-through;
    color: #9B9A97;
  }
}
</style>
