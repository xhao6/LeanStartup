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
输出 JSON，不要其他内容：
{
  "title": "不超过20个字的短标题，概括文章核心内容",
  "content": "清理和美化后的完整 Markdown 正文"
}`;

function createClient(): Anthropic {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error("MINIMAX_API_KEY environment variable is required");
  }
  return new Anthropic({ apiKey, baseURL: MINIMAX_BASE_URL });
}

function parseJsonFromText(text: string): CleanResult | null {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();

  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed === "object" && typeof parsed.title === "string" && typeof parsed.content === "string") {
      return { title: parsed.title, content: parsed.content };
    }
    return null;
  } catch {
    const rawMatch = jsonStr.match(/(\{[\s\S]*\})/);
    if (rawMatch) {
      try {
        const parsed = JSON.parse(rawMatch[1]);
        if (parsed && typeof parsed === "object" && typeof parsed.title === "string" && typeof parsed.content === "string") {
          return { title: parsed.title, content: parsed.content };
        }
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function cleanArticleContent(content: string): Promise<CleanResult> {
  const client = createClient();

  const response = await client.messages.create({
    model: MINIMAX_MODEL,
    max_tokens: 4096,
    system: CLEAN_SYSTEM_PROMPT,
    messages: [{ role: "user", content: `请清理并美化以下文章：\n\n${content}` }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("LLM response contains no text block");
  }

  const result = parseJsonFromText(textBlock.text);
  if (!result) {
    throw new Error("Failed to parse CleanResult from LLM response");
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
): Promise<string | null> {
  try {
    const cleaned = await cleanArticleContent(content);
    const embeddedContent = embedImagesAsBase64(cleaned.content, rawDirPath);

    const safeTitle = cleaned.title
      .replace(/[^\p{L}\p{N}_-]/gu, "")
      .slice(0, 20);

    const filename = `${safeTitle || "article"}-${articleId}.md`;
    const outputPath = join(outputDir, filename);

    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    writeFileSync(outputPath, embeddedContent, "utf-8");
    return outputPath;
  } catch (err) {
    console.error(`    Clean failed: ${(err as Error).message}`);
    return null;
  }
}
