# Article Downloader 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 独立的公众号文章批量下载脚本，输出带编号的结构化目录到 resources/raw/

**Architecture:** 从 baoyu-url-to-markdown skill 提取 CDP 捕获 + Defuddle/Legacy 双路径转换 + 媒体下载核心逻辑，外层增加多 URL 编排、自动编号、自定义目录结构

**Tech Stack:** TypeScript, Bun, Chrome CDP (WebSocket), Defuddle, Mozilla Readability, Turndown, jsdom, linkedom

---

## File Structure

```
scripts/article-downloader/
  package.json                  # 依赖声明
  index.ts                      # CLI 入口，多 URL 编排
  constants.ts                  # 超时、UA 等常量
  naming.ts                     # 编号管理 + 目录名生成（新增）
  capture.ts                    # Chrome CDP 页面捕获（从 cdp.ts + vendor 提取合并）
  convert.ts                    # HTML→Markdown 转换入口（从 html-to-markdown.ts 提取）
  defuddle-converter.ts         # Defuddle 转换器（直接复制）
  legacy-converter.ts           # Legacy 多策略转换器（直接复制）
  markdown-conversion-shared.ts # 共享类型和工具函数（直接复制）
  media.ts                      # 媒体下载 + 链接替换（直接复制）
```

**原 skill 对应关系：**
| 原文件 | 新文件 | 变更程度 |
|--------|--------|---------|
| `vendor/baoyu-chrome-cdp/src/index.ts` + `cdp.ts` | `capture.ts` | 合并，去掉 vendor 分层 |
| `paths.ts` | `constants.ts` | 精简，去掉 URL_DATA_DIR 等不需要的 |
| `main.ts` | `index.ts` + `naming.ts` | 重写编排逻辑 |
| `html-to-markdown.ts` | `convert.ts` | 提取 absolutizeUrlsScript + extractContent |
| `defuddle-converter.ts` | `defuddle-converter.ts` | 几乎原样 |
| `legacy-converter.ts` | `legacy-converter.ts` | 几乎原样 |
| `markdown-conversion-shared.ts` | `markdown-conversion-shared.ts` | 原样 |
| `media-localizer.ts` | `media.ts` | 原样 |

---

### Task 1: 项目初始化

**Files:**
- Create: `scripts/article-downloader/package.json`
- Create: `scripts/article-downloader/constants.ts`
- Create: `scripts/article-downloader/tsconfig.json`

- [ ] **Step 1: 创建目录和 package.json**

```bash
mkdir -p scripts/article-downloader
```

```json
{
  "name": "article-downloader",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "bun run index.ts"
  },
  "dependencies": {
    "@mozilla/readability": "^0.6.0",
    "defuddle": "^0.12.0",
    "jsdom": "^24.1.3",
    "linkedom": "^0.18.12",
    "turndown": "^7.2.2",
    "turndown-plugin-gfm": "^1.0.2"
  }
}
```

- [ ] **Step 2: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "."
  },
  "include": ["./*.ts"]
}
```

- [ ] **Step 3: 创建 constants.ts**

从原 skill 的 `constants.ts` + `paths.ts` 合并精简。去掉 `resolveUrlToMarkdownDataDir`（我们的输出目录由 CLI 参数控制），保留 Chrome profile 解析。

```typescript
import os from "node:os";
import path from "node:path";
import process from "node:process";

// Chrome profile 目录
function resolveUserDataRoot(): string {
  if (process.platform === "win32") {
    return process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support");
  }
  return process.env.XDG_DATA_HOME ?? path.join(os.homedir(), ".local", "share");
}

export const USER_DATA_DIR = process.env.ARTICLE_DOWNLOADER_CHROME_PROFILE?.trim()
  ? path.resolve(process.env.ARTICLE_DOWNLOADER_CHROME_PROFILE.trim())
  : path.join(resolveUserDataRoot(), "article-downloader", "chrome-profile");

export const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

export const DEFAULT_TIMEOUT_MS = 30_000;
export const CDP_CONNECT_TIMEOUT_MS = 15_000;
export const NETWORK_IDLE_TIMEOUT_MS = 1_500;
export const POST_LOAD_DELAY_MS = 800;
export const SCROLL_STEP_WAIT_MS = 600;
export const SCROLL_MAX_STEPS = 8;

// 默认输出目录（相对于项目根目录）
export const DEFAULT_OUTPUT_DIR = "resources/raw";
```

- [ ] **Step 4: 安装依赖**

```bash
cd scripts/article-downloader && bun install
```

Expected: `node_modules` 目录创建成功，lockb 文件生成

- [ ] **Step 5: 提交**

```bash
git add scripts/article-downloader/package.json scripts/article-downloader/constants.ts scripts/article-downloader/tsconfig.json scripts/article-downloader/bun.lock
git commit -m "feat(article-downloader): init project with dependencies and constants"
```

---

### Task 2: CDP 捕获模块

**Files:**
- Create: `scripts/article-downloader/capture.ts`

将原 skill 的 `vendor/baoyu-chrome-cdp/src/index.ts` + `cdp.ts` 合并为一个文件。包含：CdpConnection 类、Chrome 启动/发现、页面控制（waitForNetworkIdle、autoScroll、evaluateScript）。

- [ ] **Step 1: 创建 capture.ts**

从原 skill 两个文件合并，关键变更：
1. `import` 路径改为 `./constants.js`
2. Chrome 候选路径直接内联（不再从外部导入）
3. 去掉 `openPageSession`、`discoverRunningChromeDebugPort`、`getDefaultChromeUserDataDirs`、`resolveSharedChromeProfileDir` 等本脚本不用的函数

文件内容就是原 `vendor/baoyu-chrome-cdp/src/index.ts` 的全部代码 + 原 `cdp.ts` 的包装函数，合并后约 350 行。合并点：

```typescript
// ========== vendor/baoyu-chrome-cdp 核心代码 ==========
// 复制: sleep, getFreePort, findChromeExecutable, parseDevToolsActivePort,
//        findExistingChromeDebugPort, waitForChromeDebugPort,
//        CdpConnection, launchChrome, killChrome
// 变更: import { USER_DATA_DIR } from "./constants.js" 替代外部参数

// ========== cdp.ts 包装层 ==========
// 复制: findExistingChromePort, findChromeExecutable, launchChrome,
//        waitForNetworkIdle, waitForPageLoad, createTargetAndAttach,
//        navigateAndWait, evaluateScript, autoScroll
// 变更: import 从 "./constants.js" 导入
```

完整文件代码（合并后）：

```typescript
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import {
  USER_DATA_DIR,
  CDP_CONNECT_TIMEOUT_MS,
  NETWORK_IDLE_TIMEOUT_MS,
} from "./constants.js";

// ===================== Platform Candidates =====================

type PlatformCandidates = {
  darwin?: string[];
  win32?: string[];
  default: string[];
};

const CHROME_CANDIDATES: PlatformCandidates = {
  darwin: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ],
  win32: [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ],
  default: [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
    "/usr/bin/microsoft-edge",
  ],
};

// ===================== Utilities =====================

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getFreePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Unable to allocate a free TCP port.")));
        return;
      }
      const port = address.port;
      server.close((err) => {
        if (err) reject(err);
        else resolve(port);
      });
    });
  });
}

// ===================== Chrome Discovery =====================

function findChromeExecutable(): string | null {
  const envPath = process.env.ARTICLE_DOWNLOADER_CHROME_PATH?.trim();
  if (envPath && fs.existsSync(envPath)) return envPath;

  const candidates =
    process.platform === "darwin"
      ? CHROME_CANDIDATES.darwin ?? CHROME_CANDIDATES.default
      : process.platform === "win32"
        ? CHROME_CANDIDATES.win32 ?? CHROME_CANDIDATES.default
        : CHROME_CANDIDATES.default;

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

async function fetchJson<T = unknown>(url: string, timeoutMs = 5_000): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const response = await fetch(url, { redirect: "follow", signal: ctl.signal });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function isDebugPortReady(port: number, timeoutMs = 3_000): Promise<boolean> {
  try {
    const version = await fetchJson<{ webSocketDebuggerUrl?: string }>(
      `http://127.0.0.1:${port}/json/version`,
      timeoutMs
    );
    return !!version.webSocketDebuggerUrl;
  } catch {
    return false;
  }
}

function parseDevToolsActivePort(filePath: string): { port: number; wsPath: string } | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split(/\r?\n/);
    const port = Number.parseInt(lines[0]?.trim() ?? "", 10);
    const wsPath = lines[1]?.trim();
    if (port > 0 && wsPath) return { port, wsPath };
  } catch {}
  return null;
}

export async function findExistingChromePort(): Promise<number | null> {
  const parsed = parseDevToolsActivePort(path.join(USER_DATA_DIR, "DevToolsActivePort"));
  if (parsed && parsed.port > 0 && (await isDebugPortReady(parsed.port))) return parsed.port;

  if (process.platform === "win32") return null;

  try {
    const result = spawnSync("ps", ["aux"], { encoding: "utf-8", timeout: 5_000 });
    if (result.status !== 0 || !result.stdout) return null;
    const lines = result.stdout
      .split("\n")
      .filter((line) => line.includes(USER_DATA_DIR) && line.includes("--remote-debugging-port="));
    for (const line of lines) {
      const portMatch = line.match(/--remote-debugging-port=(\d+)/);
      const port = Number.parseInt(portMatch?.[1] ?? "", 10);
      if (port > 0 && (await isDebugPortReady(port))) return port;
    }
  } catch {}
  return null;
}

export async function waitForChromeDebugPort(port: number, timeoutMs: number): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const version = await fetchJson<{ webSocketDebuggerUrl?: string }>(
        `http://127.0.0.1:${port}/json/version`,
        5_000
      );
      if (version.webSocketDebuggerUrl) return version.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error("Chrome debug port not ready");
}

// ===================== CdpConnection =====================

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout> | null;
};

export class CdpConnection {
  private ws: WebSocket;
  private nextId = 0;
  private pending = new Map<number, PendingRequest>();
  private eventHandlers = new Map<string, Set<(params: unknown) => void>>();
  private defaultTimeoutMs: number;

  private constructor(ws: WebSocket, defaultTimeoutMs = 15_000) {
    this.ws = ws;
    this.defaultTimeoutMs = defaultTimeoutMs;

    this.ws.addEventListener("message", (event) => {
      try {
        const data =
          typeof event.data === "string"
            ? event.data
            : new TextDecoder().decode(event.data as ArrayBuffer);
        const msg = JSON.parse(data) as {
          id?: number;
          method?: string;
          params?: unknown;
          result?: unknown;
          error?: { message?: string };
        };

        if (msg.method) {
          const handlers = this.eventHandlers.get(msg.method);
          if (handlers) {
            handlers.forEach((handler) => handler(msg.params));
          }
        }

        if (msg.id) {
          const pending = this.pending.get(msg.id);
          if (pending) {
            this.pending.delete(msg.id);
            if (pending.timer) clearTimeout(pending.timer);
            if (msg.error?.message) pending.reject(new Error(msg.error.message));
            else pending.resolve(msg.result);
          }
        }
      } catch {}
    });

    this.ws.addEventListener("close", () => {
      for (const [, pending] of this.pending.entries()) {
        if (pending.timer) clearTimeout(pending.timer);
        pending.reject(new Error("CDP connection closed."));
      }
      this.pending.clear();
    });
  }

  static async connect(url: string, timeoutMs: number): Promise<CdpConnection> {
    const ws = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("CDP connection timeout.")), timeoutMs);
      ws.addEventListener("open", () => {
        clearTimeout(timer);
        resolve();
      });
      ws.addEventListener("error", () => {
        clearTimeout(timer);
        reject(new Error("CDP connection failed."));
      });
    });
    return new CdpConnection(ws);
  }

  on(method: string, handler: (params: unknown) => void): void {
    if (!this.eventHandlers.has(method)) {
      this.eventHandlers.set(method, new Set());
    }
    this.eventHandlers.get(method)?.add(handler);
  }

  off(method: string, handler: (params: unknown) => void): void {
    this.eventHandlers.get(method)?.delete(handler);
  }

  async send<T = unknown>(
    method: string,
    params?: Record<string, unknown>,
    options?: { sessionId?: string; timeoutMs?: number }
  ): Promise<T> {
    const id = ++this.nextId;
    const message: Record<string, unknown> = { id, method };
    if (params) message.params = params;
    if (options?.sessionId) message.sessionId = options.sessionId;

    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;
    const result = await new Promise<unknown>((resolve, reject) => {
      const timer = timeoutMs > 0
        ? setTimeout(() => {
            this.pending.delete(id);
            reject(new Error(`CDP timeout: ${method}`));
          }, timeoutMs)
        : null;
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify(message));
    });

    return result as T;
  }

  close(): void {
    try {
      this.ws.close();
    } catch {}
  }
}

// ===================== Chrome Launch =====================

export async function launchChrome(url: string, port: number): Promise<ChildProcess> {
  const chromePath = findChromeExecutable();
  if (!chromePath) throw new Error("Chrome not found. Install Chrome or set ARTICLE_DOWNLOADER_CHROME_PATH.");

  await fs.promises.mkdir(USER_DATA_DIR, { recursive: true });

  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-popup-blocking",
    url,
  ];

  return spawn(chromePath, args, { stdio: "ignore" });
}

export function killChrome(chrome: ChildProcess): void {
  try {
    chrome.kill("SIGTERM");
  } catch {}
  setTimeout(() => {
    if (!chrome.killed) {
      try { chrome.kill("SIGKILL"); } catch {}
    }
  }, 2_000).unref?.();
}

// ===================== Page Control =====================

export async function waitForNetworkIdle(
  cdp: CdpConnection,
  sessionId: string,
  timeoutMs: number = NETWORK_IDLE_TIMEOUT_MS
): Promise<void> {
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pending = 0;
    const cleanup = () => {
      if (timer) clearTimeout(timer);
      cdp.off("Network.requestWillBeSent", onRequest);
      cdp.off("Network.loadingFinished", onFinish);
      cdp.off("Network.loadingFailed", onFinish);
    };
    const done = () => { cleanup(); resolve(); };
    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(done, timeoutMs);
    };
    const onRequest = () => { pending++; resetTimer(); };
    const onFinish = () => { pending = Math.max(0, pending - 1); if (pending <= 2) resetTimer(); };
    cdp.on("Network.requestWillBeSent", onRequest);
    cdp.on("Network.loadingFinished", onFinish);
    cdp.on("Network.loadingFailed", onFinish);
    resetTimer();
  });
}

export async function waitForPageLoad(
  cdp: CdpConnection,
  sessionId: string,
  timeoutMs: number = 30_000
): Promise<void> {
  void sessionId;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      cdp.off("Page.loadEventFired", handler);
      resolve();
    }, timeoutMs);
    const handler = () => {
      clearTimeout(timer);
      cdp.off("Page.loadEventFired", handler);
      resolve();
    };
    cdp.on("Page.loadEventFired", handler);
  });
}

export async function evaluateScript<T>(
  cdp: CdpConnection,
  sessionId: string,
  expression: string,
  timeoutMs: number = 30_000
): Promise<T> {
  const result = await cdp.send<{ result: { value?: T } }>(
    "Runtime.evaluate",
    { expression, returnByValue: true, awaitPromise: true },
    { sessionId, timeoutMs }
  );
  return result.result.value as T;
}

export async function autoScroll(
  cdp: CdpConnection,
  sessionId: string,
  steps: number,
  waitMs: number
): Promise<void> {
  let lastHeight = await evaluateScript<number>(cdp, sessionId, "document.body.scrollHeight");
  for (let i = 0; i < steps; i++) {
    await evaluateScript<void>(cdp, sessionId, "window.scrollTo(0, document.body.scrollHeight)");
    await sleep(waitMs);
    const newHeight = await evaluateScript<number>(cdp, sessionId, "document.body.scrollHeight");
    if (newHeight === lastHeight) break;
    lastHeight = newHeight;
  }
  await evaluateScript<void>(cdp, sessionId, "window.scrollTo(0, 0)");
}
```

- [ ] **Step 2: 验证 TypeScript 编译无错**

```bash
cd scripts/article-downloader && bun run --bun tsc --noEmit capture.ts
```

Expected: 无错误输出

- [ ] **Step 3: 提交**

```bash
git add scripts/article-downloader/capture.ts
git commit -m "feat(article-downloader): add Chrome CDP capture module"
```

---

### Task 3: Markdown 转换模块（三个文件）

**Files:**
- Create: `scripts/article-downloader/markdown-conversion-shared.ts`
- Create: `scripts/article-downloader/defuddle-converter.ts`
- Create: `scripts/article-downloader/legacy-converter.ts`

这三个文件从原 skill 直接复制，仅修改 import 路径（`./xxx.js` → `./xxx.js`，实际无需改动因为文件名不变）。

- [ ] **Step 1: 复制 markdown-conversion-shared.ts**

原样复制。无 import 变更。

- [ ] **Step 2: 复制 defuddle-converter.ts**

原样复制。import 已经是 `./markdown-conversion-shared.js`，无需改动。

- [ ] **Step 3: 复制 legacy-converter.ts**

原样复制。import 已经是 `./markdown-conversion-shared.js`，无需改动。

- [ ] **Step 4: 验证编译**

```bash
cd scripts/article-downloader && bun run --bun tsc --noEmit
```

Expected: 无错误输出

- [ ] **Step 5: 提交**

```bash
git add scripts/article-downloader/markdown-conversion-shared.ts scripts/article-downloader/defuddle-converter.ts scripts/article-downloader/legacy-converter.ts
git commit -m "feat(article-downloader): add markdown conversion pipeline"
```

---

### Task 4: 转换入口 + 媒体下载

**Files:**
- Create: `scripts/article-downloader/convert.ts`
- Create: `scripts/article-downloader/media.ts`

- [ ] **Step 1: 创建 convert.ts**

从原 `html-to-markdown.ts` 提取，去掉 `isYouTubeUrl`、`shouldPreferDefuddle` 等不需要的逻辑。保留核心：`absolutizeUrlsScript` + `extractContent`。

```typescript
import {
  createMarkdownDocument,
  extractMetadataFromHtml,
  type ConversionResult,
  type PageMetadata,
} from "./markdown-conversion-shared.js";
import { tryDefuddleConversion } from "./defuddle-converter.js";
import {
  convertWithLegacyExtractor,
  scoreMarkdownQuality,
  shouldCompareWithLegacy,
} from "./legacy-converter.js";

export type { ConversionResult, PageMetadata };
export { createMarkdownDocument };

export const absolutizeUrlsScript = String.raw`
(function() {
  const baseUrl = document.baseURI || location.href;
  const htmlClone = document.documentElement.cloneNode(true);

  function materializeShadowDom(sourceRoot, cloneRoot) {
    const sourceElements = Array.from(sourceRoot.querySelectorAll("*"));
    const cloneElements = Array.from(cloneRoot.querySelectorAll("*"));

    for (let i = sourceElements.length - 1; i >= 0; i--) {
      const sourceEl = sourceElements[i];
      const cloneEl = cloneElements[i];
      const shadowRoot = sourceEl && sourceEl.shadowRoot;
      if (!shadowRoot || !cloneEl || !shadowRoot.innerHTML) continue;

      if (cloneEl.tagName && cloneEl.tagName.includes("-")) {
        const wrapper = document.createElement("div");
        wrapper.setAttribute("data-shadow-host", cloneEl.tagName.toLowerCase());
        wrapper.innerHTML = shadowRoot.innerHTML;
        cloneEl.replaceWith(wrapper);
      } else {
        cloneEl.innerHTML = shadowRoot.innerHTML;
      }
    }
  }

  function toAbsolute(url) {
    if (!url) return url;
    try { return new URL(url, baseUrl).href; } catch { return url; }
  }

  function absAttr(root, sel, attr) {
    root.querySelectorAll(sel).forEach(el => {
      const v = el.getAttribute(attr);
      if (v) {
        const a = toAbsolute(v);
        if (a) el.setAttribute(attr, a);
      }
    });
  }

  function absSrcset(root, sel) {
    root.querySelectorAll(sel).forEach(el => {
      const s = el.getAttribute("srcset");
      if (!s) return;
      el.setAttribute("srcset", s.split(",").map(p => {
        const t = p.trim();
        if (!t) return "";
        const [url, ...d] = t.split(/\s+/);
        return d.length ? toAbsolute(url) + " " + d.join(" ") : toAbsolute(url);
      }).filter(Boolean).join(", "));
    });
  }

  materializeShadowDom(document.documentElement, htmlClone);

  htmlClone.querySelectorAll("img[data-src], video[data-src], audio[data-src], source[data-src]").forEach(el => {
    const ds = el.getAttribute("data-src");
    if (ds && (!el.getAttribute("src") || el.getAttribute("src") === "" || el.getAttribute("src")?.startsWith("data:"))) {
      el.setAttribute("src", ds);
    }
  });

  absAttr(htmlClone, "a[href]", "href");
  absAttr(htmlClone, "img[src], video[src], audio[src], source[src], iframe[src]", "src");
  absAttr(htmlClone, "video[poster]", "poster");
  absSrcset(htmlClone, "img[srcset], source[srcset]");

  return { html: "<!doctype html>\n" + htmlClone.outerHTML };
})()
`;

export async function extractContent(html: string, url: string): Promise<ConversionResult> {
  const capturedAt = new Date().toISOString();
  const baseMetadata = extractMetadataFromHtml(html, url, capturedAt);

  const defuddleResult = await tryDefuddleConversion(html, url, baseMetadata);
  if (defuddleResult.ok) {
    if (shouldCompareWithLegacy(defuddleResult.result.markdown)) {
      const legacyResult = convertWithLegacyExtractor(html, baseMetadata);
      const legacyScore = scoreMarkdownQuality(legacyResult.markdown);
      const defuddleScore = scoreMarkdownQuality(defuddleResult.result.markdown);

      if (legacyScore > defuddleScore + 120) {
        return {
          ...legacyResult,
          fallbackReason: "Legacy extractor produced higher-quality markdown than Defuddle",
        };
      }
    }
    return defuddleResult.result;
  }

  const fallbackResult = convertWithLegacyExtractor(html, baseMetadata);
  return {
    ...fallbackResult,
    fallbackReason: defuddleResult.reason,
  };
}
```

- [ ] **Step 2: 复制 media.ts**

从原 `media-localizer.ts` 原样复制，无 import 变更（只用了 node 内置模块）。

- [ ] **Step 3: 验证编译**

```bash
cd scripts/article-downloader && bun run --bun tsc --noEmit
```

Expected: 无错误输出

- [ ] **Step 4: 提交**

```bash
git add scripts/article-downloader/convert.ts scripts/article-downloader/media.ts
git commit -m "feat(article-downloader): add HTML-to-Markdown converter and media localizer"
```

---

### Task 5: 编号管理模块

**Files:**
- Create: `scripts/article-downloader/naming.ts`

这是新增模块，负责自动编号和目录名生成。

- [ ] **Step 1: 创建 naming.ts**

```typescript
import fs from "node:fs";
import path from "node:path";

/**
 * 从页面标题生成安全的文件名片段。
 * 去除特殊字符，截断到 40 字符。
 */
export function sanitizeTitle(title: string): string {
  return title
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "")
    .trim()
    .slice(0, 40) || "untitled";
}

/**
 * 格式化日期为 YYMMDD。
 */
export function formatDateYYMMDD(date: Date = new Date()): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

/**
 * 扫描输出目录下已有的编号，返回下一个可用编号。
 * 目录名格式: 100001-YYMMDD-标题
 * 如果目录为空或不存在，返回 100001。
 */
export function getNextId(outputDir: string): number {
  if (!fs.existsSync(outputDir)) return 100001;

  const entries = fs.readdirSync(outputDir, { withFileTypes: true });
  let maxId = 100000;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const match = entry.name.match(/^(\d{6})-/);
    if (match) {
      const id = parseInt(match[1], 10);
      if (id > maxId) maxId = id;
    }
  }

  return maxId + 1;
}

/**
 * 生成目录名: 100001-260421-文章标题
 */
export function buildDirName(id: number, title: string, date?: Date): string {
  const idStr = String(id).padStart(6, "0");
  const dateStr = formatDateYYMMDD(date);
  const safeTitle = sanitizeTitle(title);
  return `${idStr}-${dateStr}-${safeTitle}`;
}

/**
 * 生成完整的输出路径。
 */
export function buildOutputPath(
  outputDir: string,
  id: number,
  title: string,
  date?: Date
): string {
  return path.join(outputDir, buildDirName(id, title, date));
}
```

- [ ] **Step 2: 验证编译**

```bash
cd scripts/article-downloader && bun run --bun tsc --noEmit naming.ts
```

Expected: 无错误输出

- [ ] **Step 3: 提交**

```bash
git add scripts/article-downloader/naming.ts
git commit -m "feat(article-downloader): add auto-numbering and directory naming"
```

---

### Task 6: CLI 入口 + 多 URL 编排

**Files:**
- Create: `scripts/article-downloader/index.ts`

这是最核心的新增文件，将所有模块组装起来。

- [ ] **Step 1: 创建 index.ts**

```typescript
import { createInterface } from "node:readline";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  CdpConnection,
  getFreePort,
  findExistingChromePort,
  launchChrome,
  killChrome,
  sleep,
  waitForChromeDebugPort,
  waitForNetworkIdle,
  waitForPageLoad,
  evaluateScript,
  autoScroll,
} from "./capture.js";
import { absolutizeUrlsScript, extractContent, createMarkdownDocument, type ConversionResult } from "./convert.js";
import { localizeMarkdownMedia, countRemoteMedia } from "./media.js";
import { getNextId, buildOutputPath } from "./naming.js";
import {
  DEFAULT_TIMEOUT_MS,
  CDP_CONNECT_TIMEOUT_MS,
  POST_LOAD_DELAY_MS,
  SCROLL_STEP_WAIT_MS,
  SCROLL_MAX_STEPS,
  DEFAULT_OUTPUT_DIR,
} from "./constants.js";

// ===================== Args =====================

interface Args {
  urls: string[];
  wait: boolean;
  timeout: number;
  downloadMedia: boolean;
  saveHtml: boolean;
  outputDir: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    urls: [],
    wait: false,
    timeout: DEFAULT_TIMEOUT_MS,
    downloadMedia: true,
    saveHtml: true,
    outputDir: DEFAULT_OUTPUT_DIR,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--wait" || arg === "-w") {
      args.wait = true;
    } else if (arg === "--timeout" || arg === "-t") {
      args.timeout = parseInt(argv[++i], 10) || DEFAULT_TIMEOUT_MS;
    } else if (arg === "--no-media") {
      args.downloadMedia = false;
    } else if (arg === "--no-html") {
      args.saveHtml = false;
    } else if (arg === "--output-dir" || arg === "-d") {
      args.outputDir = argv[++i];
    } else if (!arg.startsWith("-")) {
      args.urls.push(arg);
    }
  }
  return args;
}

// ===================== Single URL Capture =====================

async function waitForUserSignal(): Promise<void> {
  console.log("Page opened. Press Enter when ready to capture...");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await new Promise<void>((resolve) => {
    rl.once("line", () => { rl.close(); resolve(); });
  });
}

async function captureSingleUrl(
  url: string,
  args: Args
): Promise<ConversionResult> {
  const existingPort = await findExistingChromePort();
  const reusing = existingPort !== null;
  const port = existingPort ?? await getFreePort();
  const chrome = reusing ? null : await launchChrome(url, port);

  if (reusing) console.log(`  Reusing existing Chrome on port ${port}`);

  let cdp: CdpConnection | null = null;
  let targetId: string | null = null;
  try {
    const wsUrl = await waitForChromeDebugPort(port, 30_000);
    cdp = await CdpConnection.connect(wsUrl, CDP_CONNECT_TIMEOUT_MS);

    let sessionId: string;
    if (reusing) {
      const created = await cdp.send<{ targetId: string }>("Target.createTarget", { url });
      targetId = created.targetId;
      const attached = await cdp.send<{ sessionId: string }>("Target.attachToTarget", { targetId, flatten: true });
      sessionId = attached.sessionId;
      await cdp.send("Network.enable", {}, { sessionId });
      await cdp.send("Page.enable", {}, { sessionId });
    } else {
      const targets = await cdp.send<{ targetInfos: Array<{ targetId: string; type: string; url: string }> }>("Target.getTargets");
      const pageTarget = targets.targetInfos.find(t => t.type === "page" && t.url.startsWith("http"));
      if (!pageTarget) throw new Error("No page target found");
      targetId = pageTarget.targetId;
      const attached = await cdp.send<{ sessionId: string }>("Target.attachToTarget", { targetId, flatten: true });
      sessionId = attached.sessionId;
      await cdp.send("Network.enable", {}, { sessionId });
      await cdp.send("Page.enable", {}, { sessionId });
    }

    if (args.wait) {
      await waitForUserSignal();
    } else {
      console.log("  Waiting for page to load...");
      await Promise.race([waitForPageLoad(cdp, sessionId, 15_000), sleep(8_000)]);
      await waitForNetworkIdle(cdp, sessionId);
      await sleep(POST_LOAD_DELAY_MS);
      console.log("  Scrolling for lazy content...");
      await autoScroll(cdp, sessionId, SCROLL_MAX_STEPS, SCROLL_STEP_WAIT_MS);
      await sleep(POST_LOAD_DELAY_MS);
    }

    console.log("  Capturing page content...");
    const { html } = await evaluateScript<{ html: string }>(
      cdp, sessionId, absolutizeUrlsScript, args.timeout
    );

    return await extractContent(html, url);
  } finally {
    if (reusing) {
      if (cdp && targetId) {
        try { await cdp.send("Target.closeTarget", { targetId }, { timeoutMs: 5_000 }); } catch {}
      }
      if (cdp) cdp.close();
    } else {
      if (cdp) {
        try { await cdp.send("Browser.close", {}, { timeoutMs: 5_000 }); } catch {}
        cdp.close();
      }
      if (chrome) killChrome(chrome);
    }
  }
}

// ===================== Main =====================

interface DownloadResult {
  url: string;
  success: boolean;
  outputPath?: string;
  title?: string;
  error?: string;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  if (args.urls.length === 0) {
    console.error("Usage: bun run index.ts <url1> <url2> ... [options]");
    console.error("");
    console.error("Options:");
    console.error("  --wait            Wait for user confirmation before capturing");
    console.error("  --timeout <ms>    Page load timeout (default: 30000)");
    console.error("  --no-media        Don't download images");
    console.error("  --no-html         Don't save HTML snapshot");
    console.error("  --output-dir <d>  Output directory (default: resources/raw/)");
    process.exit(1);
  }

  const outputDir = path.resolve(args.outputDir);
  let nextId = getNextId(outputDir);
  const results: DownloadResult[] = [];

  console.log(`Downloading ${args.urls.length} article(s) to ${outputDir}`);
  console.log(`Starting ID: ${String(nextId).padStart(6, "0")}`);
  console.log("");

  for (let i = 0; i < args.urls.length; i++) {
    const url = args.urls[i];
    console.log(`[${i + 1}/${args.urls.length}] ${url}`);

    try {
      const conversionResult = await captureSingleUrl(url, args);
      const title = conversionResult.metadata.title || `untitled-${nextId}`;
      const articleDir = buildOutputPath(outputDir, nextId, title);

      await mkdir(articleDir, { recursive: true });

      // HTML 快照
      if (args.saveHtml) {
        const htmlPath = path.join(articleDir, "captured.html");
        await writeFile(htmlPath, conversionResult.rawHtml, "utf-8");
      }

      // Markdown 文档
      let document = createMarkdownDocument(conversionResult);

      // 媒体下载
      if (args.downloadMedia) {
        const mediaResult = await localizeMarkdownMedia(document, {
          markdownPath: path.join(articleDir, "article.md"),
          log: (msg) => console.log(`  ${msg}`),
        });
        document = mediaResult.markdown;
        if (mediaResult.downloadedImages > 0 || mediaResult.downloadedVideos > 0) {
          console.log(`  Downloaded: ${mediaResult.downloadedImages} images, ${mediaResult.downloadedVideos} videos`);
        }
      } else {
        const { images, videos } = countRemoteMedia(document);
        if (images > 0 || videos > 0) {
          console.log(`  Remote media: ${images} images, ${videos} videos (skipped)`);
        }
      }

      // 保存 Markdown
      const mdPath = path.join(articleDir, "article.md");
      await writeFile(mdPath, document, "utf-8");

      console.log(`  -> ${articleDir}`);
      console.log(`     Title: ${title}`);
      console.log(`     Method: ${conversionResult.conversionMethod}`);
      if (conversionResult.fallbackReason) {
        console.log(`     Fallback: ${conversionResult.fallbackReason}`);
      }

      results.push({ url, success: true, outputPath: articleDir, title });
      nextId++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  FAILED: ${message}`);
      results.push({ url, success: false, error: message });
    }

    console.log("");
  }

  // 汇总
  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log("=== Summary ===");
  console.log(`Success: ${succeeded}, Failed: ${failed}`);
  if (failed > 0) {
    console.log("Failed URLs:");
    for (const r of results.filter(r => !r.success)) {
      console.log(`  ${r.url}: ${r.error}`);
    }
  }
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
```

- [ ] **Step 2: 验证完整编译**

```bash
cd scripts/article-downloader && bun run --bun tsc --noEmit
```

Expected: 无错误输出

- [ ] **Step 3: 提交**

```bash
git add scripts/article-downloader/index.ts
git commit -m "feat(article-downloader): add CLI entry with multi-URL orchestration"
```

---

### Task 7: 端到端测试

**Files:** 无新文件

- [ ] **Step 1: 用单篇公众号文章测试**

```bash
bun run scripts/article-downloader/index.ts "https://mp.weixin.qq.com/s/Xmgnw20QFAlgrJ2sbRfq8g"
```

Expected:
- Chrome 启动并加载页面
- 输出目录 `resources/raw/100001-260421-年轻人不愿干的后厨炸鸡岗/`
- `article.md` 和 `captured.html` 存在
- `imgs/` 目录下有图片文件

- [ ] **Step 2: 验证编号递增**

再次运行同一命令，确认新目录编号为 `100002`。

- [ ] **Step 3: 测试多 URL**

```bash
bun run scripts/article-downloader/index.ts "https://mp.weixin.qq.com/s/url1" "https://mp.weixin.qq.com/s/url2"
```

Expected: 两个目录，编号连续递增。

- [ ] **Step 4: 测试 --no-media 和 --no-html 参数**

```bash
bun run scripts/article-downloader/index.ts "https://mp.weixin.qq.com/s/someurl" --no-media --no-html
```

Expected: 无 `imgs/` 目录，无 `captured.html` 文件。

- [ ] **Step 5: 最终提交**

如有修复，提交修复内容。
