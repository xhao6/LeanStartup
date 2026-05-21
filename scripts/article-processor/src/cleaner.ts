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
  "title": "不超过20个字的吸睛短标题，要有钩子感、突出收益/结果或引发好奇心",
  "content": "清理和美化后的完整 Markdown 正文"
}`;

const JSON_FIX_PROMPT = `你是一个JSON修复专家。用户的LLM输出无法被解析为有效JSON，请修复它。

## 任务
1. 读取下方有问题的原始输出
2. 尽可能保留原有数据，只修复JSON语法错误
3. 修复规则：
   - 修复未闭合的引号、括号
   - 修复末尾多余的逗号
   - 修复Unicode转义问题
   - 处理换行符、转义符等特殊字符
   - 移除markdown代码块标记
4. 输出必须是有效JSON，不要添加任何解释

## 注意事项
- 不要改变原始数据的语义
- 对于无法确定的值，使用null而非空字符串
- 如果原输出缺失关键字段，不要凭空添加

请修复以下JSON：`;

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

async function fixJsonWithLLM(
  client: Anthropic,
  rawText: string,
  attempt: number,
): Promise<CleanResult> {
  const response = await client.messages.create({
    model: MINIMAX_MODEL,
    max_tokens: 2048,
    system: JSON_FIX_PROMPT,
    messages: [{ role: "user", content: `原始LLM输出（解析失败第${attempt}次）：\n\n${rawText.slice(0, 8000)}` }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("JSON fix response contains no text block");
  }

  const result = parseJsonFromText(textBlock.text);
  if (!result) {
    throw new Error(`JSON fix attempt ${attempt} failed`);
  }

  return result;
}

export async function cleanArticleContent(content: string): Promise<CleanResult> {
  const client = createClient();

  const response = await client.messages.create({
    model: MINIMAX_MODEL,
    max_tokens: 8192,
    system: CLEAN_SYSTEM_PROMPT,
    messages: [{ role: "user", content: `请清理并美化以下文章：\n\n${content}` }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("LLM response contains no text block");
  }

  let result = parseJsonFromText(textBlock.text);

  if (!result) {
    try {
      result = await fixJsonWithLLM(client, textBlock.text, 1);
    } catch {
      result = await fixJsonWithLLM(client, textBlock.text, 2);
    }
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
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 20)
    .replace(/_$/, "");

  const filename = `${safeTitle || "article"}-${articleId}.md`;
  const outputPath = join(outputDir, filename);

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  writeFileSync(outputPath, embeddedContent, "utf-8");
  return outputPath;
}
