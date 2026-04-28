# User Authentication Infrastructure

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build user authentication infrastructure including user API module, enhanced user store, and userFunctions cloud function for profile management and favorites operations.

**Architecture:** CloudBase NoSQL for users/favorites collections, Pinia store for client state, uni.cloud.callFunction for cloud function invocation.

**Tech Stack:** CloudBase NoSQL / Pinia / uni-app / TypeScript

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/api/modules/user.ts` | User API layer (login, getProfile, updateProfile, getFavorites) |
| `src/store/index.ts` | Enhanced user store with login/fetchProfile/updateUserInfo |
| `cloudfunctions/userFunctions/index.js` | Cloud function for user operations and favorites sync |
| `cloudfunctions/userFunctions/package.json` | Cloud function dependencies |

---

## Task 1: Create User API Module

**Files:**
- Create: `src/api/modules/user.ts`

- [ ] **Step 1: Create the user API module**

```typescript
// src/api/modules/user.ts
import { callFunction } from '../core/cloud'

/**
 * User Login
 * Creates or updates user record in cloud database
 * @param data.userInfo Optional WeChat user profile (nickName, avatarUrl)
 */
export const login = async (data?: { userInfo: { nickName?: string; avatarUrl?: string } }) => {
  try {
    const res = await callFunction('userFunctions', {
      type: 'login',
      data
    })
    return res
  } catch (err) {
    console.error('Login failed', err)
    throw err
  }
}

/**
 * Get User Profile
 * Fetches current user info from cloud database
 */
export const getProfile = async () => {
  return callFunction('userFunctions', { type: 'getProfile' })
}

/**
 * Update User Profile
 * @param data.name New nickname (optional)
 * @param data.avatar New avatar URL (optional)
 */
export const updateProfile = async (data: { name?: string; avatar?: string }) => {
  return callFunction('userFunctions', {
    type: 'updateProfile',
    data
  })
}

/**
 * Get Favorites from Cloud
 * @param params.limit Maximum number of favorites to return (default 100)
 */
export const getFavorites = async (params?: { limit?: number }) => {
  return callFunction('userFunctions', {
    type: 'getFavorites',
    data: params || {}
  })
}

/**
 * Record Ranking View (idempotent)
 * @param date Ranking date in YYYY-MM-DD format
 */
export const viewRanking = async (date: string) => {
  return callFunction('userFunctions', {
    type: 'viewRanking',
    data: { date }
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/api/modules/user.ts
git commit -m "feat(api): add user API module with login/profile/favorites"
```

---

## Task 2: Create Cloud Function - userFunctions

**Files:**
- Create: `cloudfunctions/userFunctions/index.js`
- Create: `cloudfunctions/userFunctions/package.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "userFunctions",
  "version": "1.0.0",
  "description": "User management and favorites operations",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

- [ ] **Step 2: Create the cloud function**

```javascript
// cloudfunctions/userFunctions/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

const COLLECTIONS = {
  users: process.env.USERS_COLLECTION || 'users',
  favorites: process.env.FAVORITES_COLLECTION || 'favorites'
}

// Random nickname generator: Tech-style adjective + noun + 4-char code
const NICK_ADJECTIVES = [
  '量子', '星际', '赛博', '元界', '深空',
  '虚拟', '智能', '云端', '算法', '数据',
  '神经', '脉冲', '极光', '混沌', '秩序',
  '破晓', '无垠', '静默', '狂想', '硬核'
]
const NICK_NOUNS = [
  '架构师', '工程师', '探索者', '领航员', '观测者',
  '执行者', '开发者', '建造者', '漫游者', '守卫者',
  '先驱', '行者', '使者', '使徒', '哨兵'
]
const NICK_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateNickname() {
  const adj = NICK_ADJECTIVES[Math.floor(Math.random() * NICK_ADJECTIVES.length)]
  const noun = NICK_NOUNS[Math.floor(Math.random() * NICK_NOUNS.length)]
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += NICK_CHARS[Math.floor(Math.random() * NICK_CHARS.length)]
  }
  return `${adj}的${noun}-${code}`
}

// Initialize user data with complete schema
function initUserData(openid, userInfo = {}) {
  const now = db.serverDate()
  return {
    _openid: openid,
    name: (userInfo.nickName || userInfo.name) || generateNickname(),
    avatar: (userInfo.avatarUrl || userInfo.avatar) || '',
    gender: userInfo.gender || 0,
    country: userInfo.country || '',
    province: userInfo.province || '',
    city: userInfo.city || '',
    language: userInfo.language || 'zh_CN',
    role: 'user',
    status: 'active',
    level: 1,
    exp: 0,
    createdAt: now,
    lastLoginAt: now,
    loginCount: 1,
    lastActiveAt: now,
    vipLevel: 'free',
    vipExpireAt: null,
    stats: {
      totalViews: 0,
      totalFavorites: 0,
      totalShares: 0,
      viewedRankingDates: []
    },
    preferences: {
      theme: 'auto',
      language: 'zh',
      notifications: true
    }
  }
}

exports.main = async (event, context) => {
  const { type, data } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  if (!openid) {
    return { success: false, message: 'Missing OPENID' }
  }

  const usersCollection = db.collection(COLLECTIONS.users)
  const favoritesCollection = db.collection(COLLECTIONS.favorites)

  try {
    switch (type) {
      case 'login': {
        const { userInfo } = data || {}
        const { data: existingUsers } = await usersCollection.where({ _openid: openid }).get()

        let userData
        if (existingUsers.length > 0) {
          userData = existingUsers[0]
          await usersCollection.doc(userData._id).update({
            data: {
              lastLoginAt: db.serverDate(),
              loginCount: db.command.inc(1),
              lastActiveAt: db.serverDate(),
              ...(userInfo && userInfo.nickName ? { name: userInfo.nickName } : {}),
              ...(userInfo && userInfo.avatarUrl ? { avatar: userInfo.avatarUrl } : {})
            }
          })
        } else {
          const newUserData = initUserData(openid, userInfo)
          const res = await usersCollection.add({ data: newUserData })
          userData = { _id: res._id, ...newUserData }
        }

        return { success: true, data: userData }
      }

      case 'getProfile': {
        const { data: users } = await usersCollection.where({ _openid: openid }).get()
        if (users.length > 0) {
          const user = users[0]
          const viewedRankingCount = user.stats?.viewedRankingDates?.length || 0
          return {
            success: true,
            data: {
              user,
              viewedRankingCount
            }
          }
        }
        return { success: false, message: 'User not found' }
      }

      case 'updateProfile': {
        const { name, avatar } = data
        if (!openid) {
          return { success: false, message: '无法获取用户信息' }
        }

        const userRes = await usersCollection.where({ _openid: openid }).get()
        if (userRes.data && userRes.data.length > 0) {
          const userId = userRes.data[0]._id
          const updateData = {}
          if (name !== undefined) updateData.name = name
          if (avatar !== undefined) updateData.avatar = avatar

          await usersCollection.doc(userId).update({ data: updateData })
          return { success: true, message: '更新成功' }
        }
        return { success: false, message: '用户不存在' }
      }

      case 'getFavorites': {
        const { limit = 100 } = data || {}
        const { data: list } = await favoritesCollection
          .where({ _openid: openid })
          .orderBy('createdAt', 'desc')
          .limit(limit)
          .get()
        return {
          success: true,
          data: list
        }
      }

      case 'viewRanking': {
        const { date } = data || {}
        if (!date) return { success: false, message: 'Missing date' }

        const { data: users } = await usersCollection.where({ _openid: openid }).get()
        if (users.length === 0) return { success: false, message: 'User not found' }

        const user = users[0]
        const viewedRankingDates = user.stats?.viewedRankingDates || []

        // Idempotent: if date already recorded, return directly
        if (viewedRankingDates.includes(date)) {
          return { success: true, data: { count: viewedRankingDates.length } }
        }

        viewedRankingDates.push(date)
        await usersCollection.doc(user._id).update({
          data: {
            'stats.viewedRankingDates': viewedRankingDates
          }
        })

        return { success: true, data: { count: viewedRankingDates.length } }
      }

      default:
        return { success: false, message: `Unknown action type: ${type}` }
    }
  } catch (err) {
    console.error(err)
    return { success: false, message: err.message }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/userFunctions/
git commit -m "feat(cloud): add userFunctions cloud function"
```

---

## Task 3: Enhance User Store

**Files:**
- Modify: `src/store/index.ts`

- [ ] **Step 1: Read current store**

```bash
cat src/store/index.ts
```

- [ ] **Step 2: Replace user store implementation**

```typescript
// src/store/index.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as apiLogin, getProfile as apiGetProfile, updateProfile as apiUpdateProfile } from '@/api/modules/user'

export const useUserStore = defineStore('user', () => {
  const token = ref(uni.getStorageSync('token') || '')
  const userInfo = ref({
    id: '',
    name: '',
    avatar: '',
    level: 1,
    exp: 0,
    viewedRankingsCount: 0
  })

  const isLoggedIn = computed(() => !!userInfo.value.id)

  const setToken = (t: string) => {
    token.value = t
    uni.setStorageSync('token', t)
  }

  const setUserInfo = (info: any) => {
    userInfo.value = { ...userInfo.value, ...info }
  }

  const fetchProfile = async () => {
    try {
      const res = await apiGetProfile()
      if (res.success && res.data && res.data.user) {
        const user = res.data.user
        setUserInfo({
          id: user._id || user._openid,
          name: user.name || '',
          avatar: user.avatar || '',
          level: user.level || 1,
          exp: user.exp || 0,
          viewedRankingsCount: res.data.viewedRankingCount ?? user.stats?.viewedRankingDates?.length ?? 0
        })
      }
      return res
    } catch (err) {
      console.error('Fetch profile failed', err)
    }
  }

  const login = async (wechatUserInfo?: any) => {
    try {
      // Filter WeChat default avatar/nickname
      let filteredWechatInfo = wechatUserInfo
      if (wechatUserInfo) {
        const isDefaultName = !wechatUserInfo.nickName ||
          wechatUserInfo.nickName === '微信用户' ||
          wechatUserInfo.nickName === 'WeChat'
        const isDefaultAvatar = !wechatUserInfo.avatarUrl ||
          wechatUserInfo.avatarUrl.includes('https://wx.qlogo.cn/mmhead/')

        if (isDefaultName || isDefaultAvatar) {
          filteredWechatInfo = null
        }
      }

      const res = await apiLogin(filteredWechatInfo ? { userInfo: filteredWechatInfo } : undefined)
      if (res.success && res.data) {
        const user = res.data
        setUserInfo({
          id: user._id || user._openid,
          name: user.name || '',
          avatar: user.avatar || '',
          level: user.level || 1,
          exp: user.exp || 0,
          viewedRankingsCount: user.stats?.viewedRankingDates?.length ?? 0
        })
      }
      return res
    } catch (err) {
      console.error('Login action failed', err)
      throw err
    }
  }

  const logout = () => {
    token.value = ''
    uni.removeStorageSync('token')
    userInfo.value = {
      id: '',
      name: '',
      avatar: '',
      level: 1,
      exp: 0,
      viewedRankingsCount: 0
    }
  }

  const updateUserInfo = async (info: { name?: string; avatar?: string }) => {
    try {
      const res = await apiUpdateProfile(info)
      if (res.success) {
        setUserInfo(info)
        return { success: true }
      }
      return res
    } catch (err) {
      console.error('Update user info failed', err)
      return { success: false, message: '更新失败' }
    }
  }

  // Legacy compatibility
  const setUser = (info: any) => {
    setUserInfo(info)
  }
  const incrementViewed = () => {
    userInfo.value.viewedRankingsCount++
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    setToken,
    setUserInfo,
    setUser,
    incrementViewed,
    login,
    fetchProfile,
    logout,
    updateUserInfo
  }
})
```

- [ ] **Step 3: Commit**

```bash
git add src/store/index.ts
git commit -m "feat(store): enhance user store with login/updateUserInfo/fetchProfile"
```

---

## Verification Steps

After completing all tasks:

1. **Test userFunctions deployment** (if deploying):
   ```bash
   # Deploy cloud function
   npm run deploy:function userFunctions
   ```

2. **Test API calls from console**:
   ```typescript
   import { login } from '@/api/modules/user'
   const result = await login({ userInfo: { nickName: 'TestUser' } })
   console.log('Login result:', result)
   ```

3. **Verify store integration**:
   ```typescript
   import { useUserStore } from '@/store'
   const userStore = useUserStore()
   await userStore.login({ nickName: 'Test' })
   console.log('Logged in:', userStore.isLoggedIn)
   ```

---

**Plan complete.** This plan provides the backend infrastructure for user authentication. The next plan (Profile Page Features & Favorites Sync) will build the frontend features on top of this infrastructure.
