# 每日精选冷却期机制设计文档

> 日期：2026-06-01
> 状态：已确认

## 概述

解决每日 Top3 选品在案例池耗尽后相邻日榜单完全重复的问题。用 **冷却期机制** 替代现有的 30 天全局去重 + 经典回顾兜底，保证候选池始终有足够案例，让加权评分系统自然轮换。

## 问题

当前选择逻辑在 `generateDailyPick/index.js`:

1. 查近 30 天 DailyPick → 构建 `recentlyUsedIds`
2. `freshCases = publishedCases - recentlyUsedIds`
3. 不足 3 个 → 经典回顾：从已用案例中按 `score_total` 降序填充

74 个 published 案例，近 30 天×3≈90 次选品已覆盖全部案例 → `freshCases = []` → 经典回顾每次都选相同的三个最高分案例（100011, 100057, 100049）→ 5-31 和 6-01 榜单完全重复。

## 方案选择

**选定：冷却期机制（方案 A）**

放弃的方案：
- 只修经典回顾排序：治标不治本，候选池仍可能空
- 双池混合：改造成本高，且为当前规模过度设计

## 设计

### 冷却期窗口：14 天

14 天是当前案例规模下的合理窗口：

| 指标 | 30天（当前） | 14天（选定） |
|------|------------|------------|
| 理论最大占用量 | 90 次 | 42 次 |
| 74 案例池剩余量 | 0 | ~32+ |
| 同分案例轮换 | ❌ | ✅ 加权评分自由竞争 |

### 算法变更

#### 变更点 1：缩短冷却窗口

`generateDailyPick/index.js:42`

```diff
- const thirtyDaysAgo = deps.getDaysAgoDate(30)
+ const fourteenDaysAgo = deps.getDaysAgoDate(14)
```

对应变量和注释同步更新。

#### 变更点 2：删除经典回顾兜底

`generateDailyPick/index.js:117-130`

删除以下整段：

```javascript
// 不足 3 个 → 经典回顾补充
if (selectedIds.length < 3) {
  const needCount = 3 - selectedIds.length
  const alreadySelectedIds = new Set(selectedIds)
  const classicCases = publishedCases
    .filter(c => recentlyUsedIds.has(String(c.id)) && !alreadySelectedIds.has(c.id))
    .sort((a, b) => b.score_total - a.score_total)

  const classicIds = classicCases
    .slice(0, needCount)
    .map(c => c.id)

  selectedIds = selectedIds.concat(classicIds)
}
```

#### 变更点 3：新增渐进放宽逻辑

在删除了经典回顾兜底后，增加冷却期渐进放宽，防止极小案例池场景出空榜单：

```javascript
// 候选池不足时的渐进放宽
function expandCandidatePool(publishedCases, coolingDays, deps) {
  // 从 14 天开始，逐步放宽到 21 天 → 30 天 → 不限
  const windows = [14, 21, 30, Infinity]
  for (const days of windows) {
    const cutoff = days === Infinity ? null : deps.getDaysAgoDate(days)
    const usedIds = cutoff ? /* 查 DailyPick */ : new Set()
    const pool = publishedCases.filter(c => !usedIds.has(String(c.id)))
    if (pool.length >= 5) return pool
  }
  return publishedCases.slice()
}
```

渐进放宽保证了：
- 正常情况（案例充足）：只走 14 天窗口
- 案例偏少：逐步扩展，不会直达"全部可用"
- 极端情况：最终回退到全部 published 案例

#### 完整数据流（变更后）

```
[1] 幂等检查
[2] 查近 14 天冷却期 case_ids
[3] 查所有 published 案例
[4] candidates = published - cooling
[5] if candidates < 5 → 渐进放宽（21天→30天→全部）
[6] filterByScoreRange(candidates)
[7] computeWeightedScore + selectDailyCases(3)
[8] 写入 DailyPick + 异步推送
```

### 无需变更的部分

- `selector.js` 的三个纯函数不变（computeWeightedScore / filterByScoreRange / selectDailyCases）
- `getDailyPick/index.js` 查询 API 不变
- 前端（store / page）不变
- DailyPick 集合的数据结构不变

## 测试策略

### 单元测试（现有文件 `tests/unittest/cloudfunctions/generateDailyPick.test.js`）

需修改/新增的测试：

| 测试 | 说明 |
|------|------|
| 修改"全部30天内已用过"测试 | 冷却期改为 14 天，预期行为不同 |
| 新增"正常14天空闲案例足够"测试 | 74案例，14天用掉~35个，剩余~39个可正常选 |
| 新增"冷却期内案例不会被重复选中"测试 | 断言冷却期内的 case_id 不在结果中 |
| 删除"经典回顾补充"测试 | 该逻辑已删除 |

### 集成测试

`tests/api/generateDailyPick.test.js` — 端到端触发一次，验证返回 3 个案例且非昨天重复的 3 个。

## 部署

改动仅涉及 `cloudfunctions/generateDailyPick/` 目录下的 `index.js` 和 `selector.js`。
