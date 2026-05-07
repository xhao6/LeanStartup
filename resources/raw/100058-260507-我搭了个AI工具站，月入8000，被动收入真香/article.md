---
url: >-
  https://mp.weixin.qq.com/s?src=3&timestamp=1778126154&ver=1&signature=tu7Z7dFoN0UJrPIBvihajHjA3KplU2q3bbJ-GHCeDYPySaAebik0GQcl8K9TULHfjlKNVS46kG1Zjk7O3qzRvkKESOQs5nlbO2du1xV2huZMRYTXBMy2IO4OdkVczw*temM*TFFbyCr3DpX55JEtcfXzE9Qkt0vE6e-Vzt7GjyE%3D
title: 我搭了个AI工具站，月入8000，被动收入真香
description: 龙哥副业实战 · 第 19 篇\x0a\x0a兄弟们，先说结论：我搭了个AI工具站，月入8000，关键是还不用天天维护
author: 微信公众平台
coverImage: imgs/img-001-0.jpg
captured_at: '2026-05-07T01:42:42.743Z'
processed_at: '2026-05-07T05:30:59.450Z'
---

# 我搭了个AI工具站，月入8000，被动收入真香

> 龙哥副业实战 · 第 19 篇

兄弟们，先说结论： **我搭了个AI工具站，月入8000，关键是还不用天天维护。**

今天把我从0到1的完整搭建流程分享出来， **代码和配置全给你。**

---

## 01\. 什么是AI工具站？

**简单理解：** AI工具站就是一个网站，提供各种AI工具的功能，比如：

- AI写作
- AI绘画
- AI翻译
- AI代码生成
- AI数据分析

**商业模式：**

- 免费用户：有限次数，看广告
- 付费用户：无限次数，去广告
- 会员制：月费/年费

**核心优势：**

- 被动收入（用户自助使用）
- 边际成本低（服务100人和10000人成本差不多）
- 可复制（一个站成功，可以复制多个）
- 可积累（用户越多，收入越稳定）

---

## 02\. 我的数据，供你参考

**6个月数据复盘：**

| 月份 | 用户数 | 付费用户 | 收入 |
| --- | --- | --- | --- |
| 第1月 | 500 | 10 | ¥500 |
| 第2月 | 1500 | 35 | ¥1,800 |
| 第3月 | 3500 | 80 | ¥4,200 |
| 第4月 | 6000 | 150 | ¥7,500 |
| 第5月 | 8500 | 200 | ¥10,000 |
| 第6月 | 12000 | 280 | ¥8,000 |
| **合计** | **32000** | **755** | **¥32,000** |

**收入构成：**

- 会员订阅：60%（¥4,800/月）
- 广告收入：25%（¥2,000/月）
- 增值服务：15%（¥1,200/月）

**关键数据：**

- 转化率：2.3%（免费→付费）
- 客单价：¥30/月
- 获客成本：¥2/人
- 维护时间：每周5-10小时

---

## 03\. 技术架构：怎么搭建

### 技术选型

| 层级 | 技术 | 说明 |
| --- | --- | --- |
| 前端 | Next.js + Tailwind | 现代化React框架 |
| 后端 | Node.js + Express | 轻量级API服务 |
| 数据库 | PostgreSQL | 关系型数据库 |
| 缓存 | Redis | 会话和缓存 |
| 部署 | Vercel + Railway | 免费/低成本 |
| 支付 | Stripe | 国际支付 |

### 核心功能模块

```
AI工具站
├── 用户系统
│   ├── 注册登录
│   ├── 会员体系
│   └── 积分系统
├── AI功能
│   ├── AI写作
│   ├── AI绘画
│   ├── AI翻译
│   └── AI代码
├── 支付系统
│   ├── 订阅管理
│   ├── 支付网关
│   └── 发票系统
└── 管理系统
    ├── 用户管理
    ├── 数据统计
    └── 内容管理
```

---

## 04\. 完整搭建教程

### 第一步：初始化项目

```
# 创建项目
npx create-next-app@latest ai-tools-station
cd ai-tools-station

# 安装依赖
npm install @stripe/stripe-js @stripe/react-stripe-js
npm install prisma @prisma/client
npm install next-auth
npm install tailwindcss postcss autoprefixer
npm install @headlessui/react
npm install react-hot-toast

# 初始化Tailwind
npx tailwindcss init -p
```

### 第二步：配置数据库

```
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  subscription  Subscription?
  usage         Usage[]
}

model Subscription {
  id            String    @id @default(cuid())
  userId        String    @unique
  user          User      @relation(fields: [userId], references: [id])

  status        String    // active, canceled, past_due
  plan          String    // free, pro, enterprise
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Usage {
  id            String    @id @default(cuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])

  tool          String    // writing, image, translation, code
  tokens        Int
  createdAt     DateTime  @default(now())
}
```
```
# 生成数据库客户端
npx prisma generate

# 推送数据库结构
npx prisma db push
```

### 第三步：开发核心功能

```
// pages/api/ai/writing.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'

const prisma = new PrismaClient()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await getSession({ req })
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { prompt, type } = req.body

  // 检查用户权限和额度
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { subscription: true }
  })

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  // 检查使用额度
  const usage = await prisma.usage.findMany({
    where: {
      userId: user.id,
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30天内
      }
    }
  })

  const totalTokens = usage.reduce((sum, u) => sum + u.tokens, 0)
  const plan = user.subscription?.plan || 'free'

  // 免费用户限制
  if (plan === 'free' && totalTokens > 10000) {
    return res.status(403).json({
      error: 'Free tier limit exceeded',
      upgrade: true
    })
  }

  try {
    // 调用OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: \`You are a helpful ${type} assistant.\` },
        { role: 'user', content: prompt }
      ]
    })

    const result = completion.choices[0].message.content
    const tokens = completion.usage?.total_tokens || 0

    // 记录使用
    await prisma.usage.create({
      data: {
        userId: user.id,
        tool: 'writing',
        tokens: tokens
      }
    })

    res.status(200).json({ result, tokens })
  } catch (error) {
    console.error('AI API Error:', error)
    res.status(500).json({ error: 'AI service error' })
  }
}
```

### 第四步：集成支付系统

```
// lib/stripe.ts
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

export const plans = {
  free: {
    name: 'Free',
    price: 0,
    limits: { tokens: 10000, tools: ['writing'] }
  },
  pro: {
    name: 'Pro',
    price: 9.99,
    priceId: 'price_xxx',
    limits: { tokens: 100000, tools: ['writing', 'image', 'translation'] }
  },
  enterprise: {
    name: 'Enterprise',
    price: 29.99,
    priceId: 'price_yyy',
    limits: { tokens: 1000000, tools: ['all'] }
  }
}
```
```
// pages/api/stripe/checkout.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import { stripe, plans } from '@/lib/stripe'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await getSession({ req })
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { plan } = req.body
  const planConfig = plans[plan]

  if (!planConfig || plan === 'free') {
    return res.status(400).json({ error: 'Invalid plan' })
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      customer_email: session.user.email,
      line_items: [
        {
          price: planConfig.priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: \`${process.env.NEXT_PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}\`,
      cancel_url: \`${process.env.NEXT_PUBLIC_URL}/pricing\`
    })

    res.status(200).json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Stripe Error:', error)
    res.status(500).json({ error: 'Payment error' })
  }
}
```

### 第五步：部署上线

```
# 部署到Vercel
npm i -g vercel
vercel --prod

# 配置环境变量
# 在Vercel Dashboard中设置：
# - DATABASE_URL
# - OPENAI_API_KEY
# - STRIPE_SECRET_KEY
# - NEXTAUTH_SECRET
# - NEXTAUTH_URL
```

---

## 05\. 运营推广：怎么获客

### 渠道1：SEO优化

**关键词策略：**

- "AI写作工具"
- "AI绘画免费"
- "AI翻译在线"
- "AI代码生成"

**SEO优化技巧：**

- 每个工具单独页面
- 页面标题包含关键词
- 内容原创有价值
- 加载速度快

### 渠道2：社交媒体

**推广平台：**

- Twitter/X：技术社区
- Reddit：相关板块
- Product Hunt：产品发布
- Hacker News：技术社区

**内容策略：**

- 分享工具使用案例
- 发布教程和技巧
- 参与话题讨论
- 私信潜在用户

### 渠道3：内容营销

**内容类型：**

- 教程博客
- 使用案例
- 对比评测
- 行业报告

### 渠道4：合作推广

**合作方式：**

- 与博主合作
- 与工具站互换链接
- 与课程平台合作
- affiliate 推广

---

## 06\. 常见问题解答

继续滑动看下一个

龙哥AI副业

向上滑动看下一个
