import { describe, it, expect, vi } from 'vitest'
import {
  getMenuItems,
  handleMenuAction,
  computeStats
} from '@/pages/profile/helpers'
import type { MenuItem } from '@/pages/profile/helpers'

// ─── getMenuItems ─────────────────────────────────────────────────────

describe('getMenuItems', () => {
  it('returns 8 menu items', () => {
    const items = getMenuItems()
    expect(items).toHaveLength(8)
  })

  it('each item has key, label, icon, and action', () => {
    const items = getMenuItems()
    for (const item of items) {
      expect(item).toHaveProperty('key')
      expect(item).toHaveProperty('label')
      expect(item).toHaveProperty('icon')
      expect(item).toHaveProperty('action')
      expect(item.key).toBeTruthy()
      expect(item.label).toBeTruthy()
      expect(item.icon).toBeTruthy()
    }
  })

  it('has unique keys across all items', () => {
    const items = getMenuItems()
    const keys = items.map(i => i.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('contains "我的收藏" item with favorites action', () => {
    const items = getMenuItems()
    const fav = items.find(i => i.action === 'favorites')
    expect(fav).toBeDefined()
    expect(fav!.label).toBe('我的收藏')
  })

  it('contains "清除缓存" item with clearCache action', () => {
    const items = getMenuItems()
    const clear = items.find(i => i.action === 'clearCache')
    expect(clear).toBeDefined()
    expect(clear!.label).toBe('清除缓存')
  })

  it('items are in the correct DESIGN.md order', () => {
    const items = getMenuItems()
    const labels = items.map(i => i.label)
    expect(labels).toEqual([
      '订阅管理',
      '我的收藏',
      '转发给朋友',
      '联系客服',
      '用户协议',
      '隐私政策',
      '清除缓存',
      '关于精益副业'
    ])
  })

  it('returns a copy (immutable)', () => {
    const a = getMenuItems()
    const b = getMenuItems()
    expect(a).toEqual(b)
    expect(a).not.toBe(b)
  })
})

// ─── handleMenuAction ─────────────────────────────────────────────────

function makeDeps() {
  return {
    navigateTo: vi.fn(),
    showToast: vi.fn(),
    clearCache: vi.fn(),
    triggerShare: vi.fn(),
    openContact: vi.fn()
  }
}

describe('handleMenuAction', () => {
  it('navigates to favorites page for favorites action', () => {
    const deps = makeDeps()
    handleMenuAction(
      { key: 'favorites', label: '我的收藏', icon: '★', action: 'favorites' },
      deps
    )
    expect(deps.navigateTo).toHaveBeenCalledWith('/pages/favorites/index')
    expect(deps.showToast).not.toHaveBeenCalled()
  })

  it('calls triggerShare for share action', () => {
    const deps = makeDeps()
    handleMenuAction(
      { key: 'share', label: '转发给朋友', icon: '↗', action: 'share' },
      deps
    )
    expect(deps.triggerShare).toHaveBeenCalledOnce()
  })

  it('calls openContact for contact action', () => {
    const deps = makeDeps()
    handleMenuAction(
      { key: 'contact', label: '联系客服', icon: '◈', action: 'contact' },
      deps
    )
    expect(deps.openContact).toHaveBeenCalledOnce()
  })

  it('clears cache and shows success toast for clearCache action', () => {
    const deps = makeDeps()
    handleMenuAction(
      { key: 'clearCache', label: '清除缓存', icon: '✕', action: 'clearCache' },
      deps
    )
    expect(deps.clearCache).toHaveBeenCalledOnce()
    expect(deps.showToast).toHaveBeenCalledWith({
      title: '缓存已清除',
      icon: 'success'
    })
  })

  it('navigates to subscription page for subscribe action', () => {
    const deps = makeDeps()
    handleMenuAction(
      { key: 'subscribe', label: '订阅管理', icon: '⬡', action: 'subscribe' },
      deps
    )
    expect(deps.navigateTo).toHaveBeenCalledWith('/pages/subscription/index')
    expect(deps.showToast).not.toHaveBeenCalled()
  })

  it('navigates to agreement page for terms action', () => {
    const deps = makeDeps()
    handleMenuAction(
      { key: 'terms', label: '用户协议', icon: '▤', action: 'terms' },
      deps
    )
    expect(deps.navigateTo).toHaveBeenCalledWith('/pages/agreement/index')
    expect(deps.showToast).not.toHaveBeenCalled()
  })

  it('navigates to privacy page for privacy action', () => {
    const deps = makeDeps()
    handleMenuAction(
      { key: 'privacy', label: '隐私政策', icon: '◆', action: 'privacy' },
      deps
    )
    expect(deps.navigateTo).toHaveBeenCalledWith('/pages/privacy/index')
    expect(deps.showToast).not.toHaveBeenCalled()
  })

  it('navigates to about page for about action', () => {
    const deps = makeDeps()
    handleMenuAction(
      { key: 'about', label: '关于精益副业', icon: '◎', action: 'about' },
      deps
    )
    expect(deps.navigateTo).toHaveBeenCalledWith('/pages/about/index')
    expect(deps.showToast).not.toHaveBeenCalled()
  })
})

// ─── computeStats ─────────────────────────────────────────────────────

describe('computeStats', () => {
  it('returns 0 readCount (deferred feature)', () => {
    const stats = computeStats(0)
    expect(stats.readCount).toBe(0)
  })

  it('returns collectionCount from store total', () => {
    const stats = computeStats(42)
    expect(stats.collectionCount).toBe(42)
  })

  it('returns 0 collectionCount when no collections', () => {
    const stats = computeStats(0)
    expect(stats.collectionCount).toBe(0)
  })
})
