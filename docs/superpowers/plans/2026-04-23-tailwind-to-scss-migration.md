# Tailwind CSS 迁移到纯 SCSS 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将微信小程序从 Tailwind CSS 迁移到纯 SCSS + 内联样式，解决 WXSS 编译错误

**Architecture:** 创建 SCSS 工具类系统替代 Tailwind 类，在 global.scss 中定义所有常用类，页面/组件中使用 SCSS 类或内联样式

**Tech Stack:** SCSS, 微信小程序 WXSS, Vue3

---

## 文件结构

```
src/
├── styles/
│   ├── design-tokens.scss    # 颜色/间距变量 (已有)
│   ├── utilities.scss        # 新建: SCSS 工具类
│   ├── global.scss           # 全局样式 (已有)
│   └── tailwind.css         # 删除: @tailwind 指令
├── components/              # 组件 (需迁移)
└── pages/                   # 页面 (需迁移)
```

---

## Tailwind 类映射表

### 布局类
| Tailwind | SCSS |
|----------|------|
| flex | .flex { display: flex } |
| flex-col | .flex-col { flex-direction: column } |
| flex-1 | .flex-1 { flex: 1 } |
| flex-wrap | .flex-wrap { flex-wrap: wrap } |
| flex-shrink-0 | .flex-shrink-0 { flex-shrink: 0 } |
| items-center | .items-center { align-items: center } |
| items-start | .items-start { align-items: flex-start } |
| justify-center | .justify-center { justify-content: center } |
| justify-between | .justify-between { justify-content: space-between } |
| gap-1 ~ gap-6 | .gap-1 { gap: 4px } 等 |
| grid | .grid { display: grid } |
| grid-cols-2 | .grid-cols-2 { grid-template-columns: repeat(2, 1fr) } |

### 间距类 (margin/padding)
| Tailwind | SCSS |
|----------|------|
| mt-1 | .mt-1 { margin-top: 4px } |
| mt-2 | .mt-2 { margin-top: 8px } |
| mt-3 | .mt-3 { margin-top: 12px } |
| mt-4 | .mt-4 { margin-top: 16px } |
| mt-6 | .mt-6 { margin-top: 24px } |
| mb-2 | .mb-2 { margin-bottom: 8px } |
| mb-5 | .mb-5 { margin-bottom: 20px } |
| mb-8 | .mb-8 { margin-bottom: 32px } |
| ml-2 | .ml-2 { margin-left: 8px } |
| ml-3 | .ml-3 { margin-left: 12px } |
| ml-auto | .ml-auto { margin-left: auto } |
| mr-2 | .mr-2 { margin-right: 8px } |
| mr-3 | .mr-3 { margin-right: 12px } |
| mx-4 | .mx-4 { margin-left: 16px; margin-right: 16px } |
| mx-5 | .mx-5 { margin-left: 20px; margin-right: 20px } |
| px-4 | .px-4 { padding-left: 16px; padding-right: 16px } |
| px-5 | .px-5 { padding-left: 20px; padding-right: 20px } |
| px-6 | .px-6 { padding-left: 24px; padding-right: 24px } |
| py-2 | .py-2 { padding-top: 8px; padding-bottom: 8px } |
| py-3 | .py-3 { padding-top: 12px; padding-bottom: 12px } |
| py-6 | .py-6 { padding-top: 24px; padding-bottom: 24px } |
| py-8 | .py-8 { padding-top: 32px; padding-bottom: 32px } |
| p-4 | .p-4 { padding: 16px } |
| p-5 | .p-5 { padding: 20px } |

### 文字类
| Tailwind | SCSS |
|----------|------|
| text-xs | .text-xs { font-size: 12px } |
| text-sm | .text-sm { font-size: 14px } |
| text-base | .text-base { font-size: 16px } |
| text-lg | .text-lg { font-size: 18px } |
| text-xl | .text-xl { font-size: 20px } |
| text-2xl | .text-2xl { font-size: 24px } |
| text-[28px] | 内联 style |
| font-medium | .font-medium { font-weight: 500 } |
| font-semibold | .font-semibold { font-weight: 600 } |
| font-bold | .font-bold { font-weight: 700 } |
| leading-relaxed | .leading-relaxed { line-height: 1.625 } |
| leading-none | .leading-none { line-height: 1 } |
| leading-snug | .leading-snug { line-height: 1.375 } |
| text-center | .text-center { text-align: center } |
| text-right | .text-right { text-align: right } |
| line-clamp-2 | .line-clamp-2 { overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2 } |
| truncate | .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap } |

### 尺寸类
| Tailwind | SCSS |
|----------|------|
| w-5 | .w-5 { width: 20px } |
| w-6 | .w-6 { width: 24px } |
| w-8 | .w-8 { width: 32px } |
| w-12 | .w-12 { width: 48px } |
| h-2 | .h-2 { height: 8px } |
| h-3 | .h-3 { height: 12px } |
| h-4 | .h-4 { height: 16px } |
| h-5 | .h-5 { height: 20px } |
| h-8 | .h-8 { height: 32px } |
| h-screen | .h-screen { height: 100vh } |
| w-screen | .w-screen { width: 100vw } |
| min-h-screen | .min-h-screen { min-height: 100vh } |
| min-w-0 | .min-w-0 { min-width: 0 } |
| max-w-* | 动态值用内联 style |
| w-2/5, w-3/4 | 内联 style（如 `style="{ width: '40%' }"`，分数类极少用内联更干净）|
| mt-0.5 | 内联 style（如 `style="{ marginTop: '2px' }"`，0.5 是极特殊值不值得建 SCSS 类）|

### 圆角/边框类
| Tailwind | SCSS |
|----------|------|
| rounded | .rounded { border-radius: 4px } |
| rounded-lg | .rounded-lg { border-radius: 8px } |
| rounded-xl | .rounded-xl { border-radius: 12px } |
| rounded-2xl | .rounded-2xl { border-radius: 16px } |
| rounded-full | .rounded-full { border-radius: 9999px } |
| rounded-t-* | 动态值用内联 style |

### 颜色类
| Tailwind | SCSS |
|----------|------|
| text-primary | .text-primary { color: #1A1A2E } |
| text-secondary | .text-secondary { color: #4A4A68 } |
| text-accent | .text-accent { color: #E94560 } |
| text-muted | .text-muted { color: #9B9A97 } |
| text-gold | .text-gold { color: #F5A623 } |
| text-white | .text-white { color: #FFFFFF } |
| bg-bg | .bg-bg { background-color: #FAFAF8 } |
| bg-surface | .bg-surface { background-color: #FFFFFF } |
| border-border | .border-border { border-color: #E8E6E1 } |
| text-[#hex] | .text-primary 等语义类，或内联 style |
| bg-[#hex] | .bg-surface 等语义类，或内联 style |
| border-[#hex] | 内联 style（如 `border: 1px solid #E8E6E1`）|
| bg-[#hex]/10 | 内联 rgba style（如 `backgroundColor: rgba(233,69,96,0.1)`）|

> **注意**：所有 `bg-[#...]`, `text-[#...]`, `border-[#...]` 任意值都会触发 WXSS escape 错误。
> 优先用已有的语义类（text-primary, bg-surface 等），不在 utilities.scss 中为每个十六进制颜色建类。
> 带 opacity modifier 的（如 `/10`）直接用内联 rgba。

### 位置类
| Tailwind | SCSS |
|----------|------|
| relative | .relative { position: relative } |
| absolute | .absolute { position: absolute } |
| fixed | .fixed { position: fixed } |
| sticky | .sticky { position: sticky } |
| top-0 | .top-0 { top: 0 } |
| right-0 | .right-0 { right: 0 } |
| bottom-0 | .bottom-0 { bottom: 0 } |
| left-0 | .left-0 { left: 0 } |
| inset-0 | .inset-0 { top: 0; right: 0; bottom: 0; left: 0 } |
| z-10 | .z-10 { z-index: 10 } |
| z-50 | .z-50 { z-index: 50 } |

### 组件类
| Tailwind | SCSS |
|----------|------|
| block | .block { display: block } |
| inline-block | .inline-block { display: inline-block } |
| inline-flex | .inline-flex { display: inline-flex } |
| hidden | .hidden { display: none } |
| overflow-hidden | .overflow-hidden { overflow: hidden } |
| space-y-2 | .space-y-2 > * + * { margin-top: 8px } |
| space-y-3 | .space-y-3 > * + * { margin-top: 12px } |
| col-span-2 | .col-span-2 { grid-column: span 2 / span 2 } |

### 动画类
| Tailwind | SCSS |
|----------|------|
| animate-pulse | .animate-pulse { animation: pulse 2s ease-in-out infinite } |
| transition-transform | .transition-transform { transition: transform 200ms } |

---

## 任务分解

### Task 1: 创建 SCSS 工具类文件

**Files:**
- Create: `src/styles/utilities.scss`
- Modify: `src/styles/global.scss`

- [ ] **Step 1: 创建 utilities.scss**

在 `src/styles/utilities.scss` 中创建完整的 SCSS 工具类，涵盖所有常用的 Tailwind 类。

- [ ] **Step 2: 更新 global.scss**

在 `src/styles/global.scss` 开头添加导入：
```scss
@use './design-tokens' as *;
@use './utilities' as *;
```

- [ ] **Step 3: 验证构建**
```bash
npm run dev:mp-weixin
```

- [ ] **Step 4: 提交**
```bash
git add src/styles/utilities.scss src/styles/global.scss
git commit -m "feat: add SCSS utility classes as Tailwind alternative"
```

---

### Task 2: 迁移组件

**Files:**
- Modify: `src/components/CaseCard.vue`
- Modify: `src/components/TagMor.vue`
- Modify: `src/components/ScoreBadge.vue`
- Modify: `src/components/ShareCard.vue`

- [ ] **Step 1: 迁移 CaseCard.vue**

将所有 Tailwind 类替换为 SCSS 类：
- bg-white -> bg-surface
- flex gap-3 -> flex gap-3
- flex-shrink-0 -> flex-shrink-0
- text-base -> text-base
- text-sm -> text-sm
- mt-1, mt-2, mt-3 -> mt-1, mt-2, mt-3
- rounded-2xl -> rounded-2xl
- p-4 -> p-4
- flex-wrap -> flex-wrap
- items-center -> items-center
- text-xs -> text-xs
- font-semibold -> font-semibold
- text-[11px] -> 内联 style
- px-[10px] py-[4px] -> 内联 style

- [ ] **Step 2: 迁移 TagMor.vue**

使用内联样式替代 Tailwind 类。

- [ ] **Step 3: 迁移 ScoreBadge.vue**

使用内联样式替代 Tailwind 类。

- [ ] **Step 4: 验证构建**
```bash
npm run dev:mp-weixin
```

- [ ] **Step 5: 提交**
```bash
git add src/components/
git commit -m "refactor: migrate components from Tailwind to SCSS"
```

---

### Task 3: 迁移页面

**Files:**
- Modify: `src/pages/index/index.vue`
- Modify: `src/pages/case-detail/index.vue`
- Modify: `src/pages/history/index.vue`
- Modify: `src/pages/favorites/index.vue`
- Modify: `src/pages/subscription/index.vue`
- Modify: `src/pages/about/index.vue`

- [ ] **Step 1: 迁移首页 index.vue**

替换所有 Tailwind 类为 SCSS 类。

- [ ] **Step 2: 迁移 case-detail/index.vue**

重点处理：
- text-[11px] -> text-xs 或内联 style
- rounded-[20px] -> rounded-xl 或内联 style
- leading-[1.4] -> leading-snug
- last:mb-0 -> 用 Vue `:class` 条件绑定（如 `:class="{ 'mb-0': $index === scoreDimensions.length - 1 }"`），不能用 SCSS :last-child 选择器

- [ ] **Step 3: 迁移其他页面**

- [ ] **Step 4: 验证构建**
```bash
npm run dev:mp-weixin
```

- [ ] **Step 5: 提交**
```bash
git add src/pages/
git commit -m "refactor: migrate pages from Tailwind to SCSS"
```

---

### Task 4: 清理 Tailwind 依赖

**Files:**
- Modify: `package.json`
- Delete: `tailwind.config.js`
- Delete: `src/styles/tailwind.css`
- Modify: `src/main.ts`
- Modify: `postcss.config.js`

- [ ] **Step 1: 移除依赖**
```bash
npm uninstall tailwindcss weapp-tailwindcss
```

- [ ] **Step 2: 更新 main.ts**
移除 tailwind.css 导入。

- [ ] **Step 3: 更新 postcss.config.js**

先读取当前 `postcss.config.js` 确认是否还有其他插件依赖 Tailwind/PostCSS。
如果有其他插件（如 autoprefixer），只移除 `weapp-tailwindcss` 插件行，保留其余配置。
如果没有其他插件，直接清空 plugins 对象或改为空配置。

- [ ] **Step 4: 删除配置文件**
```bash
rm tailwind.config.js src/styles/tailwind.css
```

- [ ] **Step 5: 最终验证**
```bash
npm run dev:mp-weixin
```

- [ ] **Step 6: 提交**
```bash
git add package.json package-lock.json postcss.config.js src/main.ts
git rm tailwind.config.js src/styles/tailwind.css
git commit -m "refactor: remove Tailwind CSS, use pure SCSS"
```

---

## 验证方式

1. `npm run dev:mp-weixin` - 构建成功
2. 微信开发者工具导入 `dist/dev/mp-weixin`
3. 检查所有页面样式是否正确
4. 检查控制台无 WXSS 编译错误

## 风险与注意事项

1. **内联样式 vs 类选择器**：动态值必须使用内联样式
2. **伪类选择器**：WXSS 不支持 :last-child，需用 Vue :class 绑定
3. **CSS 优先级**：内联样式优先级高于 class
4. **测试覆盖**：每个页面都需要手动验证样式

---

## NOT in scope

- **agreement.vue / privacy.vue** 的任意颜色值处理 — 已在 about.vue 上统一覆盖了迁移模式，agreement 和 privacy 结构完全相同，可复用相同的迁移逻辑，不作为独立任务
- **自动化测试** — 样式迁移依赖人工视觉检查，不写自动化样式测试
- **回滚方案** — 迁移以 git commit 为单位，单个 commit 失败可直接 `git revert`，不需要额外回滚机制

---

## What already exists

| 模块 | 文件 | 说明 |
|------|------|------|
| 设计变量 | `src/styles/design-tokens.scss` | 已有 Morandi 色、rank 渐变色、tag 色，不需要重建 |
| 全局样式 | `src/styles/global.scss` | 已有 `.score-badge`、`.case-card`、`.tag-mor-*`、`.animate-pulse`，Task 1 只需要补充新的 utility 类 |
| 组件 | `src/components/ShareCard.vue` | 已存在，Task 2 中迁移 |
| 页面 | `src/pages/ranking-detail/index.vue` | 新页面，不在此迁移范围内 |

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | Not applicable |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | Not applicable |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR (PLAN) | 2 architecture + 3 code quality issues, all resolved |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | Not applicable |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | Not applicable |

**UNRESOLVED:** 0
**VERDICT:** ENG CLEARED — ready to implement. Outside voice found 4 minor issues (2 addressed in plan, 2 accepted as implementation detail).

