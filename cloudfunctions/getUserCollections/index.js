const cloud = require('wx-server-sdk')

// 初始化 CloudBase
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

/**
 * getUserCollections 云函数 - 获取用户收藏列表
 *
 * @param {object} event
 * @param {number} [event.page=1] - 页码
 * @param {number} [event.pageSize=10] - 每页数量
 * @returns {object} { success: boolean, data?: { total: number, list: array }, error?: string }
 */
exports.main = async (event, context) => {
  const { page = 1, pageSize = 10 } = event

  console.log('[getUserCollections] 收到请求', { page, pageSize })

  // 获取用户 OPENID（wx-server-sdk 自动处理）
  // 微信小程序规范使用 _openid 字段（带下划线前缀）
  const wxContext = cloud.getWXContext()
  const _openid = wxContext.OPENID

  console.log('[getUserCollections] 用户身份', { _openid, wxContext: Object.keys(wxContext) })

  if (!_openid) {
    return {
      success: false,
      error: '无法获取用户身份，请重新登录',
      code: 'UNAUTHORIZED'
    }
  }

  try {
    const UserCollection = db.collection('UserCollection')
    const Case = db.collection('Case')

    // 查总数
    const countResult = await UserCollection.where({ _openid }).count()
    const total = countResult.total

    console.log('[getUserCollections] 收藏总数', { _openid, total })

    if (total === 0) {
      return {
        success: true,
        data: { total: 0, list: [] }
      }
    }

    // 查当前页，按 updated_at 倒序
    const skip = Math.max(0, (parseInt(page) - 1)) * parseInt(pageSize)
    const limit = Math.min(50, Math.max(1, parseInt(pageSize)))

    const { data: collections } = await UserCollection
      .where({ _openid })
      .orderBy('updated_at', 'desc')
      .skip(skip)
      .limit(limit)
      .get()

    console.log('[getUserCollections] 查询到收藏记录', collections.length)

    if (collections.length === 0) {
      return {
        success: true,
        data: { total, list: [] }
      }
    }

    // 收集 case_id，批量查 Case
    const caseIds = collections.map(c => c.case_id)

    console.log('[getUserCollections] 查询案例信息', caseIds)

    const { data: cases } = await Case
      .where({
        id: _.in(caseIds)
      })
      .get()

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

    console.log('[getUserCollections] 返回结果', { total, listSize: list.length })

    return {
      success: true,
      data: { total, list }
    }

  } catch (err) {
    console.error('[getUserCollections] 操作失败', err)
    return {
      success: false,
      error: err.message || '网络异常，请稍后重试',
      code: 'OPERATION_FAILED'
    }
  }
}
