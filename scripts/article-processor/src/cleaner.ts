import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const MINIMAX_BASE_URL = "https://api.minimaxi.com/anthropic";
const MINIMAX_MODEL = "MiniMax-M2.7";

export interface CleanResult {
  title: string;
  content: string;
}

const MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  bmp: "image/bmp",
};

const SUPPORTED_EXTENSIONS = new Set(Object.keys(MIME_MAP));

const CLEAN_SYSTEM_PROMPT = `你是一位公众号文章清理专家。你的任务是对一篇从微信公众号下载的 Markdown 文章进行清理和美化。

## 清理规则
1. 删除所有公众号运营元素：关注引导（如"点击上方 XX 关注"）、点赞在看、原文链接、作者简介
2. 删除所有广告推广和外链（与正文无关的链接）
3. 删除冗余的段落引导语（如"大家好，我是XX"之类与正文无关的开场白）
4. 保留正文的核心内容、案例故事、操作步骤、数据等实质性信息

## 美化规则
1. 规范 Markdown 标题层级（使用 # 作为顶级标题）
2. 统一空行（段落之间一个空行，标题前后各一个空行）
3. 修正多余或缺失的换行
4. 保持原文的图片引用不变（不要删除或修改图片标签）

## 输出格式
先输出一行标题（不超过35字，原文数字必须准确如1.1万不能写成11万），然后单独一行输出 ===TITLE_END===，然后输出清理后的正文。

示例：
用NotebookLM做PPT课件月入1万
===TITLE_END===
清理和美化后的完整 Markdown 正文......

注意：===TITLE_END=== 必须独占一行，前后不要有其他内容。标题行和 ===TITLE_END=== 行之间不能有空行。`;

function createClient(): Anthropic {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error("MINIMAX_API_KEY environment variable is required");
  }
  return new Anthropic({ apiKey, baseURL: MINIMAX_BASE_URL });
}

function parseCleanResponse(text: string): CleanResult | null {
  const lines = text.split("\n");
  const sepIdx = lines.findIndex((l) => l.trim() === "===TITLE_END===");
  if (sepIdx < 1) return null;

  const title = lines.slice(0, sepIdx).join(" ").trim();
  const content = lines.slice(sepIdx + 1).join("\n").trim();

  if (!title || !content) return null;
  return { title, content };
}

export async function cleanArticleContent(content: string): Promise<CleanResult> {
  const client = createClient();

  const response = await client.messages.create({
    model: MINIMAX_MODEL,
    max_tokens: 16384,
    system: CLEAN_SYSTEM_PROMPT,
    messages: [{ role: "user", content: `请清理并美化以下文章：\n\n${content}` }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("LLM response contains no text block");
  }

  const result = parseCleanResponse(textBlock.text);
  if (!result) {
    // Fallback: use full response as content, generate title from first line
    const lines = textBlock.text.trim().split("\n");
    const firstLine = lines[0].replace(/^#+\s*/, "").replace(/[^\p{L}\p{N}0-9]/gu, "_").slice(0, 35).replace(/_+$/, "");
    return {
      title: firstLine || "article",
      content: textBlock.text.trim(),
    };
  }

  return result;
}

export function embedImagesAsBase64(markdown: string, rawDirPath: string): string {
  return markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt: string, url: string) => {
    const trimmed = url.trim();

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
      return _match;
    }

    const ext = trimmed.split(".").pop()?.toLowerCase();
    if (!ext || !SUPPORTED_EXTENSIONS.has(ext)) {
      return _match;
    }

    const fullPath = resolve(rawDirPath, trimmed);
    if (!existsSync(fullPath)) {
      return _match;
    }

    try {
      const data = readFileSync(fullPath);
      const mime = MIME_MAP[ext];
      const base64 = data.toString("base64");
      return `![${alt}](data:${mime};base64,${base64})`;
    } catch {
      return _match;
    }
  });
}

export async function writeCleanedArticle(
  rawDirPath: string,
  articleId: string,
  content: string,
  outputDir: string,
): Promise<string> {
  const cleaned = await cleanArticleContent(content);
  const embeddedContent = embedImagesAsBase64(cleaned.content, rawDirPath);

  const safeTitle = cleaned.title
    .replace(/[\u3000-\u303f\uff00-\uffef]/g, "_")
    .replace(/[\s]+/g, "_")
    .replace(/[^\p{L}\p{N}._-]/gu, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 35)
    .replace(/_$/, "");

  const filename = `${safeTitle || "article"}-${articleId}.md`;
  const outputPath = join(outputDir, filename);

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  writeFileSync(outputPath, embeddedContent, "utf-8");
  return outputPath;
}
