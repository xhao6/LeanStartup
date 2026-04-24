<!-- src/components/skeleton-card/index.vue -->
<template>
  <view class="skeleton-card">
    <view class="skeleton-header">
      <view class="skeleton-rank"></view>
      <view class="skeleton-content">
        <view class="skeleton-name"></view>
        <view class="skeleton-value"></view>
        <view class="skeleton-tags">
          <view class="skeleton-tag"></view>
          <view class="skeleton-tag"></view>
          <view class="skeleton-tag"></view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.skeleton-card {
  display: flex;
  background: #FFFFFF;
  border-radius: 16px;
  border: 1px solid #E8E6E1;
  overflow: hidden;
  height: 120px;
}

.skeleton-header {
  display: flex;
  width: 100%;
  padding: 16px;
  gap: 12px;
}

.skeleton-rank {
  width: 50px;
  height: 88px;
  border-radius: 12px;
  background: linear-gradient(90deg, #F5F5F3 25%, #E8E6E1 50%, #F5F5F3 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
}

.skeleton-name {
  width: 60%;
  height: 20px;
  border-radius: 4px;
  background: linear-gradient(90deg, #F5F5F3 25%, #E8E6E1 50%, #F5F5F3 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-value {
  width: 80%;
  height: 14px;
  border-radius: 4px;
  background: linear-gradient(90deg, #F5F5F3 25%, #E8E6E1 50%, #F5F5F3 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite 0.1s;
}

.skeleton-tags {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}

.skeleton-tag {
  width: 50px;
  height: 22px;
  border-radius: 9999px;
  background: linear-gradient(90deg, #F5F5F3 25%, #E8E6E1 50%, #F5F5F3 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite 0.2s;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
