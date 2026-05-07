import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import type { CandidateArticle, EvaluatedArticle } from "./types.js";
import { DEFAULT_CONFIG } from "./config.js";
import { generateCriteria } from "./criteria.js";
import { createClient, evaluateBatch } from "./evaluator.js";
import { loadExistingUrls, loadCandidates, getScannedSources, saveCandidates } from "./dedup.js";
import { connectChrome, randomDelay } from "./cdp-helpers.js";
import { scanAccount, scanKeyword } from "./scanner.js";
import { extractContent, createMarkdownDocument } from "../../article-downloader/convert.js";
import { localizeMarkdownMedia } from "../../article-downloader/media.js";
import { getNextId, buildOutputPath } from "../../article-downloader/naming.js";

interface DiscoverOptions {
  accountsOnly?: boolean;
  keywordsOnly?: boolean;
  maxPages?: number;
  clean?: boolean;
  saveHtml?: boolean;
  config?: typeof DEFAULT_CONFIG;
}

export async function discover(options: DiscoverOptions = {}): Promise<void> {
  const cfg = options.config ?? DEFAULT_CONFIG;
  const captureCache = new Map<string, string>();

  const criteria = await generateCriteria(cfg.outputDir);
  if (!criteria) {
    console.log("无入选标准，跳过发现");
    return;
  }

  let keywords = cfg.keywords;
  if (criteria.searchKeywords?.length) {
    keywords = criteria.searchKeywords;
    console.log(`使用 ${keywords.length} 个关键词`);
  }

  const existingUrls = loadExistingUrls(cfg.outputDir);
  const scannedSources = options.clean
    ? new Set<string>()
    : getScannedSources(loadCandidates(path.join(cfg.outputDir, "candidates.json")));

  let totalScanned = 0;
  let totalSaved = 0;
  const allEvaluated: EvaluatedArticle[] = [];

  const client = createClient();
  const rawDir = path.resolve(cfg.outputDir, "raw");
  let nextId = getNextId(rawDir);

  const candidatesPath = path.join(cfg.outputDir, "candidates.json");
  const candidates: CandidateArticle[] = options.clean ? [] : loadCandidates(candidatesPath);
  for (const c of candidates) existingUrls.add(c.url);

  const { cdp, sessionId, cleanup } = await connectChrome();

  try {
    if (!options.keywordsOnly) {
      const accounts = cfg.accounts.filter((name) => !scannedSources.has(`account:${name}`));
      for (let i = 0; i < accounts.length; i++) {
        const name = accounts[i];
        console.log(`[account ${i + 1}/${accounts.length}] ${name}`);

        const articles = await scanAccount(cdp, sessionId, name, cfg, existingUrls, captureCache);
        console.log(`  → ${articles.length} 篇新文章`);
        totalScanned += articles.length;

        if (articles.length > 0) {
          const result = await processBatch(articles, captureCache, client, criteria, rawDir, nextId, options.saveHtml);
          totalSaved += result.saved;
          nextId = result.nextId;
          allEvaluated.push(...result.evaluated);
          console.log(`  ✓ ${result.count} 篇入选`);
        }

        candidates.push(...articles);
        for (const a of articles) existingUrls.add(a.url);
        saveCandidates(candidatesPath, candidates);
        await randomDelay(cfg.scanDelayMs);
      }
    }

    if (!options.accountsOnly) {
      const remainingKeywords = keywords.filter((kw) => !scannedSources.has(`keyword:${kw}`));
      for (let i = 0; i < remainingKeywords.length; i++) {
        const kw = remainingKeywords[i];
        console.log(`[keyword ${i + 1}/${remainingKeywords.length}] "${kw}"`);

        const articles = await scanKeyword(
          cdp, sessionId, kw,
          options.maxPages ?? cfg.maxPages, cfg.dayLimit, cfg, existingUrls, captureCache,
        );
        totalScanned += articles.length;

        if (articles.length > 0) {
          const passed = await processBatch(articles, captureCache, client, criteria, rawDir, nextId, options.saveHtml);
          totalSaved += passed.saved;
          nextId = passed.nextId;
          allEvaluated.push(...passed.evaluated);
          console.log(`  → ${articles.length} 篇扫描，${passed.count} 篇入选`);
        }

        candidates.push(...articles);
        for (const a of articles) existingUrls.add(a.url);
        saveCandidates(candidatesPath, candidates);
        await randomDelay(cfg.scanDelayMs);
      }
    }

    console.log(`\n完成：${totalScanned} 篇扫描 / ${allEvaluated.filter((e) => e.pass).length} 篇入选 / ${totalSaved} 篇已保存`);
  } finally {
    await cleanup();
  }
}

interface BatchResult {
  count: number;
  saved: number;
  nextId: number;
  evaluated: EvaluatedArticle[];
}

async function processBatch(
  articles: CandidateArticle[],
  captureCache: Map<string, string>,
  client: ReturnType<typeof createClient>,
  criteria: Parameters<typeof evaluateBatch>[1],
  rawDir: string,
  startId: number,
  saveHtml?: boolean,
): Promise<BatchResult> {
  const evaluated = await evaluateBatch(client, criteria, articles);
  const passed = evaluated.filter((e) => e.pass).sort((a, b) => b.score - a.score);

  let saved = 0;
  let id = startId;

  for (const e of passed) {
    const html = captureCache.get(e.url);
    if (html) {
      await saveArticle(e, html, rawDir, id++, saveHtml ?? false);
      saved++;
    }
  }

  return { count: passed.length, saved, nextId: id, evaluated };
}

async function saveArticle(
  evaluated: EvaluatedArticle,
  html: string,
  rawDir: string,
  id: number,
  saveHtml: boolean,
): Promise<void> {
  try {
    const conversionResult = await extractContent(html, evaluated.url);
    const title = conversionResult.metadata.title || `untitled-${id}`;
    const articleDir = buildOutputPath(rawDir, id, title);
    await mkdir(articleDir, { recursive: true });

    if (saveHtml) {
      await writeFile(path.join(articleDir, "captured.html"), html, "utf-8");
    }

    let document = createMarkdownDocument(conversionResult);
    const mediaResult = await localizeMarkdownMedia(document, {
      markdownPath: path.join(articleDir, "article.md"),
      log: () => {},
    });
    document = mediaResult.markdown;

    await writeFile(path.join(articleDir, "article.md"), document, "utf-8");
    console.log(`  💾 ${id.toString().padStart(6, "0")} ${title.slice(0, 40)}`);
  } catch (err) {
    console.error(`  ✗ 保存失败: ${err instanceof Error ? err.message : String(err)}`);
  }
}
