const { collection, getCommand } = require('./utils/db')
const { getOpenid, validateCaseId, validateProgress } = require('./utils/auth')
const { success, error } = require('./utils/response')
const { formatDateTime } = require('./utils/date')

/**
 * toggleCollection 核心逻辑（可注入依赖，方便测试）
 *
 * @param {object} event
 * @param {string} event.case_id - 案例 ID（数字字符串）
 * @param {"collect"|"uncollect"} event.action
 * @param {object} [event.progress] - {step_N: boolean}
 * @param {object} deps - 注入依赖 { collection, getCommand, getOpenid, formatDateTime }
 */
async function toggleCollection(event, deps) {
  const { case_id, action, progress } = event
  const { collection: col, getCommand: getCmd, getOpenid: getOid, formatDateTime: fmtDt, openid } = deps

  // 参数校验
  validateCaseId(case_id)
  if (!action || !['collect', 'uncollect'].includes(action)) {
    return error('action 必须是 collect 或 uncollect', 'INVALID_INPUT')
  }
  if (action === 'collect') {
    validateProgress(progress)
  }

  const UserCollection = col('UserCollection')

  if (action === 'uncollect') {
    await UserCollection.where({ openid, case_id }).remove()
    return success({ case_id, action: 'uncollected' })
  }

  // action === 'collect'
  const { data: existing } = await UserCollection.where({ openid, case_id }).get()
  const now = fmtDt(new Date())

  if (existing.length > 0) {
    // 已有记录：spread 合并 progress，doc().set() 写回完整记录
    const record = existing[0]
    const mergedProgress = { ...record.progress, ...progress }

    await UserCollection.doc(record._id).set({
      openid: record.openid,
      case_id: record.case_id,
      progress: mergedProgress,
      created_at: record.created_at,
      updated_at: now
    })

    return success({ case_id, action: 'updated', progress: mergedProgress })
  }

  // 新记录
  const newRecord = {
    openid,
    case_id,
    progress: progress || {},
    created_at: now,
    updated_at: now
  }

  await UserCollection.doc(`${openid}_${case_id}`).set(newRecord)

  return success({ case_id, action: 'created', progress: newRecord.progress })
}

/**
 * 云函数入口
 */
exports.main = async function (event, context) {
  try {
    const openid = getOpenid(context)
    return await toggleCollection(event, {
      collection,
      getCommand,
      getOpenid: () => openid,
      formatDateTime,
      openid
    })
  } catch (e) {
    const msg = e.message || String(e)
    if (msg.startsWith('INVALID_INPUT') || msg.startsWith('UNAUTHORIZED')) {
      const code = msg.split(':')[0].trim()
      const message = msg.replace(/^(INVALID_INPUT|UNAUTHORIZED):\s*/, '')
      return error(message, code)
    }
    return error(msg)
  }
}

// 导出核心函数供测试使用
exports.toggleCollection = toggleCollection
