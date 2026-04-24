// src/services/CacheService.ts
const PRESERVED_KEYS = ['uni-id-token', 'uni-id-token-expire']

export class CacheService {
  static getCacheSize(): string {
    try {
      const info = uni.getStorageInfoSync()
      const size = info.currentSize
      if (size < 1024) return `${size} KB`
      return `${(size / 1024).toFixed(1)} MB`
    } catch {
      return '未知'
    }
  }

  static getClearedItemsList(): string[] {
    try {
      const info = uni.getStorageInfoSync()
      return info.keys.filter(key => !PRESERVED_KEYS.includes(key))
    } catch {
      return []
    }
  }

  static clearCache(): void {
    const keys = this.getClearedItemsList()
    keys.forEach(key => {
      try { uni.removeStorageSync(key) } catch {}
    })
  }

  static confirmAndClear(): void {
    uni.showModal({
      title: '清除缓存',
      content: `当前缓存大小: ${this.getCacheSize()}。确定要清除吗？`,
      confirmColor: '#E94560',
      success: (res) => {
        if (res.confirm) {
          this.clearCache()
          uni.showToast({ title: '缓存已清除', icon: 'success' })
        }
      }
    })
  }
}
