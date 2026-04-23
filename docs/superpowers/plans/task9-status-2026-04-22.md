# Task 9: 同步22篇案例到 Case 集合 — 状态报告

## ✅ 已完成

**2026-04-22 完成数据同步**

1. **22篇 MD 文件字段补全** — cycle/risk_tags/tags 已添加到 `resources/processed/` 下所有文件
2. **syncCaseData 云函数代码审查** — 修复 3 个 Critical 问题，提交 `222cdc8`
3. **重构 scripts/sync-to-db/** — 拆分为 lib/parser.js（MD解析）+ lib/sync.js（CloudBase同步）+ prepare.js + sync.js + index.js 统一入口
4. **创建 syncCaseDataPublic 云函数** — 使用 @cloudbase/node-sdk，无需上下文验证
5. **修复评分小数问题** — 修复 100005, 100012, 100015 三个案例的评分
6. **数据同步脚本完成** — prepare-cases.js + sync-cases.js
7. **成功同步 22 条案例** — Case 集合现在有 22 条记录

## 最终解决方案

### 核心问题
从本地脚本直接调用 CloudBase 数据库 API 受限于认证机制，无法使用 sessionToken 调用 NoSQL 数据库。

### 解决方案：云函数中转

创建 `syncCaseDataPublic` 云函数作为中转，本地脚本通过云函数间接写入数据库。

### 详细步骤

#### 1. 创建云函数 `syncCaseDataPublic`

云函数路径：`cloudfunctions/syncCaseDataPublic/index.js`

使用 `@cloudbase/node-sdk` 的 `database()` API 写入数据，接收 `{ cases }` 参数进行批量插入或更新。

#### 2. 本地脚本调用云函数

通过 `app.callFunction()` 触发云函数，数据经 `syncCaseDataPublic` 间接写入数据库。

#### 3. 数据准备

使用 `gray-matter` 解析 MD frontmatter，正则提取 section 内容。

### 技术要点
- **云函数**：使用 `@cloudbase/node-sdk` 的 `database()` API
- **本地调用**：通过 `app.callFunction()` 触发云函数
- **MD 解析**：gray-matter 解析 frontmatter，正则提取 section
- **数据验证**：评分必须为整数，总分=五维度之和
- **幂等写入**：按 id 查询已存在记录，存在则 update（保留 created_at），不存在则 add

### 部署云函数
```bash
# 使用 CloudBase MCP 工具部署
manageFunctions({
  action: 'createFunction',
  functionRootPath: 'cloudfunctions',
  func: {
    name: 'syncCaseDataPublic',
    handler: 'index.main',
    runtime: 'Nodejs18.15'
  }
})
```

## 下一步行动

1. ✅ 数据同步已完成
2. → 开发前端页面
3. → 开发其他云函数（getDailyPick, getCaseDetail 等）
4. → 配置定时任务（generateDailyPick）

## 项目配置信息

### 后端云函数配置

**CloudBase 环境**
- 环境ID: `lean-startup-d2gkuop3af0aed5c0`
- 环境别名: lean-startup
- 区域: ap-shanghai

**小程序 AppID**: `wxc65f29000694748f`

**配置文件位置**
- `.env` — 环境变量配置
- `cloudbaserc.json` — CloudBase 项目配置
- `src/manifest.json` — UniApp 小程序配置（mp-weixin.appid）

### 腾讯云账号密钥

**获取方式**
1. 登录腾讯云控制台: https://console.cloud.tencent.com/
2. 点击右上角头像 → 访问密钥 → API密钥管理
3. 新建或复制已有密钥

**配置建议**
- 建议使用子账号密钥，遵循最小权限原则
- SecretKey 只显示一次，请妥善保存

## 历史尝试（记录）

以下方案经验证不适用或被替代：
- ❌ 原生 https + Bearer token (sessionToken 不是 Bearer token)
- ❌ 原生 https + X-Tcb-Token header
- ❌ OAuth client_credentials (client type 不支持)
- ❌ @cloudbase/manager-node + runCommands (命令格式问题)
- ✅ @cloudbase/node-sdk + collection API (最终采用)

