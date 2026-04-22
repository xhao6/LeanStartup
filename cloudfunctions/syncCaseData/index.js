/**
 * syncCaseData - 同步案例数据到 Case 集合
 *
 * 使用 HTTP API 直接访问数据库，不依赖任何 npm 包
 * 凭证从 context.environment 嵌入式票据中获取
 */
const { success, error } = require('./utils/response')
const { formatDateTime } = require('./utils/date')
const { assertCloudFunctionContext } = require('./utils/auth')
const https = require('https')

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
 * 解析 context.environment JSON 字符串，提取嵌入式票据
 */
function parseCredentials(context) {
  const envObj = JSON.parse(context.environment || '{}')
  return {
    sessionToken: envObj.TENCENTCLOUD_SESSIONTOKEN,
    envId: envObj.SCF_NAMESPACE || context.namespace
  }
}

/**
 * 使用 Node.js 内置 https 调用 CloudBase 数据库 HTTP API
 * 使用 X-Tcb-Token 认证（TCB 嵌入式临时凭证）
 */
function apiRequest(method, path, body, credentials) {
  return new Promise((resolve, reject) => {
    const host = `${credentials.envId}.api.tcloudbasegateway.com`
    const bodyStr = body ? JSON.stringify(body) : ''
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(bodyStr),
      'X-Tcb-Token': credentials.sessionToken
    }

    const options = {
      hostname: host,
      path,
      method,
      headers,
      timeout: 15000
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          resolve(data)
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('请求超时'))
    })
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

/**
 * 查询单条记录
 */
async function queryOne(colName, query, credentials) {
  const res = await apiRequest('POST', `/databasepatch/v1/apps/${credentials.envId}/collections/${colName}/query`, {
    query,
    limit: 1
  }, credentials)
  console.log(`queryOne ${colName} ${JSON.stringify(query)}: code=${res.code} found=${res.data ? res.data.length : 'N/A'}`)
  if (res.code !== undefined && res.code !== 0) {
    throw new Error(res.message || `queryOne failed code=${res.code}`)
  }
  return res
}

/**
 * 新增记录
 */
async function addRecord(colName, record, credentials) {
  const res = await apiRequest('POST', `/databasepatch/v1/apps/${credentials.envId}/collections/${colName}/records`, {
    data: record
  }, credentials)
  console.log(`addRecord ${colName}: code=${res.code}`)
  if (res.code !== undefined && res.code !== 0) {
    throw new Error(res.message || `addRecord failed code=${res.code}`)
  }
  return res
}

/**
 * 更新记录
 */
async function updateRecord(colName, recordId, record, credentials) {
  const res = await apiRequest('PATCH', `/databasepatch/v1/apps/${credentials.envId}/collections/${colName}/records/${recordId}`, {
    data: record,
    query: { id: recordId }
  }, credentials)
  console.log(`updateRecord ${recordId}: code=${res.code}`)
  if (res.code !== undefined && res.code !== 0) {
    throw new Error(res.message || `updateRecord failed code=${res.code}`)
  }
  return res
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

    // 解析凭证
    let credentials
    try {
      credentials = parseCredentials(context)
    } catch (e) {
      return error('无法解析 context.environment: ' + e.message, 'ENV_PARSE_ERROR')
    }

    if (!credentials.sessionToken || !credentials.envId) {
      return error(`缺少凭证: sessionToken=${!!credentials.sessionToken}, envId=${!!credentials.envId}`, 'MISSING_CREDENTIALS')
    }

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
      const qRes = await queryOne('Case', { id: caseId }, credentials)

      if (qRes.data && qRes.data.length > 0) {
        // 保留 created_at 和 published_at
        const existingDoc = qRes.data[0]
        record.created_at = existingDoc.created_at
        record.published_at = existingDoc.published_at || undefined
        await updateRecord('Case', caseId, record, credentials)
      } else {
        record.created_at = now
        await addRecord('Case', record, credentials)
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
    return error(err.message || '未知错误', 'UNKNOWN')
  }
}
