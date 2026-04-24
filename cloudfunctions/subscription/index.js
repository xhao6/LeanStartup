// cloudfunctions/subscription/index.js
const { getOpenid } = require('./utils/auth')
const { collection } = require('./utils/db')
const { success, error } = require('./utils/response')

exports.main = async (event, context) => {
  const { action } = event

  // Prepare dependencies for core functions
  const deps = {
    collection,
    openid: getOpenid(context)
  }

  try {
    switch (action) {
      case 'subscribe':
        return await doSubscribe(event, deps)
      case 'unsubscribe':
        return await doUnsubscribe(event, deps)
      case 'getStatus':
        return await doGetStatus(event, deps)
      default:
        return error('Invalid action', 'INVALID_ACTION')
    }
  } catch (err) {
    console.error('Subscription function error:', err)
    return error(err.message || 'Internal server error', err.code || 'INTERNAL_ERROR')
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

async function doUnsubscribe(event, deps) {
  // TODO: Implement unsubscribe logic
  const { openid } = deps
  return success({ openid, action: 'unsubscribe' })
}

async function doGetStatus(event, deps) {
  // TODO: Implement getStatus logic
  const { openid } = deps
  return success({ openid, action: 'getStatus' })
}

// Export functions for testing
exports.doSubscribe = doSubscribe
exports.doUnsubscribe = doUnsubscribe
exports.doGetStatus = doGetStatus
