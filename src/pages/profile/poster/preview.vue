<route lang="json">
{
  "style": {
    "navigationBarTitleText": "预览海报",
    "navigationBarBackgroundColor": "#F8F6F1",
    "navigationBarTextStyle": "black"
  }
}
</route>

<template>
  <view class="preview-page">
    <swiper
      class="preview-swiper"
      :current="currentIndex"
      indicator-dots
      indicator-color="#E7E5E4"
      indicator-active-color="#CA8A04"
      @change="onSwiperChange"
    >
      <swiper-item v-for="(path, idx) in imagePaths" :key="idx">
        <view class="swiper-slide">
          <image :src="path" class="preview-image" mode="aspectFit" />
        </view>
      </swiper-item>
    </swiper>

    <text class="page-indicator">{{ currentIndex + 1 }} / {{ imagePaths.length }}</text>

    <view class="action-bar">
      <button class="action-btn save-btn" @click="handleSaveAll" :loading="saving">
        <text class="action-btn-text">全部保存到相册</text>
      </button>
      <button class="action-btn share-btn" open-type="share">
        <text class="action-btn-text">分享小程序</text>
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShareAppMessage } from '@dcloudio/uni-app'

const currentIndex = ref(0)
const imagePaths = ref<string[]>([])
const saving = ref(false)

// 从全局存储读取图片路径（URL 参数可能因路径过长被截断）
try {
  const stored = uni.getStorageSync('poster_paths')
  if (stored) imagePaths.value = stored
} catch (e) {
  console.error('[Preview] 读取图片路径失败:', e)
}

function onSwiperChange(e: any) {
  currentIndex.value = e.detail.current
}

async function handleSaveAll() {
  saving.value = true
  try {
    const authRes = await wx.getSetting()
    if (!authRes.authSetting['scope.writePhotosAlbum']) {
      try {
        await wx.authorize({ scope: 'scope.writePhotosAlbum' })
      } catch {
        uni.showModal({
          title: '需要相册权限',
          content: '请在设置中开启相册权限以保存图片',
          success: (res) => {
            if (res.confirm) wx.openSetting()
          },
        })
        saving.value = false
        return
      }
    }

    let saved = 0
    let failed = 0
    for (const path of imagePaths.value) {
      try {
        await wx.saveImageToPhotosAlbum({ filePath: path })
        saved++
      } catch {
        failed++
      }
    }

    if (failed === 0) {
      uni.showToast({ title: '全部保存成功', icon: 'success' })
    } else {
      uni.showToast({
        title: `${saved} 张已保存，${failed} 张失败`,
        icon: 'none',
      })
    }
  } catch (e: any) {
    console.error('[Preview] 保存失败:', e)
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

onShareAppMessage(() => ({
  title: '精益副业案例库 - 今日精选海报',
  path: '/pages/index/index',
}))
</script>

<style scoped>
.preview-page {
  background: #F8F6F1;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding-bottom: 120px;
}
.preview-swiper {
  flex: 1;
  width: 100%;
  height: 80vh;
}
.swiper-slide {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.preview-image {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.08);
}
.page-indicator {
  text-align: center;
  font-size: 14px;
  color: #78716C;
  margin: 0 0 16px;
}
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(248, 246, 241, 0.95);
  backdrop-filter: blur(10px);
  padding: 12px 20px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
  display: flex;
  gap: 12px;
}
.action-btn {
  flex: 1;
  height: 44px;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  margin: 0;
  padding: 0;
}
.action-btn::after {
  border: none;
}
.save-btn {
  background: #CA8A04;
}
.share-btn {
  background: #E11D48;
}
.action-btn-text {
  font-size: 15px;
  font-weight: 600;
  color: #FFFFFF;
}
</style>
