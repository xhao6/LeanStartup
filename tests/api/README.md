# API 测试

通过 MCP `manageFunctions` 工具直接调用云函数 API，验证线上环境行为。

## 测试分类

### 无认证函数（可直接调用）
| 函数 | 说明 |
|------|------|
| getDailyPick | 获取每日精选，无需用户身份 |
| getCaseDetail | 获取案例详情，无需用户身份 |
| generateDailyPick | 生成精选，定时触发，幂等 |

### 需微信身份函数（需真实 wx context）
| 函数 | 说明 | 测试方式 |
|------|------|----------|
| toggleCollection | 收藏/取消收藏 | 需真实 openid，仅文档说明 |
| getUserCollections | 获取收藏列表 | 需真实 openid，仅文档说明 |
| trackEvent | 埋点事件追踪 | 需真实 openid，仅文档说明 |

### 内部调用函数
| 函数 | 说明 | 测试方式 |
|------|------|----------|
| subscribeMessage | 微信订阅消息推送 | 只能被 generateDailyPick 内部调用 |

## 运行方式

```bash
# 运行所有 API 测试
npm run test:api

# 运行指定测试
npx vitest run tests/api/getDailyPick.test.js

# 查看详细输出
npx vitest run tests/api/ --reporter=verbose
```

## 测试结果

- **14 passed** ✅（getDailyPick: 6, getCaseDetail: 5, generateDailyPick: 3）
- **5 skipped**（需微信身份，需人工在小程序端验证）

## 环境要求

- `.env` 中配置 CloudBase 环境变量（已有 `CLOUDBASE_ENV_ID`）
- 云函数已部署到线上环境
- Case 集合有已发布的测试数据

## 数据清理

测试后检查并清理测试数据：
- DailyPick 集合：删除测试日期记录
- Analytics 集合：删除测试 openid 记录
