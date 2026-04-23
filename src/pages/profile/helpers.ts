import type { Ref } from 'vue'

/** Menu item definition */
export interface MenuItem {
  key: string
  label: string
  icon: string
  action: 'subscribe' | 'favorites' | 'share' | 'contact' | 'terms' | 'privacy' | 'clearCache' | 'about'
}

/** All 8 menu items matching DESIGN.md spec */
const MENU_ITEMS: MenuItem[] = [
  { key: 'subscribe', label: '订阅管理', icon: '⬡', action: 'subscribe' },
  { key: 'favorites', label: '我的收藏', icon: '★', action: 'favorites' },
  { key: 'share', label: '转发给朋友', icon: '↗', action: 'share' },
  { key: 'contact', label: '联系客服', icon: '◈', action: 'contact' },
  { key: 'terms', label: '用户协议', icon: '▤', action: 'terms' },
  { key: 'privacy', label: '隐私政策', icon: '◆', action: 'privacy' },
  { key: 'clearCache', label: '清除缓存', icon: '✕', action: 'clearCache' },
  { key: 'about', label: '关于精益副业', icon: '◎', action: 'about' }
]

/** Returns the full menu items list */
export function getMenuItems(): MenuItem[] {
  return [...MENU_ITEMS]
}

/** Handles menu item actions, dispatching the right side-effect */
export function handleMenuAction(
  item: MenuItem,
  deps: {
    navigateTo: (url: string) => void
    showToast: (opts: { title: string; icon: string }) => void
    clearCache: () => void
    triggerShare: () => void
    openContact: () => void
  }
): void {
  switch (item.action) {
    case 'favorites':
      deps.navigateTo('/pages/favorites/index')
      break
    case 'share':
      deps.triggerShare()
      break
    case 'contact':
      deps.openContact()
      break
    case 'clearCache':
      deps.clearCache()
      deps.showToast({ title: '缓存已清除', icon: 'success' })
      break
    case 'subscribe':
      deps.navigateTo('/pages/subscription/index')
      break
    case 'terms':
      deps.navigateTo('/pages/agreement/index')
      break
    case 'privacy':
      deps.navigateTo('/pages/privacy/index')
      break
    case 'about':
      deps.navigateTo('/pages/about/index')
      break
    default:
      deps.showToast({ title: '功能开发中', icon: 'none' })
      break
  }
}

/** Computes display stats for the profile header */
export function computeStats(collectionTotal: number): {
  readCount: number
  collectionCount: number
} {
  return {
    readCount: 0, // deferred feature
    collectionCount: collectionTotal
  }
}
