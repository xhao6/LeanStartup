# Code Review Fixes (C1-C3, I1/I3/I6/I4)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 3 critical and 4 important issues identified in the code review of the last 3 days of changes.

**Architecture:** Each fix is isolated to specific files. Cloud function fixes require redeployment via MCP tools. Store and component fixes are local-only.

**Tech Stack:** WeChat Cloud Functions / Vue 3 / TypeScript / Pinia

---

## File Structure

| File | Responsibility | Issue |
|------|----------------|-------|
| `.gitignore` | Add .mcp.json to prevent secret leaks | C3 |
| `cloudfunctions/userFunctions/index.js` | Security & parameter fixes | C1, C2, I6 |
| `src/store/index.ts` | Convert isLoggedIn to computed | I1 |
| `src/pages/case-detail/components/ChecklistSection.vue` | Debounce timer cleanup | I3 |
| `src/types/case.d.ts` | CaseDetail interface definition | I4 |
| `src/pages/case-detail/index.vue` | Replace `any` with CaseDetail | I4 |
| `src/pages/case-detail/components/ScoreOverview.vue` | Replace `any` + add fallbacks | I4 |
| `src/pages/case-detail/components/BaseInfoGrid.vue` | Replace `any` | I4 |
| `src/pages/case-detail/components/FixedActionBar.vue` | Replace `any` | I4 |

---

## Task 1: Fix C3 — Add .mcp.json to .gitignore

**Files:**
- Modify: `.gitignore`

**Context:** `.mcp.json` contains a Google API key (`X-Goog-Api-Key`) and is tracked in git. This is a secret leak.

- [ ] **Step 1: Add .mcp.json to .gitignore**

Open `.gitignore` and add `.mcp.json` after the existing `.env` line:

```
.env
.mcp.json
```

- [ ] **Step 2: Remove .mcp.json from git tracking (keep local file)**

```bash
git rm --cached .mcp.json
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore .mcp.json
git commit -m "security: remove .mcp.json from git tracking"
```

---

## Task 2: Fix C1 + C2 + I6 — userFunctions Cloud Function

**Files:**
- Modify: `cloudfunctions/userFunctions/index.js`

**Context:**
- **C1:** Cloud function reads `OPENID` from client `event` payload, allowing identity forgery. Must use only `wxContext.OPENID`.
- **C2:** `login` handler never reads `userInfo` from `event.data`, so `wx.getUserProfile` data is silently discarded.
- **I6:** `updateProfile` reads `event.name` instead of `event.data.name`, `getFavorites` reads `event.limit` instead of `event.data.limit`. All due to inconsistent parameter access.

**How `callFunction` works (critical for understanding the fix):**

Client calls `callFunction('userFunctions', { type: 'login', data: { userInfo } })`. The wrapper passes this object as `data` to `uni.cloud.callFunction`. So in the cloud function:

```javascript
event = { type: 'login', data: { userInfo: { nickName: '...', avatarUrl: '...' } } }
// event.type = 'login'
// event.data = { userInfo: { nickName: '...', avatarUrl: '...' } }
```

- [ ] **Step 1: Rewrite the handler entry point**

Replace lines 62-65 (the `exports.main` entry) with:

```javascript
exports.main = async (event, context) => {
  const { type, data = {} } = event
  const wxContext = cloud.getWXContext()
  const openId = wxContext.OPENID

  if (!openId) {
    return { success: false, error: 'Missing OPENID' }
  }
```

Key changes:
- Removed `OPENID` from `event` destructuring — identity now comes exclusively from `wxContext.OPENID`
- Added `data = {}` destructuring with default — all handlers now read params from `data`
- Added OPENID presence check before any operation

- [ ] **Step 2: Update `initUserData` to accept optional userInfo**

Replace the `initUserData` function (lines 23-60) with:

```javascript
function initUserData(openId, userInfo) {
  const now = new Date()
  return {
    _openid: openId,
    name: (userInfo && userInfo.nickName) || generateNickname(),
    avatar: (userInfo && userInfo.avatarUrl) || '',
    gender: 0,
    country: '',
    province: '',
    city: '',
    language: 'zh_CN',

    role: 'user',
    status: 'active',
    level: 1,
    exp: 0,

    createdAt: now,
    lastLoginAt: now,
    loginCount: 1,
    lastActiveAt: now,

    vipLevel: 0,
    vipExpireAt: null,

    totalViews: 0,
    totalFavorites: 0,
    totalShares: 0,
    viewedRankingDates: [],

    theme: 'light',
    language: 'zh_CN',
    notifications: {
      enabled: true,
      types: ['update', 'promotion']
    }
  }
}
```

Key change: `name` and `avatar` now use `userInfo.nickName` / `userInfo.avatarUrl` when provided.

- [ ] **Step 3: Rewrite `login` handler to accept userInfo**

Replace the `login` case block (lines 69-101) with:

```javascript
      case 'login': {
        const { userInfo } = data

        const userRes = await db.collection(usersCollection).where({
          _openid: openId
        }).get()

        const now = new Date()

        if (userRes.data.length === 0) {
          const userData = initUserData(openId, userInfo)
          await db.collection(usersCollection).add({ data: userData })
          return {
            success: true,
            data: userData,
            isNewUser: true
          }
        } else {
          const user = userRes.data[0]
          const updateData = {
            lastLoginAt: now,
            loginCount: user.loginCount + 1,
            lastActiveAt: now
          }
          if (userInfo && userInfo.nickName) updateData.name = userInfo.nickName
          if (userInfo && userInfo.avatarUrl) updateData.avatar = userInfo.avatarUrl

          await db.collection(usersCollection).doc(user._id).update({
            data: updateData
          })
          return {
            success: true,
            data: { ...user, ...updateData },
            isNewUser: false
          }
        }
      }
```

Key changes:
- Reads `userInfo` from `data` (was not read at all before)
- New user: passes `userInfo` to `initUserData`
- Existing user: conditionally updates `name` and `avatar` from `userInfo`

- [ ] **Step 4: Fix `updateProfile` parameter access**

Replace the `updateProfile` case block (lines 127-163) with:

```javascript
      case 'updateProfile': {
        const { name, avatar } = data

        const userRes = await db.collection(usersCollection).where({
          _openid: openId
        }).get()

        if (userRes.data.length === 0) {
          return { success: false, error: 'User not found' }
        }

        const updateData = {
          lastActiveAt: new Date()
        }

        if (name !== undefined) {
          updateData.name = name
        }

        if (avatar !== undefined) {
          updateData.avatar = avatar
        }

        await db.collection(usersCollection).doc(userRes.data[0]._id).update({
          data: updateData
        })

        return {
          success: true,
          data: {
            ...userRes.data[0],
            ...updateData
          }
        }
      }
```

Key change: `const { name, avatar } = data` instead of `const { name, avatar } = event`.

- [ ] **Step 5: Fix `getFavorites` parameter access**

In the `getFavorites` case, change line 167 from:

```javascript
        const limit = event.limit || 100
```

to:

```javascript
        const limit = data.limit || 100
```

- [ ] **Step 6: Verify the complete rewritten file**

The final `exports.main` should look like this — verify no references to `event.OPENID`, `event.name`, `event.limit`, or `event.avatar` remain:

```javascript
exports.main = async (event, context) => {
  const { type, data = {} } = event
  const wxContext = cloud.getWXContext()
  const openId = wxContext.OPENID

  if (!openId) {
    return { success: false, error: 'Missing OPENID' }
  }

  try {
    switch (type) {
      case 'login': { ... }       // reads from data.userInfo
      case 'getProfile': { ... }  // no data params needed
      case 'updateProfile': {     // reads from data.name, data.avatar
        const { name, avatar } = data
        ...
      }
      case 'getFavorites': {      // reads from data.limit
        const limit = data.limit || 100
        ...
      }
      case 'viewRanking': { ... } // no data params needed (uses server date)
      default: ...
    }
  } catch (err) { ... }
}
```

- [ ] **Step 7: Redeploy cloud function**

```bash
# Deploy via MCP tool or WeChat developer tools
```

Use MCP tool: `manageFunctions` with `action: "updateFunctionCode"`, `functionName: "userFunctions"`, `functionRootPath: "d:/MyWork/LeanMind/LeanStartup/cloudfunctions"`.

- [ ] **Step 8: Commit**

```bash
git add cloudfunctions/userFunctions/index.js
git commit -m "fix(cloud): remove OPENID from event, fix param access, persist userInfo on login"
```

---

## Task 3: Fix I1 — Convert isLoggedIn to computed

**Files:**
- Modify: `src/store/index.ts`

**Context:** `isLoggedIn` is a `ref(false)` set independently alongside `userInfo`. If one updates without the other, they desync. Making `isLoggedIn` a `computed` derived from `userInfo` eliminates the dual state.

- [ ] **Step 1: Add `computed` import and convert `isLoggedIn`**

Change line 2 from:

```typescript
import { ref } from 'vue'
```

to:

```typescript
import { ref, computed } from 'vue'
```

Change line 22 from:

```typescript
const isLoggedIn = ref(false)
```

to:

```typescript
const isLoggedIn = computed(() => userInfo.value !== null)
```

- [ ] **Step 2: Remove manual `isLoggedIn` assignments**

Remove all `isLoggedIn.value = ...` lines in the store:

1. In `setUser` (line 26): Remove `isLoggedIn.value = !!info`, keep only `userInfo.value = info`:
   ```typescript
   const setUser = (info: typeof userInfo.value) => { userInfo.value = info }
   ```

2. In `logout` (line 29): Remove `isLoggedIn.value = false`, keep only `userInfo.value = null`:
   ```typescript
   const logout = () => { userInfo.value = null }
   ```

3. In `fetchProfile` (line 47): Remove `isLoggedIn.value = true` (it's set automatically when `userInfo.value` is assigned on line 39).

4. In `login` (line 85): Remove `isLoggedIn.value = true` (it's set automatically when `userInfo.value` is assigned on line 77).

- [ ] **Step 3: Commit**

```bash
git add src/store/index.ts
git commit -m "fix(store): convert isLoggedIn to computed to prevent state desync"
```

---

## Task 4: Fix I3 — ChecklistSection debounce timer cleanup

**Files:**
- Modify: `src/pages/case-detail/components/ChecklistSection.vue`

**Context:** The `debounceTimer` is never cleared on component unmount. If the user navigates away while a debounce is pending, the timeout fires on a stale component context.

- [ ] **Step 1: Add `onBeforeUnmount` import and cleanup**

Change line 25 from:

```typescript
import { ref, computed, onMounted } from 'vue'
```

to:

```typescript
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
```

Add this after the `debounceTimer` declaration (after line 60):

```typescript
onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/case-detail/components/ChecklistSection.vue
git commit -m "fix(checklist): clean up debounce timer on component unmount"
```

---

## Task 5: Fix I4 — Define CaseDetail type, replace `any`

**Files:**
- Create: `src/types/case.d.ts`
- Modify: `src/pages/case-detail/index.vue`
- Modify: `src/pages/case-detail/components/ScoreOverview.vue`
- Modify: `src/pages/case-detail/components/BaseInfoGrid.vue`
- Modify: `src/pages/case-detail/components/FixedActionBar.vue`

**Context:** All case-detail components use `any` for their `caseData`/`detail` prop. The data shape is well-known and should be typed.

- [ ] **Step 1: Create `src/types/case.d.ts`**

```typescript
export interface CaseDetail {
  id: string
  title: string
  source_account?: string
  source_url?: string
  tags?: string[]
  summary?: string
  story?: string
  score_total: number
  score_feasibility: number
  score_profit: number
  score_timeliness: number
  score_detail: number
  score_fitness: number
  cost?: string
  expected_revenue?: string
  cycle?: string
  suitable_for?: string
  steps?: Array<{ step: string } | string>
  tools?: Array<{ name: string; desc: string }>
  pitfalls?: string
  risk_tags?: string[]
  image?: string
  progress?: Record<string, boolean>
}
```

- [ ] **Step 2: Update `case-detail/index.vue`**

Add import after existing imports (after line 96):

```typescript
import type { CaseDetail } from '@/types/case'
```

Change line 98 from:

```typescript
const detail = ref<any>({})
```

to:

```typescript
const detail = ref<Partial<CaseDetail>>({})
```

- [ ] **Step 3: Update `ScoreOverview.vue`**

Add import and replace prop type. Change the entire `<script setup>` block (lines 47-49) to:

```typescript
<script setup lang="ts">
import type { CaseDetail } from '@/types/case'

defineProps<{ caseData: Partial<CaseDetail> }>()
</script>
```

Also update the template to guard against undefined scores. Change each `caseData.score_*` in the template to use fallback `|| 0`:

```vue
<view class="dim-fill" :style="{ width: `${((caseData.score_feasibility || 0) / 3) * 100}%` }"></view>
```

```vue
<text class="dim-value">{{ caseData.score_feasibility || 0 }}/3</text>
```

Apply the same `|| 0` pattern to all 5 score dimensions (feasibility, profit, timeliness, detail, fitness) and to `score_total`:

```vue
<text class="score-number">{{ caseData.score_total || 0 }}</text>
```

The 5 dimension rows should become:

```vue
      <view class="dim-item">
        <text class="dim-label">落地可行</text>
        <view class="dim-track">
          <view class="dim-fill" :style="{ width: `${((caseData.score_feasibility || 0) / 3) * 100}%` }"></view>
        </view>
        <text class="dim-value">{{ caseData.score_feasibility || 0 }}/3</text>
      </view>
      <view class="dim-item">
        <text class="dim-label">收益潜力</text>
        <view class="dim-track">
          <view class="dim-fill" :style="{ width: `${((caseData.score_profit || 0) / 2) * 100}%` }"></view>
        </view>
        <text class="dim-value">{{ caseData.score_profit || 0 }}/2</text>
      </view>
      <view class="dim-item">
        <text class="dim-label">时间时效</text>
        <view class="dim-track">
          <view class="dim-fill" :style="{ width: `${((caseData.score_timeliness || 0) / 2) * 100}%` }"></view>
        </view>
        <text class="dim-value">{{ caseData.score_timeliness || 0 }}/2</text>
      </view>
      <view class="dim-item">
        <text class="dim-label">实操细节</text>
        <view class="dim-track">
          <view class="dim-fill" :style="{ width: `${((caseData.score_detail || 0) / 2) * 100}%` }"></view>
        </view>
        <text class="dim-value">{{ caseData.score_detail || 0 }}/2</text>
      </view>
      <view class="dim-item">
        <text class="dim-label">人群适配</text>
        <view class="dim-track">
          <view class="dim-fill" :style="{ width: `${((caseData.score_fitness || 0) / 1) * 100}%` }"></view>
        </view>
        <text class="dim-value">{{ caseData.score_fitness || 0 }}/1</text>
      </view>
```

- [ ] **Step 4: Update `BaseInfoGrid.vue`**

Change the `<script setup>` block (lines 42-44) to:

```typescript
<script setup lang="ts">
import type { CaseDetail } from '@/types/case'

defineProps<{ caseData: Partial<CaseDetail> }>()
</script>
```

- [ ] **Step 5: Update `FixedActionBar.vue`**

Add import and update prop type. Change lines 18-21 from:

```typescript
const props = defineProps<{
  caseId: string
  detail?: any
}>()
```

to:

```typescript
import type { CaseDetail } from '@/types/case'

const props = defineProps<{
  caseId: string
  detail?: Partial<CaseDetail>
}>()
```

- [ ] **Step 6: Build to verify**

```bash
npm run build:mp-weixin
```

Expected: Build succeeds with no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/types/case.d.ts src/pages/case-detail/index.vue src/pages/case-detail/components/ScoreOverview.vue src/pages/case-detail/components/BaseInfoGrid.vue src/pages/case-detail/components/FixedActionBar.vue
git commit -m "fix(types): add CaseDetail interface, replace any in case-detail components"
```

---

## Verification Steps

After completing all tasks:

1. **C1 verification**: Check `cloudfunctions/userFunctions/index.js` — no `OPENID` in event destructuring, only `wxContext.OPENID`.

2. **C2 verification**: Login flow — open profile page, tap "点击登录", authorize wx.getUserProfile. Check database `users` collection — the `name` and `avatar` fields should reflect the WeChat profile data.

3. **C3 verification**: Run `git ls-files | grep .mcp.json` — should return nothing.

4. **I1 verification**: Login and logout in profile page. The UI should correctly show/hide the edit icon and user info based on `isLoggedIn`.

5. **I3 verification**: Open a case with steps, toggle a step, immediately navigate back. No console errors about state updates on unmounted component.

6. **I6 verification**: Edit nickname in profile page. The new nickname should persist after page refresh.

7. **I4 verification**: `npm run build:mp-weixin` succeeds. No TypeScript errors in case-detail components.

---

**Plan complete.** 7 issues fixed across 9 files. Tasks are ordered by dependency: C3 first (git tracking), then cloud function (C1+C2+I6 together), then local-only fixes (I1, I3, I4).
