/**
 * CloudBase 调用辅助
 * 使用 @cloudbase/node-sdk 直接调用云函数
 *
 * 本地运行时使用环境变量中的 secretId/secretKey
 * 云函数内运行时使用 SYMBOL_CURRENT_ENV
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') })
const cloudbase = require('@cloudbase/node-sdk')

let app = null

function getApp() {
  if (app) return app

  const envId = process.env.CLOUDBASE_ENV_ID
  const secretId = process.env.CLOUDBASE_SECRET_ID
  const secretKey = process.env.CLOUDBASE_SECRET_KEY

  if (secretId && secretKey) {
    // 本地环境：使用永久密钥（顶层参数，非 credentials 对象）
    app = cloudbase.init({
      envId,
      secretId,
      secretKey
    })
  } else {
    // 云函数内：使用当前环境
    app = cloudbase.init({
      env: cloudbase.SYMBOL_CURRENT_ENV
    })
  }

  return app
}

/**
 * 调用云函数
 * @param {string} name - 函数名
 * @param {object} data - 传入参数
 * @returns {Promise<{success: boolean, data: object}>}
 *
 * SDK 返回 { result, requestId }，其中 result 是云函数返回值（已解析）
 * 此函数直接返回 result（即云函数返回的 { success, data/error, code }）
 */
async function callFunction(name, data = {}) {
  const { result, requestId } = await getApp().callFunction({ name, data })
  if (!result) {
    throw new Error(`Cloud function ${name} returned null (requestId: ${requestId})`)
  }
  return result
}

/**
 * 解析云函数返回值（兼容两种格式）
 * - SDK v3: { result: { success, data } } → 返回 result
 * - 云函数内部返回字符串 ret: { ret: '{...}' } → JSON.parse
 */
function parseResponse(result) {
  if (!result) return null
  if (result.success !== undefined) return result  // already unwrapped
  if (typeof result.ret === 'string') return JSON.parse(result.ret)
  return result.result || result
}

module.exports = { callFunction, parseResponse }
