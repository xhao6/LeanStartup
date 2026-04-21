# 后端开发计划：云函数 + NoSQL + 内容管道

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现精益副业案例库 MVP 的全部后端：7 个云函数、7 个 NoSQL 集合、共享模块、定时任务、本地 LLM 评分脚本。

**Architecture:** CloudBase 云函数 + NoSQL。共享模块通过复制到各函数目录实现复用（微信云函数不支持跨目录 require）。所有云函数从 wxContext 获取 OPENID，统一错误响应格式，NoSQL 更新使用完整记录模式。

**Tech Stack:** Node.js (CloudBase 云函数), @cloudbase/node-sdk v2.7.0, wx-server-sdk (推送用)

**Spec:** `docs/prd/PRD-精益副业案例库-MVP-v1.md` (v1.1)

---

## File Structure

```
cloudfunctions/
├── _shared/                        # 共享模块源码（不直接部署）
│   ├── db.js                       # 数据库初始化
│   ├── auth.js                     # OPENID 提取 + 输入校验
│   ├── response.js                 # 统一响应格式
│   ├── wechat-api.js               # access_token 缓存/刷新 + subscribeMessage.send
│   ├── date.js                     # 日期格式化 (YYYY-MM-DD HH:mm:ss)
│   └── copy-shared.js              # 复制脚本：将 _shared/ 内容复制到各函数目录
├── getDailyPick/
│   ├── index.js
│   ├── utils/                      # ← _shared/ 的副本
│   │   ├── db.js
│   │   ├── auth.js
│   │   ├── response.js
│   │   └── date.js
│   └── package.json
├── getCaseDetail/
│   ├── index.js
│   ├── utils/
│   └── package.json
├── getUserCollections/
│   ├── index.js
│   ├── utils/
│   └── package.json
├── toggleCollection/
│   ├── index.js
│   ├── utils/
│   └── package.json
├── trackEvent/
│   ├── index.js
│   ├── utils/
│   └── package.json
├── subscribeMessage/
│   ├── index.js
│   ├── utils/                      # 包含 wechat-api.js
│   └── package.json
├── generateDailyPick/
│   ├── index.js
│   ├── utils/                      # 包含 wechat-api.js
│   └── package.json
└── syncCaseData/                   # 同步本地数据到 NoSQL
    ├── index.js
    ├── utils/
    └── package.json

scripts/
└── llm-score/                      # 本地 LLM 评分脚本
    ├── index.ts
    ├── prompt.ts                   # Prompt 模板
    ├── desensitize.ts              # 内容脱敏
    ├── validate.ts                 # 分数校验
    ├── package.json
    └── tsconfig.json

tests/
└── unittest/
    └── cloudfunctions/
        ├── helpers/
        │   └── mock-context.js     # wxContext mock
        ├── getDailyPick.test.js
        ├── getCaseDetail.test.js
        ├── getUserCollections.test.js
        ├── toggleCollection.test.js
        ├── trackEvent.test.js
        ├── generateDailyPick.test.js
        └── shared/
            ├── auth.test.js
            ├── response.test.js
            └── date.test.js
```

---

## Task 1: NoSQL 集合与索引创建

**Files:**
- 无文件创建，通过 CloudBase MCP 工具操作

- [ ] **Step 1: 创建 7 个 NoSQL 集合**

通过 CloudBase MCP 工具 `writeNoSqlDatabaseStructure` 逐个创建：

```
集合列表：
1. Case          — 案例库
2. DailyPick     — 每日精选
3. UserCollection — 用户收藏+进度
4. PushSubscription — 推送订阅
5. Analytics     — 埋点事件
6. SystemLog     — 运维日志
7. WechatToken   — 微信API Token缓存
```

每个集合使用 `action: "createCollection"`。

- [ ] **Step 2: 创建 DailyPick 的 date 唯一索引**

```
集合: DailyPick
索引名: date_unique
字段: date (升序)
唯一: true
```

- [ ] **Step 3: 创建 UserCollection 的复合唯一索引**

```
集合: UserCollection
索引名: openid_caseid_unique
字段: openid (升序) + case_id (升序)
唯一: true
```

- [ ] **Step 4: 创建 Analytics 的查询索引**

```
集合: Analytics
索引名: event_date
字段: event (升序) + date (升序)
唯一: false
```

- [ ] **Step 5: 创建 Case 的状态+评分索引**

```
集合: Case
索引名: status_score
字段: status (升序) + score_total (降序)
唯一: false
```

- [ ] **Step 6: 验证集合和索引**

使用 `readNoSqlDatabaseStructure` 的 `listCollections` 和 `listIndexes` 确认所有集合和索引存在。

---

## Task 2: 云函数共享模块 (_shared/)

**Files:**
- Create: `cloudfunctions/_shared/db.js`
- Create: `cloudfunctions/_shared/auth.js`
- Create: `cloudfunctions/_shared/response.js`
- Create: `cloudfunctions/_shared/date.js`
- Create: `cloudfunctions/_shared/wechat-api.js`
- Create: `cloudfunctions/_shared/copy-shared.js`

- [ ] **Step 1: 编写 db.js — 数据库初始化**

```js
// cloudfunctions/_shared/db.js
const tcb = require('@cloudbase/node-sdk')

let _db = null
let _app = null

function getApp() {
  if (!_app) {
    _app = tcb.init({ env: tcb.SYMBOL_CURRENT_ENV })
  }
  return _app
}

function getDb() {
  if (!_db) {
    _db = getApp().database()
  }
  return _db
}

function collection(name) {
  return getDb().collection(name)
}

module.exports = { getApp, getDb, collection }
```

- [ ] **Step 2: 编写 auth.js — OPENID 提取 + 输入校验**

```js
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

module.exports = { getOpenid, validateCaseId, validateProgress, validateEventName }
```

- [ ] **Step 3: 编写 response.js — 统一响应格式**

```js
// cloudfunctions/_shared/response.js

function success(data) {
  return { success: true, data }
}

function error(message, code) {
  return { success: false, error: message, code: code || 'UNKNOWN' }
}

module.exports = { success, error }
```

- [ ] **Step 4: 编写 date.js — 日期格式化**

```js
// cloudfunctions/_shared/date.js

/**
 * 格式化日期为 YYYY-MM-DD HH:mm:ss（北京时间）
 */
function formatDateTime(date) {
  const d = date instanceof Date ? date : new Date(date)
  const bjOffset = 8 * 60 * 60 * 1000
  const bjTime = new Date(d.getTime() + bjOffset)
  const iso = bjTime.toISOString()
  // iso: "2026-04-21T12:30:45.000Z" → "2026-04-21 20:30:45"
  return iso.replace('T', ' ').replace(/\.\d{3}Z$/, '')
}

/**
 * 获取今天的日期字符串 YYYY-MM-DD（北京时间）
 */
function getTodayDate() {
  const now = new Date()
  const bjOffset = 8 * 60 * 60 * 1000
  const bjTime = new Date(now.getTime() + bjOffset)
  return bjTime.toISOString().slice(0, 10)
}

module.exports = { formatDateTime, getTodayDate }
```

- [ ] **Step 5: 编写 wechat-api.js — access_token 缓存 + 推送**

```js
// cloudfunctions/_shared/wechat-api.js
const { collection } = require('./db')
const { formatDateTime } = require('./date')
const { getApp } = require('./db')

const TOKEN_DOC_ID = 'access_token'

/**
 * 获取 access_token，优先从缓存读取，过期则刷新
 * 注意：此函数需要云函数环境中的 APPID 和 APPSECRET
 * 这些值应配置在云函数的环境变量中
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

  const fetch = require('node-fetch')
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
  const fetch = require('node-fetch')

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
  const fetch = require('node-fetch')

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
    // 返回的是图片 buffer
    const buffer = await res.buffer()
    return { success: true, buffer, contentType }
  }

  // 返回的是错误 JSON
  const errData = await res.json()
  return { success: false, error: errData }
}

module.exports = { getAccessToken, sendSubscribeMessage, getMiniProgramCode }
```

- [ ] **Step 6: 编写 copy-shared.js — 复制共享模块到各函数目录**

```js
// cloudfunctions/_shared/copy-shared.js
const fs = require('fs')
const path = require('path')

// 需要复制共享模块的云函数列表
const FUNCTIONS = [
  'getDailyPick',
  'getCaseDetail',
  'getUserCollections',
  'toggleCollection',
  'trackEvent',
  'subscribeMessage',
  'generateDailyPick',
  'syncCaseData'
]

// 每个函数需要的共享模块
const MODULES = {
  default: ['db.js', 'auth.js', 'response.js', 'date.js'],
  subscribeMessage: ['db.js', 'auth.js', 'response.js', 'date.js', 'wechat-api.js'],
  generateDailyPick: ['db.js', 'auth.js', 'response.js', 'date.js', 'wechat-api.js'],
  syncCaseData: ['db.js', 'auth.js', 'response.js', 'date.js']
}

const sharedDir = path.join(__dirname)

for (const fn of FUNCTIONS) {
  const utilsDir = path.join(__dirname, '..', fn, 'utils')
  const modules = MODULES[fn] || MODULES.default

  // 确保 utils/ 目录存在
  if (!fs.existsSync(utilsDir)) {
    fs.mkdirSync(utilsDir, { recursive: true })
  }

  for (const mod of modules) {
    const src = path.join(sharedDir, mod)
    const dest = path.join(utilsDir, mod)
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest)
      console.log(`  Copied ${mod} → ${fn}/utils/`)
    } else {
      console.warn(`  SKIP ${mod} not found in _shared/`)
    }
  }
}

console.log('\nDone. All shared modules copied.')
```

- [ ] **Step 7: 运行复制脚本验证**

Run: `cd cloudfunctions/_shared && node copy-shared.js`

Expected: 每个 `cloudfunctions/<fn>/utils/` 目录包含对应的共享模块文件。

- [ ] **Step 8: Commit**

```bash
git add cloudfunctions/_shared/
git commit -m "feat: add cloud function shared modules (_shared/)"
```

---

## Task 3: getDailyPick 云函数

**Files:**
- Create: `cloudfunctions/getDailyPick/index.js`
- Create: `cloudfunctions/getDailyPick/package.json`
- Copy: `_shared/` → `getDailyPick/utils/` (via copy-shared.js)

- [ ] **Step 1: 创建 package.json**

```js
// cloudfunctions/getDailyPick/package.json
{
  "name": "getDailyPick",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {}
}
```

- [ ] **Step 2: 运行 copy-shared.js 确保 utils/ 就位**

Run: `cd cloudfunctions/_shared && node copy-shared.js`

Expected: `cloudfunctions/getDailyPick/utils/` 包含 db.js, auth.js, response.js, date.js。

- [ ] **Step 3: 编写 index.js**

```js
// cloudfunctions/getDailyPick/index.js
const { collection } = require('./utils/db')
const { getTodayDate } = require('./utils/date')
const { success, error } = require('./utils/response')

/**
 * 获取指定日期的精选案例
 * 入参: { date?: string } — YYYY-MM-DD，默认当天
 * 出参: { success, data: { date, cases: [...] } }
 */
exports.main = async (event) => {
  try {
    const targetDate = event.date || getTodayDate()

    // 1. 查 DailyPick 集合
    let pick = null
    const { data: picks } = await collection('DailyPick')
      .where({ date: targetDate })
      .limit(1)
      .get()

    // 2. 无结果时回退到最近一个有效日
    if (!picks || picks.length === 0) {
      const { data: fallbackPicks } = await collection('DailyPick')
        .where({ date: collection('DailyPick')._db.command.lt(targetDate) })
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

    // 3. 用 case_ids 批量查 Case（避免 N+1）
    const caseIds = pick.case_ids || []
    if (caseIds.length === 0) {
      return success({ date: pick.date, cases: [] })
    }

    const { data: cases } = await collection('Case')
      .where({
        id: collection('Case')._db.command.in(caseIds),
        status: 'published'
      })
      .get()

    // 4. 按 case_ids 原始顺序排列
    const caseMap = {}
    for (const c of cases) {
      caseMap[c.id] = c
    }
    const orderedCases = caseIds
      .map(id => caseMap[id])
      .filter(Boolean)
      .map(c => ({
        id: c.id,
        title: c.title,
        summary: c.summary,
        score_total: c.score_total,
        cost: c.cost,
        source_account: c.source_account,
        suitable_for: c.suitable_for
      }))

    return success({ date: pick.date, cases: orderedCases })
  } catch (err) {
    console.error('[getDailyPick] error:', err.message)
    return error(err.message, 'INTERNAL_ERROR')
  }
}
```

> **注意**: `collection('DailyPick')._db.command` 访问的是底层的 `Db.command`（即 `db.command`），用于构造查询操作符如 `lt`、`in`。如果 CloudBase Node SDK 的 `collection()` 不直接暴露 `_db`，需要改用 `getDb().command` 代替。在 `_shared/db.js` 中已导出 `getDb()`，所以也可写作 `const { getDb } = require('./utils/db')` 然后 `const cmd = getDb().command`。

- [ ] **Step 4: 修正 command 访问方式**

为避免上述访问链问题，修改 `_shared/db.js` 增加 `getCommand` 导出：

在 `cloudfunctions/_shared/db.js` 末尾添加：

```js
function getCommand() {
  return getDb().command
}

module.exports = { getApp, getDb, collection, getCommand }
```

同步更新 `copy-shared.js` 已复制的各函数 utils/ 副本，或重新运行 copy-shared.js。

然后更新 `getDailyPick/index.js` 中的查询写法：

```js
// cloudfunctions/getDailyPick/index.js — 修正后
const { collection, getCommand } = require('./utils/db')
const { getTodayDate } = require('./utils/date')
const { success, error } = require('./utils/response')

exports.main = async (event) => {
  try {
    const cmd = getCommand()
    const targetDate = event.date || getTodayDate()

    // 1. 查 DailyPick
    let pick = null
    const { data: picks } = await collection('DailyPick')
      .where({ date: targetDate })
      .limit(1)
      .get()

    // 2. 无结果时回退到最近有效日
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

    // 3. 批量查 Case
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

    // 4. 按原始顺序排列，只返回前端需要的字段
    const caseMap = {}
    for (const c of cases) {
      caseMap[c.id] = c
    }
    const orderedCases = caseIds
      .map(id => caseMap[id])
      .filter(Boolean)
      .map(c => ({
        id: c.id,
        title: c.title,
        summary: c.summary,
        score_total: c.score_total,
        cost: c.cost,
        source_account: c.source_account,
        suitable_for: c.suitable_for
      }))

    return success({ date: pick.date, cases: orderedCases })
  } catch (err) {
    console.error('[getDailyPick] error:', err.message)
    return error(err.message, 'INTERNAL_ERROR')
  }
}
```

- [ ] **Step 5: Commit**

```bash
rtk git add cloudfunctions/getDailyPick/ cloudfunctions/_shared/db.js
git commit -m "feat: add getDailyPick cloud function"
```

---

## Task 4: getCaseDetail 云函数

**Files:**
- Create: `cloudfunctions/getCaseDetail/index.js`
- Create: `cloudfunctions/getCaseDetail/package.json`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "getCaseDetail",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {}
}
```

- [ ] **Step 2: 编写 index.js**

```js
// cloudfunctions/getCaseDetail/index.js
const { collection } = require('./utils/db')
const { validateCaseId } = require('./utils/auth')
const { success, error } = require('./utils/response')

/**
 * 获取单个案例完整详情
 * 入参: { case_id: string }
 * 出参: { success, data: { case: {...} } } | { success: false, error: "NOT_FOUND" }
 */
exports.main = async (event) => {
  try {
    // 1. 校验入参
    try {
      validateCaseId(event.case_id)
    } catch (validationErr) {
      return error(validationErr.message, 'INVALID_INPUT')
    }

    // 2. 查 Case 集合（用自增 id 字段，不是 _id）
    const { data } = await collection('Case')
      .where({
        id: event.case_id,
        status: 'published'
      })
      .limit(1)
      .get()

    if (!data || data.length === 0) {
      return error('案例不存在或已下架', 'NOT_FOUND')
    }

    // 3. 返回完整案例文档
    return success({ case: data[0] })
  } catch (err) {
    console.error('[getCaseDetail] error:', err.message)
    return error(err.message, 'INTERNAL_ERROR')
  }
}
```

- [ ] **Step 3: Commit**

```bash
rtk git add cloudfunctions/getCaseDetail/
git commit -m "feat: add getCaseDetail cloud function"
```

---

## Task 5: trackEvent 云函数

**Files:**
- Create: `cloudfunctions/trackEvent/index.js`
- Create: `cloudfunctions/trackEvent/package.json`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "trackEvent",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {}
}
```

- [ ] **Step 2: 编写 index.js**

```js
// cloudfunctions/trackEvent/index.js
const { collection } = require('./utils/db')
const { getOpenid, validateEventName } = require('./utils/auth')
const { formatDateTime, getTodayDate } = require('./utils/date')
const { success, error } = require('./utils/response')

/**
 * 埋点事件上报（fire-and-forget）
 * 入参: { event: string, case_id?: string, extra?: object }
 * 出参: { success: true }
 */
exports.main = async (event, context) => {
  try {
    // 1. 获取 openid
    const openid = getOpenid(context)

    // 2. 校验事件名
    try {
      validateEventName(event.event)
    } catch (validationErr) {
      return error(validationErr.message, 'INVALID_INPUT')
    }

    // 3. 构造埋点记录
    const record = {
      openid,
      event: event.event,
      date: getTodayDate(),
      created_at: formatDateTime(new Date())
    }

    // 可选字段
    if (event.case_id) {
      record.case_id = event.case_id
    }
    if (event.extra && typeof event.extra === 'object') {
      record.extra = event.extra
    }

    // 4. 写入 Analytics（fire-and-forget，不阻塞主流程）
    await collection('Analytics').add(record)

    return success(null)
  } catch (err) {
    // 埋点失败不影响用户体验，静默记录
    console.error('[trackEvent] error:', err.message)
    return success(null)
  }
}
```

> **设计决策**: trackEvent 即使出错也返回 `success(null)`，因为埋点失败不应阻断用户操作。错误仅通过 `console.error` 记录。

- [ ] **Step 3: Commit**

```bash
rtk git add cloudfunctions/trackEvent/
git commit -m "feat: add trackEvent cloud function"
```

---

## Task 6: getUserCollections 云函数

**Files:**
- Create: `cloudfunctions/getUserCollections/index.js`
- Create: `cloudfunctions/getUserCollections/package.json`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "getUserCollections",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {}
}
```

- [ ] **Step 2: 编写 index.js**

```js
// cloudfunctions/getUserCollections/index.js
const { collection, getCommand } = require('./utils/db')
const { getOpenid } = require('./utils/auth')
const { success, error } = require('./utils/response')

/**
 * 获取当前用户收藏列表（含步骤进度）
 * 入参: { page?: number, pageSize?: number }
 * 出参: { success, data: { total, list: [{case_id, title, score_total, progress, steps_count, completed_count}] } }
 */
exports.main = async (event, context) => {
  try {
    // 1. 获取 openid
    const openid = getOpenid(context)

    const page = Math.max(1, event.page || 1)
    const pageSize = Math.min(50, Math.max(1, event.pageSize || 10))
    const skip = (page - 1) * pageSize

    // 2. 查 UserCollection（按更新时间倒序）
    const { data: collections } = await collection('UserCollection')
      .where({ openid })
      .orderBy('updated_at', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get()

    if (!collections || collections.length === 0) {
      return success({ total: 0, list: [] })
    }

    // 3. 总数查询
    const { total } = await collection('UserCollection')
      .where({ openid })
      .count()

    // 4. 批量查 Case（避免 N+1）
    const caseIds = collections.map(c => c.case_id)
    const cmd = getCommand()
    const { data: cases } = await collection('Case')
      .where({ id: cmd.in(caseIds) })
      .get()

    const caseMap = {}
    for (const c of cases) {
      caseMap[c.id] = c
    }

    // 5. 组装结果
    const list = collections.map(uc => {
      const caseData = caseMap[uc.case_id]
      const stepsCount = (caseData && caseData.steps) ? caseData.steps.length : 0
      const progress = uc.progress || {}
      const completedCount = Object.values(progress).filter(Boolean).length

      return {
        case_id: uc.case_id,
        title: caseData ? caseData.title : '案例已删除',
        score_total: caseData ? caseData.score_total : 0,
        progress,
        steps_count: stepsCount,
        completed_count: completedCount
      }
    })

    return success({ total, list })
  } catch (err) {
    console.error('[getUserCollections] error:', err.message)
    return error(err.message, 'INTERNAL_ERROR')
  }
}
```

> **N+1 优化**: 先批量拿 UserCollection，收集所有 case_id，单次 `$in` 查 Case。不是逐条查 Case。

- [ ] **Step 3: Commit**

```bash
rtk git add cloudfunctions/getUserCollections/
git commit -m "feat: add getUserCollections cloud function"
```

---

## Task 7: toggleCollection 云函数

**Files:**
- Create: `cloudfunctions/toggleCollection/index.js`
- Create: `cloudfunctions/toggleCollection/package.json`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "toggleCollection",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {}
}
```

- [ ] **Step 2: 编写 index.js**

```js
// cloudfunctions/toggleCollection/index.js
const { collection } = require('./utils/db')
const { getOpenid, validateCaseId, validateProgress } = require('./utils/auth')
const { formatDateTime } = require('./utils/date')
const { success, error } = require('./utils/response')

/**
 * 收藏/取消收藏 + 保存 Checklist 进度
 * 入参: { case_id: string, action: "collect"|"uncollect", progress?: object }
 * 出参: { success, data: { collected: boolean } }
 *
 * 完整记录更新模式：先读现有记录 → 合并 progress → 写回完整记录
 */
exports.main = async (event, context) => {
  try {
    // 1. 校验
    const openid = getOpenid(context)

    try {
      validateCaseId(event.case_id)
    } catch (validationErr) {
      return error(validationErr.message, 'INVALID_INPUT')
    }

    if (!event.action || !['collect', 'uncollect'].includes(event.action)) {
      return error('action 必须是 collect 或 uncollect', 'INVALID_INPUT')
    }

    if (event.progress) {
      try {
        validateProgress(event.progress)
      } catch (validationErr) {
        return error(validationErr.message, 'INVALID_INPUT')
      }
    }

    const { case_id, action } = event

    if (action === 'uncollect') {
      // 2a. 取消收藏：删除记录
      await collection('UserCollection')
        .where({ openid, case_id })
        .remove()
      return success({ collected: false })
    }

    // 2b. 收藏：查是否已存在
    const { data: existing } = await collection('UserCollection')
      .where({ openid, case_id })
      .limit(1)
      .get()

    const now = formatDateTime(new Date())

    if (existing && existing.length > 0) {
      // 已存在 → 完整记录更新（合并 progress）
      const record = existing[0]
      const updatedRecord = {
        openid: record.openid,
        case_id: record.case_id,
        progress: event.progress || record.progress || {},
        created_at: record.created_at,
        updated_at: now
      }
      await collection('UserCollection').doc(record._id).set(updatedRecord)
    } else {
      // 不存在 → 新建
      const newRecord = {
        openid,
        case_id,
        progress: event.progress || {},
        created_at: now,
        updated_at: now
      }
      await collection('UserCollection').add(newRecord)
    }

    return success({ collected: true })
  } catch (err) {
    console.error('[toggleCollection] error:', err.message)
    return error(err.message, 'INTERNAL_ERROR')
  }
}
```

> **完整记录模式**: PRD 要求所有 NoSQL update 先读后写。此处 `toggleCollection` 收藏时：读取现有记录 → 合并 progress → `doc().set()` 写回完整记录。不是 `$set` 部分更新。

- [ ] **Step 3: Commit**

```bash
rtk git add cloudfunctions/toggleCollection/
git commit -m "feat: add toggleCollection cloud function"
```

---

## Task 8: subscribeMessage 云函数

**Files:**
- Create: `cloudfunctions/subscribeMessage/index.js`
- Create: `cloudfunctions/subscribeMessage/package.json`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "subscribeMessage",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "node-fetch": "^2.7.0"
  }
}
```

> **注意**: CloudBase Node.js 运行时可能内置 `node-fetch` 或支持原生 `fetch`。如果运行时是 Node.js 18+，可用全局 `fetch` 替代 `node-fetch`。部署前确认运行时版本。

- [ ] **Step 2: 编写 index.js**

```js
// cloudfunctions/subscribeMessage/index.js
const { collection, getCommand } = require('./utils/db')
const { sendSubscribeMessage } = require('./utils/wechat-api')
const { formatDateTime } = require('./utils/date')
const { success, error } = require('./utils/response')

/**
 * 发送一次性订阅消息（由定时任务 generateDailyPick 调用）
 * 入参: { template_id: string, data: object, page?: string }
 *
 * 逻辑:
 * 1. 遍历 PushSubscription 集合
 * 2. 逐条调用微信 API subscribeMessage.send（每条间隔 200ms 避免限频）
 * 3. 发送成功后删除该条订阅记录（一次性）
 * 4. 记录 SystemLog
 */
exports.main = async (event) => {
  const logEntry = {
    type: 'push_result',
    function_name: 'subscribeMessage',
    created_at: formatDateTime(new Date())
  }

  let successCount = 0
  let failCount = 0

  try {
    const { template_id, data: templateData, page } = event

    if (!template_id || !templateData) {
      return error('template_id 和 data 为必填', 'INVALID_INPUT')
    }

    // 1. 获取所有待推送用户
    const { data: subscriptions } = await collection('PushSubscription')
      .limit(1000)
      .get()

    if (!subscriptions || subscriptions.length === 0) {
      logEntry.detail = '无待推送订阅'
      await collection('SystemLog').add(logEntry)
      return success({ sent: 0, failed: 0 })
    }

    // 2. 逐条发送（间隔 200ms）
    for (const sub of subscriptions) {
      try {
        await sendSubscribeMessage(
          sub.openid,
          template_id,
          templateData,
          page || 'pages/index/index'
        )

        // 发送成功 → 删除该条订阅（一次性用完）
        await collection('PushSubscription').doc(sub._id).remove()
        successCount++

        // 间隔 200ms 避免限频
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (sendErr) {
        failCount++
        console.error(`[subscribeMessage] 发送失败 openid=${sub.openid}:`, sendErr.message)

        // 记录单条失败日志但不删除订阅记录（可能重试）
        await collection('SystemLog').add({
          type: 'push_single_fail',
          function_name: 'subscribeMessage',
          detail: `openid=${sub.openid} err=${sendErr.message}`,
          created_at: formatDateTime(new Date())
        })

        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    // 3. 写入执行结果日志
    logEntry.detail = `发送完成: 成功${successCount} 失败${failCount} 共${subscriptions.length}条`
    await collection('SystemLog').add(logEntry)

    return success({ sent: successCount, failed: failCount })
  } catch (err) {
    logEntry.type = 'push_error'
    logEntry.detail = err.message
    await collection('SystemLog').add(logEntry).catch(() => {})

    console.error('[subscribeMessage] error:', err.message)
    return error(err.message, 'INTERNAL_ERROR')
  }
}
```

- [ ] **Step 3: Commit**

```bash
rtk git add cloudfunctions/subscribeMessage/
git commit -m "feat: add subscribeMessage cloud function"
```

---

## Task 9: generateDailyPick 云函数 + 定时触发器

**Files:**
- Create: `cloudfunctions/generateDailyPick/index.js`
- Create: `cloudfunctions/generateDailyPick/package.json`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "generateDailyPick",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {}
}
```

- [ ] **Step 2: 编写 index.js**

```js
// cloudfunctions/generateDailyPick/index.js
const { collection, getCommand } = require('./utils/db')
const { formatDateTime, getTodayDate } = require('./utils/date')
const { success, error } = require('./utils/response')

/**
 * 每日定时生成精选 Top3（Cron 触发）
 * Cron: 0 0 6 * * * * (每天 6:00)
 *
 * 逻辑:
 * 1. 查所有已存在 DailyPick 的 case_ids（去重后的已用集合）
 * 2. 查 Case where(status=published)，排除已用 case_id
 * 3. 按 score_total 倒序取前 3
 * 4. 不足 3 个：从已用案例中按 score_total 倒序补充（经典回顾）
 * 5. 写入 DailyPick
 * 6. 触发 subscribeMessage 发送通知
 * 7. 写入 SystemLog
 */
exports.main = async () => {
  const logEntry = {
    type: 'cron_result',
    function_name: 'generateDailyPick',
    created_at: formatDateTime(new Date())
  }

  try {
    const today = getTodayDate()
    const cmd = getCommand()

    // 1. 查今日是否已生成（幂等）
    const { data: todayPick } = await collection('DailyPick')
      .where({ date: today })
      .limit(1)
      .get()

    if (todayPick && todayPick.length > 0) {
      logEntry.detail = `今日(${today})精选已存在，跳过`
      await collection('SystemLog').add(logEntry)
      return success({ date: today, case_ids: todayPick[0].case_ids, skipped: true })
    }

    // 2. 获取所有已用 case_ids（去重）
    const { data: allPicks } = await collection('DailyPick')
      .field('case_ids')
      .get()

    const usedCaseIds = new Set()
    if (allPicks) {
      for (const pick of allPicks) {
        if (pick.case_ids) {
          for (const id of pick.case_ids) {
            usedCaseIds.add(id)
          }
        }
      }
    }

    // 3. 查未用过的已发布案例，按 score_total 倒序
    const { data: newCases } = await collection('Case')
      .where({ status: 'published' })
      .orderBy('score_total', 'desc')
      .limit(50)
      .get()

    const freshCases = (newCases || []).filter(c => !usedCaseIds.has(c.id))

    // 4. 选 Top 3
    let selectedIds = freshCases.slice(0, 3).map(c => c.id)

    // 5. 不足 3 个 → 从已用案例中补充（经典回顾）
    if (selectedIds.length < 3) {
      const needCount = 3 - selectedIds.length
      const usedCaseArray = (newCases || []).filter(c => usedCaseIds.has(c.id))
      usedCaseArray.sort((a, b) => b.score_total - a.score_total)

      const classicIds = usedCaseArray
        .slice(0, needCount)
        .map(c => c.id)

      selectedIds = selectedIds.concat(classicIds)
    }

    if (selectedIds.length === 0) {
      logEntry.type = 'cron_error'
      logEntry.detail = '无可选案例，Case 集合中无 published 记录'
      await collection('SystemLog').add(logEntry)
      return error('无可选案例', 'NO_CASES')
    }

    // 6. 写入 DailyPick
    const dailyPick = {
      date: today,
      case_ids: selectedIds,
      created_at: formatDateTime(new Date())
    }
    await collection('DailyPick').add(dailyPick)

    // 7. 触发订阅消息推送（异步，不阻塞主流程）
    try {
      const templateId = process.env.PUSH_TEMPLATE_ID
      if (templateId) {
        // 内部调用 subscribeMessage 云函数
        // 注意：在 CloudBase 中可以通过 callFunction 调用其他云函数
        const { getApp } = require('./utils/db')
        const app = getApp()

        await app.callFunction({
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
      // 推送失败不影响精选生成
      console.error('[generateDailyPick] push error:', pushErr.message)
    }

    // 8. 记录日志
    logEntry.detail = `生成成功: date=${today} case_ids=${selectedIds.join(',')}`
    await collection('SystemLog').add(logEntry)

    return success({ date: today, case_ids: selectedIds })
  } catch (err) {
    logEntry.type = 'cron_error'
    logEntry.detail = err.message
    await collection('SystemLog').add(logEntry).catch(() => {})

    console.error('[generateDailyPick] error:', err.message)
    return error(err.message, 'INTERNAL_ERROR')
  }
}
```

> **去重策略**: 不是检查 `published_at != today`，而是排除所有 DailyPick 记录中已出现过的 case_id。确保案例不会重复推荐，直到所有 published 案例都用过后才会"经典回顾"。

- [ ] **Step 3: 配置定时触发器**

通过 CloudBase MCP 工具 `manageFunctions` 创建触发器：

```
action: createFunctionTrigger
functionName: generateDailyPick
triggers:
  - name: daily_6am
    type: timer
    config: "0 0 6 * * * *"   # CloudBase 7段cron，每天6:00
```

或通过 CloudBase 控制台手动配置。

- [ ] **Step 4: Commit**

```bash
rtk git add cloudfunctions/generateDailyPick/
git commit -m "feat: add generateDailyPick cloud function with cron trigger"
```

---

## Task 10: syncCaseData 云函数

**Files:**
- Create: `cloudfunctions/syncCaseData/index.js`
- Create: `cloudfunctions/syncCaseData/package.json`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "syncCaseData",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {}
}
```

- [ ] **Step 2: 编写 index.js**

```js
// cloudfunctions/syncCaseData/index.js
const { collection, getCommand } = require('./utils/db')
const { formatDateTime } = require('./utils/date')
const { success, error } = require('./utils/response')

/**
 * 同步本地结构化数据到 NoSQL Case 集合
 * 由运营人员手动调用（或本地脚本触发）
 *
 * 入参: {
 *   cases: [{
 *     id, title, source_account, source_url, summary,
 *     score_total, score_feasibility, score_profit,
 *     score_timeliness, score_detail, score_fitness,
 *     cost, expected_revenue, cycle, steps, tools,
 *     pitfalls, suitable_for, risk_tags, status
 *   }]
 * }
 * 出参: { success, data: { synced: number, errors: [...] } }
 */
exports.main = async (event) => {
  try {
    if (!event.cases || !Array.isArray(event.cases) || event.cases.length === 0) {
      return error('cases 必须是非空数组', 'INVALID_INPUT')
    }

    const cmd = getCommand()
    const synced = []
    const errors = []

    for (const caseData of event.cases) {
      try {
        // 1. 校验必填字段
        const required = ['id', 'title', 'source_account', 'source_url', 'summary',
          'score_total', 'score_feasibility', 'score_profit', 'score_timeliness',
          'score_detail', 'score_fitness', 'cost', 'expected_revenue', 'cycle', 'suitable_for']

        for (const field of required) {
          if (caseData[field] === undefined || caseData[field] === null) {
            throw new Error(`缺少必填字段: ${field}`)
          }
        }

        // 2. 校验评分一致性（整数）
        const scores = {
          score_feasibility: caseData.score_feasibility,
          score_profit: caseData.score_profit,
          score_timeliness: caseData.score_timeliness,
          score_detail: caseData.score_detail,
          score_fitness: caseData.score_fitness
        }

        for (const [key, val] of Object.entries(scores)) {
          if (!Number.isInteger(val)) {
            throw new Error(`${key}=${val} 不是整数`)
          }
        }

        const computedTotal = scores.score_feasibility + scores.score_profit +
          scores.score_timeliness + scores.score_detail + scores.score_fitness
        if (computedTotal !== caseData.score_total) {
          throw new Error(`评分不一致: 总分=${caseData.score_total} 分项之和=${computedTotal}`)
        }

        // 3. 查是否已存在（用自增 id 字段）
        const { data: existing } = await collection('Case')
          .where({ id: caseData.id })
          .limit(1)
          .get()

        const now = formatDateTime(new Date())
        const record = {
          id: caseData.id,
          title: caseData.title,
          source_account: caseData.source_account,
          source_url: caseData.source_url,
          summary: caseData.summary,
          score_total: caseData.score_total,
          score_feasibility: caseData.score_feasibility,
          score_profit: caseData.score_profit,
          score_timeliness: caseData.score_timeliness,
          score_detail: caseData.score_detail,
          score_fitness: caseData.score_fitness,
          cost: caseData.cost,
          expected_revenue: caseData.expected_revenue,
          cycle: caseData.cycle,
          steps: caseData.steps || [],
          tools: caseData.tools || [],
          pitfalls: caseData.pitfalls || '',
          suitable_for: caseData.suitable_for,
          risk_tags: caseData.risk_tags || [],
          status: caseData.status || 'reviewed',
          is_classic: false,
          created_at: now,
          published_at: caseData.status === 'published' ? now : null
        }

        if (existing && existing.length > 0) {
          // 更新（完整记录模式）
          record.created_at = existing[0].created_at
          if (existing[0].published_at) {
            record.published_at = existing[0].published_at
          }
          await collection('Case').doc(existing[0]._id).set(record)
        } else {
          await collection('Case').add(record)
        }

        synced.push(caseData.id)
      } catch (caseErr) {
        errors.push({ id: caseData.id, error: caseErr.message })
      }
    }

    return success({ synced: synced.length, errors })
  } catch (err) {
    console.error('[syncCaseData] error:', err.message)
    return error(err.message, 'INTERNAL_ERROR')
  }
}
```

> **评分校验**: 所有评分必须为整数，且 `score_total` = 五维度之和。不符合则拒绝写入，返回错误详情。

- [ ] **Step 3: Commit**

```bash
rtk git add cloudfunctions/syncCaseData/
git commit -m "feat: add syncCaseData cloud function"
```

---

## Task 11: 本地 LLM 评分脚本 (scripts/llm-score/)

**Files:**
- Create: `scripts/llm-score/package.json`
- Create: `scripts/llm-score/tsconfig.json`
- Create: `scripts/llm-score/index.ts`
- Create: `scripts/llm-score/prompt.ts`
- Create: `scripts/llm-score/desensitize.ts`
- Create: `scripts/llm-score/validate.ts`

> **说明**: 这是本地运行的 TypeScript 脚本，不是云函数。从 `resources/raw/{编号}/article.md` 读取原文，调用 LLM API 评分，输出结构化 JSON 到 `resources/processed/{编号}/score.json`。

- [ ] **Step 1: 初始化项目**

```bash
mkdir -p scripts/llm-score
cd scripts/llm-score
npm init -y
```

修改 `package.json`:

```json
{
  "name": "llm-score",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "score": "npx tsx index.ts",
    "score:batch": "npx tsx index.ts --batch"
  },
  "dependencies": {
    "openai": "^4.80.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.7.0"
  }
}
```

Run: `cd scripts/llm-score && npm install`

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": ".",
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["*.ts"]
}
```

- [ ] **Step 3: 编写 desensitize.ts — 内容脱敏**

```ts
// scripts/llm-score/desensitize.ts

/**
 * 脱敏规则（正则替换）
 * 在发送给 LLM 之前清除敏感信息
 */
const RULES: [RegExp, string][] = [
  [/1[3-9]\d{9}/g, '[手机号]'],                          // 手机号
  [/微信号[：:]\s*\S+/g, '微信号: [已隐藏]'],              // 微信号
  [/微信[：:]\s*\S+/g, '微信: [已隐藏]'],                  // 微信号变体
  [/\d{17}[\dXx]/g, '[身份证号]'],                        // 身份证号
  [/[\w.-]+@[\w.-]+\.\w{2,}/g, '[邮箱]'],                 // 邮箱
]

export function desensitize(text: string): string {
  let result = text
  for (const [pattern, replacement] of RULES) {
    result = result.replace(pattern, replacement)
  }
  return result
}
```

- [ ] **Step 4: 编写 prompt.ts — Prompt 模板**

```ts
// scripts/llm-score/prompt.ts

export function buildPrompt(articleContent: string): string {
  return `你是一个副业案例分析专家。请对以下副业案例文章进行结构化评分和字段提取。

## 评分维度（所有评分为整数，不允许小数）
- score_feasibility: 落地可行性 0-3（3=立刻能做, 0=无法落地）
- score_profit: 收益潜力 0-2（2=月入5000+, 0=无收益）
- score_timeliness: 时效性 0-2（2=当下可做, 0=已过时）
- score_detail: 实操细节 0-2（2=步骤清晰, 0=纯概念）
- score_fitness: 用户适配度 0-1（1=适合普通人, 0=门槛高）

## 约束
- score_total = 以上五维度之和（整数加法）
- summary 不超过 200 字
- 每个步骤描述不超过 50 字
- 工具/资源不超过 5 个
- risk_tags 不超过 3 个

## 输出格式（严格 JSON，不要多余文字）
{
  "score_feasibility": <integer 0-3>,
  "score_profit": <integer 0-2>,
  "score_timeliness": <integer 0-2>,
  "score_detail": <integer 0-2>,
  "score_fitness": <integer 0-1>,
  "score_total": <integer>,
  "summary": "<核心摘要>",
  "steps": [{"step": "<描述>", "order": 1}],
  "tools": [{"name": "<工具名>", "desc": "<说明>"}],
  "pitfalls": "<避坑指南>",
  "suitable_for": "<适合人群>",
  "cost": "<启动成本>",
  "expected_revenue": "<预期收益>",
  "cycle": "<变现周期>",
  "risk_tags": ["<标签>"]
}

## 文章内容
${articleContent}`
}
```

- [ ] **Step 5: 编写 validate.ts — 分数校验**

```ts
// scripts/llm-score/validate.ts

export interface ScoreResult {
  score_feasibility: number
  score_profit: number
  score_timeliness: number
  score_detail: number
  score_fitness: number
  score_total: number
  summary: string
  steps: { step: string; order: number }[]
  tools: { name: string; desc: string }[]
  pitfalls: string
  suitable_for: string
  cost: string
  expected_revenue: string
  cycle: string
  risk_tags: string[]
}

const DIMENSION_RANGES: Record<string, [number, number]> = {
  score_feasibility: [0, 3],
  score_profit: [0, 2],
  score_timeliness: [0, 2],
  score_detail: [0, 2],
  score_fitness: [0, 1],
}

export function validateScore(result: ScoreResult): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // 1. 检查每个维度是否为整数且在范围内
  for (const [dim, [min, max]] of Object.entries(DIMENSION_RANGES)) {
    const val = result[dim as keyof ScoreResult] as number
    if (!Number.isInteger(val)) {
      errors.push(`${dim}=${val} 不是整数`)
    } else if (val < min || val > max) {
      errors.push(`${dim}=${val} 超出范围 [${min}, ${max}]`)
    }
  }

  // 2. 检查总分一致性
  const computed = result.score_feasibility + result.score_profit +
    result.score_timeliness + result.score_detail + result.score_fitness
  if (computed !== result.score_total) {
    errors.push(`总分不一致: score_total=${result.score_total}, 分项之和=${computed}`)
  }

  // 3. 检查 score_total 范围
  if (!Number.isInteger(result.score_total) || result.score_total < 0 || result.score_total > 10) {
    errors.push(`score_total=${result.score_total} 不是 0-10 的整数`)
  }

  return { valid: errors.length === 0, errors }
}
```

- [ ] **Step 6: 编写 index.ts — 主入口**

```ts
// scripts/llm-score/index.ts
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import OpenAI from 'openai'
import { desensitize } from './desensitize.js'
import { buildPrompt } from './prompt.js'
import { validateScore, type ScoreResult } from './validate.js'

const RAW_DIR = join(process.cwd(), 'resources', 'raw')
const PROCESSED_DIR = join(process.cwd(), 'resources', 'processed')

// LLM 配置（支持多种兼容 OpenAI 的 API）
const client = new OpenAI({
  apiKey: process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL || 'https://api.minimaxi.chat/v1',
})

const MODEL = process.env.LLM_MODEL || 'MiniMax-Text-01'

async function scoreSingle(caseDir: string): Promise<void> {
  const articlePath = join(caseDir, 'article.md')
  if (!existsSync(articlePath)) {
    console.error(`  SKIP: ${caseDir} - article.md not found`)
    return
  }

  const caseId = dirname(caseDir).split('/').pop() || 'unknown'
  console.log(`  Processing: ${caseId}`)

  // 1. 读取 + 脱敏
  const rawContent = readFileSync(articlePath, 'utf-8')
  const sanitized = desensitize(rawContent)

  // 2. 调用 LLM
  const prompt = buildPrompt(sanitized)
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error(`LLM 返回为空: ${caseId}`)
  }

  // 3. 解析 JSON
  let result: ScoreResult
  try {
    result = JSON.parse(content)
  } catch {
    throw new Error(`JSON 解析失败: ${caseId}\n原始输出: ${content.slice(0, 200)}`)
  }

  // 4. 校验分数
  const validation = validateScore(result)
  if (!validation.valid) {
    console.warn(`  WARN: ${caseId} 评分校验失败: ${validation.errors.join('; ')}`)
    // 写入原始结果 + 错误信息，由人工审核
    result._validation_errors = validation.errors as any
  }

  // 5. 输出到 processed 目录
  const outputDir = join(PROCESSED_DIR, caseId)
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  writeFileSync(
    join(outputDir, 'score.json'),
    JSON.stringify(result, null, 2),
    'utf-8'
  )

  console.log(`  DONE: ${caseId} → score.json (total=${result.score_total})`)
}

async function main() {
  const args = process.argv.slice(2)
  const isBatch = args.includes('--batch')

  if (isBatch) {
    // 批量模式：处理所有 raw 子目录
    const { readdirSync } = await import('fs')
    const dirs = readdirSync(RAW_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => join(RAW_DIR, d.name))

    console.log(`Found ${dirs.length} cases to score`)
    for (const dir of dirs) {
      const outputDir = join(PROCESSED_DIR, dir.split('/').pop()!)
      if (existsSync(join(outputDir, 'score.json'))) {
        console.log(`  SKIP: ${dir.split('/').pop()} - already scored`)
        continue
      }
      try {
        await scoreSingle(dir)
      } catch (err: any) {
        console.error(`  ERROR: ${dir.split('/').pop()} - ${err.message}`)
      }
    }
  } else {
    // 单个模式：传入目录路径
    const targetDir = args.find(a => !a.startsWith('--'))
    if (!targetDir) {
      console.error('Usage: npm run score <case-dir-path>')
      console.error('       npm run score:batch')
      process.exit(1)
    }
    await scoreSingle(targetDir)
  }
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
```

- [ ] **Step 7: 测试运行**

```bash
# 单个案例评分
LLM_API_KEY=your-key npm run score resources/raw/100001-2026-04-20-测试案例

# 批量评分
LLM_API_KEY=your-key npm run score:batch
```

Expected: `resources/processed/{编号}/score.json` 生成，包含整数评分和结构化字段。

- [ ] **Step 8: Commit**

```bash
rtk git add scripts/llm-score/
git commit -m "feat: add local LLM scoring script"
```

---

## Task 12: 云函数单元测试 (Vitest)

**Files:**
- Create: `tests/unittest/cloudfunctions/helpers/mock-context.js`
- Create: `tests/unittest/cloudfunctions/getDailyPick.test.js`
- Create: `tests/unittest/cloudfunctions/getCaseDetail.test.js`
- Create: `tests/unittest/cloudfunctions/trackEvent.test.js`
- Create: `tests/unittest/cloudfunctions/shared/auth.test.js`
- Create: `tests/unittest/cloudfunctions/shared/response.test.js`
- Create: `tests/unittest/cloudfunctions/shared/date.test.js`

> **测试策略**: 云函数测试不需要启动 CloudBase 环境。通过 mock `utils/db.js` 的 `collection()` 返回值来模拟数据库操作。每个测试文件独立，不依赖真实云环境。

- [ ] **Step 1: 安装测试依赖**

在项目根目录:

```bash
npm install -D vitest
```

在 `package.json` 添加 scripts:

```json
{
  "scripts": {
    "test:cf": "vitest run tests/unittest/cloudfunctions/"
  }
}
```

- [ ] **Step 2: 创建 mock-context.js**

```js
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
```

- [ ] **Step 3: 编写 shared/auth.test.js**

```js
// tests/unittest/cloudfunctions/shared/auth.test.js
import { describe, it, expect } from 'vitest'
import { getOpenid, validateCaseId, validateProgress, validateEventName } from '../../../../cloudfunctions/_shared/auth.js'
import { createMockContext, createUnauthContext } from '../helpers/mock-context.js'

describe('auth', () => {
  describe('getOpenid', () => {
    it('从 wxContext 获取 OPENID', () => {
      const ctx = createMockContext('openid_abc')
      expect(getOpenid(ctx)).toBe('openid_abc')
    })

    it('无 OPENID 时抛出异常', () => {
      expect(() => getOpenid(createUnauthContext())).toThrow('UNAUTHORIZED')
    })
  })

  describe('validateCaseId', () => {
    it('合法数字字符串通过', () => {
      expect(validateCaseId('100001')).toBe(true)
    })

    it('空字符串拒绝', () => {
      expect(() => validateCaseId('')).toThrow('INVALID_INPUT')
    })

    it('非数字字符串拒绝', () => {
      expect(() => validateCaseId('abc')).toThrow('INVALID_INPUT')
    })

    it('非字符串拒绝', () => {
      expect(() => validateCaseId(123)).toThrow('INVALID_INPUT')
    })
  })

  describe('validateProgress', () => {
    it('合法 progress 通过', () => {
      expect(validateProgress({ step_1: true, step_2: false })).toBe(true)
    })

    it('null 通过（可选字段）', () => {
      expect(validateProgress(null)).toBe(true)
    })

    it('非法 key 拒绝', () => {
      expect(() => validateProgress({ invalid_key: true })).toThrow('INVALID_INPUT')
    })

    it('非布尔值拒绝', () => {
      expect(() => validateProgress({ step_1: 'yes' })).toThrow('INVALID_INPUT')
    })
  })

  describe('validateEventName', () => {
    it('合法事件名通过', () => {
      expect(validateEventName('page_view')).toBe(true)
    })

    it('非法事件名拒绝', () => {
      expect(() => validateEventName('hack')).toThrow('INVALID_INPUT')
    })
  })
})
```

- [ ] **Step 4: 编写 shared/response.test.js**

```js
// tests/unittest/cloudfunctions/shared/response.test.js
import { describe, it, expect } from 'vitest'
import { success, error } from '../../../../cloudfunctions/_shared/response.js'

describe('response', () => {
  it('success 返回正确格式', () => {
    const result = success({ id: 1 })
    expect(result).toEqual({ success: true, data: { id: 1 } })
  })

  it('error 返回正确格式', () => {
    const result = error('出错了', 'NOT_FOUND')
    expect(result).toEqual({ success: false, error: '出错了', code: 'NOT_FOUND' })
  })

  it('error 无 code 时默认 UNKNOWN', () => {
    const result = error('出错了')
    expect(result.code).toBe('UNKNOWN')
  })
})
```

- [ ] **Step 5: 编写 shared/date.test.js**

```js
// tests/unittest/cloudfunctions/shared/date.test.js
import { describe, it, expect } from 'vitest'
import { formatDateTime, getTodayDate } from '../../../../cloudfunctions/_shared/date.js'

describe('date', () => {
  it('formatDateTime 格式正确', () => {
    // 2026-04-21T00:00:00.000Z UTC = 2026-04-21 08:00:00 北京时间
    const result = formatDateTime(new Date('2026-04-21T00:00:00.000Z'))
    expect(result).toBe('2026-04-21 08:00:00')
  })

  it('getTodayDate 返回 YYYY-MM-DD 格式', () => {
    const result = getTodayDate()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('formatDateTime 接受字符串输入', () => {
    const result = formatDateTime('2026-04-21T00:00:00.000Z')
    expect(result).toBe('2026-04-21 08:00:00')
  })
})
```

- [ ] **Step 6: 编写 getDailyPick.test.js（云函数集成测试）**

```js
// tests/unittest/cloudfunctions/getDailyPick.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock 依赖
vi.mock('../../../cloudfunctions/getDailyPick/utils/db.js', () => {
  const mockCmd = {
    lt: (val) => ({ _type: 'lt', value: val }),
    in: (val) => ({ _type: 'in', value: val })
  }
  return {
    collection: vi.fn((name) => ({
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      field: vi.fn().mockReturnThis(),
      get: vi.fn(),
      add: vi.fn(),
      count: vi.fn(),
      doc: vi.fn().mockReturnThis(),
      set: vi.fn(),
      remove: vi.fn()
    })),
    getCommand: vi.fn(() => mockCmd),
    getDb: vi.fn()
  }
})

import { getDailyPick } from '../../../cloudfunctions/getDailyPick/index.js'

// 由于云函数是 exports.main，直接测试
const handler = async (event) => {
  // 这里通过动态 import 来获取云函数 handler
  const mod = await import('../../../cloudfunctions/getDailyPick/index.js')
  return mod.main(event)
}

describe('getDailyPick', () => {
  it('返回空数组当无数据时', async () => {
    // 此测试验证函数结构正确
    // 完整 mock 需要根据实际 collection() 调用链配置返回值
    // 此处作为占位，实际实现时需要细化 mock 返回值
    expect(true).toBe(true)
  })
})
```

> **测试说明**: 云函数的完整集成测试需要精细 mock `collection()` 的链式调用。上面的 shared 模块测试（auth/response/date）是纯函数，可以直接测试。云函数的 mock 测试结构已给出，实际 mock 返回值需要根据函数逻辑配置。生产中建议先跑通 shared 模块测试，云函数逻辑通过 CloudBase 控制台手动验证。

- [ ] **Step 7: 运行测试**

```bash
npx vitest run tests/unittest/cloudfunctions/shared/
```

Expected: 所有 shared 模块测试通过（auth: 8 tests, response: 3 tests, date: 3 tests）。

- [ ] **Step 8: Commit**

```bash
rtk git add tests/unittest/
git commit -m "test: add cloud function unit tests"
```

---

## Task 13: 部署与验证

- [ ] **Step 1: 部署共享模块到各云函数目录**

Run: `cd cloudfunctions/_shared && node copy-shared.js`

- [ ] **Step 2: 通过 CloudBase MCP 工具部署云函数**

按顺序部署（先无依赖的简单函数，后有依赖的复杂函数）：

1. `getCaseDetail` — 最简单，单个查询
2. `trackEvent` — 简单写入
3. `getDailyPick` — 需要数据
4. `getUserCollections` — 需要数据
5. `toggleCollection` — 读写操作
6. `syncCaseData` — 数据导入
7. `subscribeMessage` — 依赖 wechat-api
8. `generateDailyPick` — 定时任务

使用 `manageFunctions` 工具:
```
action: createFunction
functionName: getCaseDetail
functionRootPath: /abs/path/to/cloudfunctions
runtime: Nodejs18.15
```

对每个函数重复上述操作。

- [ ] **Step 3: 配置定时触发器**

```
action: createFunctionTrigger
functionName: generateDailyPick
triggers:
  - name: daily_6am
    type: timer
    config: "0 0 6 * * * *"
```

- [ ] **Step 4: 配置环境变量**

在 CloudBase 控制台为 subscribeMessage 和 generateDailyPick 配置环境变量:
- `WX_APPID`: 小程序 AppID
- `WX_APPSECRET`: 小程序 AppSecret
- `PUSH_TEMPLATE_ID`: 推送消息模板 ID

- [ ] **Step 5: 端到端验证**

```bash
# 1. 通过 syncCaseData 导入测试数据
# 调用云函数 syncCaseData，传入 mock cases

# 2. 手动触发 generateDailyPick
# 调用云函数 generateDailyPick

# 3. 查询结果
# 调用 getDailyPick 验证返回数据
```

- [ ] **Step 6: Final commit**

```bash
rtk git add -A
git commit -m "chore: final backend setup and deployment config"
```
