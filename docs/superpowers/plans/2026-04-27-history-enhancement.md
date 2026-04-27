# History 页面增强计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development

**Goal:** 将 LeanStartup 历史榜单页面增强到 LeanSkill 的完善程度

**Architecture:** 在现有 `src/pages/history/index.vue` 基础上，适配 LeanSkill 的更丰富展示逻辑

---

## Task 1: 增强案例名称显示 (getCaseDisplay)

**Files:**
- Modify: `src/pages/history/index.vue:137-141`

- [ ] **Step 1: 添加 score_total 显示**

LeanSkill 的 `getSkillDisplay` 会显示 `skill.value`（技能价值），LeanStartup 应该显示 `score_total`。

```typescript
// 替换 getCaseDisplay 函数
const getCaseDisplay = (caseId: string): string => {
  const caseItem = store.getCaseById(caseId)
  if (!caseItem) return '加载中...'
  const title = caseItem.title || '未知案例'
  // 如果有评分，显示 "案例名 (评分)"
  if (caseItem.score_total) {
    return `${title} (${caseItem.score_total}分)`
  }
  return title
}
```

- [ ] **Step 2: 提交**

```bash
git add src/pages/history/index.vue && git commit -m "feat(history): 显示案例评分"
```

---

## Task 2: 添加多行文字截断支持

**Files:**
- Modify: `src/pages/history/index.vue:332-339`

- [ ] **Step 1: 更新 CSS 支持多行截断**

当前使用 `white-space: nowrap` 只支持单行截断，LeanSkill 使用 `-webkit-line-clamp: 2` 支持多行。

```css
/* 替换 .history-name 的样式 */
.history-name {
  font-size: 15px;
  font-weight: 500;
  color: #1A1A2E;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.4;
}
```

- [ ] **Step 2: 提交**

```bash
git add src/pages/history/index.vue && git commit -m "feat(history): 支持案例名称多行截断"
```

---

## Task 3: 验证构建

- [ ] **Step 1: 运行构建**

```bash
npm run build:mp-weixin 2>&1 | tail -5
```

Expected: `DONE  Build complete.`
