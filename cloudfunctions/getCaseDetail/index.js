// cloudfunctions/getCaseDetail/index.js
const { collection } = require('./utils/db')
const { validateCaseId } = require('./utils/auth')
const { success, error } = require('./utils/response')

/**
 * getCaseDetail 核心逻辑（可注入依赖，方便测试）
 *
 * @param {object} event
 * @param {string} event.case_id - 案例 ID（数字字符串）
 * @param {object} deps - 注入依赖 { collection, validateCaseId }
 * @returns {object} { success, data/error/code }
 */
async function doGetCaseDetail(event, deps) {
  try {
    const { case_id } = event
    const { collection: col, validateCaseId: validate } = deps

    validate(case_id)

    const res = await col('Case')
      .where({ id: case_id, status: 'published' })
      .limit(1)
      .get()

    if (!res.data || res.data.length === 0) {
      return error('案例不存在或已下架', 'NOT_FOUND')
    }

    return success(res.data[0])
  } catch (e) {
    const match = e.message.match(/^(\w+):\s*(.*)$/)
    if (match) {
      return error(match[2], match[1])
    }
    return error(e.message, 'UNKNOWN')
  }
}

/**
 * 云函数入口
 */
exports.main = async function (event, context) {
  return doGetCaseDetail(event, {
    collection,
    validateCaseId
  })
}

// 导出核心函数供测试使用
exports.doGetCaseDetail = doGetCaseDetail
