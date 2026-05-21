import { describe, it, expect, vi, beforeEach, afterAll, afterEach } from "vitest";
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn() as any,
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));

let testDir = "";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MINIMAX_API_KEY = "test-key-123";
  testDir = "";
});

afterAll(() => {
  if (testDir && existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

describe("cleanArticleContent", () => {
  it("should call Anthropic and return parsed CleanResult", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: '{"title":"测试标题","content":"清理后的内容"}' }],
    });

    const { cleanArticleContent } = await import("./cleaner.js");

    const result = await cleanArticleContent("原文内容");

    expect(result.title).toBe("测试标题");
    expect(result.content).toBe("清理后的内容");
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("should handle markdown code blocks in response", async () => {
    mockCreate.mockResolvedValue({
      content: [{
        type: "text",
        text: "```json\n{\"title\":\"标题\",\"content\":\"正文内容\"}\n```",
      }],
    });

    const { cleanArticleContent } = await import("./cleaner.js");

    const result = await cleanArticleContent("内容");

    expect(result.title).toBe("标题");
    expect(result.content).toBe("正文内容");
  });
});

describe("embedImagesAsBase64", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `cleaner-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    mkdirSync(tmpDir, { recursive: true });
    mkdirSync(join(tmpDir, "imgs"), { recursive: true });
    testDir = tmpDir;
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("should replace local image paths with data URIs", async () => {
    const imgPath = join(tmpDir, "imgs", "test.png");
    const pixel = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    );
    writeFileSync(imgPath, pixel);

    const { embedImagesAsBase64 } = await import("./cleaner.js");
    const result = embedImagesAsBase64("![alt](imgs/test.png)", tmpDir);

    expect(result).toContain("data:image/png;base64,");
    expect(result).not.toContain("imgs/test.png");
  });

  it("should skip HTTP URLs", async () => {
    const markdown = "![alt](https://example.com/image.png)";

    const { embedImagesAsBase64 } = await import("./cleaner.js");
    const result = embedImagesAsBase64(markdown, tmpDir);

    expect(result).toBe(markdown);
  });

  it("should skip data URIs", async () => {
    const markdown = "![alt](data:image/png;base64,abc123)";

    const { embedImagesAsBase64 } = await import("./cleaner.js");
    const result = embedImagesAsBase64(markdown, tmpDir);

    expect(result).toBe(markdown);
  });

  it("should skip non-existent files", async () => {
    const markdown = "![alt](imgs/nonexistent.png)";

    const { embedImagesAsBase64 } = await import("./cleaner.js");
    const result = embedImagesAsBase64(markdown, tmpDir);

    expect(result).toBe(markdown);
  });

  it("should map extensions to correct MIME types", async () => {
    const imgPath = join(tmpDir, "imgs", "test.jpg");
    const pixel = Buffer.from(
      "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AEAj/2Q==",
      "base64",
    );
    writeFileSync(imgPath, pixel);

    const { embedImagesAsBase64 } = await import("./cleaner.js");
    const result = embedImagesAsBase64("![alt](imgs/test.jpg)", tmpDir);

    expect(result).toContain("data:image/jpeg;base64,");
  });

  it("should skip unsupported extensions", async () => {
    const { embedImagesAsBase64 } = await import("./cleaner.js");
    const result = embedImagesAsBase64("![alt](imgs/test.psd)", tmpDir);

    expect(result).toBe("![alt](imgs/test.psd)");
  });

  it("should handle multiple images", async () => {
    const imgPath1 = join(tmpDir, "imgs", "a.png");
    const imgPath2 = join(tmpDir, "imgs", "b.jpg");
    const pixel = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    );
    writeFileSync(imgPath1, pixel);
    writeFileSync(imgPath2, pixel);

    const { embedImagesAsBase64 } = await import("./cleaner.js");
    const result = embedImagesAsBase64("![a](imgs/a.png) and ![b](imgs/b.jpg)", tmpDir);

    expect(result).toContain("data:image/png;base64,");
    expect(result).toContain("data:image/jpeg;base64,");
    expect(result).not.toContain("imgs/a.png");
    expect(result).not.toContain("imgs/b.jpg");
  });

  it("should handle webp and svg images", async () => {
    const webpPath = join(tmpDir, "imgs", "test.webp");
    const svgPath = join(tmpDir, "imgs", "test.svg");
    writeFileSync(webpPath, "WEBP");
    writeFileSync(svgPath, "<svg></svg>");

    const { embedImagesAsBase64 } = await import("./cleaner.js");
    const result = embedImagesAsBase64("![webp](imgs/test.webp) ![svg](imgs/test.svg)", tmpDir);

    expect(result).toContain("data:image/webp;base64,");
    expect(result).toContain("data:image/svg+xml;base64,");
  });
});

describe("writeCleanedArticle", () => {
  let tmpDir: string;
  let outputDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `cleaner-write-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    outputDir = join(tmpDir, "output");
    mkdirSync(tmpDir, { recursive: true });
    mkdirSync(join(tmpDir, "imgs"), { recursive: true });
    mkdirSync(outputDir, { recursive: true });
    testDir = tmpDir;
  });

  afterEach(() => {
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("should write cleaned article to output directory", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: '{"title":"一个简短的测试标题","content":"清理后的文章正文内容"}' }],
    });

    const { writeCleanedArticle } = await import("./cleaner.js");

    const result = await writeCleanedArticle(tmpDir, "100042", "原文内容", outputDir);

    expect(result).toContain("output");
    expect(result).toContain("100042");
    expect(existsSync(result)).toBe(true);

    const written = readFileSync(result, "utf-8");
    expect(written).toContain("清理后的文章正文内容");
  });

  it("should sanitize title in filename", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: '{"title":"短标题最多20字","content":"Content"}' }],
    });

    const { writeCleanedArticle } = await import("./cleaner.js");

    const result = await writeCleanedArticle(tmpDir, "100042", "内容", outputDir);

    const filename = result.split(/[/\\]/).pop()!;
    expect(filename).toContain("100042");
    expect(filename).toBe("短标题最多20字-100042.md");
  });

  it("should throw if cleanArticleContent returns invalid JSON", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "invalid json response" }],
    });

    const { writeCleanedArticle } = await import("./cleaner.js");

    await expect(writeCleanedArticle(tmpDir, "100042", "内容", outputDir)).rejects.toThrow();
  });
});
