// cloudfunctions/subscription/utils/auth.js
function getOpenid(context) {
  if (!context || !context.cloudContext || !context.cloudContext.OPENID) {
    const err = new Error('UNAUTHORIZED: 无法获取用户 OPENID')
    err.code = 'UNAUTHORIZED'
    throw err
  }
  return context.cloudContext.OPENID
}

module.exports = { getOpenid }
