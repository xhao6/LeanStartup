import { getDatabase } from "../cloudbase.js"
import { fetchDailyPick } from "../data/daily-pick.js"
import { fetchCasesByIds } from "../data/case.js"
import type { CaseRecord } from "../types.js"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { config } from "../config.js"
import Anthropic from "@anthropic-ai/sdk"

const execFileAsync = promisify(execFile)
const __dirname = dirname(fileURLToPath(import.meta.url))

const XHS_SCRIPT = resolve(
  __dirname, "../../../../skills/xhs-copywriter-redfox/scripts/fetch_xhs_trends.py"
)

const MINIMAX_BASE_URL = "https://api.minimaxi.com/anthropic"
const MINIMAX_MODEL = "MiniMax-M2.7"

function extractKeywords(cases: CaseRecord[]): string {
  const tagCount = new Map<string, number>()
  for (const c of cases) {
    for (const t of c.tags ?? []) {
      tagCount.set(t, (tagCount.get(t) ?? 0) + 1)
    }
  }
  const sorted = [...tagCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag)

  let keywords = sorted.join(",")
  if (keywords.length > 200) {
    keywords = keywords.slice(0, 200)
    const last = keywords.lastIndexOf(",")
    if (last > 0) keywords = keywords.slice(0, last)
  }
  return keywords || "一人公司,独立开发,AI副业"
}

async function fetchTrends(keywords: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("python3", [
      XHS_SCRIPT,
      "--keyword", keywords,
      "--max-items", "8",
      "--output-format", "json",
    ], { timeout: 60000 })
    return stdout
  } catch {
    console.warn("Warning: failed to fetch XHS trends, proceeding without trend data")
    return ""
  }
}

const SYSTEM_PROMPT = `你是一个小红书爆款文案写手。你的任务是基于真实数据和案例生成可直接发布的小红书笔记文案。

## 标题规则
- 参考爆款数据中出现的标题模式（数字型、情绪型、疑问型、悬念型）
- 每个标题不超过20字
- 生成6个不同风格的推荐标题

## 正文规则
- 开头必须使用钩子：痛点共鸣、惊人数据、反差对比等手法
- 正文采用分点/分段结构，融入案例核心信息
- 结尾添加互动引导话术
- 每段可用1-2个Emoji点缀
- 保持口语化、亲切感、代入感

## 格式约束（必须严格遵守）
- 纯文本，不使用任何Markdown语法
- 不包含投入、周期、收入等商业数据
- 标签以#开头，空格分隔
- 爆款公式来源中列出参考的笔记时，使用纯文本格式

## 输出格式
推荐标题

1. 标题1
2. 标题2
3. 标题3
4. 标题4
5. 标题5
6. 标题6

正文内容

[正文]

推荐标签

#标签1 #标签2 ...

爆款公式来源

参考的爆款规律：[简述]
参考的爆款笔记
1. 标题 - 作者 - 收藏X 点赞X

## 自检清单
输出前检查：
- 是否包含6个推荐标题？
- 正文是否完整可发布？
- 标签是否5-10个？
- 爆款公式来源是否包含规律简述和参考笔记？`

export async function generateXhsCopy(date: string): Promise<string> {
  const db = getDatabase()

  const pick = await fetchDailyPick(db, date)
  if (!pick) throw new Error(`No daily pick found for ${date}`)

  const allCases = await fetchCasesByIds(db, pick.case_ids)
  const caseMap = new Map(allCases.map((c) => [c.id, c]))
  const orderedCases = pick.case_ids
    .map((id) => caseMap.get(id))
    .filter((c): c is CaseRecord => !!c)

  const keywords = extractKeywords(orderedCases)
  const trendsJson = await fetchTrends(keywords)

  const caseData = orderedCases.map((c, i) =>
    `案例${i + 1}：${c.title}\n摘要：${c.summary}\n标签：${(c.tags ?? []).join("、")}\n来源：${c.source_account ?? ""}`
  ).join("\n\n")

  const userPrompt = `## 今日案例数据\n\n${caseData}\n\n## 小红书爆款数据\n\n${trendsJson}`

  const apiKey = process.env.MINIMAX_API_KEY
  if (!apiKey) throw new Error("MINIMAX_API_KEY is not set")

  const client = new Anthropic({
    apiKey,
    baseURL: MINIMAX_BASE_URL,
  })

  const response = await client.messages.create({
    model: MINIMAX_MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  })

  const textBlock = response.content.find((b) => b.type === "text")
  if (!textBlock || !("text" in textBlock)) throw new Error("No text in MiniMax response")

  const outputDir = resolve(config.OUTPUT_DIR, date)
  const outputPath = resolve(outputDir, "xhs-copy.txt")

  writeFileSync(outputPath, textBlock.text, "utf-8")
  return outputPath
}
