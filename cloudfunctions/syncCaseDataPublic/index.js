/**
 * syncCaseDataPublic - 同步案例数据到 Case 集合（公开版本）
 *
 * 注意：此函数不进行上下文验证，仅用于初始化数据同步任务
 */
const cloudbase = require('@cloudbase/node-sdk')

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
 * 格式化时间
 */
function formatDateTime(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  const second = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

/**
 * 云函数入口
 */
exports.main = async (event, context) => {
  try {
    const { cases } = event

    if (!Array.isArray(cases) || cases.length === 0) {
      return { success: false, error: 'cases 必须是非空数组', code: 'INVALID_INPUT' }
    }

    // 初始化 CloudBase SDK
    const envId = context.namespace || process.env.TCB_ENV_ID || process.env.CLOUDBASE_ENV_ID
    if (!envId) {
      return { success: false, error: '无法获取环境 ID', code: 'ENV_ERROR' }
    }

    const app = cloudbase.init({ envId })
    const collection = app.database().collection('Case')

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

      // 构建记录
      const record = {
        id: caseId,
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

      try {
        // 查询是否已存在
        const { data: existing } = await collection.where({ id: caseId }).get()

        if (existing && existing.length > 0) {
          // 保留 created_at
          record.created_at = existing[0].created_at
          record.published_at = existing[0].published_at || undefined
          await collection.doc(caseId).update(record)
        } else {
          record.created_at = now
          // 使用 add 时，让 MongoDB 自动生成 _id
          await collection.add(record)
        }

        synced++
      } catch (err) {
        errors.push({ index: i, id: caseData.id, message: err.message })
      }
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: `部分案例同步失败: ${errors.map(e => `[${e.index}] ${e.message}`).join('; ')}`,
        code: 'PARTIAL_FAILURE'
      }
    }

    return { success: true, data: { synced } }
  } catch (err) {
    console.error('syncCaseDataPublic error:', err)
    return { success: false, error: err.message || '未知错误', code: 'UNKNOWN' }
  }
}
