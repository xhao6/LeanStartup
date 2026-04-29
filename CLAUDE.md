# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在本项目中工作提供指引。

---
description: CloudBase AI 开发规范指南 - 提供场景化的最佳实践以确保开发质量
globs: *
alwaysApply: true
inclusion: always
---

# CloudBase AI 开发规范指南

## 🗂️ 规则文件路径解析策略

**重要提示：本文档中所有规则文件路径都采用智能解析策略，以支持多种 AI 编辑器。**

### 路径解析规则

当文档引用规则文件时，按以下顺序尝试：

1. **通用路径**: `rules/{rule-name}/rule.md`
2. **兜底搜索**: 使用 `search_file` 工具搜索 `*{rule-name}*rule.md`

### 规则名称映射

| 规则简写 | 完整规则名称 |
|---------|-------------|
| `auth-tool` | 认证工具配置 |
| `auth-web` | Web 认证 |
| `auth-wechat` | 微信小程序认证 |
| `auth-nodejs` | Node.js 认证 |
| `auth-http-api` | HTTP API 认证 |
| `web-development` | Web 平台开发 |
| `miniprogram-development` | 小程序平台开发 |
| `cloudrun-development` | CloudRun 后端开发 |
| `cloud-functions` | 云函数开发 |
| `http-api` | HTTP API 使用 |
| `relational-database-tool` | MySQL 数据库工具操作 |
| `relational-database-web` | MySQL Web SDK |
| `no-sql-web-sdk` | NoSQL Web SDK |
| `no-sql-wx-mp-sdk` | NoSQL 微信小程序 SDK |
| `cloudbase-platform` | CloudBase 平台知识 |
| `cloud-storage-web` | 云存储 Web SDK |
| `ui-design` | UI 设计规范 |
| `spec-workflow` | 软件工程工作流 |
| `data-model-creation` | 数据模型创建 |
| `ai-model-web` | AI 模型调用 (Web SDK) |
| `ai-model-nodejs` | AI 模型调用 (Node SDK) |
| `ai-model-wechat` | AI 模型调用 (微信小程序) |

### 使用示例

当你在文档中看到 "Read `{auth-web}` rule file" 时：
- 首先尝试：`.codebuddy/rules/tcb/rules/auth-web/rule.md`
- 然后尝试：`rules/auth-web/rule.md`
- 最后搜索：`*auth-web*rule.md`

**注意**：已使用 `rules/` 前缀的文件（如 `rules/ui-design/rule.md`）在所有编辑器中通用，无需路径解析。

---

## AI 快速参考

**⚠️ 重要提示：根据你的项目类型首先阅读本节**

### 开发 Web 项目时：
1. **环境检查**: 首先调用 `envQuery` 工具（适用于所有交互）
2. **⚠️ 模板下载（新项目必读）**: **开始新项目时必须首先调用 `downloadTemplate` 工具** - 切勿手动创建文件。使用 `downloadTemplate` 并指定 `template="react"` 或 `template="vue"` 获取完整项目结构。只有在模板下载失败或用户明确要求手动创建时，才进行手动文件创建。
3. **⚠️ UI 设计（重要）**: **在生成任何页面、界面、组件或样式之前，必须首先阅读 `rules/ui-design/rule.md`** - 这不是可选的。必须在编写任何 UI 代码之前明确阅读此文件并输出设计规范。
4. **核心能力**: 阅读下面的核心能力部分（特别是 Web 的 UI 设计和数据库 + 认证）
5. **⚠️ 认证配置检查（必读）**: **当用户提到任何登录/认证需求时，必须首先阅读 `{auth-tool}` 规则文件（使用路径解析策略）并在实施前端代码之前检查/配置认证服务提供商**
6. **平台规则**: 阅读 `{web-development}` 规则文件（使用路径解析策略）了解平台特定规则（SDK 集成、静态托管、构建配置）
7. **认证**: 阅读 `{auth-web}` 规则文件（使用路径解析策略）和 `{auth-tool}` - **必须使用 Web SDK 内置认证**
8. **数据库**:
   - NoSQL: `rules/no-sql-web-sdk/rule.md`
   - MySQL: `rules/relational-database-web/rule.md` + `rules/relational-database-tool/rule.md`

### 开发小程序项目时：
1. **环境检查**: 首先调用 `envQuery` 工具（适用于所有交互）
2. **⚠️ 模板下载（新项目必读）**: **开始新项目时必须首先调用 `downloadTemplate` 工具** - 切勿手动创建文件。使用 `downloadTemplate` 并指定 `template="miniprogram"` 获取完整项目结构。只有在模板下载失败或用户明确要求手动创建时，才进行手动文件创建。
3. **⚠️ UI 设计（重要）**: **在生成任何页面、界面、组件或样式之前，必须首先阅读 `rules/ui-design/rule.md`** - 这不是可选的。必须在编写任何 UI 代码之前明确阅读此文件并输出设计规范。
4. **核心能力**: 阅读下面的核心能力部分（特别是小程序的 UI 设计和数据库 + 认证）
5. **平台规则**: 阅读 `rules/miniprogram-development/rule.md` 了解平台特定规则（项目结构、微信开发者工具、wx.cloud 使用）
6. **认证**: 阅读 `rules/auth-wechat/rule.md` - **天然免登录，在云函数中获取 OPENID**
7. **数据库**:
   - NoSQL: `rules/no-sql-wx-mp-sdk/rule.md`
   - MySQL: `rules/relational-database-tool/rule.md`（通过工具）

### 开发原生 App 项目时（iOS/Android/Flutter/React Native 等）：
1. **环境检查**: 首先调用 `envQuery` 工具（适用于所有交互）
2. **⚠️ 平台限制**: **原生应用（iOS、Android、Flutter、React Native 等）不支持 CloudBase SDK** - 必须使用 HTTP API 调用 CloudBase 能力
3. **⚠️ UI 设计（重要）**: **在生成任何页面、界面、组件或样式之前，必须首先阅读 `rules/ui-design/rule.md`** - 这不是可选的。必须在编写任何 UI 代码之前明确阅读此文件并输出设计规范。
4. **必读规则**:
   - **必须阅读** `{http-api}` 规则文件（使用路径解析策略） - 所有 CloudBase 操作的 HTTP API 使用
   - **必须阅读** `{relational-database-tool}` 规则文件（使用路径解析策略） - MySQL 数据库操作（通过工具）
   - **必须阅读** `{auth-tool}` 规则文件（使用路径解析策略） - 认证配置
5. **可选规则**:
   - `rules/cloudbase-platform/rule.md` - 通用 CloudBase 平台知识
   - `rules/ui-design/rule.md` - UI 设计规范（如涉及 UI）
6. **⚠️ 数据库限制**: **原生应用只支持 MySQL 数据库**。如果用户需要使用 MySQL 数据库，**必须提示用户在控制台先启用它**:
   - 启用 MySQL 数据库：[CloudBase 控制台 - MySQL 数据库](https://tcb.cloud.tencent.com/dev?envId=${envId}#/db/mysql/table/default/)
   - 将 `${envId}` 替换为实际的环境 ID

---

## 核心能力（必须做好）

### 0. ⚠️ 配置优先原则（最高优先级）

**🚨 必读：在编写代码之前必须先检查和配置 CloudBase 服务**

**认证关键词检测：**

当用户提到以下任何词时，立即阅读 auth-tool 规则文件：

- 手机登录 / 短信登录 / 移动登录
- 邮箱登录
- 微信登录 / 微信认证
- 用户名密码登录
- 匿名登录 / 游客登录
- 登录 / 注册 / 认证 / 认证 / 登录 / 注册

**规则文件位置策略：**

当你在本文档中看到 `{rule-name}` 标记时，应用本文档顶部的路径解析策略：
1. 首先尝试 `.codebuddy/rules/tcb/rules/{rule-name}/rule.md` (CodeBuddy)
2. 然后尝试 `rules/{rule-name}/rule.md` (其他编辑器)
3. 如果两者都失败，使用 `search_file` 搜索 `*{rule-name}*rule.md`

**auth-tool 具体示例：**
1. `.codebuddy/rules/tcb/rules/auth-tool/rule.md` (CodeBuddy)
2. `rules/auth-tool/rule.md` (其他编辑器：Cursor、WindSurf 等)
3. 如果两者都失败，搜索 `*auth-tool*rule.md`

**执行顺序：**

1. **第一步**: 使用路径解析策略阅读 `{auth-tool}` 规则文件
2. **第二步**: 使用 `callCloudApi` 检查当前认证配置状态
3. **第三步**: 启用所需的认证方式（如未配置）
4. **第四步**: 验证配置是否生效
5. **第五步**: 实施前端认证代码

作为应用开发最重要的部分，以下四个核心能力必须做好，无需为不同平台阅读不同规则：

### 1. ⚠️ UI 设计（最高优先级）
**⚠️ 必读：所有设计工作必须严格遵循 `rules/ui-design/rule.md` 规则**

**🚨 强制执行：在生成任何 UI 代码之前，你必须明确阅读 `rules/ui-design/rule.md` 文件。这不是建议，而是强制要求。**

**在生成任何页面、界面、组件或样式之前：**
1. **必须首先明确阅读 `rules/ui-design/rule.md` 文件** - 使用文件阅读工具读取此文件，切勿跳过此步骤
2. **必须在编写任何代码之前完成设计规范输出**：
   - 设计目的说明
   - 美学方向（选择具体选项，而非通用术语）
   - 配色方案（含十六进制颜色，避免禁忌色）
   - 排版（具体字体名称，避免禁忌字体）
   - 布局策略（非对称/创意方案，避免居中模板）
3. **必须确保**生成的界面具有独特的美学风格和高质量的视觉设计
4. **必须避免**通用的 AI 美学（常见字体、陈词滥调的配色方案、模板化设计）

**这适用于所有涉及以下内容的任务：**
- 页面生成
- 界面创建
- 组件设计
- 样式/视觉效果
- 任何前端视觉元素

**⚠️ 违规检测：如果发现自己在未首先阅读 `rules/ui-design/rule.md` 的情况下编写 UI 代码，请立即停止并先阅读该文件。**

### 2. 数据库 + 认证
**加强数据库和认证能力**

**认证**：
- **Web 项目**:
  - 必须使用 CloudBase Web SDK 内置认证，参考 `rules/auth-web/rule.md`
  - 平台开发规则：参考 `rules/web-development/rule.md` 了解 Web SDK 集成、静态托管部署和构建配置
- **小程序项目**:
  - 天然免登录，在云函数中获取 `wxContext.OPENID`，参考 `rules/auth-wechat/rule.md`
  - 平台开发规则：参考 `rules/miniprogram-development/rule.md` 了解小程序项目结构、微信开发者工具集成和 CloudBase 能力
- **Node.js 后端**: 参考 `rules/auth-nodejs/rule.md`

**数据库操作**：
- **Web 项目**:
  - NoSQL 数据库：参考 `rules/no-sql-web-sdk/rule.md`
  - MySQL 关系型数据库：参考 `rules/relational-database-web/rule.md`（Web 应用开发）和 `rules/relational-database-tool/rule.md`（通过工具管理）
  - 平台开发规则：参考 `rules/web-development/rule.md` 了解 Web SDK 数据库集成模式
- **小程序项目**:
  - NoSQL 数据库：参考 `rules/no-sql-wx-mp-sdk/rule.md`
  - MySQL 关系型数据库：参考 `rules/relational-database-tool/rule.md`（通过工具）
  - 平台开发规则：参考 `rules/miniprogram-development/rule.md` 了解小程序数据库集成和 wx.cloud 使用

### 3. 静态托管部署（Web）
**参考 `rules/web-development/rule.md` 中的部署流程**
- 构建完成后使用 CloudBase 静态托管
- 使用 `uploadFiles` 工具部署
- 提醒用户部署后 CDN 有几分钟缓存
- 生成带随机查询字符串的 markdown 格式访问链接

### 4. 后端部署（云函数或 CloudRun）
- **云函数部署**: 参考 `rules/cloud-functions/rule.md` - 使用 `getFunctionList` 查询，然后调用 `createFunction` 或 `updateFunctionCode` 部署。**重要**：运行时创建后不可更改，开始时必须选择正确的运行时。
- **CloudRun 部署**: 参考 `rules/cloudrun-development/rule.md` - 使用 `manageCloudRun` 工具进行容器化部署
- 确保后端代码支持 CORS，准备 Dockerfile（容器类型）

## 开发流程标准

**重要提示：为确保开发质量，AI 在开始工作之前必须完成以下步骤：**

### 0. 环境检查（第一步）
用户输入任何内容后，首先检查 CloudBase 环境状态：
- 确保当前 CloudBase 环境 ID 已知
- 如果对话历史中不存在，必须使用参数 `action=info` 调用 `envQuery` 工具查询当前环境信息和环境 ID
- **重要**：后续代码中涉及环境 ID 配置时，自动使用查询到的环境 ID，无需用户手动输入

### 1. 场景识别
识别当前开发场景类型，主要是为了解项目类型，但核心能力适用于所有项目：
- **Web 项目**: React/Vue/原生 JS 前端项目
- **微信小程序**: 小程序 CloudBase 项目
- **UniApp 项目**: 使用 uni-app 框架的跨平台应用
- **原生应用**: 使用 HTTP API 的原生移动应用（iOS、Android、Flutter、React Native 等）（无 SDK 支持）
- **CloudRun 项目**: CloudBase Run 后端服务项目（支持任意语言：Java/Go/Python/Node.js/PHP/.NET 等）
- **数据库相关**: 涉及数据操作的项目
- **UI 设计/界面生成**: 需要界面设计、页面生成、原型创建、组件设计等的项目
- **AI 模型集成**: 需要 AI 能力的项目（文本生成、流式响应、图像生成）

### 2. 平台特定快速指南

**UniApp 项目 - 必读规则文件：**
- `rules/miniprogram-development/rule.md` - 平台开发规则（项目结构、微信开发者工具、uni-app 特性）
- `rules/auth-wechat/rule.md` - 认证（天然免登录，在云函数中获取 OPENID）
- `rules/no-sql-wx-mp-sdk/rule.md` - NoSQL 数据库操作
- `rules/relational-database-tool/rule.md` - MySQL 数据库操作（通过工具）
- `rules/cloudbase-platform/rule.md` - 通用 CloudBase 平台知识
- `rules/ai-model-wechat/rule.md` - UniApp 的 AI 模型调用

**Web 项目 - 必读规则文件：**
- `rules/web-development/rule.md` - 平台开发规则（SDK 集成、静态托管、构建配置）
- `rules/auth-web/rule.md` - 认证（**必须使用 Web SDK 内置认证**）
- `rules/no-sql-web-sdk/rule.md` - NoSQL 数据库操作
- `rules/relational-database-web/rule.md` - MySQL 数据库操作（Web）
- `rules/relational-database-tool/rule.md` - MySQL 数据库管理（工具）
- `rules/cloud-storage-web/rule.md` - 云存储操作（上传、下载、文件管理）
- `rules/cloudbase-platform/rule.md` - 通用 CloudBase 平台知识
- `rules/ai-model-web/rule.md` - Web 应用的 AI 模型调用（文本生成、流式）

**小程序项目 - 必读规则文件：**
- `rules/miniprogram-development/rule.md` - 平台开发规则（项目结构、微信开发者工具、wx.cloud）
- `rules/auth-wechat/rule.md` - 认证（天然免登录，在云函数中获取 OPENID）
- `rules/no-sql-wx-mp-sdk/rule.md` - NoSQL 数据库操作
- `rules/relational-database-tool/rule.md` - MySQL 数据库操作（通过工具）
- `rules/cloudbase-platform/rule.md` - 通用 CloudBase 平台知识
- `rules/ai-model-wechat/rule.md` - 小程序的 AI 模型调用（文本生成、带回调的流式）

**通用规则文件（所有项目）：**
- **⚠️ `rules/ui-design/rule.md`** - **必读 - 最高优先级** - 在生成任何 UI/页面/组件/样式之前必须首先阅读
- `rules/spec-workflow/rule.md` - 标准软件工程工作流（如需要）

### 3. 开发确认
开始工作前，建议向用户确认：
1. "我识别这是一个 [场景类型] 项目"
2. "我将严格遵循核心能力要求并参考相关规则文件"
3. "请确认我的理解是否正确"

## 核心行为规则

1. **工具优先级**: 对于腾讯 CloudBase 操作，必须优先使用 CloudBase 工具
2. **⚠️ 模板下载（必读）**: **开始新项目或用户要求开发应用时，必须首先调用 `downloadTemplate` 工具** - 切勿手动创建项目文件。使用适当的模板类型（`react`、`vue`、`miniprogram`、`uniapp`）调用 `downloadTemplate`。只有在模板下载失败或用户明确要求手动创建时，才进行手动文件创建。这确保了正确的项目结构、配置文件和最佳实践。
3. **项目理解**: 首先阅读当前项目的 README.md，遵循项目说明进行开发
4. **目录标准**: 在当前目录输出项目代码前，先检查当前目录文件
5. **开发顺序**: 开发时优先前端后后端，确保先完成前端界面和交互逻辑，再实现后端业务逻辑
6. **⚠️ UI 设计规则强制应用**: 当任务涉及生成页面、界面、组件、样式或任何前端视觉元素时，**必须首先使用文件阅读工具明确阅读 `rules/ui-design/rule.md` 文件**，然后严格遵循该规则文件，确保生成的界面具有独特的美学风格和高质量的视觉设计，避免通用的 AI 美学。**必须在编写任何 UI 代码之前输出设计规范。**
7. **后端开发优先策略**: 开发后端时，优先使用 SDK 直接调用 CloudBase 数据库，而非通过云函数（除非特别需要，如复杂业务逻辑、服务器端计算、调用第三方 API 等）
8. **部署顺序**: 有后端依赖时，优先部署后端再预览前端
9. **交互确认**: 需求不明确时使用 interactiveDialog 澄清，必须在执行高风险操作前确认
10. **实时通讯**: 使用 CloudBase 实时数据库 watch 能力
11. **⚠️ 认证规则**: 用户开发项目时需要登录认证，必须使用内置认证功能，必须按平台严格区分认证方式
    - **Web 项目**: **必须使用 CloudBase Web SDK 内置认证**（如 `auth.toDefaultLoginPage()`），参考 `rules/auth-wechat/rule.md`
    - **小程序/UniApp 项目**: **天然免登录**，在云函数中获取 `wxContext.OPENID`，参考 `rules/auth-wechat/rule.md`
    - **原生应用（iOS/Android）**: **必须使用 HTTP API** 进行认证，参考 `rules/http-api/rule.md` 和认证 API swagger
12. **⚠️ 认证配置强制检查**: 用户提到任何认证相关需求时：
    - **必须首先阅读** `{auth-tool}` 规则文件（使用本文档顶部的路径解析策略）
    - **必须首先检查** 当前认证配置状态
    - **必须首先启用** 所需的认证方式
    - **必须验证** 配置是否生效
    - **然后才能实施** 前端认证代码

## 开发工作流

### 开发

1. **⚠️ 下载 CloudBase 模板（新项目必读）**:
   - **开始新项目时必须首先调用 `downloadTemplate` 工具** - 切勿手动创建项目文件
   - Web 项目：使用 `downloadTemplate` 并指定 `template="react"` 或 `template="vue"`
   - 小程序项目：使用 `downloadTemplate` 并指定 `template="miniprogram"`
   - UniApp 项目：使用 `downloadTemplate` 并指定 `template="uniapp"`
   - **只有在模板下载失败或用户明确要求手动创建时才进行手动文件创建**
   - 如果无法下载到当前目录，可以使用脚本复制，注意隐藏文件也需要复制

2. **⚠️ 阅读 UI 设计文档（必读）**:
   - **在生成任何页面、界面、组件或样式之前，必须首先使用文件阅读工具明确阅读 `rules/ui-design/rule.md` 文件**
   - **必须在编写任何 UI 代码之前输出设计规范**（设计目的说明、美学方向、配色方案、排版、布局策略）
   - 这是必读的 - 必须阅读文件并遵循设计思维框架和前端美学指南
   - 避免生成通用的 AI 美学风格界面

3. **小程序/UniApp TabBar 素材下载**: Tabbar 等素材图片必须使用 **png** 格式，必须使用 downloadRemoteFile 工具下载到本地。可以从 Unsplash、wikimedia（一般选择 500 尺寸）、Pexels、Apple 官方 UI 等资源中选择

4. **从知识库查询专业知识**: 如对任何 CloudBase 知识不确定，可以使用 searchKnowledgeBase 工具智能搜索 CloudBase 知识库（支持 CloudBase 和云函数、小程序前端知识等），通过向量搜索快速获取专业文档和答案

5. **微信开发者工具打开项目工作流**:
   - 检测到当前项目是小程序或 uni-app 项目时，建议用户使用微信开发者工具进行预览、调试和发布
   - 打开前确认 project.config.json 已配置 appid 字段。如未配置，必须让用户提供
   - 使用微信开发者工具内置 CLI 命令打开项目（指向包含 project.config.json 的目录）：
     - Windows: `"C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat" open --project "项目根目录路径"`
     - macOS: `/Applications/wechatwebdevtools.app/Contents/MacOS/cli open --project "/path/to/project/root"`
   - 项目根目录路径是包含 project.config.json 文件的目录

### 部署流程

1. **云函数部署流程**: 可以使用 getFunctionList 工具查询是否有云函数，然后直接调用 createFunction 或 updateFunctionCode 更新云函数代码。只需将 functionRootPath 指向云函数目录的父目录（如 cloudfunctions 目录的绝对路径）。无需压缩代码等操作。上述工具会自动读取父目录下与云函数同名的子目录中的文件并自动部署

2. **云函数部署流程**: 对于 Node.js 云函数，使用 `getFunctionList` 查询，然后调用 `createFunction` 或 `updateFunctionCode` 部署。**重要**：运行时创建后不可更改。详细参考 `rules/cloud-functions/rule.md`

3. **CloudRun 部署流程**: 对于非云函数后端服务（Java、Go、PHP、Python、Node.js 等），使用 manageCloudRun 工具进行容器化部署。确保后端代码支持 CORS，准备 Dockerfile，然后调用 manageCloudRun 进行容器化部署。详细参考 `rules/cloudrun-development/rule.md`

4. **静态托管部署流程**: 使用 uploadFiles 工具部署。部署后提醒用户 CDN 有几分钟缓存。可以生成带随机查询字符串的 markdown 格式访问链接。详细参考 `rules/web-development/rule.md`

### 文档生成规则

1. 生成项目后创建 README.md 文件，包含基本信息，如项目名称、项目描述。最重要的是清楚解释项目架构和涉及的 CloudBase 资源，以便维护者参考修改和维护
2. 部署后，如果是 Web 项目，可以在文档中写上正式的部署访问地址

### 配置文件规则

1. 为了帮助不使用 AI 的其他人了解有哪些可用资源，可以在生成后创建 cloudbaserc.json 文件

### 工具接口调用规则
调用工具服务时，需要充分了解所有要调用的接口的数据类型以及返回值类型。如果不确定要调用哪个接口，先查看文档和工具描述，然后根据文档和工具描述确定要调用的接口和参数。避免出现方法参数错误或参数类型错误的情况。

例如，许多接口需要 confirm 参数，为布尔类型。如果不提供此参数或提供错误的数据类型，接口将返回错误。

### ⚠️ NoSQL 数据库 Update 操作必读

使用 `writeNoSqlDatabaseContent` 的 `update` 操作时，**只更新指定字段会导致其他字段丢失**（部分更新模式）。

**正确做法**：在 update 对象中包含所有必要字段，确保记录完整。

```javascript
// ✅ 完整更新示例
update({
  "title": "新标题",
  "desc": "描述内容",
  "type": "skill",
  "markdownUrl": "https://xxx.tcb.la/content/xxx.md",
  "tags": ["标签1", "标签2"],
  "heat": 0,
  "image": "",
  "url": "",
  "source": ""
})
```

### 环境 ID 自动配置规则
- 生成项目配置文件（如 `cloudbaserc.json`、`project.config.json` 等）时，自动使用 `envQuery` 查询到的环境 ID
- 在涉及环境 ID 的代码示例中，自动填充当前环境 ID，无需用户手动替换
- 在部署和预览相关操作中，优先使用已查询到的环境信息

## 开发质量检查清单

为确保开发质量，建议在开始任务前完成以下检查：

### 推荐步骤
0. **[ ] 环境检查**: 调用 `envQuery` 工具检查 CloudBase 环境状态（适用于所有交互）
1. **[ ] 模板下载检查（新项目必读）**: 如果开始新项目，是否首先调用了 `downloadTemplate` 工具？不要手动创建项目文件 - 使用模板。
2. **[ ] 场景识别**: 清楚识别这是什么类型的项目（Web/小程序/UniApp/数据库/UI/AI）
3. **[ ] 核心能力确认**: 确认已考虑所有四个核心能力
   - UI 设计：是否使用文件阅读工具明确阅读了 `rules/ui-design/rule.md` 文件？
   - 数据库 + 认证：是否参考了相应的认证和数据库规则？
   - 静态托管部署：是否了解部署流程？
   - 后端部署：是否了解云函数或 CloudRun 部署流程？
4. **[ ] UI 设计规则检查（必读）**: 如果任务涉及生成页面、界面、组件或样式：
   - 是否使用文件阅读工具明确阅读了 `rules/ui-design/rule.md` 文件？（必填：是）
   - 是否在编写代码前输出了设计规范？（必填：是）
   - 是否理解并遵循设计思维框架？（必填：是）
5. **[ ] 用户确认]: 向用户确认场景识别和核心能力理解是否正确
6. **[ ] 规则执行**: 严格遵循核心能力要求和相关规则文件进行开发

### ⚠️ 常见问题避免
- **❌ 不要手动创建项目文件** - 新项目首先使用 `downloadTemplate` 工具
- **❌ 不要跳过阅读 UI 设计文档** - 生成任何 UI 代码前必须明确阅读 `rules/ui-design/rule.md` 文件
- 避免跳过核心能力直接开始开发
- 避免混合使用不同平台的 API 和认证方式
- 避免忽略 UI 设计规则：所有涉及界面、页面、组件、样式的任务必须明确阅读并严格遵循 `rules/ui-design/rule.md`
- 避免忽略数据库和认证标准：必须使用正确的认证方式和数据库操作方法
- 重要的技术解决方案应与用户确认

### 质量保证
如发现开发不符合标准，可以：
- 指出具体问题
- 要求重新执行规则检查流程
- 明确指定需要遵循的规则文件

## CloudBase 控制台入口

创建/部署资源后，提供相应的控制台管理页面链接。所有控制台 URL 遵循格式：`https://tcb.cloud.tencent.com/dev?envId=${envId}#/{path}`

### 核心功能入口

1. **概览**: `#/overview` - 主仪表盘
2. **模板中心**: `#/cloud-template/market` - 项目模板
3. **文档型数据库**: `#/db/doc` - NoSQL 集合：`#/db/doc/collection/${collectionName}`，模型：`#/db/doc/model/${modelName}`
4. **MySQL 数据库**: `#/db/mysql` - 表：`#/db/mysql/table/default/`
5. **云函数**: `#/scf` - 函数详情：`#/scf/detail?id=${functionName}&NameSpace=${envId}`
6. **云托管**: `#/platform-run` - 容器服务
7. **云存储**: `#/storage` - 文件存储
8. **AI+**: `#/ai` - AI 能力
9. **静态网站托管**: `#/static-hosting`
10. **身份认证**: `#/identity` - 登录管理：`#/identity/login-manage`，令牌管理：`#/identity/token-management`
11. **微搭低代码**: `#/lowcode/apps`
12. **日志监控**: `#/devops/log`
13. **扩展能力**: `#/apis`
14. **环境设置**: `#/env`

## 开发命令

```bash
# 安装依赖
npm install  # 或 pnpm install

# 开发
npm run dev:h5         # 运行 H5 网页版
npm run dev:mp-weixin  # 运行微信小程序

# 构建
npm run build:h5         # 构建 H5 网页
npm run build:mp-weixin # 构建微信小程序

# 代码质量
npm run type-check  # TypeScript 类型检查
npm run lint        # ESLint 自动修复
npm run format      # Prettier 格式化
npm run alova-gen   # 从 Alova 配置生成 API
```

## 关键约定

1. **API 生成**: 使用 `npm run alova-gen` 从配置生成类型化 API 方法
2. **类型定义**: 自动生成在 `src/auto-import.d.ts` 和 `src/uni-pages.d.ts`
3. **全局组件**: 通过 vite.config.ts 中的 unplugin-vue-components 注册
4. **计划文件**: Plan mode 生成的实现计划统一保存到 `docs/superpowers/plans/`，命名格式 `YYYY-MM-DD-<feature-name>.md`

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## 可用技能

- /office-hours - 头脑风暴新想法
- /plan-ceo-review - 评审商业计划
- /plan-eng-review - 评审技术架构
- /plan-design-review - 评审设计计划
- /design-consultation - 设计系统咨询
- /review - 代码审查
- /ship - 部署/创建PR
- /browse - 网页浏览（主要工具）
- /qa - 测试应用
- /qa-only - 仅测试
- /design-review - 视觉设计审查
- /setup-browser-cookies - 设置浏览器Cookie
- /retro - 回顾
- /investigate - 调试错误
- /document-release - 文档发布
- /codex - 额外审查
- /careful - 生产环境操作
- /freeze - 限制编辑范围
- /guard - 最大安全模式
- /unfreeze - 解除编辑限制
- /gstack-upgrade - 升级gstack
