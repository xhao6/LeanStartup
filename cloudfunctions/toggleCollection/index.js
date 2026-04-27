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
 * toggleCollection 云函数 - 收藏/取消收藏案例
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

  const _ = db.command
  const now = new Date().toISOString()

  try {
    const UserCollection = db.collection('UserCollection')

    if (action === 'uncollect') {
      await UserCollection.where({ _openid, case_id }).remove()
      console.log('[toggleCollection] 取消收藏成功', { _openid, case_id })
      return {
        success: true,
        data: { case_id, action: 'uncollected' }
      }
    }

    // action === 'collect'
    const { data: existing } = await UserCollection.where({ _openid, case_id }).get()

    if (existing.length > 0) {
      // 已有记录：合并 progress
      const record = existing[0]
      const mergedProgress = { ...record.progress, ...progress }

      await UserCollection.doc(record._id).update({
        progress: mergedProgress,
        updated_at: now
      })

      console.log('[toggleCollection] 更新收藏成功', { _openid, case_id, progress: mergedProgress })
      return {
        success: true,
        data: { case_id, action: 'updated', progress: mergedProgress }
      }
    }

    // 新记录
    const newRecord = {
      _openid,
      case_id,
      progress: progress || {},
      created_at: now,
      updated_at: now
    }

    await UserCollection.add(newRecord)

    console.log('[toggleCollection] 新增收藏成功', { _openid, case_id, progress: newRecord.progress })
    return {
      success: true,
      data: { case_id, action: 'created', progress: newRecord.progress }
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
