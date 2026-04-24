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
  // TODO: Implement subscribe logic
  const { openid } = deps
  return success({ openid, action: 'subscribe' })
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
