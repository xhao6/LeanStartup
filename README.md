# CloudBase UniApp 跨平台应用 · AI 内容创作工具链

[![Powered by CloudBase](https://7463-tcb-advanced-a656fc-1257967285.tcb.qcloud.la/mcp/powered-by-cloudbase-badge.svg)](https://github.com/TencentCloudBase/CloudBase-AI-ToolKit)

基于 **UniApp + Vue 3 + TypeScript + 腾讯云开发（CloudBase）** 的全栈跨平台项目，适配 H5 / 微信小程序 / 支付宝小程序 / 抖音小程序 / App (iOS/Android)。

## 核心功能（实战部分）

**AI 内容创作工具链**（`scripts/`）——面向内容生产的自动化流水线：

| 模块 | 职责 |
|------|------|
| `article-discoverer` | 多渠道文章发现（搜狗微信等），关键词驱动选题 |
| `article-downloader` | 文章抓取与解析 |
| `article-processor` | 内容清洗 / Markdown 化 / 标签生成 / 爆款公式来源回填 |
| `reporter` | 产出汇总报告（含 vitest 单测） |
| `sync-to-db` | 结构化结果同步至云数据库 |

**多端应用**（`src/`）——UniApp + CloudBase 登录体系（手机/邮箱/密码/微信静默登录）+ 云函数 + 云数据库 + 云存储 + 静态托管。

**工程化**：分层架构（api / components / composables / pages / services / store）+ **三层测试**（`tests/unittest` · `tests/api` · `tests/e2e`）+ TypeScript 严格检查 + ESLint/Prettier。

> 本项目由 CloudBase AI ToolKit 引导搭建，应用层与工具链为本项目实战开发部分。

## 目录结构

```
├── src/               # UniApp 应用（Vue3 + TS）
│   ├── pages/         # 页面（首页 / 登录 / 个人中心等）
│   ├── components/    # 通用组件
│   ├── services/      # 业务服务
│   ├── api/           # 接口层
│   ├── store/         # 状态管理
│   ├── composables/   # 组合式函数
│   └── config/        # 应用配置
├── scripts/           # AI 内容创作工具链（Node/TS）
├── tests/             # 三层测试（unittest / api / e2e）
├── cloudfunctions/    # CloudBase 云函数
└── docs/              # 设计文档
```

## 快速开始

前置：Node.js 16+ · 腾讯云开发账号

```bash
npm install

# H5 开发
npm run dev:h5

# 微信小程序
npm run dev:mp-weixin
```

云开发配置：将 `src/config/index.ts` 中 `ENV_ID` 替换为你的环境 ID；按云开发控制台开启对应登录方式（匿名 / 密码 / 验证码 / 微信 openId）。

## 测试

```bash
npm run test          # 全量（unittest + api + e2e）
npm run test:unit     # 单测（vitest）
```

## 多端支持

H5 · 微信小程序 · 支付宝小程序 · 抖音小程序 · App (iOS/Android)（其余平台适配中）。
