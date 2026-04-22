/**
 * CloudBase 数据同步器
 * 将案例数据同步到 NoSQL 数据库
 */
const cloudbase = require('@cloudbase/node-sdk')

/**
 * 初始化 CloudBase
 */
function initCloudBase(envId, secretId, secretKey) {
  return cloudbase.init({
    envId,
    secretId,
    secretKey
  })
}

/**
 * 同步案例数据到云数据库
 * @param {Object} app - CloudBase 实例
 * @param {string} functionName - 云函数名称
 * @param {Array} cases - 案例数据数组
 * @returns {Promise<Object>} 同步结果
 */
async function syncCasesToCloud(app, functionName, cases) {
  try {
    const result = await app.callFunction({
      name: functionName,
      data: { cases }
    })

    return result.result
  } catch (err) {
    throw new Error(`调用云函数失败: ${err.message}`)
  }
}

module.exports = {
  initCloudBase,
  syncCasesToCloud
}
