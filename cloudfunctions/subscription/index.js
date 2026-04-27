const cloud = require('wx-server-sdk')

// 初始化 CloudBase
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

/**
 * 订阅管理云函数
 *
 * @param {object} event
 * @param {string} event.action - 操作类型: subscribe / unsubscribe / getStatus
 * @param {string} [event.template_id] - 模板ID (subscribe 时需要)
 * @returns {object} { success: boolean, data?: object, error?: string }
 */
exports.main = async (event, context) => {
  const { action, template_id } = event

  console.log('[subscription] 收到请求', { action, template_id })

  // 获取用户 OPENID（wx-server-sdk 自动处理）
  // 微信小程序规范使用 _openid 字段（带下划线前缀）
  const wxContext = cloud.getWXContext()
  const _openid = wxContext.OPENID

  console.log('[subscription] 用户身份', { _openid, wxContext: Object.keys(wxContext) })

  if (!_openid) {
    return {
      success: false,
      error: '无法获取用户身份，请重新登录',
      code: 'UNAUTHORIZED'
    }
  }

  try {
    const PushSubscription = db.collection('PushSubscription')

    switch (action) {
      case 'subscribe':
        if (!template_id) {
          return {
            success: false,
            error: 'template_id 为必填',
            code: 'INVALID_INPUT'
          }
        }

        // 检查是否已订阅
        const { data: existing } = await PushSubscription
          .where({ _openid })
          .field({ _id: true, template_id: true })
          .get()

        if (existing && existing.length > 0) {
          // 已订阅，返回成功但提示已订阅
          console.log('[subscription] 已订阅', { _openid })
          return {
            success: true,
            data: {
              isSubscribed: true,
              alreadySubscribed: true,
              message: '已订阅每日提醒'
            }
          }
        }

        // 新增订阅记录
        await PushSubscription.add({
          _openid,
          template_id,
          subscribed_at: new Date().toISOString()
        })

        console.log('[subscription] 订阅成功', { _openid, template_id })
        return {
          success: true,
          data: {
            isSubscribed: true,
            alreadySubscribed: false,
            message: '订阅成功'
          }
        }

      case 'unsubscribe':
        // 检查是否有订阅记录
        const { data: subs } = await PushSubscription
          .where({ _openid })
          .field({ _id: true })
          .get()

        if (!subs || subs.length === 0) {
          // 未订阅，返回成功
          console.log('[subscription] 未订阅，无需取消', { _openid })
          return {
            success: true,
            data: {
              isSubscribed: false,
              message: '未订阅'
            }
          }
        }

        // 删除所有该 openid 的订阅记录
        for (const record of subs) {
          await PushSubscription.doc(record._id).remove()
        }

        console.log('[subscription] 取消订阅成功', { _openid })
        return {
          success: true,
          data: {
            isSubscribed: false,
            message: '已取消订阅'
          }
        }

      case 'getStatus':
        const { data: statusData } = await PushSubscription
          .where({ _openid })
          .field({ _id: true })
          .get()

        const isSubscribed = statusData && statusData.length > 0

        console.log('[subscription] 查询状态', { _openid, isSubscribed })
        return {
          success: true,
          data: {
            isSubscribed
          }
        }

      default:
        return {
          success: false,
          error: '无效的 action 参数',
          code: 'INVALID_INPUT'
        }
    }

  } catch (err) {
    console.error('[subscription] 操作失败', err)
    return {
      success: false,
      error: err.message || '网络异常，请稍后重试',
      code: 'OPERATION_FAILED'
    }
  }
}
