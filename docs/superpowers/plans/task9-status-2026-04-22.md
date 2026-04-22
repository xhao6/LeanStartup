# Task 9: 同步22篇案例到 Case 集合 — 状态报告

## 已完成

1. **22篇 MD 文件字段补全** — cycle/risk_tags/tags 已添加到 `resources/processed/` 下所有文件
2. **syncCaseData 云函数代码审查** — 修复 3 个 Critical 问题，提交 `222cdc8`
3. **删除失效的 scripts/sync-to-db 目录** — 清理无用代码

## 解决方案确定

**问题根源**：云函数内的 `SESSIONTOKEN` 是 SCF 临时凭证，无法直接用于数据库 HTTP API 认证。之前尝试用原生 https 调数据库 API，但认证方式不对。

**正确方案**：使用 `@cloudbase/manager-node` SDK

根据 CloudBase 官方文档，在云函数环境中：

```javascript
const CloudBase = require('@cloudbase/manager-node')
const app = CloudBase.init({ envId: 'your-env-id' })
```

**关键点**：
- 无需传入 secretId/secretKey
- SDK 自动从云函数环境变量中获取凭证
- 使用 `app.database.runCommands()` 支持原生 MongoDB 命令

## 下一步行动

1. 修改 `cloudfunctions/syncCaseData/index.js`，使用 manager-node SDK
2. 更新 `cloudfunctions/package.json`，添加 `@cloudbase/manager-node` 依赖
3. 重新部署 syncCaseData 云函数
4. 调用云函数同步 22 条记录

## 历史尝试（废弃）

以下方案经验证不适用：
- ❌ 原生 https + Bearer token (sessionToken 不是 Bearer token)
- ❌ 原生 https + X-Tcb-Token header
- ❌ OAuth client_credentials (client type 不支持)
