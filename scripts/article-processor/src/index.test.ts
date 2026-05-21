import { describe, it, expect, vi, beforeEach, afterAll, afterEach } from "vitest";
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let testDirs: string[] = [];

// Mocks for cleaner module
vi.mock("./cleaner.js", () => ({
  writeCleanedArticle: vi.fn(),
}));

// Mock process.exit
const mockExit = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MINIMAX_API_KEY = "test-key-123";
});

function trackDir(dir: string) {
  testDirs.push(dir);
  return dir;
}

afterAll(() => {
  for (const dir of testDirs) {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  mockExit.mockRestore();
});

function createArticleDir(
  baseDir: string,
  id: string,
  title: string,
  options?: { processed?: boolean },
) {
  const dirName = `${id}-test-${title.replace(/\s+/g, "-").toLowerCase()}`;
  const dirPath = join(baseDir, dirName);
  mkdirSync(dirPath, { recursive: true });
  const processedAt = options?.processed ? `processed_at: ${new Date().toISOString()}\n` : "";
  const frontmatter = `---\nurl: https://example.com/${id}\ntitle: ${title}\ndescription: A test article\n${processedAt}---\n`;
  writeFileSync(join(dirPath, "article.md"), frontmatter + "\nArticle content here\n");
  return { dirName, dirPath };
}

describe("scanProcessed", () => {
  let rawDir: string;

  beforeEach(() => {
    rawDir = trackDir(join(tmpdir(), `index-test-scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));
    mkdirSync(rawDir, { recursive: true });
  });

  it("should return processed articles that have processed_at in frontmatter", async () => {
    createArticleDir(rawDir, "100001", "First Article", { processed: true });
    createArticleDir(rawDir, "100002", "Second Article", { processed: true });
    createArticleDir(rawDir, "100003", "Unprocessed Article");

    const { scanProcessed } = await import("./index.js");
    const articles = scanProcessed(rawDir);

    expect(articles).toHaveLength(2);
    expect(articles.map((a) => a.id).sort()).toEqual(["100001", "100002"]);
  });

  it("should filter by IDs when specified", async () => {
    createArticleDir(rawDir, "100001", "Article One", { processed: true });
    createArticleDir(rawDir, "100002", "Article Two", { processed: true });

    const { scanProcessed } = await import("./index.js");
    const articles = scanProcessed(rawDir, ["100001"]);

    expect(articles).toHaveLength(1);
    expect(articles[0].id).toBe("100001");
  });

  it("should return empty array when rawDir does not exist", async () => {
    const { scanProcessed } = await import("./index.js");
    const articles = scanProcessed("/nonexistent/path");

    expect(articles).toEqual([]);
  });

  it("should skip directories without 6-digit ID prefix", async () => {
    mkdirSync(join(rawDir, "no-id-prefix"), { recursive: true });
    writeFileSync(join(rawDir, "no-id-prefix", "article.md"), "---\nprocessed_at: 2024-01-01\n---\nContent");

    const { scanProcessed } = await import("./index.js");
    const articles = scanProcessed(rawDir);

    expect(articles).toEqual([]);
  });

  it("should skip directories without article.md", async () => {
    mkdirSync(join(rawDir, "100001-no-article"), { recursive: true });

    const { scanProcessed } = await import("./index.js");
    const articles = scanProcessed(rawDir);

    expect(articles).toEqual([]);
  });

  it("should handle malformed article.md gracefully", async () => {
    const dirPath = join(rawDir, "100001-bad-file");
    mkdirSync(dirPath, { recursive: true });
    writeFileSync(join(dirPath, "article.md"), "not valid frontmatter");

    const { scanProcessed } = await import("./index.js");
    const articles = scanProcessed(rawDir);

    expect(articles).toEqual([]);
  });

  it("should sort articles by ID ascending", async () => {
    createArticleDir(rawDir, "100003", "Third", { processed: true });
    createArticleDir(rawDir, "100001", "First", { processed: true });
    createArticleDir(rawDir, "100002", "Second", { processed: true });

    const { scanProcessed } = await import("./index.js");
    const articles = scanProcessed(rawDir);

    expect(articles.map((a) => a.id)).toEqual(["100001", "100002", "100003"]);
  });
});

describe("processCleanOnly", () => {
  let rawDir: string;
  let outputDir: string;

  beforeEach(() => {
    rawDir = trackDir(join(tmpdir(), `index-test-clean-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));
    outputDir = join(rawDir, "output");
    mkdirSync(rawDir, { recursive: true });
    mkdirSync(outputDir, { recursive: true });
  });

  it("should call writeCleanedArticle and return success", async () => {
    const { writeCleanedArticle } = await import("./cleaner.js");
    vi.mocked(writeCleanedArticle).mockResolvedValue(join(outputDir, "test-100001.md"));

    const { processCleanOnly } = await import("./index.js");
    const article = {
      id: "100001",
      dirName: "100001-test-article",
      dirPath: rawDir,
      frontmatter: { url: "", title: "Test Article" },
      content: "Article content",
    };
    const options = { ids: [], rawDir, outputDir, skipReview: false, extractOnly: false, cleanOnly: true };

    const result = await processCleanOnly(article, options);

    expect(result.success).toBe(true);
    expect(writeCleanedArticle).toHaveBeenCalledWith(rawDir, "100001", "Article content", join(outputDir, "100001-test-article"));
  });

  it("should create output subdirectory if it does not exist", async () => {
    const { writeCleanedArticle } = await import("./cleaner.js");
    vi.mocked(writeCleanedArticle).mockResolvedValue("dummy.md");

    const { processCleanOnly } = await import("./index.js");

    const article = {
      id: "100001",
      dirName: "100001-test-article",
      dirPath: rawDir,
      frontmatter: { url: "", title: "Test" },
      content: "Content",
    };
    const options = { ids: [], rawDir, outputDir, skipReview: false, extractOnly: false, cleanOnly: true };

    await processCleanOnly(article, options);

    expect(existsSync(join(outputDir, "100001-test-article"))).toBe(true);
  });

  it("should return failure when writeCleanedArticle throws", async () => {
    const { writeCleanedArticle } = await import("./cleaner.js");
    vi.mocked(writeCleanedArticle).mockRejectedValue(new Error("LLM failed"));

    const { processCleanOnly } = await import("./index.js");

    const article = {
      id: "100001",
      dirName: "100001-test-article",
      dirPath: rawDir,
      frontmatter: { url: "", title: "Test" },
      content: "Content",
    };
    const options = { ids: [], rawDir, outputDir, skipReview: false, extractOnly: false, cleanOnly: true };

    const result = await processCleanOnly(article, options);

    expect(result.success).toBe(false);
    expect(result.error).toBe("LLM failed");
  });
});

describe("main clean-only routing", () => {
  it("should call scanProcessed when cleanOnly is true", async () => {
    const { writeCleanedArticle } = await import("./cleaner.js");
    vi.mocked(writeCleanedArticle).mockResolvedValue("dummy.md");

    const { scanProcessed, processCleanOnly } = await import("./index.js");

    const rawDir = trackDir(join(tmpdir(), `index-test-main-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));
    mkdirSync(rawDir, { recursive: true });
    createArticleDir(rawDir, "100001", "Test", { processed: true });

    const options = {
      ids: [],
      rawDir,
      outputDir: join(rawDir, "output"),
      skipReview: false,
      extractOnly: false,
      cleanOnly: true,
    };

    const articles = scanProcessed(rawDir, options.ids);
    expect(articles).toHaveLength(1);

    const result = await processCleanOnly(articles[0], options);
    expect(result.success).toBe(true);
    expect(writeCleanedArticle).toHaveBeenCalledTimes(1);
  });
});
