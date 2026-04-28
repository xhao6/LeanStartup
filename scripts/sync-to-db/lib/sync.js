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
 * 查询云端现有案例列表（用于增量同步）
 * @param {Object} app - CloudBase 实例
 * @returns {Promise<Map<string, Date>>} 案例ID到updated_at的映射
 */
async function fetchExistingCases(app) {
  try {
    const collection = app.database().collection('Case')
    const { data } = await collection
      .field(['id', 'updated_at', 'created_at'])
      .limit(1000)
      .get()

    const caseTimeMap = new Map()
    if (data) {
      for (const record of data) {
        const time = record.updated_at || record.created_at
        if (time) {
          caseTimeMap.set(String(record.id), new Date(time))
        }
      }
    }

    return caseTimeMap
  } catch (err) {
    throw new Error(`查询云端案例失败: ${err.message}`)
  }
}

/**
 * 同步案例数据到云数据库
 * @param {Object} app - CloudBase 实例
 * @param {string} functionName - 云函数名称
 * @param {Array} cases - 案例数据数组
 * @param {boolean} incremental - 是否增量同步模式
 * @returns {Promise<Object>} 同步结果
 */
async function syncCasesToCloud(app, functionName, cases, incremental = false) {
  try {
    let casesToSync = cases

    // 增量同步：过滤已存在且未更新的案例
    if (incremental) {
      console.log('  正在查询云端现有案例...')
      const existingTimeMap = await fetchExistingCases(app)
      console.log(`  云端现有 ${existingTimeMap.size} 个案例`)

      casesToSync = cases.filter(c => {
        const cloudTime = existingTimeMap.get(String(c.id))
        if (!cloudTime) {
          // 云端不存在，需要新增
          return true
        }

        // 云端存在，比较 processed_at
        const localTime = c.processed_at ? new Date(c.processed_at) : new Date(0)
        return localTime > cloudTime
      })

      console.log(`  需要同步 ${casesToSync.length} 个案例（新增/更新）`)

      if (casesToSync.length === 0) {
        return { success: true, data: { synced: 0, skipped: cases.length, incremental: true } }
      }
    }

    const result = await app.callFunction({
      name: functionName,
      data: { cases: casesToSync }
    })

    return {
      ...result.result,
      incremental: incremental ? { synced: casesToSync.length, skipped: cases.length - casesToSync.length } : null
    }
  } catch (err) {
    throw new Error(`调用云函数失败: ${err.message}`)
  }
}

module.exports = {
  initCloudBase,
  syncCasesToCloud,
  fetchExistingCases
}
