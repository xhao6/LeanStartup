# 订阅管理后端实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 创建订阅管理云函数和数据库支持，解决前端调用 getSubscriptionStatus 时云函数不存在的问题

**Architecture:** 参照 LeanSkill 模式，创建 `subscription` 云函数通过 `action` 参数区分操作（subscribe/unsubscribe/getStatus），使用 `PushSubscription` 集合存储一次性微信订阅消息授权记录。

**Tech Stack:** CloudBase 云函数（Node.js 16.13）+ NoSQL 数据库 + 微信小程序订阅消息 API

---

## 架构说明

### 云函数设计

**云函数名称**: `subscription`

**请求格式**:
```javascript
// 订阅
{ action: 'subscribe', template_id: 'xxx' }

// 取消订阅
{ action: 'unsubscribe' }

// 查询状态
{ action: 'getStatus' }
```

**响应格式**:
```javascript
{ success: true, data: { isSubscribed: true/false, alreadySubscribed: true/false, message: 'xxx' } }
{ success: false, error: 'xxx', code: 'ERROR_CODE' }
```

### 数据库集合

**PushSubscription** (已存在):
- `_id`: 自动生成
- `openid`: 用户唯一标识
- `template_id`: 消息模板 ID
- `subscribed_at`: 授权时间

**设计决策**:
- 不创建新的 `DailySubscription` 集合
- 订阅状态 = `PushSubscription` 集合中是否存在该 openid 的记录
- 消息发送后自动删除记录（一次性订阅）

---

## Task 1: 创建 subscription 云函数目录和基础文件

**Files:**
- Create: `cloudfunctions/subscription/index.js`
- Create: `cloudfunctions/subscription/package.json`
- Create: `cloudfunctions/subscription/utils/db.js`
- Create: `cloudfunctions/subscription/utils/auth.js`
- Create: `cloudfunctions/subscription/utils/response.js`

- [ ] **Step 1: 创建云函数目录**

```bash
mkdir -p cloudfunctions/subscription/utils
```

- [ ] **Step 2: 创建 package.json**

```json
{
  "name": "subscription",
  "version": "1.0.0",
  "description": "订阅管理云函数",
  "main": "index.js",
  "dependencies": {
    "@cloudbase/node-sdk": "^2.10.0"
  }
}
```

- [ ] **Step 3: 创建 utils/db.js**

```javascript
// cloudfunctions/subscription/utils/db.js
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

- [ ] **Step 4: 创建 utils/auth.js**

```javascript
// cloudfunctions/subscription/utils/auth.js
function getOpenid(context) {
  if (!context || !context.cloudContext || !context.cloudContext.OPENID) {
    const err = new Error('UNAUTHORIZED: 无法获取用户 OPENID')
    err.code = 'UNAUTHORIZED'
    throw err
  }
  return context.cloudContext.OPENID
}

module.exports = { getOpenid }
```

- [ ] **Step 5: 创建 utils/response.js**

```javascript
// cloudfunctions/subscription/utils/response.js
function success(data) {
  return { success: true, data }
}

function error(message, code = 'INTERNAL_ERROR') {
  return { success: false, error: message, code }
}

module.exports = { success, error }
```

- [ ] **Step 6: Commit**

```bash
git add cloudfunctions/subscription/
git commit -m "feat: create subscription cloud function scaffold"
```

---

## Task 2: 实现 subscribe 操作（订阅每日提醒）

**Files:**
- Modify: `cloudfunctions/subscription/index.js`

- [ ] **Step 1: 实现 doSubscribe 核心逻辑**

在 `cloudfunctions/subscription/index.js` 中写入：

```javascript
// cloudfunctions/subscription/index.js
const { collection } = require('./utils/db')
const { getOpenid } = require('./utils/auth')
const { success, error } = require('./utils/response')

/**
 * subscribe 核心逻辑
 *
 * @param {object} event
 * @param {string} event.action - 'subscribe'
 * @param {string} event.template_id - 微信订阅消息模板 ID
 * @param {object} deps - { collection, openid }
 */
async function doSubscribe(event, deps) {
  const { collection: col, openid } = deps
  const { template_id } = event

  if (!template_id) {
    return error('template_id 为必填', 'INVALID_INPUT')
  }

  try {
    // 检查是否已订阅
    const { data: existing } = await col('PushSubscription').where({ openid }).get()

    if (existing && existing.length > 0) {
      // 已订阅，返回成功但提示已订阅
      return success({
        isSubscribed: true,
        alreadySubscribed: true,
        message: '已订阅每日提醒'
      })
    }

    // 新增订阅记录
    await col('PushSubscription').add({
      openid,
      template_id,
      subscribed_at: new Date().toISOString()
    })

    return success({
      isSubscribed: true,
      alreadySubscribed: false,
      message: '订阅成功'
    })
  } catch (e) {
    return error(e.message, 'INTERNAL_ERROR')
  }
}
```

- [ ] **Step 2: 导出函数**

在 `index.js` 末尾添加：

```javascript
exports.doSubscribe = doSubscribe
```

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/subscription/index.js
git commit -m "feat: implement subscribe action"
```

---

## Task 3: 实现 unsubscribe 操作（取消订阅）

**Files:**
- Modify: `cloudfunctions/subscription/index.js`

- [ ] **Step 1: 实现 doUnsubscribe 核心逻辑**

在 `cloudfunctions/subscription/index.js` 中 `doSubscribe` 函数后添加：

```javascript
/**
 * unsubscribe 核心逻辑
 *
 * @param {object} event
 * @param {string} event.action - 'unsubscribe'
 * @param {object} deps - { collection, openid }
 */
async function doUnsubscribe(event, deps) {
  const { collection: col, openid } = deps

  try {
    // 检查是否有订阅记录
    const { data: existing } = await col('PushSubscription').where({ openid }).get()

    if (!existing || existing.length === 0) {
      // 未订阅，返回成功
      return success({
        isSubscribed: false,
        message: '未订阅'
      })
    }

    // 删除所有该 openid 的订阅记录
    for (const record of existing) {
      await col('PushSubscription').doc(record._id).remove()
    }

    return success({
      isSubscribed: false,
      message: '已取消订阅'
    })
  } catch (e) {
    return error(e.message, 'INTERNAL_ERROR')
  }
}
```

- [ ] **Step 2: 导出函数**

在 `index.js` 末尾添加：

```javascript
exports.doUnsubscribe = doUnsubscribe
```

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/subscription/index.js
git commit -m "feat: implement unsubscribe action"
```

---

## Task 4: 实现 getStatus 操作（查询订阅状态）

**Files:**
- Modify: `cloudfunctions/subscription/index.js`

- [ ] **Step 1: 实现 doGetStatus 核心逻辑**

在 `cloudfunctions/subscription/index.js` 中 `doUnsubscribe` 函数后添加：

```javascript
/**
 * getStatus 核心逻辑
 *
 * @param {object} event
 * @param {string} event.action - 'getStatus'
 * @param {object} deps - { collection, openid }
 */
async function doGetStatus(event, deps) {
  const { collection: col, openid } = deps

  try {
    const { data: existing } = await col('PushSubscription').where({ openid }).get()

    const isSubscribed = existing && existing.length > 0

    return success({
      isSubscribed
    })
  } catch (e) {
    return error(e.message, 'INTERNAL_ERROR')
  }
}
```

- [ ] **Step 2: 导出函数**

在 `index.js` 末尾添加：

```javascript
exports.doGetStatus = doGetStatus
```

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/subscription/index.js
git commit -m "feat: implement getStatus action"
```

---

## Task 5: 实现云函数入口和路由逻辑

**Files:**
- Modify: `cloudfunctions/subscription/index.js`

- [ ] **Step 1: 实现云函数主入口**

在 `cloudfunctions/subscription/index.js` 开头添加（在所有核心函数之后，导出语句之前）：

```javascript
/**
 * 云函数入口 - 路由分发
 */
exports.main = async function (event, context) {
  try {
    const openid = getOpenid(context)
    const { action } = event

    const deps = {
      collection,
      openid
    }

    switch (action) {
      case 'subscribe':
        return await doSubscribe(event, deps)
      case 'unsubscribe':
        return await doUnsubscribe(event, deps)
      case 'getStatus':
        return await doGetStatus(event, deps)
      default:
        return error('无效的 action 参数', 'INVALID_INPUT')
    }
  } catch (e) {
    const msg = e.message || String(e)
    if (msg.startsWith('UNAUTHORIZED')) {
      const code = msg.split(':')[0].trim()
      const message = msg.replace(/^UNAUTHORIZED:\s*/, '')
      return error(message, code)
    }
    return error(msg, 'INTERNAL_ERROR')
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add cloudfunctions/subscription/index.js
git commit -m "feat: implement cloud function main entry and routing"
```

---

## Task 6: 更新前端 subscription API

**Files:**
- Modify: `src/api/modules/subscription.ts`

- [ ] **Step 1: 更新 subscription.ts**

完整替换 `src/api/modules/subscription.ts`：

```typescript
// src/api/modules/subscription.ts
import { callFunction } from '../core/cloud'

export interface SubscribeResponse {
  success: boolean
  message?: string
  alreadySubscribed?: boolean
}

export interface UnsubscribeResponse {
  success: boolean
  message?: string
}

export interface GetStatusResponse {
  success: boolean
  isSubscribed?: boolean
}

/**
 * 用户订阅每日榜单提醒
 */
export const subscribe = async (): Promise<SubscribeResponse> => {
  try {
    const res = await callFunction('subscription', {
      action: 'subscribe',
      template_id: 'YOUR_TEMPLATE_ID' // TODO: 替换为实际的微信订阅消息模板 ID
    })

    if (res.success) {
      return {
        success: true,
        message: res.data?.message || '订阅成功',
        alreadySubscribed: res.data?.alreadySubscribed || false
      }
    }

    return { success: false, message: res.error || '订阅失败' }
  } catch (err: any) {
    console.error('[subscribe] error:', err)
    return { success: false, message: err.message || '订阅失败' }
  }
}

/**
 * 取消订阅
 */
export const unsubscribe = async (): Promise<UnsubscribeResponse> => {
  try {
    const res = await callFunction('subscription', {
      action: 'unsubscribe'
    })

    if (res.success) {
      return {
        success: true,
        message: res.data?.message || '已取消订阅'
      }
    }

    return { success: false, message: res.error || '取消失败' }
  } catch (err: any) {
    console.error('[unsubscribe] error:', err)
    return { success: false, message: err.message || '取消失败' }
  }
}

/**
 * 查询订阅状态
 */
export const getSubscriptionStatus = async (): Promise<GetStatusResponse> => {
  try {
    const res = await callFunction('subscription', {
      action: 'getStatus'
    })

    if (res.success) {
      return {
        success: true,
        isSubscribed: res.data?.isSubscribed || false
      }
    }

    return { success: false, isSubscribed: false }
  } catch (err: any) {
    console.error('[getSubscriptionStatus] error:', err)
    return { success: false, isSubscribed: false }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/api/modules/subscription.ts
git commit -m "refactor: update subscription API to use cloud function"
```

---

## Task 7: 部署云函数到 CloudBase

**Files:**
- Deploy: `cloudfunctions/subscription`

- [ ] **Step 1: 使用 CloudBase MCP 工具部署**

```bash
# 检查云函数列表（确认 subscription 尚未部署）
npx tcb fn list
```

- [ ] **Step 2: 创建云函数**

使用 CloudBase MCP 工具的 `mcp__cloudbase__manageFunctions`:

```json
{
  "action": "createFunction",
  "functionRootPath": "d:/MyWork/LeanMind/LeanStartup/cloudfunctions",
  "func": {
    "name": "subscription",
    "runtime": "Nodejs16.13",
    "handler": "index.main",
    "timeout": 60
  }
}
```

- [ ] **Step 3: 验证部署**

```bash
# 再次检查云函数列表，确认 subscription 已创建
npx tcb fn list

# 查看云函数详情
npx tcb fn get subscription
```

- [ ] **Step 4: 测试云函数**

在微信开发者工具中测试订阅功能：
1. 打开小程序
2. 进入"我的" → "订阅管理"
3. 点击"订阅"按钮
4. 检查控制台是否还有 `FunctionName parameter could not be found` 错误

- [ ] **Step 5: Commit**

如果部署成功，无需 commit（云函数代码已在前面步骤提交）。

---

## Task 8: 验证和文档

**Files:**
- Update: `docs/operations/cloudbase-resources.md` (如果存在)

- [ ] **Step 1: 验证所有功能**

- [ ] 订阅功能：调用 `subscribe()`，检查 PushSubscription 集合是否新增记录
- [ ] 状态查询：调用 `getSubscriptionStatus()`，检查返回 `isSubscribed: true`
- [ ] 取消订阅：调用 `unsubscribe()`，检查 PushSubscription 集合记录是否删除
- [ ] 状态查询：再次调用 `getSubscriptionStatus()`，检查返回 `isSubscribed: false`

- [ ] **Step 2: 更新文档**

在项目文档中记录新增的云函数：

```markdown
## 云函数列表

### subscription

订阅管理云函数

**操作**:
- `subscribe`: 订阅每日提醒（需要 template_id）
- `unsubscribe`: 取消订阅
- `getStatus`: 查询订阅状态

**数据集合**: PushSubscription
```

- [ ] **Step 3: Commit**

```bash
git add docs/operations/
git commit -m "docs: document subscription cloud function"
```

---

## 验证标准

完成后必须通过：

1. `npm run build:mp-weixin` 构建成功
2. 微信开发者工具中无编译错误
3. 订阅管理页面功能正常
4. 控制台无 `FunctionName parameter could not be found` 错误
5. 云函数日志显示正常调用
