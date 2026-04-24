export const formatDate = (d: Date | string): string => {
  const date = typeof d === 'string' ? new Date(d) : d
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const formatDateShort = (d: Date | string): string => {
  const date = typeof d === 'string' ? new Date(d) : d
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const getCurrentDate = (): string => formatDate(new Date())

export const getWeekday = (d: Date | string): string => {
  const date = typeof d === 'string' ? new Date(d) : d
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
}

export const truncate = (text: string, maxLen: number): string => {
  if (text.length <= maxLen) return text
  return text.substring(0, maxLen) + '...'
}
