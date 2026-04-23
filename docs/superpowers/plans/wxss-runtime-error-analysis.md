# 小程序运行时错误分析与解决方案

> **状态**：待解决

## 问题描述

微信小程序启动时报错：

```
TypeError: Invalid attempt to destructure non-iterable instance.
    at _nonIterableRest (nonIterableRest.js:1)
    at _slicedToArray (slicedToArray.js:1)
    at Si (vendor.js:7)
    at Fi (vendor.js:7)
    at ls (vendor.js:7)
    at Object.n.mount (app.js:1)
    at Object.e.mount (app.js:1)
    at app.js:1
```

**关键观察**：`app.js` 只有 **735 字节**（正常应有数 KB），说明编译器生成的入口文件不完整。

---

## 已尝试的排查方法

| 方法 | 结果 | 说明 |
|------|------|------|
| 降级 pinia 3.x → 2.3.1 → 2.1.0 | ✅ 版本降级成功 | `createPinia=function(){...}` 签名确认无参数，正确 |
| `createApp()` 返回值从 `{app,pinia}` 改为 `app` | ❌ | 两者在 LeanSkill 中都正常工作 |
| `createApp()` 模块顶部提前初始化 pinia | ❌ | 编译器仍然生成相同的精简 app.js |
| 移除 App.vue 中 `async/await` | ✅ app.js 减少到 703 字节 | 核心问题未解决 |
| 对齐 dcloudio 包版本至 404 版本 | ❌ | 问题依旧 |
| 检查 `createSSRApp` 返回值（Ds/ji 函数） | ✅ 返回组件实例，有 `.mount()` | 返回值正确 |

---

## LeanSkill vs Startup 关键对比

| 对比项 | LeanSkill（正常） | Startup（报错） |
|--------|------------------|-----------------|
| `app.js` 大小 | 989 字节 | 703-735 字节 |
| `vendor.js` 大小 | 177,552 字节 | 748,236 字节 |
| `createSSRApp` 导出名 | `ji` | `Us` |
| `createSSRApp` 实现 | `ji=function(t,e=null){return t&&(t.mpType="app"),bi(t,e).use(Mi)}` | `Ds=function(t,null){return t&&(t.mpType="app"),ms(t,null).use(Ls)}` |
| `createPinia` 内部函数 | `Fn(!0), Gr({})` | `Cn(!0), Yr({})` |
| 导出的函数/变量数量 | 较多（包含 wot-design-uni 等组件） | 较少（精简版） |

**核心发现**：Startup 的 `vendor.js` 是 LeanSkill 的 **4.2 倍**，且导出的内容更少。这说明编译器在处理多平台输出时做了过度精简。

---

## 根因假设

**假设**：uni-app 编译器在生成 `vendor.js` 时，对多平台（mp-weixin）输出进行了过度精简，导致 Vue 的某个内部函数（如 `Ls`/`Mi` 插件）被错误地移除或损坏。

- LeanSkill 导出了 `Mi` 但未在 `createSSRApp` 中直接使用
- Startup 导出了 `Ls` 并在 `createSSRApp` 中使用 `.use(Ls)`
- `Ls`/`Mi` 很可能是 Vue Router 或某个插件的安装函数

**次要观察**：703 字节的 `app.js` 调用 `t().app.mount("#app")` 是正确的，但 `t()` 函数返回的对象的 `.mount` 方法内部调用链出错。

---

## 待验证的解决方案

1. **降级全部 dcloudio 包至精确的 404 版本** — 已部分实施，需完整对齐
2. **对比 vite 构建配置** — LeanSkill 使用 `unocss/vite`，Startup 使用纯 SCSS，检查 vite 插件链差异
3. **检查 `Ls`/`Mi` 插件来源** — 确认 `Ls` 来自哪个包，为何被精简
4. **清除 node_modules 重新安装** — 可能有残留的 407 版本文件干扰

---

## 相关文件

- `src/main.ts` — createApp 入口
- `src/App.vue` — App 组件（已移除 async/await）
- `src/utils/cloudbase.ts` — initCloudBase（已改为同步）
- `dist/build/mp-weixin/app.js` — 构建输出（735 字节）
- `dist/build/mp-weixin/common/vendor.js` — 供应商 bundle（748KB）

---

## 参考

- LeanSkill 项目：`/d/MyWork/LeanMind/LeanSkill/`（正常运行）
- 对比构建输出：`/d/MyWork/LeanMind/LeanSkill/dist/build/mp-weixin/`
