# Viewed Rankings Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the existing `viewRanking` cloud function to the frontend so "已阅榜单" count is tracked and displayed correctly, matching LeanSkill's approach.

**Architecture:** Cloud-based idempotent tracking via `viewedRankingDates` array in `users` collection. Frontend calls `viewRanking(date)` when viewing rankings, count displayed from profile data. Dead store code cleaned up.

**Tech Stack:** uni-app / Vue 3 / Pinia / WeChat Cloud Functions

---

## File Structure

| File | Responsibility |
|------|----------------|
| `cloudfunctions/userFunctions/index.js` | Fix viewRanking to accept date from client |
| `src/store/index.ts` | Clean up dead code, add recordRankingView helper |
| `src/pages/index/index.vue` | Record view when viewing today's ranking |
| `src/pages/history/detail/index.vue` | Record view when viewing historical ranking |

---

## Task 1: Fix cloud function viewRanking to accept date parameter

**Files:**
- Modify: `cloudfunctions/userFunctions/index.js` (lines 217-263)

**Context:** The cloud function hardcodes `today = new Date().toISOString().split('T')[0]` instead of reading `date` from `data`. This means viewing a historical ranking always records today's date.

- [ ] **Step 1: Update viewRanking handler**

Replace the `viewRanking` case (lines 217-263) with:

```javascript
      case 'viewRanking': {
        const { date } = data
        const rankingDate = date || new Date().toISOString().split('T')[0]

        if (!rankingDate) {
          return { success: false, error: 'Missing date' }
        }

        const userRes = await db.collection(usersCollection).where({
          _openid: openId
        }).get()

        if (userRes.data.length === 0) {
          return { success: false, error: 'User not found' }
        }

        const user = userRes.data[0]
        const viewedDates = user.viewedRankingDates || []

        if (viewedDates.includes(rankingDate)) {
          return {
            success: true,
            data: { count: viewedDates.length, isNewView: false }
          }
        }

        viewedDates.push(rankingDate)

        await db.collection(usersCollection).doc(user._id).update({
          data: {
            viewedRankingDates: viewedDates,
            totalViews: (user.totalViews || 0) + 1,
            lastActiveAt: new Date()
          }
        })

        return {
          success: true,
          data: { count: viewedDates.length, isNewView: true }
        }
      }
```

Key changes:
- Reads `date` from `data` (was hardcoded to `today`)
- Returns `count` (array length) — consistent with LeanSkill's API contract
- Simplified response format: `{ count, isNewView }`

- [ ] **Step 2: Redeploy cloud function**

Use MCP tool `manageFunctions` with `action: "updateFunctionCode"`, `functionName: "userFunctions"`, `functionRootPath: "d:/MyWork/LeanMind/LeanStartup/cloudfunctions"`.

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/userFunctions/index.js
git commit -m "fix(cloud): viewRanking accepts date param from client"
```

---

## Task 2: Clean up store dead code, add recordRankingView helper

**Files:**
- Modify: `src/store/index.ts`

**Context:** The store has dead code: `viewedCount` ref (line 23) and `incrementViewed` (line 27) are never used by any page. Remove them and add a `recordRankingView` helper that calls the API and updates local state.

- [ ] **Step 1: Add viewRanking import**

Add to the import on line 3:

```typescript
import { login as apiLogin, getProfile as apiGetProfile, updateProfile as apiUpdateProfile, viewRanking as apiViewRanking } from '@/api/modules/user'
```

- [ ] **Step 2: Remove dead code and add recordRankingView**

Remove line 23 (`const viewedCount = ref(0)`), line 27 (`const incrementViewed = () => viewedCount.value++`), and line 28 (`const setFavoritesCount = (n: number) => favoritesCount.value = n`).

Also remove `favoritesCount` ref (line 24) since it's not used by the store — it's managed locally in the profile page.

Add `recordRankingView` method after `updateUserInfo`:

```typescript
  const recordRankingView = async (date: string) => {
    if (!isLoggedIn.value) return
    try {
      const res = await apiViewRanking(date)
      if (res.success && res.data && typeof res.data.count === 'number') {
        if (userInfo.value) {
          userInfo.value.viewedRankingsCount = res.data.count
        }
      }
    } catch (e) {
      // Silent failure — view tracking should never block UX
      console.warn('[recordRankingView] Failed:', e)
    }
  }
```

- [ ] **Step 3: Update return statement**

Remove `viewedCount`, `incrementViewed`, `setFavoritesCount` from the return. Add `recordRankingView`:

```typescript
  return {
    userInfo,
    isLoggedIn,
    setUser,
    logout,
    fetchProfile,
    login,
    updateUserInfo,
    recordRankingView
  }
```

- [ ] **Step 4: Commit**

```bash
git add src/store/index.ts
git commit -m "refactor(store): remove dead code, add recordRankingView helper"
```

---

## Task 3: Record ranking view on index page (today)

**Files:**
- Modify: `src/pages/index/index.vue`

**Context:** When user opens the app and sees today's ranking, we should record the view for today's date.

- [ ] **Step 1: Add imports and record view**

Add imports after line 61 (`import { useCaseStore } from '@/store/case'`):

```typescript
import { useUserStore } from '@/store'
```

Add after `const store = useCaseStore()` (line 67):

```typescript
const userStore = useUserStore()
```

- [ ] **Step 2: Add onShow lifecycle to record view**

Add `onShow` import from `@dcloudio/uni-app`:

Change line 60 from:
```typescript
import { computed, onMounted } from 'vue'
```
to:
```typescript
import { computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
```

Add after the `onMounted` block (after line 81):

```typescript
onShow(() => {
  const today = new Date().toISOString().split('T')[0]
  userStore.recordRankingView(today)
})
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/index/index.vue
git commit -m "feat(index): record ranking view when viewing today's cases"
```

---

## Task 4: Record ranking view on history detail page

**Files:**
- Modify: `src/pages/history/detail/index.vue`

**Context:** When user opens a historical ranking detail, record the view for that date.

- [ ] **Step 1: Add imports**

Add after line 35 (`import { getDailyPick } from '@/api/modules/daily'`):

```typescript
import { useUserStore } from '@/store'
```

Add after line 39 (`const cases = ref<DailyCase[]>([])`):

```typescript
const userStore = useUserStore()
```

- [ ] **Step 2: Add view recording in onMounted**

In the `onMounted` callback (line 76-79), add view recording after `loadData()`:

```typescript
onMounted(() => {
  initDate()
  loadData()
  // Record view after date is initialized
  if (date.value) {
    userStore.recordRankingView(date.value)
  }
})
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/history/detail/index.vue
git commit -m "feat(history): record ranking view when viewing historical detail"
```

---

## Verification Steps

After completing all tasks:

1. **Cloud function**: Deploy updated `userFunctions` — verify `viewRanking` accepts `date` parameter

2. **Index page**: Open app as logged-in user → go to profile → "已阅榜单" should show 1 → refresh → still 1 (idempotent)

3. **History detail**: Go to history → tap a past ranking → go to profile → "已阅榜单" should increment

4. **Logged out**: Views should be silently skipped, no errors

5. **Build**: `npm run build:mp-weixin` succeeds

---

**Plan complete.** 4 tasks: cloud function fix → store cleanup → index page wiring → history detail wiring.
