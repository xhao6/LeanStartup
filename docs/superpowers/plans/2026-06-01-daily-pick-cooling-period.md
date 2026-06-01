# 每日精选冷却期机制 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 14 天冷却期替代 30 天去重 + 经典回顾兜底，解决案例池耗尽后相邻日榜单完全重复的问题。

**Architecture:** 只改 `generateDailyPick/index.js`，不改 selector 纯函数。将 30 天去重窗口缩为 14 天冷却期，删除经典回顾兜底，新增候选池不足时的渐进放宽逻辑（14 天冷却期 → 全部 published）。

**Tech Stack:** Node.js 云函数（CloudBase Node SDK），Vitest 测试

---

## File Structure

| 文件 | 变更 | 职责 |
|------|------|------|
| `cloudfunctions/generateDailyPick/index.js` | 修改 | 缩短冷却期至 14 天 + 删除经典回顾 + 新增放宽逻辑 |
| `tests/unittest/cloudfunctions/generateDailyPick.test.js` | 修改 | 更新测试描述 + 新增冷却期扩展测试 |

---

## Task 1: 修改 index.js — 14 天冷却期 + 删除经典回顾 + 放宽逻辑

**Files:**
- Modify: `cloudfunctions/generateDailyPick/index.js:41-130`

### 1.1 缩短冷却期窗口（第 41-58 行）

将 30 天去重改为 14 天冷却期：

```diff
-     // 2. 获取最近 30 天已用的 case_ids（30 天去重限制）
-     const thirtyDaysAgo = deps.getDaysAgoDate(30)
+     // 2. 获取最近 14 天冷却期内已用的 case_ids
+     const coolingCutoff = deps.getDaysAgoDate(14)
      const { data: recentPicks } = await deps.collection('DailyPick')
-       .where({ date: cmd.gte(thirtyDaysAgo) })
+       .where({ date: cmd.gte(coolingCutoff) })
        .field('case_ids')
        .limit(100)
        .get()

-     const recentlyUsedIds = new Set()
+     const coolingIds = new Set()
      if (recentPicks) {
        for (const pick of recentPicks) {
          if (pick.case_ids) {
            for (const id of pick.case_ids) {
-             recentlyUsedIds.add(id)
+             coolingIds.add(String(id))
            }
          }
        }
      }
```

注意：`coolingIds.add(String(id))` 统一转字符串，与 filter 时的 `String(c.id)` 保持一致，避免类型不匹配导致去重失效。

### 1.2 修改候选池构建 + 新增放宽逻辑（第 97-99 行）

```diff
-     // 5. 过滤已用 + 分数区间过滤
-     const freshCases = publishedCases.filter(c => !recentlyUsedIds.has(String(c.id)))
-     const candidates = filterByScoreRange(freshCases)
+     // 5. 构建候选池（14 天冷却期 + 渐进放宽）
+     let freshCases = publishedCases.filter(c => !coolingIds.has(String(c.id)))
+     let candidates = filterByScoreRange(freshCases)
+     if (candidates.length < 5) {
+       // 候选池不足 → 放宽冷却限制，使用全部 published 案例
+       freshCases = publishedCases.slice()
+       candidates = filterByScoreRange(freshCases)
+     }
```

### 1.3 删除经典回顾兜底（第 117-130 行）

删除以下整段：

```diff
-     // 8. 不足 3 个 → 经典回顾补充
-     if (selectedIds.length < 3) {
-       const needCount = 3 - selectedIds.length
-       const alreadySelectedIds = new Set(selectedIds)
-       const classicCases = publishedCases
-         .filter(c => recentlyUsedIds.has(String(c.id)) && !alreadySelectedIds.has(c.id))
-         .sort((a, b) => b.score_total - a.score_total)
- 
-       const classicIds = classicCases
-         .slice(0, needCount)
-         .map(c => c.id)
- 
-       selectedIds = selectedIds.concat(classicIds)
-     }
```

### 1.4 验证修改后的完整文件

确认文件结构正确：

```javascript
async function doGenerateDailyPick(_event, deps) {
  // ...
  // 1. 幂等检查
  // 2. 获取最近 14 天冷却期内已用的 case_ids
  // 3. 查所有已发布案例
  // 4. 查询最近 7 天热度
  // 5. 构建候选池（14 天冷却期 + 渐进放宽）
  // 6. 计算加权评分
  // 7. 选择 3 个（标签分散 + 随机）
  // 8. 写入 DailyPick + 异步推送 + 日志
  // (没有经典的回顾步骤)
}
```

---

## Task 2: 更新单元测试

**Files:**
- Modify: `tests/unittest/cloudfunctions/generateDailyPick.test.js`

### 2.1 更新测试 3 的标题

```diff
-   it('新案例不足 → 经典回顾补充', async () => {
+   it('新案例不足 → 渐进放宽冷却期', async () => {
```

### 2.2 更新测试 6 的标题

```diff
-   it('有案例但全部30天内已用过 → 经典回顾补充', async () => {
+   it('有案例但全部14天冷却期内 → 渐进放宽冷却期', async () => {
```

### 2.3 验证现有测试全部通过

```bash
npx vitest run tests/unittest/cloudfunctions/generateDailyPick.test.js --reporter=verbose
```

预期结果：全部 17 个测试通过（10 个 DI 测试 + 7 个 selector 测试）

---

## Task 3: 新增冷却期专用测试

**Files:**
- Modify: `tests/unittest/cloudfunctions/generateDailyPick.test.js`

在 `describe('新选择逻辑')` 中追加两个测试：

### 3.1 14天冷却期内案例不会被选中

```javascript
it('14天冷却期内案例不会被选中（不含放宽）', async () => {
  const deps = createMockDeps()
  deps.collection._getResults.push(
    { data: [] },                      // today check
    { data: [{ case_ids: ['200'] }] }, // 14-day cooling: 200 在冷却期
    {                                   // published cases
      data: [
        makeCase(200, 9, { tags: ['A'] }),
        makeCase(201, 8, { tags: ['B'] }),
        makeCase(202, 7, { tags: ['C'] })
      ]
    },
    { data: [] }                       // Analytics
  )

  const result = await doGenerateDailyPick({}, deps)

  expect(result.success).toBe(true)
  expect(result.data.case_ids).toHaveLength(3)
  // 200 在冷却期，且 3 个 published ≥ 5 不会触发放宽
  // → 200 不应出现在选中结果中
  expect(result.data.case_ids).not.toContain('200')
})
```

### 3.2 候选池不足时放宽到全部 published

```javascript
it('候选池 < 5 时放宽到全部 published（含冷却期内案例）', async () => {
  const deps = createMockDeps()
  deps.collection._getResults.push(
    { data: [] },                      // today check
    { data: [{ case_ids: ['200'] }] }, // 14-day cooling
    {                                   // published cases（只有 3 个，不足 5）
      data: [
        makeCase(200, 9, { tags: ['A'] }),
        makeCase(201, 8, { tags: ['B'] }),
        makeCase(202, 7, { tags: ['C'] })
      ]
    },
    { data: [] }                       // Analytics
  )

  const result = await doGenerateDailyPick({}, deps)

  expect(result.success).toBe(true)
  // 放宽后 200 从冷却期回到候选池，应能被选中
  expect(result.data.case_ids).toContain('200')
  expect(result.data.case_ids).toHaveLength(3)
})
```

---

## Task 4: 运行全部测试并验证

**Files:**
- Run: 单元测试

```bash
npx vitest run tests/unittest/cloudfunctions/generateDailyPick.test.js --reporter=verbose
```

预期输出：19 个测试全部通过（10 个 DI + 7 个 selector + 2 个新增）

---

## Task 5: 可选 — 部署验证

通过云函数部署验证端到端行为：

```bash
# 部署 generateDailyPick 云函数
tcb fn deploy generateDailyPick
```

然后手动触发一次检查日志：

```bash
tcb fn invoke generateDailyPick
```

查看 SystemLog 集合确认生成成功，检查 DailyPick 集合确认 case_ids 不重复。
