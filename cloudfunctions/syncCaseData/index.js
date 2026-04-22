// cloudfunctions/syncCaseData/index.js
const { collection, getCommand } = require('./utils/db.js')
const { assertCloudFunctionContext } = require('./utils/auth.js')
const { formatDateTime } = require('./utils/date.js')
const { success, error } = require('./utils/response.js')

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
 * @param {object} caseData
 * @returns {{ valid: boolean, message?: string }}
 */
function validateCase(caseData) {
  // 检查必填字段
  const missing = REQUIRED_FIELDS.filter(f => caseData[f] === undefined || caseData[f] === null || caseData[f] === '')
  if (missing.length > 0) {
    return { valid: false, message: `缺少必填字段: ${missing.join(', ')}` }
  }

  // 校验评分为整数
  const scores = [caseData.score_total, ...SCORE_FIELDS.map(f => caseData[f])]
  for (const s of scores) {
    if (!Number.isInteger(s)) {
      return { valid: false, message: `评分必须为整数，当前值: ${s}` }
    }
  }

  // 校验总分 = 五维度之和
  const dimensionsSum = SCORE_FIELDS.reduce((sum, f) => sum + caseData[f], 0)
  if (caseData.score_total !== dimensionsSum) {
    return { valid: false, message: `评分不一致: score_total=${caseData.score_total}，五维度之和=${dimensionsSum}` }
  }

  return { valid: true }
}

/**
 * 构建案例记录（用于写入数据库）
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
    status: caseData.status,
    updated_at: now
  }
}

/**
 * syncCaseData 核心逻辑（依赖注入版本）
 *
 * @param {object} event - 云函数事件参数 { cases: object[] }
 * @param {object} context - 云函数上下文
 * @param {object} deps - 注入的依赖
 * @param {Function} deps.collection - 数据库集合操作
 * @param {Function} deps.getCommand - 获取数据库命令
 * @param {Function} deps.formatDateTime - 格式化时间
 * @param {Function} deps.assertCloudFunctionContext - 鉴权断言
 */
async function doSyncCaseData(event, context, deps) {
  const { collection, getCommand, formatDateTime, assertCloudFunctionContext } = deps

  try {
    // 1. 内部调用鉴权
    assertCloudFunctionContext(context)

    const { cases } = event

    // 2. 基本输入校验
    if (!Array.isArray(cases) || cases.length === 0) {
      return error('cases 必须是非空数组', 'INVALID_INPUT')
    }

    const col = collection('Case')
    const now = formatDateTime(new Date())
    let synced = 0
    const errors = []

    for (let i = 0; i < cases.length; i++) {
      const caseData = cases[i]

      // 3. 数据校验
      const validation = validateCase(caseData)
      if (!validation.valid) {
        errors.push({ index: i, id: caseData.id, message: validation.message })
        continue
      }

      // 4. id 类型强转为字符串
      const caseId = String(caseData.id)

      // 5. 查询是否已存在
      const { data: existing } = await col.where({ id: caseId }).get()

      const record = buildRecord(caseData, now)

      if (existing.length > 0) {
        // 6. 已存在 → 保留 created_at 和 published_at，更新其他字段
        const existingDoc = existing[0]
        record.created_at = existingDoc.created_at
        record.published_at = existingDoc.published_at || undefined
        await col.where({ id: caseId }).update(record)
      } else {
        // 7. 新增 → 设置 created_at
        record.created_at = now
        await col.add(record)
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
    // 鉴权错误
    if (err.message && err.message.startsWith('FORBIDDEN')) {
      return error(err.message, 'FORBIDDEN')
    }
    // 其他未知错误
    return error(err.message || '未知错误', 'UNKNOWN')
  }
}

/**
 * 云函数入口 — 生产环境使用真实依赖
 */
exports.main = async (event, context) => {
  return doSyncCaseData(event, context, {
    collection,
    getCommand,
    formatDateTime,
    assertCloudFunctionContext
  })
}

/**
 * 导出核心逻辑供测试使用
 */
exports.doSyncCaseData = doSyncCaseData
