const cloud = require('wx-server-sdk')

// 初始化 CloudBase
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 用户友好的错误消息
 */
const ERROR_MESSAGES = {
  MISSING_ID: '缺少案例ID',
  INVALID_ACTION: '操作类型无效',
  NETWORK_ERROR: '网络异常，请稍后重试'
}

/**
 * 获取案例详情（用于收藏时返回完整数据）
 */
const getCaseDetail = async (case_id) => {
  try {
    const caseData = await db.collection('Case').doc(case_id).get()
    if (caseData.data) {
      return {
        title: caseData.data.title || '',
        desc: caseData.data.summary || caseData.data.story || '',
        tags: caseData.data.tags || [],
        score_total: caseData.data.score_total || 0,
        url: caseData.data.source_url || caseData.data.url || '',
        image: caseData.data.image || '',
        steps_count: Array.isArray(caseData.data.steps) ? caseData.data.steps.length : 0
      }
    }
  } catch (e) {
    console.warn('[toggleCollection] 获取case详情失败', e)
  }
  return null
}

/**
 * toggleCollection 云函数 - 收藏/取消收藏案例
 * 使用 upsert 原子操作避免唯一索引冲突
 *
 * @param {object} event
 * @param {string} event.case_id - 案例 ID（数字字符串）
 * @param {"collect"|"uncollect"} event.action - 操作类型
 * @param {object} [event.progress] - 实践步骤进度 {step_N: boolean}
 * @returns {object} { success: boolean, data?: object, error?: string }
 */
exports.main = async (event, context) => {
  const { case_id, action, progress } = event

  console.log('[toggleCollection] 收到请求', { case_id, action, progress })

  // 获取用户 OPENID（wx-server-sdk 自动处理）
  // 微信小程序规范使用 _openid 字段（带下划线前缀）
  const wxContext = cloud.getWXContext()
  const _openid = wxContext.OPENID

  console.log('[toggleCollection] 用户身份', { _openid, wxContext: Object.keys(wxContext) })

  if (!_openid) {
    return {
      success: false,
      error: '无法获取用户身份，请重新登录',
      code: 'UNAUTHORIZED'
    }
  }

  // 参数校验
  if (!case_id || typeof case_id !== 'string') {
    return {
      success: false,
      error: ERROR_MESSAGES.MISSING_ID,
      code: 'MISSING_ID'
    }
  }

  if (!action || !['collect', 'uncollect'].includes(action)) {
    return {
      success: false,
      error: ERROR_MESSAGES.INVALID_ACTION,
      code: 'INVALID_ACTION'
    }
  }

  // 校验 progress 格式
  if (action === 'collect' && progress) {
    if (typeof progress !== 'object' || Array.isArray(progress)) {
      return {
        success: false,
        error: '进度格式错误',
        code: 'INVALID_PROGRESS'
      }
    }
    for (const [key, value] of Object.entries(progress)) {
      if (!/^step_\d+$/.test(key)) {
        return {
          success: false,
          error: `进度key "${key}" 格式错误，应为 step_N`,
          code: 'INVALID_PROGRESS_KEY'
        }
      }
      if (typeof value !== 'boolean') {
        return {
          success: false,
          error: `进度值 "${key}" 必须是布尔值`,
          code: 'INVALID_PROGRESS_VALUE'
        }
      }
    }
  }

  const now = new Date().toISOString()

  try {
    const UserCollection = db.collection('UserCollection')

    if (action === 'uncollect') {
      // 取消收藏：删除记录（用可预测的 _id）
      const docId = `${_openid}_${case_id}`
      try {
        await UserCollection.doc(docId).remove()
      } catch (e) {
        // 记录不存在时 remove() 会抛异常，忽略即可
      }
      console.log('[toggleCollection] 取消收藏成功', { _openid, case_id })
      return {
        success: true,
        data: { case_id, action: 'uncollected' }
      }
    }

    // action === 'collect'
    const caseDetail = await getCaseDetail(case_id)
    const docId = `${_openid}_${case_id}`
    const recordData = {
      _openid,
      case_id,
      progress: progress || {},
      updated_at: now
    }

    // 先检查记录是否存在
    // 注意：doc().get() 在文档不存在时会抛出异常，需要 try-catch
    let existingData = null
    try {
      const existing = await UserCollection.doc(docId).get()
      existingData = existing.data
    } catch (e) {
      // 文档不存在，会抛出异常，这是预期行为
      existingData = null
    }

    if (existingData) {
      // 已存在，只更新 progress 和 updated_at（不更新 _openid 和 case_id）
      await UserCollection.doc(docId).update({
        data: {
          progress: progress || {},
          updated_at: now
        }
      })
      console.log('[toggleCollection] 更新收藏', { docId, case_id })
      return {
        success: true,
        data: {
          case_id,
          action: 'updated',
          progress: progress || {},
          ...(caseDetail || {})
        }
      }
    } else {
      // 不存在，插入（使用 set 保持 _id 可控）
      await UserCollection.doc(docId).set({
        data: {
          ...recordData,
          created_at: now
        }
      })
      console.log('[toggleCollection] 新增收藏', { docId, case_id })
      return {
        success: true,
        data: {
          case_id,
          action: 'created',
          progress: progress || {},
          ...(caseDetail || {})
        }
      }
    }

  } catch (err) {
    console.error('[toggleCollection] 操作失败', err)
    return {
      success: false,
      error: err.message || ERROR_MESSAGES.NETWORK_ERROR,
      code: 'OPERATION_FAILED'
    }
  }
}
