import fs from "node:fs";
import path from "node:path";
import {
  CdpConnection,
  evaluateScript,
  autoScroll,
  connectChrome,
  navigateTo,
  randomDelay,
  detectCaptcha,
  handleCaptcha,
  resetCaptchaCount,
  sleep,
} from "./cdp-helpers.js";
import type { CandidateArticle, DiscoverConfig, SelectionCriteria } from "./types.js";
import { DEFAULT_CONFIG } from "./config.js";
import { extractWeChatUrlFromSogou, normalizeWeChatUrl } from "./url-normalize.js";
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
  captureCache?: Map<string, string>;
}

export async function scan(options: ScanOptions = {}): Promise<void> {
  const cfg = options.config ?? DEFAULT_CONFIG;
  const candidatesPath = path.join(cfg.outputDir, "candidates.json");

  // Load keywords from criteria.json if available
  let keywords = cfg.keywords;
  const criteriaPath = path.join(cfg.outputDir, "criteria.json");
  if (fs.existsSync(criteriaPath)) {
    try {
      const criteria: SelectionCriteria = JSON.parse(fs.readFileSync(criteriaPath, "utf-8"));
      if (criteria.searchKeywords?.length) {
        keywords = criteria.searchKeywords;
        console.log(`  从 criteria.json 加载 ${keywords.length} 个关键词`);
      }
    } catch { /* ignore */ }
  }

  let candidates: CandidateArticle[] = options.clean
    ? []
    : loadCandidates(candidatesPath);
  const scannedSources = getScannedSources(candidates);
  const existingUrls = loadExistingUrls(cfg.outputDir);
  for (const c of candidates) existingUrls.add(c.url);

  resetCaptchaCount();
  const { cdp, sessionId, cleanup } = await connectChrome();

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
          options.captureCache,
        );
        console.log(`  → 已加载 ${articles.length} 篇新文章`);
        candidates.push(...articles);
        for (const a of articles) existingUrls.add(a.url);
        saveCandidates(candidatesPath, candidates);
        await randomDelay(cfg.scanDelayMs);
      }
    }

    if (!options.accountsOnly) {
      const remainingKeywords = keywords.filter(
        (kw) => !scannedSources.has(`keyword:${kw}`),
      );
      for (let i = 0; i < remainingKeywords.length; i++) {
        const kw = remainingKeywords[i];
        console.log(`[keyword ${i + 1}/${remainingKeywords.length}] "${kw}"`);[i];
        console.log(`[keyword ${i + 1}/${keywords.length}] "${kw}"`);
        const articles = await scanKeyword(
          cdp,
          sessionId,
          kw,
          options.maxPages ?? cfg.maxPages,
          cfg.dayLimit,
          cfg,
          existingUrls,
          options.captureCache,
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
    await cleanup();
  }
}

export async function scanAccount(
  cdp: CdpConnection,
  sessionId: string,
  accountName: string,
  cfg: DiscoverConfig,
  existingUrls: Set<string>,
  captureCache?: Map<string, string>,
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
    captureCache,
  );
}

export async function scanKeyword(
  cdp: CdpConnection,
  sessionId: string,
  keyword: string,
  maxPages: number,
  dayLimit: number,
  cfg: DiscoverConfig,
  existingUrls: Set<string>,
  captureCache?: Map<string, string>,
): Promise<CandidateArticle[]> {
  const allArticles: CandidateArticle[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const searchUrl = `${cfg.sogouSearchUrl}/weixin?type=2&query=${encodeURIComponent(keyword)}&sort=time&dr=${dayLimit}&page=${page}`;
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
      captureCache,
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
  captureCache?: Map<string, string>,
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
      date: (() => { const el = item.querySelector('${cfg.selectors.articleDate}'); if (!el) return ''; const t = el.textContent.trim(); const abs = t.match(/(\\d{4}[\\/-]\\d{1,2}[\\/-]\\d{1,2})/); if (abs) return abs[1]; const dm = t.match(/(\\d+)\\s*天前/); if (dm) return new Date(Date.now() - parseInt(dm[1]) * 86400000).toISOString().slice(0,10); const wm = t.match(/(\\d+)\\s*周前/); if (wm) return new Date(Date.now() - parseInt(wm[1]) * 7 * 86400000).toISOString().slice(0,10); const mm = t.match(/(\\d+)\\s*个月前/); if (mm) return new Date(Date.now() - parseInt(mm[1]) * 30 * 86400000).toISOString().slice(0,10); const yd = t.match(/昨天/); if (yd) return new Date(Date.now() - 86400000).toISOString().slice(0,10); return t; })()
    }))`,
  );

  const now = new Date().toISOString();
  const articles: CandidateArticle[] = [];

  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  for (const item of raw) {
    if (!item.title) continue;

    // Skip articles older than 90 days
    if (item.date) {
      const d = new Date(item.date.replace(/\//g, "-"));
      if (!isNaN(d.getTime()) && d < cutoff) continue;
    }

    // Try direct URL parsing first
    let url = extractWeChatUrlFromSogou(item.href);

    // If not a direct WeChat URL, resolve via CDP navigation
    if (!url && item.href.includes("weixin.sogou.com")) {
      url = await resolveSogouRedirect(cdp, item.href, captureCache);
    }

    if (!url || existingUrls.has(url)) continue;

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

async function resolveSogouRedirect(
  cdp: CdpConnection,
  sogouUrl: string,
  captureCache?: Map<string, string>,
): Promise<string | null> {
  const target = await cdp.send<{ targetId: string }>("Target.createTarget", {
    url: sogouUrl,
  });
  const newTargetId = target.targetId;

  try {
    const { sessionId: newSessionId } = await cdp.send<{ sessionId: string }>(
      "Target.attachToTarget",
      { targetId: newTargetId, flatten: true },
    );

    await sleep(2000);

    // Try to extract biz/mid/idx from page JS runtime for a canonical URL
    const ids = await evaluateScript<{ biz: string; mid: string; idx: string } | null>(
      cdp, newSessionId,
      `(() => { const b = typeof biz !== 'undefined' ? String(biz) : (typeof window.biz !== 'undefined' ? String(window.biz) : ''); const m = typeof mid !== 'undefined' ? String(mid) : ''; const x = typeof idx !== 'undefined' ? String(idx) : ''; return b && m && x ? { biz: b, mid: m, idx: x } : null; })()`,
    );

    let canonicalUrl: string | null = null;
    if (ids) {
      canonicalUrl = normalizeWeChatUrl(
        `https://mp.weixin.qq.com/s?__biz=${ids.biz}&mid=${ids.mid}&idx=${ids.idx}`,
      );
    } else {
      const finalUrl = await evaluateScript<string>(
        cdp, newSessionId, "window.location.href",
      );
      canonicalUrl = extractWeChatUrlFromSogou(finalUrl);
    }

    if (canonicalUrl && captureCache) {
      await autoScroll(cdp, newSessionId, 6, 500);
      await sleep(500);
      const html = await evaluateScript<string>(
        cdp, newSessionId, "document.documentElement.outerHTML",
      );
      captureCache.set(canonicalUrl, html);
    }

    return canonicalUrl;
  } catch {
    return null;
  } finally {
    try {
      await cdp.send("Target.closeTarget", { targetId: newTargetId });
    } catch { /* ignore */ }
  }
}
