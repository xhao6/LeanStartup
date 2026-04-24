// cloudfunctions/subscription/index.js
const { getOpenid } = require('./utils/auth')
const { collection } = require('./utils/db')
const { success, error } = require('./utils/response')

/**
 * 云函数入口 - 路由分发
 */
exports.main = async function (event, context) {
  try {
    const openid = getOpenid(context)
    const { action } = event

    const deps = {
      collection,
      openid
    }

    switch (action) {
      case 'subscribe':
        return await doSubscribe(event, deps)
      case 'unsubscribe':
        return await doUnsubscribe(event, deps)
      case 'getStatus':
        return await doGetStatus(event, deps)
      default:
        return error('无效的 action 参数', 'INVALID_INPUT')
    }
  } catch (e) {
    if (e.code === 'UNAUTHORIZED') {
      return error(e.message, e.code)
    }
    return error(e.message || String(e), 'INTERNAL_ERROR')
  }
}

async function doSubscribe(event, deps) {
  const { collection: col, openid } = deps
  const { template_id } = event

  if (!template_id) {
    return error('template_id 为必填', 'INVALID_INPUT')
  }

  try {
    // 检查是否已订阅
    const { data: existing } = await col('PushSubscription').where({ openid }).get()

    if (existing && existing.length > 0) {
      // 已订阅，返回成功但提示已订阅
      return success({
        isSubscribed: true,
        alreadySubscribed: true,
        message: '已订阅每日提醒'
      })
    }

    // 新增订阅记录
    await col('PushSubscription').add({
      openid,
      template_id,
      subscribed_at: new Date().toISOString()
    })

    return success({
      isSubscribed: true,
      alreadySubscribed: false,
      message: '订阅成功'
    })
  } catch (e) {
    return error(e.message, 'INTERNAL_ERROR')
  }
}

/**
 * unsubscribe 核心逻辑
 *
 * @param {object} event
 * @param {string} event.action - 'unsubscribe'
 * @param {object} deps - { collection, openid }
 */
async function doUnsubscribe(event, deps) {
  const { collection: col, openid } = deps

  try {
    // 检查是否有订阅记录
    const { data: existing } = await col('PushSubscription').where({ openid }).get()

    if (!existing || existing.length === 0) {
      // 未订阅，返回成功
      return success({
        isSubscribed: false,
        message: '未订阅'
      })
    }

    // 删除所有该 openid 的订阅记录
    for (const record of existing) {
      await col('PushSubscription').doc(record._id).remove()
    }

    return success({
      isSubscribed: false,
      message: '已取消订阅'
    })
  } catch (e) {
    return error(e.message, 'INTERNAL_ERROR')
  }
}

/**
 * getStatus 核心逻辑
 *
 * @param {object} event
 * @param {string} event.action - 'getStatus'
 * @param {object} deps - { collection, openid }
 */
async function doGetStatus(event, deps) {
  const { collection: col, openid } = deps

  try {
    const { data: existing } = await col('PushSubscription').where({ openid }).get()

    const isSubscribed = existing && existing.length > 0

    return success({
      isSubscribed
    })
  } catch (e) {
    return error(e.message, 'INTERNAL_ERROR')
  }
}

// Export functions for testing
exports.doSubscribe = doSubscribe
exports.doUnsubscribe = doUnsubscribe
exports.doGetStatus = doGetStatus
