// cloudfunctions/subscribeMessage/index.js
const { collection, getApp } = require('./utils/db')
const { assertCloudFunctionContext } = require('./utils/auth')
const { sendSubscribeMessage } = require('./utils/wechat-api')
const { formatDateTime } = require('./utils/date')
const { success, error } = require('./utils/response')

const BATCH_SIZE = 50

/**
 * 发送一次性订阅消息（核心逻辑，纯函数，依赖注入）
 *
 * @param {object} event - 云函数事件参数 { template_id, data, page, offset? }
 * @param {object} deps - 注入的依赖
 * @param {object} context - 云函数上下文
 * @returns {object} { success, data } 或 { success: false, error, code }
 */
async function doSubscribeMessage(event, deps, context) {
  // 1. 内部调用鉴权
  try {
    deps.assertCloudFunctionContext(context)
  } catch (e) {
    return error(e.message, 'FORBIDDEN')
  }

  // 2. 校验必填参数
  const { template_id, data: templateData, page, offset = 0 } = event
  if (!template_id) {
    return error('template_id 为必填', 'INVALID_INPUT')
  }
  if (!templateData) {
    return error('data 为必填', 'INVALID_INPUT')
  }

  let successCount = 0
  let failCount = 0

  try {
    // 3. 分批获取待推送订阅
    const { data: subscriptions } = await deps.collection('PushSubscription')
      .skip(offset)
      .limit(BATCH_SIZE)
      .get()

    if (!subscriptions || subscriptions.length === 0) {
      // 无订阅用户
      await deps.collection('SystemLog').add({
        type: 'push_result',
        function_name: 'subscribeMessage',
        detail: '无待推送订阅',
        created_at: deps.formatDateTime(new Date())
      })
      return success({ sent: 0, failed: 0 })
    }

    // 4. 逐条发送（200ms 间隔避免微信限频）
    for (const sub of subscriptions) {
      try {
        await deps.sendSubscribeMessage(
          sub.openid,
          template_id,
          templateData,
          page || 'pages/index/index'
        )

        // 发送成功 → 删除该条订阅（一次性用完）
        await deps.collection('PushSubscription').doc(sub._id).remove()
        successCount++
      } catch (sendErr) {
        failCount++
        console.error(`[subscribeMessage] 发送失败 openid=${sub.openid}:`, sendErr.message)

        // 发送失败不删除订阅（可能重试），记录日志
        await deps.collection('SystemLog').add({
          type: 'push_single_fail',
          function_name: 'subscribeMessage',
          detail: `openid=${sub.openid} err=${sendErr.message}`,
          created_at: deps.formatDateTime(new Date())
        })
      }

      // 200ms 节流，避免触发微信接口限频
      if (subscriptions.indexOf(sub) < subscriptions.length - 1) {
        await (deps.sleep || ((ms) => new Promise(r => setTimeout(r, ms))))(200)
      }
    }

    // 5. 如果本批次取满 BATCH_SIZE，说明可能还有更多，递归处理
    if (subscriptions.length === BATCH_SIZE) {
      deps.callFunction({
        name: 'subscribeMessage',
        data: {
          template_id,
          data: templateData,
          page: page || 'pages/index/index',
          offset: offset + subscriptions.length
        }
      })
    }

    // 6. 记录本批次执行结果
    await deps.collection('SystemLog').add({
      type: 'push_result',
      function_name: 'subscribeMessage',
      detail: `批次完成: offset=${offset} 成功${successCount} 失败${failCount} 共${subscriptions.length}条`,
      created_at: deps.formatDateTime(new Date())
    })

    return success({ sent: successCount, failed: failCount })
  } catch (err) {
    console.error('[subscribeMessage] error:', err.message)

    await deps.collection('SystemLog').add({
      type: 'push_error',
      function_name: 'subscribeMessage',
      detail: err.message,
      created_at: deps.formatDateTime(new Date())
    }).catch(() => {})

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
    sendSubscribeMessage,
    formatDateTime,
    assertCloudFunctionContext,
    callFunction: app.callFunction.bind(app)
  }
  return doSubscribeMessage(event, deps, context)
}

// 导出核心函数供测试直接调用
exports.doSubscribeMessage = doSubscribeMessage
