/**
 * syncCaseData - 同步案例数据到 Case 集合
 *
 * 使用 @cloudbase/manager-node SDK
 * 在云函数环境中，SDK 自动从环境变量获取凭证，无需传入 secretId/secretKey
 */
const CloudBase = require('@cloudbase/manager-node')
const { success, error } = require('./utils/response')
const { formatDateTime } = require('./utils/date')
const { assertCloudFunctionContext } = require('./utils/auth')

/**
 * 必填字段列表
 */
const REQUIRED_FIELDS = [
  'id', 'title', 'source_account', 'source_url', 'summary',
  'score_total', 'score_feasibility', 'score_profit',
  'score_timeliness', 'score_detail', 'score_fitness',
  'cost', 'expected_revenue', 'cycle', 'steps', 'tools',
  'pitfalls', 'suitable_for', 'risk_tags', 'status'
]

/**
 * 评分维度字段
 */
const SCORE_FIELDS = [
  'score_feasibility', 'score_profit',
  'score_timeliness', 'score_detail', 'score_fitness'
]

/**
 * 校验单个案例数据
 */
function validateCase(caseData) {
  const missing = REQUIRED_FIELDS.filter(f => caseData[f] === undefined || caseData[f] === null || caseData[f] === '')
  if (missing.length > 0) {
    return { valid: false, message: `缺少必填字段: ${missing.join(', ')}` }
  }
  const scores = [caseData.score_total, ...SCORE_FIELDS.map(f => caseData[f])]
  for (const s of scores) {
    if (!Number.isInteger(s)) {
      return { valid: false, message: `评分必须为整数，当前值: ${s}` }
    }
  }
  const dimensionsSum = SCORE_FIELDS.reduce((sum, f) => sum + caseData[f], 0)
  if (caseData.score_total !== dimensionsSum) {
    return { valid: false, message: `评分不一致: score_total=${caseData.score_total}，五维度之和=${dimensionsSum}` }
  }
  return { valid: true }
}

/**
 * 构建案例记录
 */
function buildRecord(caseData, now) {
  return {
    id: String(caseData.id),
    title: caseData.title,
    source_account: caseData.source_account,
    source_url: caseData.source_url,
    summary: caseData.summary,
    score_total: caseData.score_total,
    score_feasibility: caseData.score_feasibility,
    score_profit: caseData.score_profit,
    score_timeliness: caseData.score_timeliness,
    score_detail: caseData.score_detail,
    score_fitness: caseData.score_fitness,
    cost: caseData.cost,
    expected_revenue: caseData.expected_revenue,
    cycle: caseData.cycle,
    steps: caseData.steps,
    tools: caseData.tools,
    pitfalls: caseData.pitfalls,
    suitable_for: caseData.suitable_for,
    risk_tags: caseData.risk_tags,
    case_story: caseData.case_story || '',
    tags: caseData.tags || [],
    status: caseData.status,
    updated_at: now
  }
}

/**
 * 查询单条记录
 */
async function queryOne(db, collectionName, query, tag) {
  const result = await db.runCommands({
    MgoCommands: [{
      TableName: collectionName,
      CommandType: 'QUERY',
      Command: JSON.stringify({
        filter: query,
        limit: 1
      })
    }],
    Tag: tag
  })

  if (!result.Data || result.Data.length === 0) {
    return { data: [] }
  }

  const data = JSON.parse(result.Data[0])
  console.log(`queryOne ${collectionName} ${JSON.stringify(query)}: found=${data.length}`)
  return { data }
}

/**
 * 新增记录
 */
async function addRecord(db, collectionName, record, tag) {
  const result = await db.runCommands({
    MgoCommands: [{
      TableName: collectionName,
      CommandType: 'INSERT',
      Command: JSON.stringify(record)
    }],
    Tag: tag
  })

  console.log(`addRecord ${collectionName}: InsertedIds=${result.InsertedIds?.join(',')}`)
  return result
}

/**
 * 更新记录
 */
async function updateRecord(db, collectionName, record, tag) {
  const result = await db.runCommands({
    MgoCommands: [{
      TableName: collectionName,
      CommandType: 'UPDATE',
      Command: JSON.stringify({
        filter: { id: record.id },
        update: { $set: record }
      })
    }],
    Tag: tag
  })

  console.log(`updateRecord ${record.id}: ModifiedNum=${result.ModifiedNum}`)
  return result
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  try {
    // 内部调用鉴权
    assertCloudFunctionContext(context)

    const { cases } = event

    if (!Array.isArray(cases) || cases.length === 0) {
      return error('cases 必须是非空数组', 'INVALID_INPUT')
    }

    // 初始化 CloudBase SDK（云函数环境无需 secretId/secretKey）
    const envId = context.namespace || process.env.TCB_ENV
    if (!envId) {
      return error('无法获取环境 ID', 'ENV_ERROR')
    }

    const app = CloudBase.init({ envId })
    const db = app.database

    // 获取数据库实例 ID
    const { EnvInfo } = await app.env.getEnvInfo()
    const { Databases } = EnvInfo
    if (!Databases || Databases.length === 0) {
      return error('未找到数据库实例', 'DB_ERROR')
    }
    const tag = Databases[0].InstanceId

    const now = formatDateTime(new Date())
    let synced = 0
    const errors = []

    for (let i = 0; i < cases.length; i++) {
      const caseData = cases[i]
      const validation = validateCase(caseData)
      if (!validation.valid) {
        errors.push({ index: i, id: caseData.id, message: validation.message })
        continue
      }

      const caseId = String(caseData.id)
      const record = buildRecord(caseData, now)

      // 查询是否已存在
      const qRes = await queryOne(db, 'Case', { id: caseId }, tag)

      if (qRes.data && qRes.data.length > 0) {
        // 保留 created_at 和 published_at
        const existingDoc = qRes.data[0]
        record.created_at = existingDoc.created_at
        record.published_at = existingDoc.published_at || undefined
        await updateRecord(db, 'Case', record, tag)
      } else {
        record.created_at = now
        await addRecord(db, 'Case', record, tag)
      }

      synced++
    }

    if (errors.length > 0) {
      return error(
        `部分案例同步失败: ${errors.map(e => `[${e.index}] ${e.message}`).join('; ')}`,
        'INVALID_INPUT'
      )
    }

    return success({ synced })
  } catch (err) {
    console.error('syncCaseData error:', err)
    return error(err.message || '未知错误', 'UNKNOWN')
  }
}
