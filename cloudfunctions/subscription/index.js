// cloudfunctions/subscription/index.js
const { getOpenid } = require('./utils/auth')
const { collection } = require('./utils/db')
const { success, error } = require('./utils/response')

exports.main = async (event, context) => {
  const { action } = event

  try {
    switch (action) {
      case 'subscribe':
        return await handleSubscribe(event, context)
      case 'unsubscribe':
        return await handleUnsubscribe(event, context)
      case 'getStatus':
        return await handleGetStatus(event, context)
      default:
        return error('Invalid action', 'INVALID_ACTION')
    }
  } catch (err) {
    console.error('Subscription function error:', err)
    return error(err.message || 'Internal server error', err.code || 'INTERNAL_ERROR')
  }
}

async function handleSubscribe(event, context) {
  // TODO: Implement subscribe logic
  const openid = getOpenid(context)
  return success({ openid, action: 'subscribe' })
}

async function handleUnsubscribe(event, context) {
  // TODO: Implement unsubscribe logic
  const openid = getOpenid(context)
  return success({ openid, action: 'unsubscribe' })
}

async function handleGetStatus(event, context) {
  // TODO: Implement getStatus logic
  const openid = getOpenid(context)
  return success({ openid, action: 'getStatus' })
}
