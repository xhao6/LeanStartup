# Content Discoverer 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现公众号内容发现工具，自动扫描搜狗微信搜索并评估候选文章，输出 URL 列表供 article-downloader 消费。

**Architecture:** 两阶段工具——Phase 1 通过 Chrome CDP 扫描搜狗微信搜索收集候选文章元数据，Phase 2 通过 MiniMax LLM 评估候选文章是否符合入选标准。CDP 能力复用 article-downloader 的 capture.ts。

**Tech Stack:** TypeScript, @anthropic-ai/sdk (MiniMax), commander, gray-matter, Chrome CDP (via article-downloader)

---

## 文件结构

```
scripts/content-discoverer/
├── src/
│   ├── types.ts              # 所有类型定义
│   ├── config.ts             # 配置（公众号、关键词、选择器）
│   ├── cdp-helpers.ts        # CDP 辅助函数（导航、验证码检测、延迟）
│   ├── url-normalize.ts      # URL 归一化
│   ├── dedup.ts              # 去重：加载已有 URL 集合
│   ├── scanner.ts            # Phase 1: 扫描公众号 + 关键词
│   ├── criteria.ts           # 从存量文章总结入选标准
│   ├── evaluator.ts          # Phase 2: LLM 评估候选文章
│   └── index.ts              # CLI 入口（commander 子命令）
├── package.json
├── tsconfig.json
└── README.md
```

---

### Task 1: 项目脚手架 + 类型定义

**Files:**
- Create: `scripts/content-discoverer/package.json`
- Create: `scripts/content-discoverer/tsconfig.json`
- Create: `scripts/content-discoverer/src/types.ts`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "content-discoverer",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "npx tsx src/index.ts"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.52.0",
    "commander": "^13.1.0",
    "gray-matter": "^4.0.3"
  },
  "devDependencies": {
    "@types/node": "^22.15.0",
    "typescript": "^5.8.3",
    "tsx": "^4.19.0"
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
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: 创建 src/types.ts**

```typescript
export interface CandidateArticle {
  url: string;
  title: string;
  excerpt: string;
  date: string;
  source: string;
  scannedAt: string;
}

export interface SelectionCriteria {
  summary: string;
  coreThemes: string[];
  coreTags: string[];
  scoreDistribution: string;
  searchKeywords: string[];
  negativeSignals: string[];
  generatedAt: string;
}

export interface EvaluatedArticle {
  url: string;
  pass: boolean;
  score: number;
  reason: string;
}

export interface SogouSelectors {
  searchBox: string;
  searchButton: string;
  searchTypeAccount: string;
  searchTypeArticle: string;
  accountResult: string;
  articleItem: string;
  articleTitle: string;
  articleExcerpt: string;
  articleDate: string;
  articleUrl: string;
  loadMoreButton: string;
  captchaIndicator: string;
  timeSortTab: string;
}

export interface DiscoverConfig {
  accounts: string[];
  keywords: string[];
  maxPages: number;
  batchSize: number;
  scanDelayMs: [number, number];
  sogouSearchUrl: string;
  outputDir: string;
  selectors: SogouSelectors;
}
```

- [ ] **Step 4: 安装依赖并验证编译**

```bash
cd scripts/content-discoverer && npm install && npx tsc --noEmit
```

Expected: 无错误退出

- [ ] **Step 5: 提交**

```bash
git add scripts/content-discoverer/ && git commit -m "feat(content-discoverer): scaffold project with types"
```

---

### Task 2: 配置模块（config.ts）

**Files:**
- Create: `scripts/content-discoverer/src/config.ts`

- [ ] **Step 1: 创建 config.ts**

```typescript
import path from "node:path";
import type { DiscoverConfig } from "./types.js";

export const DEFAULT_CONFIG: DiscoverConfig = {
  accounts: [
    // 在此添加目标公众号名称
  ],
  keywords: [
    // 在此添加搜索关键词
  ],
  maxPages: 5,
  batchSize: 10,
  scanDelayMs: [3000, 5000],
  sogouSearchUrl: "https://weixin.sogou.com",
  outputDir: path.resolve(import.meta.dirname, "../../../resources"),
  selectors: {
    searchBox: "#query",
    searchButton: ".swz2",
    searchTypeAccount: "a[href*='type=1']",
    searchTypeArticle: "a[href*='type=2']",
    accountResult: ".txt-box h3 a",
    articleItem: ".news-list li",
    articleTitle: ".txt-box h3 a",
    articleExcerpt: ".txt-box p",
    articleDate: ".s-p .s2",
    articleUrl: ".txt-box h3 a[href]",
    loadMoreButton: ".load-more",
    captchaIndicator: "#captcha, .antispider",
    timeSortTab: "a[href*='sort=time']",
  },
};
```

- [ ] **Step 2: 验证编译**

```bash
cd scripts/content-discoverer && npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add scripts/content-discoverer/src/config.ts && git commit -m "feat(content-discoverer): add config with Sogou selectors"
```

---

### Task 3: CDP 辅助函数（cdp-helpers.ts）

**Files:**
- Create: `scripts/content-discoverer/src/cdp-helpers.ts`

此模块封装 CDP 交互：连接 Chrome、导航、验证码检测、随机延迟。从 `article-downloader/capture.ts` 导入已有能力。

- [ ] **Step 1: 创建 cdp-helpers.ts**

```typescript
import readline from "node:readline";
import {
  CdpConnection,
  evaluateScript,
  waitForPageLoad,
  waitForNetworkIdle,
  autoScroll,
  findExistingChromePort,
  sleep,
} from "../../article-downloader/capture.js";
import { DEFAULT_CONFIG } from "./config.js";

export { CdpConnection, evaluateScript, waitForPageLoad, waitForNetworkIdle, autoScroll, sleep };

export async function connectChrome(): Promise<{ cdp: CdpConnection; sessionId: string }> {
  const port = await findExistingChromePort();
  if (!port) {
    console.error("[!] 未检测到运行中的 Chrome 实例");
    console.error("    请先启动 Chrome 并开启远程调试：chrome.exe --remote-debugging-port=9222");
    process.exit(1);
  }

  const { waitForChromeDebugPort } = await import("../../article-downloader/capture.js");
  const wsUrl = await waitForChromeDebugPort(port, 15_000);
  const cdp = await CdpConnection.connect(wsUrl, 15_000);

  const target = await cdp.send<{ targetId: string }>("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send<{ sessionId: string }>("Target.attachToTarget", {
    targetId: target.targetId,
    flatten: true,
  });

  return { cdp, sessionId };
}

export async function navigateTo(cdp: CdpConnection, sessionId: string, url: string): Promise<void> {
  await cdp.send("Page.enable", undefined, { sessionId });
  await cdp.send("Network.enable", undefined, { sessionId });
  await cdp.send("Page.navigate", { url }, { sessionId });
  await waitForPageLoad(cdp, sessionId);
  await waitForNetworkIdle(cdp, sessionId);
}

export async function randomDelay(msRange?: [number, number]): Promise<void> {
  const [min, max] = msRange ?? DEFAULT_CONFIG.scanDelayMs;
  const delay = min + Math.random() * (max - min);
  await sleep(delay);
}

export async function detectCaptcha(cdp: CdpConnection, sessionId: string): Promise<boolean> {
  const url = await evaluateScript<string>(cdp, sessionId, "window.location.href");
  if (url.includes("/antispider/")) return true;

  const hasCaptcha = await evaluateScript<boolean>(
    cdp,
    sessionId,
    `!!document.querySelector('${DEFAULT_CONFIG.selectors.captchaIndicator}')`
  );
  return hasCaptcha;
}

let captchaCount = 0;

export async function handleCaptcha(cdp: CdpConnection, sessionId: string): Promise<void> {
  captchaCount++;
  if (captchaCount > 3) {
    console.error("[!] 验证码出现超过 3 次，终止扫描。已扫描结果已保存。");
    process.exit(1);
  }

  console.log("[!] 检测到验证码，请在浏览器中手动完成验证后按 Enter 继续...");
  await waitForEnter();
  await waitForPageLoad(cdp, sessionId);
  await waitForNetworkIdle(cdp, sessionId);
}

function waitForEnter(): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.once("line", () => {
      rl.close();
      resolve();
    });
  });
}
```

- [ ] **Step 2: 验证编译**

```bash
cd scripts/content-discoverer && npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add scripts/content-discoverer/src/cdp-helpers.ts && git commit -m "feat(content-discoverer): add CDP helpers with captcha handling"
```

---

### Task 4: URL 归一化（url-normalize.ts）

**Files:**
- Create: `scripts/content-discoverer/src/url-normalize.ts`

纯函数模块，无外部依赖，可单独测试。

- [ ] **Step 1: 创建 url-normalize.ts**

```typescript
import { URL } from "node:url";

const KEEP_PARAMS = new Set(["__biz", "mid", "idx"]);

export function normalizeWeChatUrl(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (url.hostname !== "mp.weixin.qq.com") return null;

  const clean = new URL(url.origin + url.pathname);
  for (const [key, value] of url.searchParams) {
    if (KEEP_PARAMS.has(key)) {
      clean.searchParams.set(key, value);
    }
  }

  const normalized = clean.toString();
  if (clean.searchParams.get("__biz") && clean.searchParams.get("mid") && clean.searchParams.get("idx")) {
    return normalized;
  }

  return null;
}

export function extractWeChatUrlFromSogou(href: string): string | null {
  if (href.includes("mp.weixin.qq.com")) {
    return normalizeWeChatUrl(href);
  }

  const urlParam = new URL(href, "https://weixin.sogou.com").searchParams.get("url");
  if (urlParam) {
    return normalizeWeChatUrl(urlParam);
  }

  return null;
}
```

- [ ] **Step 2: 验证编译**

```bash
cd scripts/content-discoverer && npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add scripts/content-discoverer/src/url-normalize.ts && git commit -m "feat(content-discoverer): add URL normalization for WeChat articles"
```

---

### Task 5: 去重工具（dedup.ts）

**Files:**
- Create: `scripts/content-discoverer/src/dedup.ts`

从 raw/processed 目录和已有 candidates.json 加载已存在的 URL 集合。

- [ ] **Step 1: 创建 dedup.ts**

```typescript
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { CandidateArticle } from "./types.js";
import { normalizeWeChatUrl } from "./url-normalize.js";

export function loadExistingUrls(resourcesDir: string): Set<string> {
  const urls = new Set<string>();

  // raw/ 目录：HTML 文件，从 <meta property="og:url"> 提取 URL
  const rawDir = path.join(resourcesDir, "raw");
  if (fs.existsSync(rawDir)) {
    const entries = fs.readdirSync(rawDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      for (const htmlFile of fs.readdirSync(path.join(rawDir, entry.name))) {
        if (!htmlFile.endsWith(".html")) continue;
        try {
          const html = fs.readFileSync(path.join(rawDir, entry.name, htmlFile), "utf-8");
          const match = html.match(/<meta\s+property="og:url"\s+content="([^"]+)"/);
          if (match) {
            const normalized = normalizeWeChatUrl(match[1]);
            if (normalized) urls.add(normalized);
          }
        } catch { /* skip */ }
      }
    }
  }

  // processed/ 目录：MD 文件，frontmatter 中 source_url 字段，文件名 {dirName}/{dirName}.md
  const processedDir = path.join(resourcesDir, "processed");
  if (fs.existsSync(processedDir)) {
    const entries = fs.readdirSync(processedDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const mdPath = path.join(processedDir, entry.name, `${entry.name}.md`);
      if (!fs.existsSync(mdPath)) continue;
      try {
        const content = fs.readFileSync(mdPath, "utf-8");
        const { data } = matter(content);
        if (data.source_url) {
          const normalized = normalizeWeChatUrl(data.source_url);
          if (normalized) urls.add(normalized);
        }
      } catch { /* skip */ }
    }
  }

  return urls;
}

export function loadCandidates(candidatesPath: string): CandidateArticle[] {
  if (!fs.existsSync(candidatesPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(candidatesPath, "utf-8"));
  } catch {
    return [];
  }
}

export function getScannedSources(candidates: CandidateArticle[]): Set<string> {
  return new Set(candidates.map((c) => c.source));
}

export function saveCandidates(candidatesPath: string, candidates: CandidateArticle[]): void {
  fs.writeFileSync(candidatesPath, JSON.stringify(candidates, null, 2), "utf-8");
}
```

- [ ] **Step 2: 验证编译**

```bash
cd scripts/content-discoverer && npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add scripts/content-discoverer/src/dedup.ts && git commit -m "feat(content-discoverer): add dedup utility for existing URLs"
```

---

### Task 6: 扫描器（scanner.ts）

**Files:**
- Create: `scripts/content-discoverer/src/scanner.ts`

最核心的模块：通过 CDP 操控搜狗微信搜索，扫描公众号和关键词。

- [ ] **Step 1: 创建 scanner.ts**

```typescript
import fs from "node:fs";
import path from "node:path";
import type { CdpConnection } from "../../article-downloader/capture.js";
import type { CandidateArticle, DiscoverConfig } from "./types.js";
import { DEFAULT_CONFIG } from "./config.js";
import { evaluateScript, autoScroll } from "../../article-downloader/capture.js";
import { connectChrome, navigateTo, randomDelay, detectCaptcha, handleCaptcha } from "./cdp-helpers.js";
import { extractWeChatUrlFromSogou } from "./url-normalize.js";
import { loadExistingUrls, loadCandidates, getScannedSources, saveCandidates } from "./dedup.js";

interface ScanOptions {
  accountsOnly?: boolean;
  keywordsOnly?: boolean;
  maxPages?: number;
  clean?: boolean;
  config?: DiscoverConfig;
}

export async function scan(options: ScanOptions = {}): Promise<void> {
  const cfg = options.config ?? DEFAULT_CONFIG;
  const candidatesPath = path.join(cfg.outputDir, "candidates.json");

  let candidates: CandidateArticle[] = options.clean ? [] : loadCandidates(candidatesPath);
  const scannedSources = getScannedSources(candidates);
  const existingUrls = loadExistingUrls(cfg.outputDir);
  for (const c of candidates) existingUrls.add(c.url);

  const { cdp, sessionId } = await connectChrome();

  try {
    if (!options.keywordsOnly) {
      const accounts = cfg.accounts.filter((name) => !scannedSources.has(`account:${name}`));
      for (let i = 0; i < accounts.length; i++) {
        const name = accounts[i];
        console.log(`[account ${scannedSources.size + i + 1}/${cfg.accounts.length}] ${name}`);
        const articles = await scanAccount(cdp, sessionId, name, cfg, existingUrls);
        console.log(`  → 已加载 ${articles.length} 篇新文章`);
        candidates.push(...articles);
        for (const a of articles) existingUrls.add(a.url);
        saveCandidates(candidatesPath, candidates);
        await randomDelay(cfg.scanDelayMs);
      }
    }

    if (!options.accountsOnly) {
      const keywords = cfg.keywords.filter((kw) => !scannedSources.has(`keyword:${kw}`));
      for (let i = 0; i < keywords.length; i++) {
        const kw = keywords[i];
        console.log(`[keyword ${i + 1}/${keywords.length}] "${kw}"`);
        const articles = await scanKeyword(cdp, sessionId, kw, options.maxPages ?? cfg.maxPages, cfg, existingUrls);
        console.log(`  → ${articles.length} 篇新文章`);
        candidates.push(...articles);
        for (const a of articles) existingUrls.add(a.url);
        saveCandidates(candidatesPath, candidates);
        await randomDelay(cfg.scanDelayMs);
      }
    }

    console.log(`\n扫描完成：共 ${candidates.length} 篇候选`);
  } finally {
    cdp.close();
  }
}

async function scanAccount(
  cdp: CdpConnection,
  sessionId: string,
  accountName: string,
  cfg: DiscoverConfig,
  existingUrls: Set<string>
): Promise<CandidateArticle[]> {
  await navigateTo(cdp, sessionId, cfg.sogouSearchUrl);
  await randomDelay();

  if (await detectCaptcha(cdp, sessionId)) await handleCaptcha(cdp, sessionId);

  await evaluateScript<void>(
    cdp, sessionId,
    `document.querySelector('${cfg.selectors.searchTypeAccount}')?.click()`
  );
  await randomDelay([500, 1000]);

  await evaluateScript<void>(
    cdp, sessionId,
    `const box = document.querySelector('${cfg.selectors.searchBox}'); box.value = '${accountName.replace(/'/g, "\\'")}'; box.dispatchEvent(new Event('input'))`
  );
  await evaluateScript<void>(
    cdp, sessionId,
    `document.querySelector('${cfg.selectors.searchButton}')?.click()`
  );
  await randomDelay([2000, 3000]);

  if (await detectCaptcha(cdp, sessionId)) await handleCaptcha(cdp, sessionId);

  const hasResult = await evaluateScript<boolean>(
    cdp, sessionId,
    `!!document.querySelector('${cfg.selectors.accountResult}')`
  );
  if (!hasResult) {
    console.log(`  ⚠ 未找到公众号 "${accountName}"，跳过`);
    return [];
  }

  await evaluateScript<void>(
    cdp, sessionId,
    `document.querySelector('${cfg.selectors.accountResult}')?.click()`
  );
  await randomDelay([2000, 3000]);

  if (await detectCaptcha(cdp, sessionId)) await handleCaptcha(cdp, sessionId);

  await autoScroll(cdp, sessionId, 8, 600);

  return extractArticlesFromPage(cdp, sessionId, `account:${accountName}`, cfg, existingUrls);
}

async function scanKeyword(
  cdp: CdpConnection,
  sessionId: string,
  keyword: string,
  maxPages: number,
  cfg: DiscoverConfig,
  existingUrls: Set<string>
): Promise<CandidateArticle[]> {
  const allArticles: CandidateArticle[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const searchUrl = `${cfg.sogouSearchUrl}/weixin?type=2&query=${encodeURIComponent(keyword)}&sort=time&page=${page}`;
    await navigateTo(cdp, sessionId, searchUrl);
    await randomDelay();

    if (await detectCaptcha(cdp, sessionId)) await handleCaptcha(cdp, sessionId);

    const articles = await extractArticlesFromPage(cdp, sessionId, `keyword:${keyword}`, cfg, existingUrls);
    console.log(`  第${page}页 → ${articles.length} 篇`);
    allArticles.push(...articles);
    if (articles.length === 0) break;
    await randomDelay(cfg.scanDelayMs);
  }

  return allArticles;
}

async function extractArticlesFromPage(
  cdp: CdpConnection,
  sessionId: string,
  source: string,
  cfg: DiscoverConfig,
  existingUrls: Set<string>
): Promise<CandidateArticle[]> {
  const raw = await evaluateScript<
    Array<{ href: string; title: string; excerpt: string; date: string }>
  >(
    cdp, sessionId,
    `Array.from(document.querySelectorAll('${cfg.selectors.articleItem}')).map(item => ({
      href: item.querySelector('${cfg.selectors.articleUrl}')?.href || '',
      title: (item.querySelector('${cfg.selectors.articleTitle}')?.textContent || '').trim(),
      excerpt: (item.querySelector('${cfg.selectors.articleExcerpt}')?.textContent || '').trim().slice(0, 100),
      date: (item.querySelector('${cfg.selectors.articleDate}')?.textContent || '').trim()
    }))`
  );

  const now = new Date().toISOString();
  const articles: CandidateArticle[] = [];

  for (const item of raw) {
    const url = extractWeChatUrlFromSogou(item.href);
    if (!url || existingUrls.has(url)) continue;
    if (!item.title) continue;

    articles.push({
      url,
      title: item.title,
      excerpt: item.excerpt,
      date: item.date,
      source,
      scannedAt: now,
    });
  }

  return articles;
}
```

- [ ] **Step 2: 验证编译**

```bash
cd scripts/content-discoverer && npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add scripts/content-discoverer/src/scanner.ts && git commit -m "feat(content-discoverer): implement scanner with account and keyword search"
```

---

### Task 7: 入选标准生成（criteria.ts）

**Files:**
- Create: `scripts/content-discoverer/src/criteria.ts`

从存量文章中提取标签、评分等特征，通过 LLM 总结入选标准。

- [ ] **Step 1: 创建 criteria.ts**

```typescript
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import matter from "gray-matter";
import Anthropic from "@anthropic-ai/sdk";
import type { SelectionCriteria } from "./types.js";
import { DEFAULT_CONFIG } from "./config.js";

const MINIMAX_BASE_URL = "https://api.minimaxi.com/anthropic";
const MINIMAX_MODEL = "MiniMax-M2.7";

const CRITERIA_SYSTEM_PROMPT = `你是一个内容分析专家。我会给你一批已入选的副业案例文章的特征数据。请分析这些文章的共同模式，总结出入选标准。

请输出 JSON（包含以下字段）：
{
  "summary": "入选标准的自然语言描述（2-3句话，说明什么样的文章值得入选）",
  "coreThemes": ["主题1", "主题2", ...],
  "coreTags": ["高频标签1", "高频标签2", ...],
  "scoreDistribution": "评分分布特征描述",
  "searchKeywords": ["搜索关键词1", "搜索关键词2", ...],
  "negativeSignals": ["排除信号1", "排除信号2", ...]
}

要求：
- coreThemes: 5-8个核心主题方向
- coreTags: 10-15个高频标签
- searchKeywords: 10-20个可用于搜索发现新文章的关键词
- negativeSignals: 5-8个应该排除的信号特征
- summary 要具体到可指导后续筛选`;

function createClient(): Anthropic {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) throw new Error("MINIMAX_API_KEY environment variable is required");
  return new Anthropic({ apiKey, baseURL: MINIMAX_BASE_URL });
}

interface ArticleFeatures {
  title: string;
  tags: string[];
  scoreTotal: number;
  summary: string;
  caseStoryExcerpt: string;
}

function extractFeaturesFromDir(processedDir: string): ArticleFeatures[] {
  if (!fs.existsSync(processedDir)) return [];

  const features: ArticleFeatures[] = [];
  const entries = fs.readdirSync(processedDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const mdPath = path.join(processedDir, entry.name, `${entry.name}.md`);
    if (!fs.existsSync(mdPath)) continue;

    try {
      const content = fs.readFileSync(mdPath, "utf-8");
      const { data, content: body } = matter(content);

      // 从 body 中提取吸睛标签
      const tagMatch = body.match(/## 吸睛标签\s*\n([\s\S]*?)(?=\n## |$)/);
      const tags = tagMatch?.[1]
        ?.split("\n")
        .map((l: string) => l.replace(/^[-*]\s*/, "").trim())
        .filter(Boolean) ?? [];

      // 从 body 中提取核心亮点作为 summary
      const highlightMatch = body.match(/## 核心亮点\s*\n([\s\S]*?)(?=\n## |$)/);
      const summary = highlightMatch?.[1]?.trim().slice(0, 200) ?? "";

      features.push({
        title: data.source_title ?? "",
        tags,
        scoreTotal: data.total_score ?? 0,
        summary,
        caseStoryExcerpt: (body.match(/## 案例故事\s*\n([\s\S]{0,300})/)?.[1] ?? "").trim(),
      });
    } catch { /* skip */ }
  }

  return features;
}

export async function generateCriteria(
  resourcesDir?: string,
  force = false
): Promise<SelectionCriteria | null> {
  const outputDir = resourcesDir ?? DEFAULT_CONFIG.outputDir;
  const criteriaPath = path.join(outputDir, "criteria.json");
  const processedDir = path.join(outputDir, "processed");

  if (!force && fs.existsSync(criteriaPath)) {
    return JSON.parse(fs.readFileSync(criteriaPath, "utf-8"));
  }

  const features = extractFeaturesFromDir(processedDir);
  if (features.length === 0) {
    console.log("无存量文章，跳过入选标准生成");
    return null;
  }

  console.log(`从 ${features.length} 篇存量文章中总结入选标准...`);

  const client = createClient();
  const featuresText = features
    .map((f) => `标题: ${f.title}\n标签: ${f.tags.join(", ")}\n总分: ${f.scoreTotal}\n摘要: ${f.summary}\n案例片段: ${f.caseStoryExcerpt}`)
    .join("\n---\n");

  const response = await client.messages.create({
    model: MINIMAX_MODEL,
    max_tokens: 2048,
    system: CRITERIA_SYSTEM_PROMPT,
    messages: [{ role: "user", content: `以下是 ${features.length} 篇已入选文章的特征：\n\n${featuresText}` }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("LLM 响应无文本块");

  const jsonMatch = textBlock.text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? textBlock.text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) throw new Error("无法解析 LLM 响应中的 JSON");

  const criteria: SelectionCriteria = {
    ...JSON.parse(jsonMatch[1].trim()),
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(criteriaPath, JSON.stringify(criteria, null, 2), "utf-8");
  console.log(`入选标准已保存到 ${criteriaPath}`);
  return criteria;
}
```

- [ ] **Step 2: 验证编译**

```bash
cd scripts/content-discoverer && npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add scripts/content-discoverer/src/criteria.ts && git commit -m "feat(content-discoverer): implement criteria generator from existing articles"
```

---

### Task 8: 评估器（evaluator.ts）

**Files:**
- Create: `scripts/content-discoverer/src/evaluator.ts`

批量将候选文章发给 LLM 评估，输出 URL 列表和元数据文件。

- [ ] **Step 1: 创建 evaluator.ts**

```typescript
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import Anthropic from "@anthropic-ai/sdk";
import type { CandidateArticle, EvaluatedArticle, SelectionCriteria } from "./types.js";
import { DEFAULT_CONFIG } from "./config.js";
import { generateCriteria } from "./criteria.js";
import { loadCandidates } from "./dedup.js";

const MINIMAX_BASE_URL = "https://api.minimaxi.com/anthropic";
const MINIMAX_MODEL = "MiniMax-M2.7";

function createClient(): Anthropic {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) throw new Error("MINIMAX_API_KEY environment variable is required");
  return new Anthropic({ apiKey, baseURL: MINIMAX_BASE_URL });
}

function buildSystemPrompt(criteria: SelectionCriteria): string {
  return `你是一个内容筛选专家。根据以下入选标准，评估候选文章是否值得入选。

## 入选标准
${criteria.summary}

## 核心主题
${criteria.coreThemes.join("、")}

## 评分参考
${criteria.scoreDistribution}

## 排除信号（出现以下特征的应排除）
${criteria.negativeSignals.map((s) => `- ${s}`).join("\n")}

## 输出格式
对每篇文章输出 JSON 数组，每个元素包含：
{
  "url": "原始URL",
  "pass": true/false,
  "score": 1-10的相关度评分,
  "reason": "一句话说明入选或排除理由"
}

只输出 JSON 数组，不要其他内容。`;
}

async function evaluateBatch(
  client: Anthropic,
  criteria: SelectionCriteria,
  batch: CandidateArticle[]
): Promise<EvaluatedArticle[]> {
  const articlesText = batch
    .map((a, i) => `[${i + 1}] 标题: ${a.title}\n    摘要: ${a.excerpt}\n    日期: ${a.date}\n    URL: ${a.url}`)
    .join("\n\n");

  let retries = 0;
  while (retries < 3) {
    try {
      const response = await client.messages.create({
        model: MINIMAX_MODEL,
        max_tokens: 2048,
        system: buildSystemPrompt(criteria),
        messages: [{ role: "user", content: `请评估以下 ${batch.length} 篇候选文章：\n\n${articlesText}` }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") throw new Error("LLM 响应无文本块");

      const jsonMatch = textBlock.text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? textBlock.text.match(/(\[[\s\S]*\])/);
      if (!jsonMatch) throw new Error("无法解析 LLM 响应中的 JSON");

      const parsed: EvaluatedArticle[] = JSON.parse(jsonMatch[1].trim());

      // 验证 LLM 返回：补全缺失项，确保 URL 匹配
      return batch.map((article, idx) => {
        const found = parsed.find((e) => e.url === article.url);
        return found ?? { url: article.url, pass: false, score: 0, reason: "LLM 未返回评估结果" };
      });
    } catch (err) {
      retries++;
      if (retries >= 3) throw err;
      const delay = 2000 * Math.pow(2, retries - 1);
      console.log(`  评估批次重试 ${retries}/3 (${delay}ms)...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  return [];
}

interface EvaluateOptions {
  refreshCriteria?: boolean;
  config?: typeof DEFAULT_CONFIG;
}

export async function evaluate(options: EvaluateOptions = {}): Promise<void> {
  const cfg = options.config ?? DEFAULT_CONFIG;
  const candidatesPath = path.join(cfg.outputDir, "candidates.json");

  if (!fs.existsSync(candidatesPath)) {
    console.error("错误：candidates.json 不存在，请先运行 scan");
    process.exit(1);
  }

  const candidates = loadCandidates(candidatesPath);
  if (candidates.length === 0) {
    console.log("无候选文章可评估");
    return;
  }

  const criteria = await generateCriteria(cfg.outputDir, options.refreshCriteria);
  if (!criteria) {
    console.log("无入选标准，将仅基于标题和摘要做相关性判断");
  }

  const defaultCriteria: SelectionCriteria = criteria ?? {
    summary: "适合普通用户的副业、创业、赚钱案例，有实操步骤",
    coreThemes: ["副业", "创业", "自媒体"],
    coreTags: [],
    scoreDistribution: "无参考",
    searchKeywords: [],
    negativeSignals: ["纯广告", "无实操步骤", "标题党"],
    generatedAt: new Date().toISOString(),
  };

  const client = createClient();
  const batchSize = cfg.batchSize;
  const allEvaluated: EvaluatedArticle[] = [];

  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    console.log(`评估批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(candidates.length / batchSize)} (${batch.length} 篇)...`);

    const results = await evaluateBatch(client, defaultCriteria, batch);
    allEvaluated.push(...results);

    if (i + batchSize < candidates.length) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  const passed = allEvaluated
    .filter((e) => e.pass)
    .sort((a, b) => b.score - a.score);

  const urlsPath = path.join(cfg.outputDir, "discovered-urls.txt");
  fs.writeFileSync(urlsPath, passed.map((e) => e.url).join("\n"), "utf-8");

  const metadataPath = path.join(cfg.outputDir, "discovered-metadata.json");
  fs.writeFileSync(metadataPath, JSON.stringify(passed, null, 2), "utf-8");

  console.log(`\n评估完成：${passed.length}/${candidates.length} 篇入选`);
  console.log(`URL 列表：${urlsPath}`);
  console.log(`元数据：${metadataPath}`);
}
```

- [ ] **Step 2: 验证编译**

```bash
cd scripts/content-discoverer && npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add scripts/content-discoverer/src/evaluator.ts && git commit -m "feat(content-discoverer): implement LLM-based evaluator with batch processing"
```

---

### Task 9: CLI 入口 + 手动模式 + README

**Files:**
- Create: `scripts/content-discoverer/src/index.ts`
- Create: `scripts/content-discoverer/README.md`
- Modify: `scripts/README.md` — 更新管道流程图

- [ ] **Step 1: 创建 index.ts**

```typescript
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { Command } from "commander";
import { scan } from "./scanner.js";
import { evaluate } from "./evaluator.js";
import { DEFAULT_CONFIG } from "./config.js";

function loadEnv(): void {
  const projectRoot = path.resolve(import.meta.dirname, "../../..");
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex > 0) {
      const key = trimmed.slice(0, eqIndex).trim();
      const val = trimmed.slice(eqIndex + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnv();

const program = new Command();

program
  .name("discover")
  .description("公众号内容发现工具：自动扫描并评估候选文章");

program
  .command("scan")
  .description("扫描公众号和关键词，收集候选文章")
  .option("--accounts-only", "仅扫描固定公众号")
  .option("--keywords-only", "仅关键词搜索")
  .option("--max-pages <n>", "关键词搜索最大翻页数", "5")
  .option("--clean", "清除已有候选，重新全量扫描")
  .action(async (opts) => {
    await scan({
      accountsOnly: opts.accountsOnly,
      keywordsOnly: opts.keywordsOnly,
      maxPages: parseInt(opts.maxPages, 10),
      clean: opts.clean,
    });
  });

program
  .command("evaluate")
  .description("评估候选文章，输出入选 URL 列表")
  .option("--refresh-criteria", "重新总结入选标准")
  .action(async (opts) => {
    await evaluate({
      refreshCriteria: opts.refreshCriteria,
    });
  });

program
  .command("manual")
  .description("手动模式：从 manual-urls.txt 读取 URL，跳过扫描直接进入评估")
  .action(async () => {
    const manualPath = path.join(DEFAULT_CONFIG.outputDir, "manual-urls.txt");
    if (!fs.existsSync(manualPath)) {
      console.error(`错误：${manualPath} 不存在`);
      console.error("请创建该文件，每行一个 mp.weixin.qq.com 的文章 URL");
      process.exit(1);
    }

    const urls = fs.readFileSync(manualPath, "utf-8")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      console.error("manual-urls.txt 为空");
      process.exit(1);
    }

    const now = new Date().toISOString();
    const candidates = urls.map((url) => ({
      url,
      title: "",
      excerpt: "",
      date: "",
      source: "manual",
      scannedAt: now,
    }));

    const candidatesPath = path.join(DEFAULT_CONFIG.outputDir, "candidates.json");
    fs.writeFileSync(candidatesPath, JSON.stringify(candidates, null, 2), "utf-8");
    console.log(`已从 manual-urls.txt 加载 ${urls.length} 个 URL`);

    await evaluate();
  });

program.parse();
```

- [ ] **Step 2: 创建 README.md**

```markdown
# Content Discoverer

公众号内容发现工具：自动扫描搜狗微信搜索并评估候选文章。

## 前置条件

1. Chrome 浏览器已开启远程调试：
   ```bash
   chrome.exe --remote-debugging-port=9222
   ```
2. 环境变量 `MINIMAX_API_KEY` 已配置（在项目根 `.env` 文件中）

## 使用

```bash
cd scripts/content-discoverer

# 扫描公众号 + 关键词
npx tsx src/index.ts scan

# 仅扫描公众号
npx tsx src/index.ts scan --accounts-only

# 仅关键词搜索（限制3页）
npx tsx src/index.ts scan --keywords-only --max-pages 3

# 清除已有候选，重新扫描
npx tsx src/index.ts scan --clean

# 评估候选文章
npx tsx src/index.ts evaluate

# 重新总结入选标准
npx tsx src/index.ts evaluate --refresh-criteria

# 手动模式（从 resources/manual-urls.txt 读取 URL）
npx tsx src/index.ts manual
```

## 输出文件

| 文件 | 说明 |
|------|------|
| `resources/candidates.json` | 候选文章列表（增量更新） |
| `resources/criteria.json` | 入选标准（从存量文章总结） |
| `resources/discovered-urls.txt` | 入选 URL 列表（每行一个） |
| `resources/discovered-metadata.json` | 入选文章评分和理由 |

## 配置

编辑 `src/config.ts` 中的 `accounts` 和 `keywords` 数组。
```

- [ ] **Step 3: 更新 scripts/README.md 的管道流程图**

在现有流程图中 `运营筛选 文章 URL` 前插入 content-discoverer 节点。

- [ ] **Step 4: 验证编译**

```bash
cd scripts/content-discoverer && npx tsc --noEmit
```

- [ ] **Step 5: 提交**

```bash
git add scripts/content-discoverer/ scripts/README.md && git commit -m "feat(content-discoverer): add CLI entry, manual mode, and README"
```
