// src/reviewer.ts
import Anthropic from "@anthropic-ai/sdk";
import type { ExtractionResult, ReviewResult } from "./types.js";
import { clampScore } from "./scorer.js";

const MINIMAX_BASE_URL = "https://api.minimaxi.com/anthropic";
const MINIMAX_MODEL = "MiniMax-M2.7";

function createClient(): Anthropic {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error("MINIMAX_API_KEY environment variable is required");
  }
  return new Anthropic({ apiKey, baseURL: MINIMAX_BASE_URL });
}

const REVIEW_SYSTEM_PROMPT = `你是一位严格的副业案例质量审核员。你需要审核AI提取的结构化案例数据是否准确、完整。

## 审核维度
1. 字段完整性：7大字段是否都有实质内容（非"原文未提及"）
2. 案例故事质量：是否有钩子、字数是否在300-800范围、是否去除了广告内容、关键数据和转折点是否保留
3. 打分合理性：分数是否与原文内容匹配
4. 事实性校验：金额、数字、工具名、平台名是否准确提取
5. 步骤完整性：操作步骤是否有明显遗漏
6. 广告残留：是否还有广告/拉群/关注内容残留
7. 标签质量：tags 是否恰好5个、每个2-6字、有辨识度且无泛标签；riskTags 是否最多3个
8. 变现周期：cycle 字段是否合理提取

## 输出要求
如果发现任何问题，直接在extraction中修正，并在reviewNotes中说明修正内容。
如果没有问题，原样返回extraction，reviewNotes为空数组，passed设为true。

必须严格按JSON格式输出：
{
  "extraction": { ...(修正后的完整extraction对象) },
  "reviewNotes": ["修正说明1", "修正说明2"],
  "passed": true或false
}`;

/**
 * Call MiniMax LLM to review and correct extraction results.
 */
export async function reviewExtraction(
  articleContent: string,
  extraction: ExtractionResult
): Promise<ReviewResult> {
  const client = createClient();

  const response = await client.messages.create({
    model: MINIMAX_MODEL,
    max_tokens: 4096,
    system: REVIEW_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `## 原文内容\n${articleContent}\n\n## AI提取结果\n${JSON.stringify(extraction, null, 2)}\n\n请审核以上提取结果，如有问题请修正。`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("LLM review response contains no text block");
  }

  const rawText = textBlock.text;

  const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/) ||
    rawText.match(/(\{[\s\S]*\})/);

  if (!jsonMatch) {
    throw new Error("Failed to parse JSON from LLM review response");
  }

  const parsed: ReviewResult = JSON.parse(jsonMatch[1].trim());

  // Clamp scores in the corrected extraction
  parsed.extraction.score = clampScore(parsed.extraction.score);

  // Ensure arrays
  if (!Array.isArray(parsed.extraction.steps)) parsed.extraction.steps = [];
  if (!Array.isArray(parsed.extraction.tools)) parsed.extraction.tools = [];
  if (!Array.isArray(parsed.extraction.pitfalls)) parsed.extraction.pitfalls = [];
  if (!Array.isArray(parsed.reviewNotes)) parsed.reviewNotes = [];
  if (!Array.isArray(parsed.extraction.riskTags)) parsed.extraction.riskTags = [];
  if (!Array.isArray(parsed.extraction.tags)) parsed.extraction.tags = [];

  return parsed;
}
