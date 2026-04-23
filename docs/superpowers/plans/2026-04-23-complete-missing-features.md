# 补全未完成功能 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐案例详情页缺失区块（来源/故事/避坑/风险/收益信息）、修复个人中心联系客服功能。

**Architecture:** 纯前端变更。数据库字段已全部存在（`case_story`、`pitfalls`、`risk_tags`、`expected_revenue`、`cycle`、`tags`），只需扩展 TypeScript 接口 + 补充 UI 模板。无云函数改动。

**Tech Stack:** UniApp, Vue 3, TypeScript, TailwindCSS (utility classes)

---

## 项目文件结构

### 修改文件
- `src/composables/useCaseDetail.ts` — 扩展 CaseDetail 接口（+6 字段）
- `src/pages/case-detail/index.vue` — 补充 5 个缺失 UI 区块
- `src/pages/profile/index.vue` — 联系客服改用微信原生 button
- `src/pages/profile/helpers.ts` — openContact 改为 no-op（由原生 button 接管）
- `src/utils/constants.ts` — SUBSCRIBE_TEMPLATE_ID 已更新（✅ 完成）

### 测试文件
- `tests/unittest/composables/useCaseDetail.test.ts` — 验证新字段类型

---

## Task 1: 扩展 CaseDetail TypeScript 接口

**Files:**
- Modify: `src/composables/useCaseDetail.ts`

- [ ] **Step 1: 在 CaseDetail 接口中添加 6 个缺失字段**

在 `src/composables/useCaseDetail.ts` 的 `CaseDetail` 接口中，在 `resources` 字段后追加：

```typescript
  // 内容扩展字段（数据库已存在）
  expected_revenue?: string     // 预期收益，如 "5000+/月"
  cycle?: string                // 变现周期，如 "1-2周"
  case_story?: string           // 案例故事（300-800字）
  pitfalls?: string             // 避坑指南
  risk_tags?: string[]          // 风险标签
  tags?: string[]               // 眼睛标签（5个，2-6字）
```

Run: `npx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 2: 提交接口扩展**

```bash
git add src/composables/useCaseDetail.ts
git commit -m "feat: extend CaseDetail interface with 6 missing fields"
```

---

## Task 2: 详情页 — 来源信息行 + 案例故事

**Files:**
- Modify: `src/pages/case-detail/index.vue`

- [ ] **Step 1: 在标题和摘要之后、评分之前，插入来源信息行和案例故事区块**

在 `<!-- Score visualization -->` 注释之前，插入以下模板代码：

```html
      <!-- Source info row -->
      <view
        v-if="caseData.source_account || caseData.source_url"
        class="flex items-center justify-between mt-2 px-1"
      >
        <text class="text-sm" :style="{ color: '#4A4A68' }">
          📌 {{ caseData.source_account || '' }}
        </text>
        <text
          v-if="caseData.source_url"
          class="text-sm"
          :style="{ color: '#0369A1' }"
          @tap="openUrl(caseData.source_url)"
        >
          ↗ 阅读原文
        </text>
      </view>

      <!-- Case story (blue quote box) -->
      <view
        v-if="caseData.case_story"
        class="mt-3 rounded-xl p-4"
        :style="{
          backgroundColor: '#F0F9FF',
          border: '1px solid #BAE6FD'
        }"
      >
        <text class="text-sm font-semibold block mb-2" :style="{ color: '#0369A1' }">📖 案例故事</text>
        <text class="text-sm block leading-relaxed" :style="{ color: '#4A4A68' }">
          {{ caseData.case_story }}
        </text>
      </view>
```

- [ ] **Step 2: 验证模板渲染正常**

Run: `npx tsc --noEmit`
Expected: 无类型错误（case_story、source_url 已在接口中定义）

- [ ] **Step 3: 提交**

```bash
git add src/pages/case-detail/index.vue
git commit -m "feat(detail): add source info row and case story section"
```

---

## Task 3: 详情页 — 扩展基础信息 + 避坑指南 + 风险标签

**Files:**
- Modify: `src/pages/case-detail/index.vue`

- [ ] **Step 1: 在基础信息网格中添加「预期收益」和「变现周期」**

在 `<!-- Cost -->` 区块之后、`<!-- Source -->` 区块之前，插入：

```html
          <!-- Expected revenue -->
          <view class="flex items-center gap-2">
            <text class="text-sm" :style="{ color: '#F5A623' }">&#x1F4C8;</text>
            <view class="flex-1 min-w-0">
              <text class="text-[11px] block" :style="{ color: '#9B9A97' }">预期收益</text>
              <text class="text-sm truncate" :style="{ color: '#1A1A2E' }">{{ caseData.expected_revenue || '--' }}</text>
            </view>
          </view>

          <!-- Cycle -->
          <view class="flex items-center gap-2">
            <text class="text-sm" :style="{ color: '#F5A623' }">&#x23F0;</text>
            <view class="flex-1 min-w-0">
              <text class="text-[11px] block" :style="{ color: '#9B9A97' }">变现周期</text>
              <text class="text-sm truncate" :style="{ color: '#1A1A2E' }">{{ caseData.cycle || '--' }}</text>
            </view>
          </view>
```

注意：插入后网格变为 4 格（成本 / 预期收益 / 来源 / 变现周期 + 适合人群跨 2 列）。

- [ ] **Step 2: 在资源区块之后、底部操作栏之前，插入避坑指南和风险标签**

在 `<!-- Resources -->` 区块的 `</view>` 之后，添加：

```html
      <!-- Pitfall guide (orange warning box) -->
      <view
        v-if="caseData.pitfalls"
        class="mt-3 rounded-xl p-4"
        :style="{
          backgroundColor: '#FFF3E0',
          border: '1px solid #FFE0B2'
        }"
      >
        <text class="text-sm font-semibold block mb-2" :style="{ color: '#E65100' }">⚠️ 避坑指南</text>
        <text class="text-sm block leading-relaxed" :style="{ color: '#BF360C' }">
          {{ caseData.pitfalls }}
        </text>
      </view>

      <!-- Risk tags (red pills) -->
      <view
        v-if="caseData.risk_tags?.length"
        class="mt-3 flex flex-wrap gap-2"
      >
        <view
          v-for="(tag, i) in caseData.risk_tags"
          :key="i"
          class="inline-flex items-center rounded-full px-[10px] py-[4px]"
          :style="{ backgroundColor: '#FEE2E2' }"
        >
          <text class="text-[11px] font-semibold" :style="{ color: '#DC2626' }">{{ tag }}</text>
        </view>
      </view>
```

- [ ] **Step 3: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 4: 提交**

```bash
git add src/pages/case-detail/index.vue
git commit -m "feat(detail): add extended info, pitfalls, and risk tags"
```

---

## Task 4: 个人中心 — 联系客服改用微信原生按钮

**Files:**
- Modify: `src/pages/profile/index.vue`
- Modify: `src/pages/profile/helpers.ts`

- [ ] **Step 1: 在 profile/index.vue 模板中，将菜单渲染改为特殊处理客服项**

把菜单循环中的 `@tap="onMenuTap(item)"` 改为：对 `contact` 项使用原生 `<button open-type="contact">`，其余项保持 `@tap`。

找到模板中的菜单循环（约第 61-80 行）：

```html
      <view
        v-for="(item, index) in menuItems"
        :key="item.key"
        class="flex items-center"
        :class="{ 'border-b': index < menuItems.length - 1 }"
        style="padding: 16px 18px; border-bottom-color: #E8E6E1; border-bottom-width: 1px; border-bottom-style: solid"
        :style="index === menuItems.length - 1 ? { borderBottom: 'none' } : {}"
        @tap="onMenuTap(item)"
      >
        <text
          class="mr-3"
          style="width: 24px; text-align: center; font-size: 20px; color: #4A4A68"
        >{{ item.icon }}</text>
        <text
          class="flex-1"
          style="font-size: 15px; font-weight: 400; color: #1A1A2E"
        >{{ item.label }}</text>
        <text style="font-size: 14px; color: #9B9A97">›</text>
      </view>
```

替换为：

```html
      <!-- Contact item: native button -->
      <button
        v-if="item.action === 'contact'"
        :key="item.key + '-btn'"
        open-type="contact"
        class="flex items-center w-full text-left"
        :class="{ 'border-b': index < menuItems.length - 1 }"
        style="padding: 16px 18px; border-bottom-color: #E8E6E1; border-bottom-width: 1px; border-bottom-style: solid; background: transparent; border-left: none; border-right: none; border-top: none; border-radius: 0; font-family: inherit; font-size: inherit; line-height: inherit"
      >
        <text
          class="mr-3"
          style="width: 24px; text-align: center; font-size: 20px; color: #4A4A68"
        >{{ item.icon }}</text>
        <text
          class="flex-1"
          style="font-size: 15px; font-weight: 400; color: #1A1A2E"
        >{{ item.label }}</text>
        <text style="font-size: 14px; color: #9B9A97">›</text>
      </button>
      <!-- Regular menu items -->
      <view
        v-else
        :key="item.key"
        class="flex items-center"
        :class="{ 'border-b': index < menuItems.length - 1 }"
        style="padding: 16px 18px; border-bottom-color: #E8E6E1; border-bottom-width: 1px; border-bottom-style: solid"
        :style="index === menuItems.length - 1 ? { borderBottom: 'none' } : {}"
        @tap="onMenuTap(item)"
      >
        <text
          class="mr-3"
          style="width: 24px; text-align: center; font-size: 20px; color: #4A4A68"
        >{{ item.icon }}</text>
        <text
          class="flex-1"
          style="font-size: 15px; font-weight: 400; color: #1A1A2E"
        >{{ item.label }}</text>
        <text style="font-size: 14px; color: #9B9A97">›</text>
      </view>
```

注意：`v-for` 需要移到外层 `<template>` 标签上，因为 Vue 3 不允许 `v-for` + `v-if` 在同一元素。改为：

```html
      <template v-for="(item, index) in menuItems" :key="item.key">
        <!-- Contact item: native button -->
        <button
          v-if="item.action === 'contact'"
          open-type="contact"
          ...>
        </button>
        <!-- Regular items -->
        <view v-else ...>
        </view>
      </template>
```

- [ ] **Step 2: 在 profile/helpers.ts 中更新 openContact 为 no-op**

`handleMenuAction` 的 `contact` 分支已调用 `deps.openContact()`，但模板中客服按钮现在由原生接管，不会再触发 `onMenuTap`。保留 `openContact` 作为 fallback no-op 即可，无需改动 helpers.ts。

- [ ] **Step 3: 验证编译**

Run: `npx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 4: 提交**

```bash
git add src/pages/profile/index.vue
git commit -m "fix(profile): use native WeChat contact button for customer service"
```

---

## Task 5: 全量测试验证 + 提交

- [ ] **Step 1: 运行全部单元测试**

Run: `npx vitest run`
Expected: 366+ 测试全部通过（syncCaseData 预期失败除外）

- [ ] **Step 2: TypeScript 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: 提交 constants 更新（如尚未提交）**

```bash
git add src/utils/constants.ts
git commit -m "fix: set actual SUBSCRIBE_TEMPLATE_ID"
```

---

## 验证清单

- [ ] 详情页显示来源信息行（📌 来源 + ↗ 阅读原文）
- [ ] 详情页显示案例故事（蓝色引用框）
- [ ] 详情页基础信息 4 格（成本/预期收益/来源/变现周期）
- [ ] 详情页显示避坑指南（橙色警告框）
- [ ] 详情页显示风险标签（红色 pill）
- [ ] 个人中心「联系客服」点击打开微信客服会话
- [ ] SUBSCRIBE_TEMPLATE_ID 已设为实际值
- [ ] 全部单元测试通过
