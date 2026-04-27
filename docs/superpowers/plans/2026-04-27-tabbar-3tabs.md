# LeanStartup 原生 Tabbar 重构

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 tabbar 从 4 Tab（首页/榜单/收藏/我的，红色）改为 3 Tab（今日/榜单/我的，科技蓝），移除独立收藏 Tab，收藏功能入口合并到"我的"页面。

**Architecture:** 改动分 4 层：pages.json tabBar 配置、静态图标资源、页面导航跳转（navigateTo→switchTab）、"我的"页面增加收藏入口。全部为配置和路由调整，无复杂业务逻辑。

**Tech Stack:** UniApp + Vue 3 + TypeScript

---

## 文件结构

```
需要修改的文件
- src/pages.json                     # tabBar 配置（4→3 Tab，颜色变更）
- static/tabbar/favorites.png        # 删除（独立收藏 Tab 移除）
- static/tabbar/favorites-active.png # 删除
- static/tabbar/home.png             # 重命名 → today.png
- static/tabbar/home-active.png      # 重命名 → today-active.png
- static/tabbar/ranking.png          # 重命名 → history.png
- static/tabbar/ranking-active.png   # 重命名 → history-active.png

需要修改的页面文件
- src/pages/index/index.vue          # navigateTo → switchTab（首页→榜单）
- src/pages/history/index.vue        # navigateTo → switchTab（榜单→案例详情）
- src/pages/profile/index.vue        # 增加收藏入口，switchTab 跳转
- src/pages/profile/favorites/index.vue  # 移除 switchTab（变为普通页面）
- src/components/case-card/index.vue # navigateTo → switchTab
- src/pages/case-detail/index.vue     # navigateBack 保持不变

需要创建的图标资源
- static/tabbar/today.png             # 新增（从 home 重命名而来）
- static/tabbar/today-active.png     # 新增（从 home-active 重命名而来）
- static/tabbar/history.png          # 新增（从 ranking 重命名而来）
- static/tabbar/history-active.png   # 新增（从 ranking-active 重命名而来）
```

---

## Task 1: 更新 pages.json tabBar 配置

**Files:**
- Modify: `src/pages.json:83-114`

- [ ] **Step 1: 备份当前 tabBar 配置**

复制当前 `tabBar` 配置块到此处留档（只需要在脑中确认，不用写出来）

- [ ] **Step 2: 修改 tabBar 配置**

将 `src/pages.json` 中 `tabBar` 部分替换为：

```json
"tabBar": {
  "color": "#9CA3AF",
  "selectedColor": "#2563EB",
  "backgroundColor": "#FFFFFF",
  "borderStyle": "white",
  "list": [
    {
      "pagePath": "pages/index/index",
      "text": "今日",
      "iconPath": "static/tabbar/today.png",
      "selectedIconPath": "static/tabbar/today-active.png"
    },
    {
      "pagePath": "pages/history/index",
      "text": "榜单",
      "iconPath": "static/tabbar/history.png",
      "selectedIconPath": "static/tabbar/history-active.png"
    },
    {
      "pagePath": "pages/profile/index",
      "text": "我的",
      "iconPath": "static/tabbar/profile.png",
      "selectedIconPath": "static/tabbar/profile-active.png"
    }
  ]
}
```

变化说明：
- `color`: `#9B9A97`（旧）→ `#9CA3AF`（新，灰色）
- `selectedColor`: `#E94560`（旧，红色）→ `#2563EB`（新，科技蓝）
- `borderStyle`: `black`（旧）→ `white`（新）
- `list`: 4 项 → 3 项（移除收藏 tab）
- 首页 Tab text: `首页`（旧）→ `今日`（新）

- [ ] **Step 3: 更新首页导航栏标题**

修改 `src/pages.json` 第 19 行：
```json
"navigationBarTitleText": "轻选案例"
```

（从"搞钱案例榜"改为"轻选案例"，与新 TabBar "今日"语义一致）

- [ ] **Step 4: 提交**

```bash
git add src/pages.json
git commit -m "refactor: update tabBar to 3 tabs with blue theme"
```

---

## Task 2: 重命名并新增 TabBar 图标资源

**Files:**
- Rename: `static/tabbar/home.png` → `static/tabbar/today.png`
- Rename: `static/tabbar/home-active.png` → `static/tabbar/today-active.png`
- Rename: `static/tabbar/ranking.png` → `static/tabbar/history.png`
- Rename: `static/tabbar/ranking-active.png` → `static/tabbar/history-active.png`
- Delete: `static/tabbar/favorites.png`
- Delete: `static/tabbar/favorites-active.png`

- [ ] **Step 1: 重命名图标文件**

在 `static/tabbar/` 目录下执行以下重命名（Windows cmd）：

```bash
cd D:/MyWork/LeanMind/LeanStartup/static/tabbar
ren home.png today.png
ren home-active.png today-active.png
ren ranking.png history.png
ren ranking-active.png history-active.png
```

- [ ] **Step 2: 删除收藏相关图标**

```bash
del favorites.png
del favorites-active.png
```

- [ ] **Step 3: 验证目录内容**

```bash
ls D:/MyWork/LeanMind/LeanStartup/static/tabbar/
```

期望输出：
```
history.png
history-active.png
profile.png
profile-active.png
today.png
today-active.png
```

- [ ] **Step 4: 提交**

```bash
git add -A static/tabbar/
git commit -m "refactor: rename tabbar icons to today/history and remove favorites"
```

---

## Task 3: 更新页面导航跳转（navigateTo → switchTab）

**Files:**
- Modify: `src/pages/index/index.vue:84`
- Modify: `src/pages/history/index.vue:110`
- Modify: `src/components/case-card/index.vue`
- Modify: `src/pages/profile/favorites/index.vue:119`

**背景：** UniApp 原生 tabBar 页面之间跳转必须用 `switchTab`，不能用 `navigateTo`。当前代码中：
- `src/pages/index/index.vue` 的卡片点击用 `navigateTo` 跳转详情页（详情页不是 tabBar 页面，保留 `navigateTo`）
- 但 `src/pages/history/index.vue` 内部没有跳转到其他 tabBar 页面的逻辑，无需修改
- 需要修改的是 profile/favorites 中的 `switchTab` 到 index（已经是 switchTab，无需改）

**实际需要检查的文件：**

- [ ] **Step 1: 检查所有使用 switchTab 的地方**

```bash
grep -rn "switchTab" D:/MyWork/LeanMind/LeanStartup/src/ --include="*.vue" | grep -v node_modules
```

确认所有 tabBar 页面间的跳转已使用 `switchTab`，非 tabBar 页面跳转用 `navigateTo`。

- [ ] **Step 2: 如有遗漏修改则修改**

如果发现某处用 `navigateTo` 跳转到 tabBar 页面，改为 `switchTab`。

- [ ] **Step 3: 提交**

```bash
git add -A src/
git commit -m "fix: ensure switchTab usage for tabBar page navigation"
```

---

## Task 4: "我的"页面增加收藏入口

**Files:**
- Modify: `src/pages/profile/index.vue`

- [ ] **Step 1: 读取当前"我的"页面**

确认当前"我的"页面已存在"我的收藏"菜单项（如已有则跳过）。

查看 `src/pages/profile/index.vue` 第 62-64 行附近是否有 `wd-cell title="我的收藏"`。

- [ ] **Step 2: 如果已有收藏菜单项**

无需改动，跳过此 task。

- [ ] **Step 3: 如果没有收藏菜单项**

在 `wd-cell-group` 中添加：
```vue
<wd-cell title="我的收藏" is-link icon="star" size="large" @click="goToFavorites" />
```

并确认 `goToFavorites` 函数为：
```typescript
const goToFavorites = () => {
  uni.navigateTo({ url: '/pages/profile/favorites/index' })
}
```

（收藏页不是 tabBar 页面，所以用 `navigateTo`）

- [ ] **Step 4: 提交**

```bash
git add src/pages/profile/index.vue
git commit -m "feat(profile): add favorites entry to my page"
```

---

## Task 5: 验证与测试

**Files:**
- 无新增文件

- [ ] **Step 1: 运行 lint 检查**

```bash
npm run lint
```

Expected: 无错误

- [ ] **Step 2: 运行类型检查**

```bash
npm run type-check
```

Expected: 无错误

- [ ] **Step 3: 构建微信小程序验证配置**

```bash
npm run build:mp-weixin
```

Expected: 构建成功，tabBar 配置无报错

- [ ] **Step 4: 提交所有剩余变更**

```bash
git add -A
git status
```

确认无未提交的相关变更后：
```bash
git commit -m "feat: complete tabbar redesign to 3 tabs with blue theme"
```

---

## 验收标准

1. ✅ `pages.json` tabBar.list 长度为 3
2. ✅ Tab 顺序为：今日、榜单、我的
3. ✅ selectedColor 为 `#2563EB`（科技蓝）
4. ✅ color 为 `#9CA3AF`（灰色）
5. ✅ borderStyle 为 `white`
6. ✅ `static/tabbar/` 目录只有 6 个文件（today/today-active/history/history-active/profile/profile-active）
7. ✅ 收藏页面 `/pages/profile/favorites/index` 可正常通过 `navigateTo` 访问
8. ✅ "我的"页面包含收藏入口
9. ✅ 首页导航栏标题为"轻选案例"
10. ✅ `npm run build:mp-weixin` 构建成功