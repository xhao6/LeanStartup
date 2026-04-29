// cloudfunctions/generateDailyPick/index.js
const { collection, getCommand, getApp } = require('./utils/db')
const { formatDateTime, getTodayDate, getDaysAgoDate } = require('./utils/date')
const { success, error } = require('./utils/response')
const {
  computeWeightedScore,
  filterByScoreRange,
  selectDailyCases
} = require('./selector')

/**
 * 每日定时生成精选 Top3（核心逻辑，纯函数，依赖注入）
 *
 * @param {object} _event - 云函数事件参数（未使用）
 * @param {object} deps - 注入的依赖
 * @returns {object} { success, data } 或 { success: false, error, code }
 */
async function doGenerateDailyPick(_event, deps) {
  const logEntry = {
    type: 'cron_result',
    function_name: 'generateDailyPick',
    created_at: deps.formatDateTime(new Date())
  }

  try {
    const today = deps.getTodayDate()
    const cmd = deps.getCommand()

    // 1. 幂等检查: 今日是否已生成
    const { data: todayPick } = await deps.collection('DailyPick')
      .where({ date: today })
      .limit(1)
      .get()

    if (todayPick && todayPick.length > 0) {
      logEntry.detail = `今日(${today})精选已存在，跳过`
      await deps.collection('SystemLog').add(logEntry)
      return success({ date: today, case_ids: todayPick[0].case_ids, skipped: true })
    }

    // 2. 获取最近 30 天已用的 case_ids（30 天去重限制）
    const thirtyDaysAgo = deps.getDaysAgoDate(30)
    const { data: recentPicks } = await deps.collection('DailyPick')
      .where({ date: cmd.gte(thirtyDaysAgo) })
      .field('case_ids')
      .limit(100)
      .get()

    const recentlyUsedIds = new Set()
    if (recentPicks) {
      for (const pick of recentPicks) {
        if (pick.case_ids) {
          for (const id of pick.case_ids) {
            recentlyUsedIds.add(id)
          }
        }
      }
    }

    // 3. 查所有已发布案例
    const { data: publishedCases } = await deps.collection('Case')
      .where({ status: 'published' })
      .limit(100)
      .get()

    if (!publishedCases || publishedCases.length === 0) {
      logEntry.type = 'cron_error'
      logEntry.detail = '无可选案例，Case 集合中无 published 记录'
      await deps.collection('SystemLog').add(logEntry)
      return error('无可选案例', 'NO_CASES')
    }

    // 4. 查询最近 7 天热度（Analytics 中 collect 事件计数）
    const sevenDaysAgo = deps.getDaysAgoDate(7)
    const popularityMap = {}
    try {
      const { data: analytics } = await deps.collection('Analytics')
        .where({
          event: 'collect',
          date: cmd.gte(sevenDaysAgo)
        })
        .field('case_id')
        .limit(1000)
        .get()

      if (analytics) {
        for (const record of analytics) {
          if (record.case_id) {
            popularityMap[record.case_id] = (popularityMap[record.case_id] || 0) + 1
          }
        }
      }
    } catch (analyticsErr) {
      console.error('[generateDailyPick] analytics query failed:', analyticsErr.message)
    }

    // 5. 过滤已用 + 分数区间过滤
    const freshCases = publishedCases.filter(c => !recentlyUsedIds.has(String(c.id)))
    const candidates = filterByScoreRange(freshCases)

    // 6. 计算加权评分
    for (const c of candidates) {
      const createdDate = c.created_at ? c.created_at.split(' ')[0] : ''
      const daysSinceCreation = createdDate
        ? Math.floor((new Date(today) - new Date(createdDate)) / 86400000)
        : 999
      c._weightedScore = computeWeightedScore(c, {
        isNewCase: daysSinceCreation <= 7,
        popularityCount: popularityMap[c.id] || 0
      })
    }

    // 7. 选择 3 个（标签分散 + 随机）
    const selected = selectDailyCases(candidates, 3)
    let selectedIds = selected.map(c => c.id)

    // 8. 不足 3 个 → 经典回顾补充
    if (selectedIds.length < 3) {
      const needCount = 3 - selectedIds.length
      const alreadySelectedIds = new Set(selectedIds)
      const classicCases = publishedCases
        .filter(c => recentlyUsedIds.has(String(c.id)) && !alreadySelectedIds.has(c.id))
        .sort((a, b) => b.score_total - a.score_total)

      const classicIds = classicCases
        .slice(0, needCount)
        .map(c => c.id)

      selectedIds = selectedIds.concat(classicIds)
    }

    if (selectedIds.length === 0) {
      logEntry.type = 'cron_error'
      logEntry.detail = '无可选案例'
      await deps.collection('SystemLog').add(logEntry)
      return error('无可选案例', 'NO_CASES')
    }

    // 9. 写入 DailyPick
    const dailyPick = {
      date: today,
      case_ids: selectedIds,
      created_at: deps.formatDateTime(new Date())
    }
    await deps.collection('DailyPick').add(dailyPick)

    // 10. 异步推送订阅消息（不 await，fire-and-forget）
    try {
      const templateId = process.env.PUSH_TEMPLATE_ID
      if (templateId) {
        deps.callFunction({
          name: 'subscribeMessage',
          data: {
            template_id: templateId,
            data: {
              thing1: { value: '今日精选副业案例已更新' },
              thing2: { value: '点击查看今天的3个精选案例' }
            },
            page: 'pages/index/index'
          }
        })
      }
    } catch (pushErr) {
      console.error('[generateDailyPick] push error:', pushErr.message)
    }

    // 11. 记录日志
    logEntry.detail = `生成成功: date=${today} case_ids=${selectedIds.join(',')}`
    await deps.collection('SystemLog').add(logEntry)

    return success({ date: today, case_ids: selectedIds })
  } catch (err) {
    logEntry.type = 'cron_error'
    logEntry.detail = err.message
    await deps.collection('SystemLog').add(logEntry).catch(() => {})

    console.error('[generateDailyPick] error:', err.message)
    return error(err.message, 'INTERNAL_ERROR')
  }
}

/**
 * 云函数入口 — 组装默认依赖
 */
exports.main = async (event, context) => {
  const app = getApp()
  const deps = {
    collection,
    getCommand,
    formatDateTime,
    getTodayDate,
    getDaysAgoDate,
    callFunction: app.callFunction.bind(app)
  }
  return doGenerateDailyPick(event, deps)
}

// 导出核心函数供测试直接调用
exports.doGenerateDailyPick = doGenerateDailyPick
