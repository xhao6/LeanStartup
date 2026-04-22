const { collection, getCommand } = require('./utils/db')
const { getOpenid } = require('./utils/auth')
const { success, error } = require('./utils/response')

/**
 * getUserCollections 核心逻辑（可注入依赖，方便测试）
 *
 * @param {object} event
 * @param {number} [event.page=1]
 * @param {number} [event.pageSize=10]
 * @param {object} deps - { collection, getCommand, openid }
 */
async function getUserCollections(event, deps) {
  const { collection: col, getCommand: getCmd, openid } = deps

  const page = Math.max(1, parseInt(event.page) || 1)
  const pageSize = Math.min(50, Math.max(1, parseInt(event.pageSize) || 10))

  const UserCollection = col('UserCollection')
  const Case = col('Case')

  // 查总数
  const { total } = await UserCollection.where({ openid }).count()

  if (total === 0) {
    return success({ total: 0, list: [] })
  }

  // 查当前页，按 updated_at 倒序
  const { data: collections } = await UserCollection
    .where({ openid })
    .orderBy('updated_at', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  if (collections.length === 0) {
    return success({ total, list: [] })
  }

  // N+1 优化：收集 case_id，单次 cmd.in() 批量查 Case
  const caseIds = collections.map(c => c.case_id)
  const cmd = getCmd()

  const { data: cases } = await Case.where({
    id: cmd.in(caseIds)
  }).get()

  // 构建 Case 查找映射
  const caseMap = {}
  for (const c of cases) {
    caseMap[c.id] = c
  }

  // 组装返回列表
  const list = collections.map(uc => {
    const caseInfo = caseMap[uc.case_id] || {}
    const progress = uc.progress || {}
    const completed_count = Object.values(progress).filter(v => v === true).length

    return {
      case_id: uc.case_id,
      title: caseInfo.title || '',
      score_total: caseInfo.score_total || 0,
      progress,
      steps_count: caseInfo.steps_count || 0,
      completed_count
    }
  })

  return success({ total, list })
}

/**
 * 云函数入口
 */
exports.main = async function (event, context) {
  try {
    const openid = getOpenid(context)
    return await getUserCollections(event, {
      collection,
      getCommand,
      openid
    })
  } catch (e) {
    const msg = e.message || String(e)
    if (msg.startsWith('UNAUTHORIZED')) {
      const code = msg.split(':')[0].trim()
      const message = msg.replace(/^UNAUTHORIZED:\s*/, '')
      return error(message, code)
    }
    return error(msg)
  }
}

exports.getUserCollections = getUserCollections
