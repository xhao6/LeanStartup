import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { Command } from "commander";
import { scan } from "./scanner.js";
import { evaluate } from "./evaluator.js";
import { discover } from "./pipeline.js";
import { DEFAULT_CONFIG } from "./config.js";
import { normalizeWeChatUrl } from "./url-normalize.js";

function loadEnv(): void {
  const projectRoot = path.resolve(import.meta.dirname ?? ".", "../../..");
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex > 0) {
      const key = trimmed.slice(0, eqIndex).trim();
      const val = trimmed.slice(eqIndex + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnv();

const program = new Command();

program
  .name("discover")
  .description("公众号文章发现工具：自动扫描并评估候选文章");

program
  .command("scan")
  .description("扫描公众号和关键词，收集候选文章")
  .option("--accounts-only", "仅扫描固定公众号")
  .option("--keywords-only", "仅关键词搜索")
  .option("--max-pages <n>", "关键词搜索最大翻页数", "5")
  .option("--clean", "清除已有候选，重新全量扫描")
  .action(async (opts) => {
    await scan({
      accountsOnly: opts.accountsOnly,
      keywordsOnly: opts.keywordsOnly,
      maxPages: parseInt(opts.maxPages, 10),
      clean: opts.clean,
    });
  });

program
  .command("evaluate")
  .description("评估候选文章，输出入选 URL 列表")
  .option("--refresh-criteria", "重新总结入选标准")
  .action(async (opts) => {
    await evaluate({
      refreshCriteria: opts.refreshCriteria,
    });
  });

program
  .command("discover")
  .description("一站式：扫描 → 评估 → 下载")
  .option("--accounts-only", "仅扫描固定公众号")
  .option("--keywords-only", "仅关键词搜索")
  .option("--max-pages <n>", "关键词搜索最大翻页数", "5")
  .option("--clean", "清除已有候选，重新全量扫描")
  .option("--no-html", "不保存 HTML 快照")
  .action(async (opts) => {
    await discover({
      accountsOnly: opts.accountsOnly,
      keywordsOnly: opts.keywordsOnly,
      maxPages: parseInt(opts.maxPages, 10),
      clean: opts.clean,
      saveHtml: opts.html ?? true,
    });
  });

program
  .command("manual")
  .description("手动模式：从 manual-urls.txt 读取 URL，跳过扫描直接进入评估")
  .action(async () => {
    const manualPath = path.join(DEFAULT_CONFIG.outputDir, "manual-urls.txt");
    if (!fs.existsSync(manualPath)) {
      console.error(`错误：${manualPath} 不存在`);
      console.error("请创建该文件，每行一个 mp.weixin.qq.com 的文章 URL");
      process.exit(1);
    }

    const urls = fs.readFileSync(manualPath, "utf-8")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      console.error("manual-urls.txt 为空");
      process.exit(1);
    }

    // Validate and normalize URLs
    const now = new Date().toISOString();
    const candidates = urls
      .map((url) => {
        const normalized = normalizeWeChatUrl(url);
        return normalized ? { url: normalized, title: "", excerpt: "", date: "", source: "manual", scannedAt: now } : null;
      })
      .filter(Boolean);

    if (candidates.length === 0) {
      console.error("manual-urls.txt 中无有效的微信文章 URL");
      process.exit(1);
    }

    const candidatesPath = path.join(DEFAULT_CONFIG.outputDir, "candidates.json");
    fs.writeFileSync(candidatesPath, JSON.stringify(candidates, null, 2), "utf-8");
    console.log(`已从 manual-urls.txt 加载 ${candidates.length} 个有效 URL`);
    await evaluate();
  });

program.parse();
