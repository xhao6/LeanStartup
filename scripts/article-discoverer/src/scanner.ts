import path from "node:path";
import type { CdpConnection } from "./cdp-helpers.js";
import {
  evaluateScript,
  autoScroll,
  connectChrome,
  navigateTo,
  randomDelay,
  detectCaptcha,
  handleCaptcha,
  resetCaptchaCount,
} from "./cdp-helpers.js";
import type { CandidateArticle, DiscoverConfig } from "./types.js";
import { DEFAULT_CONFIG } from "./config.js";
import { extractWeChatUrlFromSogou } from "./url-normalize.js";
import {
  loadExistingUrls,
  loadCandidates,
  getScannedSources,
  saveCandidates,
} from "./dedup.js";

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

  let candidates: CandidateArticle[] = options.clean
    ? []
    : loadCandidates(candidatesPath);
  const scannedSources = getScannedSources(candidates);
  const existingUrls = loadExistingUrls(cfg.outputDir);
  for (const c of candidates) existingUrls.add(c.url);

  resetCaptchaCount();
  const { cdp, sessionId, targetId } = await connectChrome();

  try {
    if (!options.keywordsOnly) {
      const accounts = cfg.accounts.filter(
        (name) => !scannedSources.has(`account:${name}`),
      );
      for (let i = 0; i < accounts.length; i++) {
        const name = accounts[i];
        console.log(`[account ${i + 1}/${accounts.length}] ${name}`);
        const articles = await scanAccount(
          cdp,
          sessionId,
          name,
          cfg,
          existingUrls,
        );
        console.log(`  → 已加载 ${articles.length} 篇新文章`);
        candidates.push(...articles);
        for (const a of articles) existingUrls.add(a.url);
        saveCandidates(candidatesPath, candidates);
        await randomDelay(cfg.scanDelayMs);
      }
    }

    if (!options.accountsOnly) {
      const keywords = cfg.keywords.filter(
        (kw) => !scannedSources.has(`keyword:${kw}`),
      );
      for (let i = 0; i < keywords.length; i++) {
        const kw = keywords[i];
        console.log(`[keyword ${i + 1}/${keywords.length}] "${kw}"`);
        const articles = await scanKeyword(
          cdp,
          sessionId,
          kw,
          options.maxPages ?? cfg.maxPages,
          cfg,
          existingUrls,
        );
        console.log(`  → ${articles.length} 篇新文章`);
        candidates.push(...articles);
        for (const a of articles) existingUrls.add(a.url);
        saveCandidates(candidatesPath, candidates);
        await randomDelay(cfg.scanDelayMs);
      }
    }

    console.log(`\n扫描完成：共 ${candidates.length} 篇候选`);
  } finally {
    try {
      await cdp.send("Target.closeTarget", { targetId });
    } catch {
      /* ignore */
    }
    cdp.close();
  }
}

async function scanAccount(
  cdp: CdpConnection,
  sessionId: string,
  accountName: string,
  cfg: DiscoverConfig,
  existingUrls: Set<string>,
): Promise<CandidateArticle[]> {
  await navigateTo(cdp, sessionId, cfg.sogouSearchUrl);
  await randomDelay();

  if (await detectCaptcha(cdp, sessionId)) await handleCaptcha(cdp, sessionId);

  await evaluateScript<void>(
    cdp,
    sessionId,
    `document.querySelector('${cfg.selectors.searchTypeAccount}')?.click()`,
  );
  await randomDelay([500, 1000]);

  await evaluateScript<void>(
    cdp,
    sessionId,
    `const box = document.querySelector('${cfg.selectors.searchBox}'); box.value = '${accountName.replace(/'/g, "\\'")}'; box.dispatchEvent(new Event('input'))`,
  );
  await evaluateScript<void>(
    cdp,
    sessionId,
    `document.querySelector('${cfg.selectors.searchButton}')?.click()`,
  );
  await randomDelay([2000, 3000]);

  if (await detectCaptcha(cdp, sessionId)) await handleCaptcha(cdp, sessionId);

  const hasResult = await evaluateScript<boolean>(
    cdp,
    sessionId,
    `!!document.querySelector('${cfg.selectors.accountResult}')`,
  );
  if (!hasResult) {
    console.log(`  ⚠ 未找到公众号 "${accountName}"，跳过`);
    return [];
  }

  await evaluateScript<void>(
    cdp,
    sessionId,
    `document.querySelector('${cfg.selectors.accountResult}')?.click()`,
  );
  await randomDelay([2000, 3000]);

  if (await detectCaptcha(cdp, sessionId)) await handleCaptcha(cdp, sessionId);

  await autoScroll(cdp, sessionId, 8, 600);

  return extractArticlesFromPage(
    cdp,
    sessionId,
    `account:${accountName}`,
    cfg,
    existingUrls,
  );
}

async function scanKeyword(
  cdp: CdpConnection,
  sessionId: string,
  keyword: string,
  maxPages: number,
  cfg: DiscoverConfig,
  existingUrls: Set<string>,
): Promise<CandidateArticle[]> {
  const allArticles: CandidateArticle[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const searchUrl = `${cfg.sogouSearchUrl}/weixin?type=2&query=${encodeURIComponent(keyword)}&sort=time&page=${page}`;
    await navigateTo(cdp, sessionId, searchUrl);
    await randomDelay();

    if (await detectCaptcha(cdp, sessionId))
      await handleCaptcha(cdp, sessionId);

    const articles = await extractArticlesFromPage(
      cdp,
      sessionId,
      `keyword:${keyword}`,
      cfg,
      existingUrls,
    );
    console.log(`  第${page}页 → ${articles.length} 篇`);
    allArticles.push(...articles);
    for (const a of articles) existingUrls.add(a.url);
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
  existingUrls: Set<string>,
): Promise<CandidateArticle[]> {
  const raw = await evaluateScript<
    Array<{ href: string; title: string; excerpt: string; date: string }>
  >(
    cdp,
    sessionId,
    `Array.from(document.querySelectorAll('${cfg.selectors.articleItem}')).map(item => ({
      href: item.querySelector('${cfg.selectors.articleUrl}')?.href || '',
      title: (item.querySelector('${cfg.selectors.articleTitle}')?.textContent || '').trim(),
      excerpt: (item.querySelector('${cfg.selectors.articleExcerpt}')?.textContent || '').trim().slice(0, 100),
      date: (item.querySelector('${cfg.selectors.articleDate}')?.textContent || '').trim()
    }))`,
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
