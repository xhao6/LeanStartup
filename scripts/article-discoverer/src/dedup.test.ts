import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  loadExistingUrls,
  loadCandidates,
  getScannedSources,
  saveCandidates,
} from "./dedup.js";
import type { CandidateArticle } from "./types.js";

// Valid WeChat URL used across tests
const WECHAT_URL =
  "https://mp.weixin.qq.com/s?__biz=MzIwNDM2NTA0NA%3D%3D&mid=2247484533&idx=1";
const WECHAT_URL_RAW =
  "https://mp.weixin.qq.com/s?__biz=MzIwNDM2NTA0NA==&mid=2247484533&idx=1";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "dedup-test-"));
}

function cleanup(dir: string) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function makeHtmlWithOgUrl(url: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta property="og:url" content="${url}">
<title>Test</title>
</head>
<body>Hello</body>
</html>`;
}

function makeMdWithSourceUrl(url: string): string {
  return `---
source_url: "${url}"
source_title: "Test Article"
total_score: 8
scores:
  feasibility: 2
  revenue: 2
  timeliness: 2
  detail: 1
  userFit: 1
---

# Article content here
`;
}

describe("loadExistingUrls", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  it("returns empty Set when directories do not exist", () => {
    const result = loadExistingUrls(tmpDir);
    assert.equal(result.size, 0);
  });

  it("extracts URL from raw HTML with og:url meta tag", () => {
    const rawDir = path.join(tmpDir, "raw", "article1");
    fs.mkdirSync(rawDir, { recursive: true });
    fs.writeFileSync(
      path.join(rawDir, "article.html"),
      makeHtmlWithOgUrl(WECHAT_URL_RAW),
      "utf-8",
    );

    const result = loadExistingUrls(tmpDir);
    assert.equal(result.size, 1);
    assert.equal(result.has(WECHAT_URL), true);
  });

  it("extracts URL from processed MD with source_url frontmatter", () => {
    const processedDir = path.join(tmpDir, "processed", "article1");
    fs.mkdirSync(processedDir, { recursive: true });
    fs.writeFileSync(
      path.join(processedDir, "article1.md"),
      makeMdWithSourceUrl(WECHAT_URL_RAW),
      "utf-8",
    );

    const result = loadExistingUrls(tmpDir);
    assert.equal(result.size, 1);
    assert.equal(result.has(WECHAT_URL), true);
  });

  it("combines URLs from both raw and processed directories", () => {
    // Raw article with URL 1
    const rawDir = path.join(tmpDir, "raw", "article1");
    fs.mkdirSync(rawDir, { recursive: true });
    fs.writeFileSync(
      path.join(rawDir, "captured.html"),
      makeHtmlWithOgUrl(WECHAT_URL_RAW),
      "utf-8",
    );

    // Processed article with URL 2 (different mid)
    const WECHAT_URL_2_RAW =
      "https://mp.weixin.qq.com/s?__biz=MzIwNDM2NTA0NA==&mid=9999999999&idx=1";
    const processedDir = path.join(tmpDir, "processed", "article2");
    fs.mkdirSync(processedDir, { recursive: true });
    fs.writeFileSync(
      path.join(processedDir, "article2.md"),
      makeMdWithSourceUrl(WECHAT_URL_2_RAW),
      "utf-8",
    );

    const result = loadExistingUrls(tmpDir);
    assert.equal(result.size, 2);
  });

  it("deduplicates when same URL appears in both raw and processed", () => {
    // Both have the same URL
    const rawDir = path.join(tmpDir, "raw", "article1");
    fs.mkdirSync(rawDir, { recursive: true });
    fs.writeFileSync(
      path.join(rawDir, "article.html"),
      makeHtmlWithOgUrl(WECHAT_URL_RAW),
      "utf-8",
    );

    const processedDir = path.join(tmpDir, "processed", "article1");
    fs.mkdirSync(processedDir, { recursive: true });
    fs.writeFileSync(
      path.join(processedDir, "article1.md"),
      makeMdWithSourceUrl(WECHAT_URL_RAW),
      "utf-8",
    );

    const result = loadExistingUrls(tmpDir);
    assert.equal(result.size, 1);
  });

  it("skips HTML files without og:url meta tag", () => {
    const rawDir = path.join(tmpDir, "raw", "no-url");
    fs.mkdirSync(rawDir, { recursive: true });
    fs.writeFileSync(
      path.join(rawDir, "article.html"),
      "<html><head><title>No URL</title></head><body>Nope</body></html>",
      "utf-8",
    );

    const result = loadExistingUrls(tmpDir);
    assert.equal(result.size, 0);
  });

  it("skips MD files without source_url in frontmatter", () => {
    const processedDir = path.join(tmpDir, "processed", "no-source");
    fs.mkdirSync(processedDir, { recursive: true });
    fs.writeFileSync(
      path.join(processedDir, "no-source.md"),
      "---\ntitle: No source URL\n---\n# Content\n",
      "utf-8",
    );

    const result = loadExistingUrls(tmpDir);
    assert.equal(result.size, 0);
  });

  it("filters out non-WeChat URLs via normalizeWeChatUrl", () => {
    // Raw with non-WeChat URL
    const rawDir = path.join(tmpDir, "raw", "external");
    fs.mkdirSync(rawDir, { recursive: true });
    fs.writeFileSync(
      path.join(rawDir, "article.html"),
      makeHtmlWithOgUrl("https://example.com/some-article"),
      "utf-8",
    );

    // Processed with non-WeChat URL
    const processedDir = path.join(tmpDir, "processed", "external");
    fs.mkdirSync(processedDir, { recursive: true });
    fs.writeFileSync(
      path.join(processedDir, "external.md"),
      makeMdWithSourceUrl("https://example.com/some-article"),
      "utf-8",
    );

    const result = loadExistingUrls(tmpDir);
    assert.equal(result.size, 0);
  });

  it("skips non-HTML files in raw directories", () => {
    const rawDir = path.join(tmpDir, "raw", "mixed");
    fs.mkdirSync(rawDir, { recursive: true });
    fs.writeFileSync(
      path.join(rawDir, "data.json"),
      '{"url": "something"}',
      "utf-8",
    );
    fs.writeFileSync(path.join(rawDir, "notes.txt"), "some notes", "utf-8");

    const result = loadExistingUrls(tmpDir);
    assert.equal(result.size, 0);
  });

  it("skips processed subdirectory if {dirName}.md does not exist", () => {
    const processedDir = path.join(tmpDir, "processed", "missing-md");
    fs.mkdirSync(processedDir, { recursive: true });
    // Write a file with a different name (not matching the dirName pattern)
    fs.writeFileSync(
      path.join(processedDir, "other-name.md"),
      makeMdWithSourceUrl(WECHAT_URL_RAW),
      "utf-8",
    );

    const result = loadExistingUrls(tmpDir);
    assert.equal(result.size, 0);
  });
});

describe("loadCandidates", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  it("returns empty array for non-existent file", () => {
    const result = loadCandidates(path.join(tmpDir, "nonexistent.json"));
    assert.deepEqual(result, []);
  });

  it("returns empty array for invalid JSON", () => {
    const filePath = path.join(tmpDir, "bad.json");
    fs.writeFileSync(filePath, "not valid json {{{", "utf-8");
    const result = loadCandidates(filePath);
    assert.deepEqual(result, []);
  });

  it("returns array of CandidateArticle for valid JSON", () => {
    const candidates: CandidateArticle[] = [
      {
        url: WECHAT_URL,
        title: "Test Article",
        excerpt: "An excerpt",
        date: "2025-01-15",
        source: "sogou",
        scannedAt: "2025-01-15T10:00:00Z",
      },
      {
        url: "https://mp.weixin.qq.com/s?__biz=OTHER&mid=123&idx=2",
        title: "Another Article",
        excerpt: "Another excerpt",
        date: "2025-01-14",
        source: "account",
        scannedAt: "2025-01-14T10:00:00Z",
      },
    ];
    const filePath = path.join(tmpDir, "candidates.json");
    fs.writeFileSync(filePath, JSON.stringify(candidates), "utf-8");

    const result = loadCandidates(filePath);
    assert.equal(result.length, 2);
    assert.equal(result[0].title, "Test Article");
    assert.equal(result[1].source, "account");
  });

  it("handles empty JSON array", () => {
    const filePath = path.join(tmpDir, "empty.json");
    fs.writeFileSync(filePath, "[]", "utf-8");
    const result = loadCandidates(filePath);
    assert.deepEqual(result, []);
  });
});

describe("getScannedSources", () => {
  it("returns empty Set for empty array", () => {
    const result = getScannedSources([]);
    assert.equal(result.size, 0);
  });

  it("returns Set of source strings from candidates", () => {
    const candidates: CandidateArticle[] = [
      {
        url: "https://mp.weixin.qq.com/s?__biz=A&mid=1&idx=1",
        title: "A1",
        excerpt: "",
        date: "2025-01-01",
        source: "sogou",
        scannedAt: "2025-01-01T00:00:00Z",
      },
      {
        url: "https://mp.weixin.qq.com/s?__biz=B&mid=2&idx=1",
        title: "B1",
        excerpt: "",
        date: "2025-01-01",
        source: "account",
        scannedAt: "2025-01-01T00:00:00Z",
      },
      {
        url: "https://mp.weixin.qq.com/s?__biz=C&mid=3&idx=1",
        title: "C1",
        excerpt: "",
        date: "2025-01-01",
        source: "sogou",
        scannedAt: "2025-01-01T00:00:00Z",
      },
    ];

    const result = getScannedSources(candidates);
    assert.equal(result.size, 2);
    assert.equal(result.has("sogou"), true);
    assert.equal(result.has("account"), true);
  });

  it("returns Set with single entry when all sources are same", () => {
    const candidates: CandidateArticle[] = [
      {
        url: "https://mp.weixin.qq.com/s?__biz=A&mid=1&idx=1",
        title: "A1",
        excerpt: "",
        date: "2025-01-01",
        source: "sogou",
        scannedAt: "2025-01-01T00:00:00Z",
      },
    ];

    const result = getScannedSources(candidates);
    assert.equal(result.size, 1);
    assert.equal(result.has("sogou"), true);
  });
});

describe("saveCandidates", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTempDir();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  it("writes valid JSON that can be read back with loadCandidates", () => {
    const candidates: CandidateArticle[] = [
      {
        url: WECHAT_URL,
        title: "Saved Article",
        excerpt: "Saved excerpt",
        date: "2025-01-15",
        source: "sogou",
        scannedAt: "2025-01-15T10:00:00Z",
      },
    ];

    const filePath = path.join(tmpDir, "candidates.json");
    saveCandidates(filePath, candidates);

    // File should exist and be readable
    const loaded = loadCandidates(filePath);
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].title, "Saved Article");
    assert.equal(loaded[0].url, WECHAT_URL);
  });

  it("writes formatted JSON (pretty-printed)", () => {
    const candidates: CandidateArticle[] = [];
    const filePath = path.join(tmpDir, "candidates.json");
    saveCandidates(filePath, candidates);

    const raw = fs.readFileSync(filePath, "utf-8");
    // Pretty-printed empty array should be "[]"
    assert.equal(raw, "[]");
  });

  it("round-trips multiple candidates correctly", () => {
    const candidates: CandidateArticle[] = [
      {
        url: "https://mp.weixin.qq.com/s?__biz=A&mid=1&idx=1",
        title: "First",
        excerpt: "E1",
        date: "2025-01-01",
        source: "sogou",
        scannedAt: "2025-01-01T00:00:00Z",
      },
      {
        url: "https://mp.weixin.qq.com/s?__biz=B&mid=2&idx=1",
        title: "Second",
        excerpt: "E2",
        date: "2025-01-02",
        source: "account",
        scannedAt: "2025-01-02T00:00:00Z",
      },
    ];

    const filePath = path.join(tmpDir, "candidates.json");
    saveCandidates(filePath, candidates);
    const loaded = loadCandidates(filePath);

    assert.equal(loaded.length, 2);
    assert.deepEqual(loaded, candidates);
  });
});
