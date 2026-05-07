import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { CandidateArticle } from "./types.js";
import { normalizeWeChatUrl } from "./url-normalize.js";

/**
 * Scan raw/ and processed/ directories under resourcesDir to collect
 * all previously-seen WeChat article URLs (normalized).
 *
 * Raw: HTML files in raw/<subdir>/*.html — extract og:url from <meta> tag.
 * Processed: Markdown files at processed/<dirName>/<dirName>.md — extract source_url from frontmatter.
 */
export function loadExistingUrls(resourcesDir: string): Set<string> {
  const urls = new Set<string>();

  // raw/: Extract URLs from article.md frontmatter (primary) and captured.html (fallback)
  const rawDir = path.join(resourcesDir, "raw");
  if (fs.existsSync(rawDir)) {
    const entries = fs.readdirSync(rawDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const subDir = path.join(rawDir, entry.name);

      // article.md frontmatter: url field
      const mdPath = path.join(subDir, "article.md");
      if (fs.existsSync(mdPath)) {
        try {
          const content = fs.readFileSync(mdPath, "utf-8");
          const { data } = matter(content);
          if (data.url) {
            const normalized = normalizeWeChatUrl(data.url);
            if (normalized) urls.add(normalized);
          }
        } catch {
          /* skip unparseable files */
        }
      }

      // captured.html fallback: og:url meta tag
      for (const file of fs.readdirSync(subDir)) {
        if (!file.endsWith(".html")) continue;
        try {
          const html = fs.readFileSync(path.join(subDir, file), "utf-8");
          const match = html.match(
            /<meta\s+property="og:url"\s+content="([^"]+)"/,
          );
          if (match) {
            const normalized = normalizeWeChatUrl(match[1]);
            if (normalized) urls.add(normalized);
          }
        } catch {
          /* skip unreadable files */
        }
      }
    }
  }

  // processed/: MD files, extract source_url from frontmatter
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
      } catch {
        /* skip unparseable files */
      }
    }
  }

  return urls;
}

/** Load previously saved candidate articles from a JSON file. */
export function loadCandidates(candidatesPath: string): CandidateArticle[] {
  if (!fs.existsSync(candidatesPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(candidatesPath, "utf-8"));
  } catch {
    return [];
  }
}

/** Extract the set of unique source identifiers from candidate articles. */
export function getScannedSources(candidates: CandidateArticle[]): Set<string> {
  return new Set(candidates.map((c) => c.source));
}

/** Persist candidate articles to a JSON file. */
export function saveCandidates(
  candidatesPath: string,
  candidates: CandidateArticle[],
): void {
  fs.writeFileSync(
    candidatesPath,
    JSON.stringify(candidates, null, 2),
    "utf-8",
  );
}
