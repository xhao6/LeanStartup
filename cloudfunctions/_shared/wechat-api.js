// cloudfunctions/_shared/wechat-api.js
// 使用 Node.js 18 内置全局 fetch，不依赖 node-fetch
const { collection } = require('./db')
const { formatDateTime } = require('./date')
const { getApp } = require('./db')

const TOKEN_DOC_ID = 'access_token'

/**
 * 获取 access_token，优先从缓存读取，过期则刷新
 */
async function getAccessToken() {
  const tokenCol = collection('WechatToken')

  // 1. 尝试从缓存读取
  const { data: cached } = await tokenCol.doc(TOKEN_DOC_ID).get()

  if (cached && cached.token && cached.expire_at) {
    const now = new Date()
    const expireAt = new Date(cached.expire_at.replace(/-/g, '/'))
    // 提前 5 分钟过期
    if (now.getTime() < expireAt.getTime() - 5 * 60 * 1000) {
      return cached.token
    }
  }

  // 2. 缓存不存在或已过期，重新获取
  const appid = process.env.WX_APPID
  const secret = process.env.WX_APPSECRET

  if (!appid || !secret) {
    throw new Error('WX_APPID 或 WX_APPSECRET 环境变量未配置')
  }

  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`
  const res = await fetch(url)
  const data = await res.json()

  if (data.errcode) {
    throw new Error(`获取 access_token 失败: ${data.errcode} ${data.errmsg}`)
  }

  // 3. 缓存到 NoSQL（有效期 2 小时）
  const expireAt = formatDateTime(new Date(Date.now() + 2 * 60 * 60 * 1000))
  const tokenData = {
    token: data.access_token,
    expire_at: expireAt,
    updated_at: formatDateTime(new Date())
  }

  await tokenCol.doc(TOKEN_DOC_ID).set(tokenData)

  return data.access_token
}

/**
 * 发送一次性订阅消息
 * @param {string} openid - 接收用户 openid
 * @param {string} templateId - 消息模板 ID
 * @param {object} data - 模板数据
 * @param {string} page - 点击通知后跳转的小程序页面路径
 */
async function sendSubscribeMessage(openid, templateId, data, page) {
  const accessToken = await getAccessToken()

  const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`
  const body = {
    touser: openid,
    template_id: templateId,
    page: page || 'pages/index/index',
    data
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const result = await res.json()

  if (result.errcode && result.errcode !== 0) {
    throw new Error(`发送订阅消息失败: ${result.errcode} ${result.errmsg}`)
  }

  return result
}

/**
 * 获取小程序码（wxacode.get）
 * @param {string} scene - 场景值（如 case_id）
 * @param {string} page - 小程序页面路径
 */
async function getMiniProgramCode(scene, page) {
  const accessToken = await getAccessToken()

  const url = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`
  const body = {
    scene,
    page: page || 'pages/case/detail',
    width: 280,
    auto_color: false,
    line_color: { r: 102, g: 126, b: 234 }
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('image')) {
    const buffer = Buffer.from(await res.arrayBuffer())
    return { success: true, buffer, contentType }
  }

  const errData = await res.json()
  return { success: false, error: errData }
}

module.exports = { getAccessToken, sendSubscribeMessage, getMiniProgramCode }
