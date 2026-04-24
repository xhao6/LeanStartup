// cloudfunctions/getDailyPick/index.js
const { collection, getCommand } = require('./utils/db')
const { getTodayDate } = require('./utils/date')
const { success, error } = require('./utils/response')

/**
 * 获取每日精选案例
 *
 * 双模式：
 * - 单日查询: { date: "YYYY-MM-DD" } → 返回指定日期的精选（含 fallback）
 * - 历史分页: { page: 1, pageSize: 10 } → 返回按日期倒序分页的精选列表
 *
 * 规则: 有 page 参数时走分页模式，否则走单日模式（无 date 默认查今天）
 */

/**
 * 核心业务逻辑 — 接受 deps 参数实现依赖注入
 * @param {object} event - 云函数调用参数
 * @param {object} deps - 依赖注入: { collection, getCommand, getTodayDate }
 */
async function handleGetDailyPick(event, deps) {
  const { collection, getCommand, getTodayDate } = deps
  const cmd = getCommand()

  // 分页模式：有 page 参数时走分页
  if (event.page !== undefined && event.page !== null) {
    return await handlePagination(event, collection, cmd)
  }

  // 单日模式：指定日期或默认今天
  return await handleSingleDay(event, collection, cmd, getTodayDate)
}

/**
 * 单日查询模式
 * 无结果时 fallback 到最近一个有效日
 */
async function handleSingleDay(event, collection, cmd, getTodayDate) {
  const targetDate = event.date || getTodayDate()

  // 1. 查指定日期的 DailyPick
  let pick = null
  const { data: picks } = await collection('DailyPick')
    .where({ date: targetDate })
    .limit(1)
    .get()

  // 2. 无结果时 fallback 到最近一个有效日
  if (!picks || picks.length === 0) {
    const { data: fallbackPicks } = await collection('DailyPick')
      .where({ date: cmd.lt(targetDate) })
      .orderBy('date', 'desc')
      .limit(1)
      .get()

    if (!fallbackPicks || fallbackPicks.length === 0) {
      return success({ date: targetDate, cases: [] })
    }
    pick = fallbackPicks[0]
  } else {
    pick = picks[0]
  }

  // 3. 批量查 Case（避免 N+1）
  const caseIds = pick.case_ids || []
  if (caseIds.length === 0) {
    return success({ date: pick.date, cases: [] })
  }

  const { data: cases } = await collection('Case')
    .where({
      id: cmd.in(caseIds),
      status: 'published'
    })
    .get()

  // 4. 按 case_ids 原始顺序排列，只返回前端需要的字段
  const orderedCases = buildOrderedCases(caseIds, cases || [])

  return success({ date: pick.date, cases: orderedCases })
}

/**
 * 历史分页模式
 * 按日期倒序返回精选列表
 */
async function handlePagination(event, collection, cmd) {
  const page = Math.max(1, Number(event.page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(event.pageSize) || 10))
  const skip = (page - 1) * pageSize

  // 1. 分页查 DailyPick
  const { data: list } = await collection('DailyPick')
    .orderBy('date', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get()

  // 2. 总数
  const { total } = await collection('DailyPick')
    .count()

  return success({
    total,
    list: list || [],
    page,
    pageSize
  })
}

/**
 * 按 case_ids 原始顺序排列，只返回前端需要的字段
 */
function buildOrderedCases(caseIds, cases) {
  const caseMap = {}
  for (const c of cases) {
    caseMap[c.id] = c
  }

  return caseIds
    .map(id => caseMap[id])
    .filter(Boolean)
    .map(c => ({
      id: c.id,
      title: c.title,
      summary: c.summary,
      score_total: c.score_total,
      cost: c.cost,
      source_account: c.source_account,
      suitable_for: c.suitable_for,
      tags: c.tags || [],
      cycle: c.cycle || ''
    }))
}

// 云函数入口 — 注入真实依赖
exports.main = async function (event) {
  try {
    return await handleGetDailyPick(event, {
      collection,
      getCommand,
      getTodayDate
    })
  } catch (err) {
    console.error('[getDailyPick] error:', err.message)
    return error(err.message, 'INTERNAL_ERROR')
  }
}

// 导出核心函数供测试使用
exports.handleGetDailyPick = handleGetDailyPick
