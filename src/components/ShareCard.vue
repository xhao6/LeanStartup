<template>
  <view>
    <!-- Hidden canvas for drawing -->
    <canvas
      canvas-id="shareCard"
      :style="{
        width: '750px',
        height: '1334px',
        position: 'fixed',
        left: '-9999px',
        top: '-9999px'
      }"
    />

    <!-- Share button -->
    <view
      class="rounded-full flex items-center justify-center px-6 py-3"
      :style="{ backgroundColor: '#E94560' }"
      @tap="handleGenerate"
    >
      <text class="text-white text-base font-semibold">生成分享卡片</text>
    </view>

    <!-- Preview modal overlay -->
    <view
      v-if="showPreview"
      class="fixed inset-0 z-50 flex items-center justify-center"
      :style="{ backgroundColor: 'rgba(0,0,0,0.7)' }"
      @tap="showPreview = false"
    >
      <view
        class="flex flex-col items-center mx-6"
        @tap.stop
      >
        <!-- Card image preview -->
        <image
          v-if="cardImageUrl"
          :src="cardImageUrl"
          mode="aspectFit"
          class="rounded-2xl"
          :style="{ width: '280px', height: '498px' }"
        />

        <!-- Action buttons -->
        <view class="flex gap-4 mt-6">
          <view
            class="rounded-full px-6 py-3"
            :style="{ backgroundColor: 'rgba(255,255,255,0.15)' }"
            @tap="handleSave"
          >
            <text class="text-white text-sm">保存到相册</text>
          </view>
          <view
            class="rounded-full px-6 py-3"
            :style="{ backgroundColor: 'rgba(255,255,255,0.15)' }"
            @tap="handleClose"
          >
            <text class="text-white text-sm">关闭</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useShareCard } from '@/composables/useShareCard'

const props = defineProps<{
  title: string
  summary: string
  scoreTotal: number
}>()

const emit = defineEmits<{
  generated: [url: string]
  saved: []
}>()

const { isGenerating, cardImageUrl, drawCard, saveToAlbum } = useShareCard()
const showPreview = ref(false)

async function handleGenerate() {
  if (isGenerating.value) return
  isGenerating.value = true

  try {
    const ctx = uni.createCanvasContext('shareCard')
    const url = await drawCard(ctx, {
      title: props.title,
      summary: props.summary,
      scoreTotal: props.scoreTotal
    }, 'shareCard')
    showPreview.value = true
    emit('generated', url)
  } catch (err) {
    uni.showToast({ title: '生成失败', icon: 'none' })
  } finally {
    isGenerating.value = false
  }
}

async function handleSave() {
  if (!cardImageUrl.value) return
  const ok = await saveToAlbum(cardImageUrl.value)
  if (ok) {
    emit('saved')
  }
}

function handleClose() {
  showPreview.value = false
}
</script>
