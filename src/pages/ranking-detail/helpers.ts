/**
 * Pure logic for the ranking-detail page.
 * Extracted for TDD without Vue/UniApp test infrastructure.
 */

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/** "2026-04-23" → "2026年4月23日" */
export function formatDateChinese(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/** "2026-04-23" → "周四" */
export function getWeekdayName(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return WEEKDAYS[d.getDay()]
}

/** "2026-04-23" → "精益副业案例库 - 2026年4月23日榜单" */
export function buildShareTitle(dateStr: string): string {
  const chinese = formatDateChinese(dateStr)
  return chinese ? `精益副业案例库 - ${chinese}榜单` : '精益副业案例库'
}
