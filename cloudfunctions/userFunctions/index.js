const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

const usersCollection = 'users'

function generateNickname() {
  const adjectives = ['敏捷', '智慧', '创新', '勇敢', '探索', '洞察', '先锋', '卓越']
  const nouns = ['开发者', '极客', '创客', '工程师', '建筑师', '设计师', '架构师', '发明家']

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const code = Math.random().toString(36).substring(2, 6).toUpperCase()

  return `${adj}${noun}${code}`
}

async function initUserData(openId) {
  const now = new Date()
  return {
    _openid: openId,
    name: generateNickname(),
    avatar: '',
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

exports.main = async (event, context) => {
  const { type, OPENID } = event
  const wxContext = cloud.getWXContext()
  const openId = OPENID || wxContext.OPENID

  try {
    switch (type) {
      case 'login': {
        const userRes = await db.collection(usersCollection).where({
          _openid: openId
        }).get()

        const now = new Date()

        if (userRes.data.length === 0) {
          const userData = await initUserData(openId)
          await db.collection(usersCollection).add({
            data: userData
          })
          return {
            success: true,
            data: userData,
            isNewUser: true
          }
        } else {
          const user = userRes.data[0]
          await db.collection(usersCollection).doc(user._id).update({
            data: {
              lastLoginAt: now,
              loginCount: user.loginCount + 1,
              lastActiveAt: now
            }
          })
          return {
            success: true,
            data: { ...user, lastLoginAt: now, loginCount: user.loginCount + 1, lastActiveAt: now },
            isNewUser: false
          }
        }
      }

      case 'getProfile': {
        const userRes = await db.collection(usersCollection).where({
          _openid: openId
        }).get()

        if (userRes.data.length === 0) {
          return {
            success: false,
            error: 'User not found'
          }
        }

        const user = userRes.data[0]
        const viewedRankingCount = user.viewedRankingDates ? user.viewedRankingDates.length : 0

        return {
          success: true,
          data: {
            ...user,
            viewedRankingCount
          }
        }
      }

      case 'updateProfile': {
        const { name, avatar } = event

        const userRes = await db.collection(usersCollection).where({
          _openid: openId
        }).get()

        if (userRes.data.length === 0) {
          return {
            success: false,
            error: 'User not found'
          }
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

      case 'getFavorites': {
        const limit = event.limit || 100

        // 1. 从 UserCollection 获取收藏记录（按 updated_at 降序）
        const { data: collections } = await db.collection('UserCollection')
          .where({ _openid: openId })
          .orderBy('updated_at', 'desc')
          .limit(limit)
          .get()

        if (collections.length === 0) {
          return { success: true, data: [], length: 0 }
        }

        // 2. 获取 case_id 列表
        const caseIds = collections.map(c => c.case_id)

        // 3. 批量查询 Case 详情
        const { data: cases } = await db.collection('Case')
          .where({ id: _.in(caseIds) })
          .field({ id: true, title: true, summary: true, tags: true, score_total: true, image: true, source_url: true })
          .get()

        // 4. 组装返回（兼容 CloudFavoriteItem 格式，用 resourceId 字段）
        const caseMap = new Map(cases.map(c => [c.id, c]))
        const result = collections.map(uc => {
          const c = caseMap.get(uc.case_id) || {}
          return {
            resourceId: uc.case_id,
            title: c.title || '',
            desc: c.summary || '',
            tags: c.tags || [],
            score_total: c.score_total || 0,
            url: c.source_url || '',
            image: c.image || '',
            createdAt: uc.created_at || uc.updated_at,
            progress: uc.progress || {}
          }
        })

        return {
          success: true,
          data: result,
          length: result.length
        }
      }

      case 'viewRanking': {
        const today = new Date().toISOString().split('T')[0]

        const userRes = await db.collection(usersCollection).where({
          _openid: openId
        }).get()

        if (userRes.data.length === 0) {
          return {
            success: false,
            error: 'User not found'
          }
        }

        const user = userRes.data[0]
        const viewedDates = user.viewedRankingDates || []

        if (!viewedDates.includes(today)) {
          viewedDates.push(today)

          await db.collection(usersCollection).doc(user._id).update({
            data: {
              viewedRankingDates: viewedDates,
              totalViews: user.totalViews + 1,
              lastActiveAt: new Date()
            }
          })

          return {
            success: true,
            data: {
              viewedRankingDates: viewedDates,
              totalViews: user.totalViews + 1,
              isNewView: true
            }
          }
        }

        return {
          success: true,
          data: {
            viewedRankingDates: viewedDates,
            totalViews: user.totalViews,
            isNewView: false
          }
        }
      }

      default:
        return {
          success: false,
          error: 'Invalid operation type'
        }
    }
  } catch (err) {
    console.error(err)
    return {
      success: false,
      error: err.message
    }
  }
}
