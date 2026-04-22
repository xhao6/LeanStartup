// cloudfunctions/trackEvent/index.js
const { collection } = require('./utils/db')
const { getOpenid, validateEventName } = require('./utils/auth')
const { success, error } = require('./utils/response')
const { formatDateTime, getTodayDate } = require('./utils/date')

/**
 * trackEvent 核心逻辑（可注入依赖，方便测试）
 *
 * subscribe 事件 → 写入 PushSubscription 集合
 * 其他事件 → 写入 Analytics 集合
 * 错误时也返回 success(null)，埋点不影响用户体验
 *
 * @param {object} event
 * @param {string} event.event - 事件名
 * @param {string} [event.case_id] - 案例 ID（可选）
 * @param {object} [event.extra] - 额外数据（可选）
 * @param {object} deps - 注入依赖 { collection, validateEventName, getTodayDate, formatDateTime, openid }
 * @returns {object} { success, data/error/code }
 */
async function doTrackEvent(event, deps) {
  try {
    const { event: eventName, case_id, extra } = event
    const {
      collection: col,
      validateEventName: validate,
      getTodayDate: todayDate,
      formatDateTime: fmtDt,
      openid
    } = deps

    validate(eventName)

    if (eventName === 'subscribe') {
      // subscribe 事件 → 写入 PushSubscription
      await col('PushSubscription').add({
        openid,
        subscribed_at: fmtDt(new Date())
      })
      return success(null)
    }

    // 其他事件 → 写入 Analytics
    const record = {
      openid,
      event: eventName,
      date: todayDate(),
      created_at: fmtDt(new Date())
    }
    if (case_id) record.case_id = case_id
    if (extra) record.extra = extra

    await col('Analytics').add(record)
    return success(null)
  } catch (e) {
    const msg = e.message || String(e)
    // INVALID_INPUT 是业务校验错误，返回具体错误信息
    if (msg.startsWith('INVALID_INPUT')) {
      const match = msg.match(/^(\w+):\s*(.*)$/)
      if (match) {
        return error(match[2], match[1])
      }
      return error(msg, 'INVALID_INPUT')
    }
    // 数据库错误等 → 静默返回 success(null)，埋点不影响用户体验
    return success(null)
  }
}

/**
 * 云函数入口
 */
exports.main = async function (event, context) {
  const openid = getOpenid(context)
  return doTrackEvent(event, {
    collection,
    validateEventName,
    getTodayDate,
    formatDateTime,
    openid
  })
}

// 导出核心函数供测试使用
exports.doTrackEvent = doTrackEvent
