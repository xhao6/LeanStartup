# Article Downloader

文章下载工具，使用 Chrome CDP (Chrome DevTools Protocol) 从微信公众号下载文章内容。

## 功能

- 通过 Chrome CDP 连接到本地 Chrome 浏览器
- 自动滚动页面加载完整内容
- 提取文章标题、正文内容
- 保存为 HTML 文件到 `resources/raw/` 目录

## 使用方法

### 1. 启动 Chrome 浏览器（带远程调试）

```bash
# Windows
chrome.exe --remote-debugging-port=9222

# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Linux
google-chrome --remote-debugging-port=9222
```

### 2. 运行下载脚本

```bash
cd scripts/article-downloader
node download.js <文章URL>
```

### 示例

```bash
node download.js "https://mp.weixin.qq.com/s/xxxxxxxxx"
```

### 输出

文件保存到：`resources/raw/<编号>/index.html`

## 技术实现

- 使用 [puppeteer-cluster](https://github.com/thomasdond/puppeteer-cluster) 并发控制
- Chrome CDP 协议通信
- 自动滚动加载完整内容
- 超时处理：最多滚动 50 次，每次间隔 500ms

## 注意事项

1. **必须先启动 Chrome 浏览器**并开启远程调试端口
2. **文章 URL** 必须是完整的微信公众号文章链接
3. **文件命名**：自动使用时间戳编号（如 1700000001）
4. **并发限制**：默认同时最多 2 个浏览器实例

## 依赖

- puppeteer-cluster
- chrome-remote-interface
- fs-extra

## 故障排查

### 问题：连接失败
```
Error: Failed to connect to Chrome
```
**解决**：确认 Chrome 已启动并开启了 `--remote-debugging-port=9222`

### 问题：内容不完整
**解决**：调整 `maxScrolls` 参数（默认 50 次）

### 问题：下载速度慢
**解决**：调整 `concurrency` 参数（默认 2）
