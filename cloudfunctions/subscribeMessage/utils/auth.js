// cloudfunctions/_shared/auth.js

/**
 * 从云函数上下文获取用户 OPENID
 * 永远不从客户端参数获取 openid
 */
function getOpenid(context) {
  const wxContext = context && context._wxContext
    ? context._wxContext
    : (context && context.OPENID ? context : null)

  if (!wxContext || !wxContext.OPENID) {
    throw new Error('UNAUTHORIZED: 无法获取用户身份')
  }
  return wxContext.OPENID
}

/**
 * 确保调用来自云函数环境（内部调用检查）
 * 用于 subscribeMessage、syncCaseData 等不应被前端直接调用的函数
 */
function assertCloudFunctionContext(context) {
  if (!context || (!context._wxContext && !context.OPENID)) {
    throw new Error('FORBIDDEN: 此函数仅支持云函数内部调用')
  }
}

/**
 * 校验 case_id 格式（数字字符串）
 */
function validateCaseId(caseId) {
  if (!caseId || typeof caseId !== 'string') {
    throw new Error('INVALID_INPUT: case_id 必须是非空字符串')
  }
  if (!/^\d+$/.test(caseId)) {
    throw new Error('INVALID_INPUT: case_id 必须是数字字符串')
  }
  return true
}

/**
 * 校验 progress 格式（{step_N: boolean}）
 */
function validateProgress(progress) {
  if (!progress) return true
  if (typeof progress !== 'object' || Array.isArray(progress)) {
    throw new Error('INVALID_INPUT: progress 必须是对象')
  }
  for (const [key, value] of Object.entries(progress)) {
    if (!/^step_\d+$/.test(key)) {
      throw new Error(`INVALID_INPUT: progress key "${key}" 格式错误，应为 step_N`)
    }
    if (typeof value !== 'boolean') {
      throw new Error(`INVALID_INPUT: progress["${key}"] 必须是布尔值`)
    }
  }
  return true
}

/**
 * 校验事件名
 */
function validateEventName(event) {
  const validEvents = ['page_view', 'case_click', 'case_collect', 'case_share', 'subscribe']
  if (!event || !validEvents.includes(event)) {
    throw new Error(`INVALID_INPUT: event 必须是 ${validEvents.join('/')} 之一`)
  }
  return true
}

module.exports = { getOpenid, assertCloudFunctionContext, validateCaseId, validateProgress, validateEventName }
