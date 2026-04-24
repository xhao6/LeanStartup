// src/config/app.config.ts
interface TabBarItem {
  pagePath: string
  text: string
  iconPath: string
  selectedIconPath: string
}

interface AppConfig {
  appName: string
  appid: string
  tabBar: {
    color: string
    selectedColor: string
    backgroundColor: string
    borderStyle: string
    list: TabBarItem[]
  }
  features: {
    share: boolean
    favorites: boolean
  }
  collections: {
    users: string
    favorites: string
    cases: string
    dailyPicks: string
  }
}

const appConfig: AppConfig = {
  appName: '精益副业案例库',
  appid: 'wxc65f29000694748f',
  tabBar: {
    color: '#9B9A97',
    selectedColor: '#E94560',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: 'static/tabbar/home.png',
        selectedIconPath: 'static/tabbar/home-active.png'
      },
      {
        pagePath: 'pages/history/index',
        text: '榜单',
        iconPath: 'static/tabbar/ranking.png',
        selectedIconPath: 'static/tabbar/ranking-active.png'
      },
      {
        pagePath: 'pages/profile/favorites/index',
        text: '收藏',
        iconPath: 'static/tabbar/favorites.png',
        selectedIconPath: 'static/tabbar/favorites-active.png'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'static/tabbar/profile.png',
        selectedIconPath: 'static/tabbar/profile-active.png'
      }
    ]
  },
  features: {
    share: true,
    favorites: true
  },
  collections: {
    users: 'users',
    favorites: 'user_favorites',
    cases: 'cases',
    dailyPicks: 'daily_picks'
  }
}

export default appConfig
