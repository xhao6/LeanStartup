import type { CollectionItem } from '@/store'

/**
 * Format progress display string from collection item.
 * Returns "completed/steps" format, e.g. "2/5".
 */
export function formatProgress(item: Pick<CollectionItem, 'completed_count' | 'steps_count'>): string {
  return `${item.completed_count || 0}/${item.steps_count || 0}`
}

/**
 * Build navigation URL for case detail page.
 */
export function buildCaseDetailUrl(caseId: string): string {
  return `/pages/case-detail/index?case_id=${caseId}`
}

/**
 * Build header text showing collection count.
 */
export function buildHeaderText(total: number): string {
  if (total === 0) return '我的收藏'
  return `我的收藏 (${total}个)`
}

/**
 * Determine if "load more" should be shown.
 */
export function canLoadMore(currentLength: number, total: number, isLoading: boolean): boolean {
  if (isLoading) return false
  if (total === 0) return false
  return currentLength < total
}
