// cloudfunctions/_shared/date.js

/**
 * 格式化日期为 YYYY-MM-DD HH:mm:ss（北京时间）
 * 使用 Intl API 自动处理时区
 */
function formatDateTime(date) {
  const d = date instanceof Date ? date : new Date(date)
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  // formatter.formatToParts 返回各部分，拼接为 YYYY-MM-DD HH:mm:ss
  const parts = formatter.formatToParts(d)
  const get = (type) => parts.find(p => p.type === type)?.value || ''
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`
}

/**
 * 获取今天的日期字符串 YYYY-MM-DD（北京时间）
 */
function getTodayDate() {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  const parts = formatter.formatToParts(now)
  const get = (type) => parts.find(p => p.type === type)?.value || ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/**
 * 获取 N 天前的日期字符串 YYYY-MM-DD（北京时间）
 */
function getDaysAgoDate(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  const parts = formatter.formatToParts(d)
  const get = (type) => parts.find(p => p.type === type)?.value || ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

module.exports = { formatDateTime, getTodayDate, getDaysAgoDate }
