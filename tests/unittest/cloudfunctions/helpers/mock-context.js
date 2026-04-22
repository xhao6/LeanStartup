// tests/unittest/cloudfunctions/helpers/mock-context.js

/**
 * 模拟云函数调用上下文
 * wxContext.OPENID 是云函数获取用户身份的唯一方式
 */
function createMockContext(openid = 'test_openid_123') {
  return {
    _wxContext: {
      OPENID: openid,
      APPID: 'test_appid',
      ENV: 'test_env'
    }
  }
}

/**
 * 无 OPENID 的上下文（测试鉴权失败）
 */
function createUnauthContext() {
  return {}
}

module.exports = { createMockContext, createUnauthContext }
