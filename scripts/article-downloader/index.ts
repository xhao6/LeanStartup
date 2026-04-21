import { createInterface } from "node:readline";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  CdpConnection,
  getFreePort,
  findExistingChromePort,
  launchChrome,
  killChrome,
  sleep,
  waitForChromeDebugPort,
  waitForNetworkIdle,
  waitForPageLoad,
  evaluateScript,
  autoScroll,
} from "./capture.js";
import { absolutizeUrlsScript, extractContent, createMarkdownDocument } from "./convert.js";
import { localizeMarkdownMedia, countRemoteMedia } from "./media.js";
import { getNextId, buildOutputPath } from "./naming.js";
import {
  DEFAULT_TIMEOUT_MS,
  CDP_CONNECT_TIMEOUT_MS,
  POST_LOAD_DELAY_MS,
  SCROLL_STEP_WAIT_MS,
  SCROLL_MAX_STEPS,
  DEFAULT_OUTPUT_DIR,
} from "./constants.js";

// ===================== Args =====================

interface Args {
  urls: string[];
  wait: boolean;
  timeout: number;
  downloadMedia: boolean;
  saveHtml: boolean;
  outputDir: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    urls: [],
    wait: false,
    timeout: DEFAULT_TIMEOUT_MS,
    downloadMedia: true,
    saveHtml: true,
    outputDir: DEFAULT_OUTPUT_DIR,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--wait" || arg === "-w") {
      args.wait = true;
    } else if (arg === "--timeout" || arg === "-t") {
      args.timeout = parseInt(argv[++i], 10) || DEFAULT_TIMEOUT_MS;
    } else if (arg === "--no-media") {
      args.downloadMedia = false;
    } else if (arg === "--no-html") {
      args.saveHtml = false;
    } else if (arg === "--output-dir" || arg === "-d") {
      args.outputDir = argv[++i];
    } else if (!arg.startsWith("-")) {
      args.urls.push(arg);
    }
  }
  return args;
}

// ===================== Single URL Capture =====================

async function waitForUserSignal(): Promise<void> {
  console.log("Page opened. Press Enter when ready to capture...");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await new Promise<void>((resolve) => {
    rl.once("line", () => { rl.close(); resolve(); });
  });
}

async function captureSingleUrl(
  url: string,
  args: Args
): Promise<import("./convert.js").ConversionResult> {
  const existingPort = await findExistingChromePort();
  const reusing = existingPort !== null;
  const port = existingPort ?? await getFreePort();
  const chrome = reusing ? null : await launchChrome(url, port);

  if (reusing) console.log(`  Reusing existing Chrome on port ${port}`);

  let cdp: CdpConnection | null = null;
  let targetId: string | null = null;
  try {
    const wsUrl = await waitForChromeDebugPort(port, 30_000);
    cdp = await CdpConnection.connect(wsUrl, CDP_CONNECT_TIMEOUT_MS);

    let sessionId: string;
    if (reusing) {
      const created = await cdp.send<{ targetId: string }>("Target.createTarget", { url });
      targetId = created.targetId;
      const attached = await cdp.send<{ sessionId: string }>("Target.attachToTarget", { targetId, flatten: true });
      sessionId = attached.sessionId;
      await cdp.send("Network.enable", {}, { sessionId });
      await cdp.send("Page.enable", {}, { sessionId });
    } else {
      const targets = await cdp.send<{ targetInfos: Array<{ targetId: string; type: string; url: string }> }>("Target.getTargets");
      const pageTarget = targets.targetInfos.find(t => t.type === "page" && t.url.startsWith("http"));
      if (!pageTarget) throw new Error("No page target found");
      targetId = pageTarget.targetId;
      const attached = await cdp.send<{ sessionId: string }>("Target.attachToTarget", { targetId, flatten: true });
      sessionId = attached.sessionId;
      await cdp.send("Network.enable", {}, { sessionId });
      await cdp.send("Page.enable", {}, { sessionId });
    }

    if (args.wait) {
      await waitForUserSignal();
    } else {
      console.log("  Waiting for page to load...");
      await Promise.race([waitForPageLoad(cdp, sessionId, 15_000), sleep(8_000)]);
      await waitForNetworkIdle(cdp, sessionId);
      await sleep(POST_LOAD_DELAY_MS);
      console.log("  Scrolling for lazy content...");
      await autoScroll(cdp, sessionId, SCROLL_MAX_STEPS, SCROLL_STEP_WAIT_MS);
      await sleep(POST_LOAD_DELAY_MS);
    }

    console.log("  Capturing page content...");
    const { html } = await evaluateScript<{ html: string }>(
      cdp, sessionId, absolutizeUrlsScript, args.timeout
    );

    return await extractContent(html, url);
  } finally {
    if (reusing) {
      if (cdp && targetId) {
        try { await cdp.send("Target.closeTarget", { targetId }, { timeoutMs: 5_000 }); } catch {}
      }
      if (cdp) cdp.close();
    } else {
      if (cdp) {
        try { await cdp.send("Browser.close", {}, { timeoutMs: 5_000 }); } catch {}
        cdp.close();
      }
      if (chrome) killChrome(chrome);
    }
  }
}

// ===================== Main =====================

interface DownloadResult {
  url: string;
  success: boolean;
  outputPath?: string;
  title?: string;
  error?: string;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  if (args.urls.length === 0) {
    console.error("Usage: bun run scripts/article-downloader/index.ts <url1> <url2> ... [options]");
    console.error("");
    console.error("Options:");
    console.error("  --wait            Wait for user confirmation before capturing");
    console.error("  --timeout <ms>    Page load timeout (default: 30000)");
    console.error("  --no-media        Don't download images");
    console.error("  --no-html         Don't save HTML snapshot");
    console.error("  --output-dir <d>  Output directory (default: resources/raw/)");
    process.exit(1);
  }

  const outputDir = path.resolve(args.outputDir);
  let nextId = getNextId(outputDir);
  const results: DownloadResult[] = [];

  console.log(`Downloading ${args.urls.length} article(s) to ${outputDir}`);
  console.log(`Starting ID: ${String(nextId).padStart(6, "0")}`);
  console.log("");

  for (let i = 0; i < args.urls.length; i++) {
    const url = args.urls[i];
    console.log(`[${i + 1}/${args.urls.length}] ${url}`);

    try {
      const conversionResult = await captureSingleUrl(url, args);
      const title = conversionResult.metadata.title || `untitled-${nextId}`;
      const articleDir = buildOutputPath(outputDir, nextId, title);

      await mkdir(articleDir, { recursive: true });

      // HTML snapshot
      if (args.saveHtml) {
        const htmlPath = path.join(articleDir, "captured.html");
        await writeFile(htmlPath, conversionResult.rawHtml, "utf-8");
      }

      // Markdown document
      let document = createMarkdownDocument(conversionResult);

      // Media download
      if (args.downloadMedia) {
        const mediaResult = await localizeMarkdownMedia(document, {
          markdownPath: path.join(articleDir, "article.md"),
          log: (msg) => console.log(`  ${msg}`),
        });
        document = mediaResult.markdown;
        if (mediaResult.downloadedImages > 0 || mediaResult.downloadedVideos > 0) {
          console.log(`  Downloaded: ${mediaResult.downloadedImages} images, ${mediaResult.downloadedVideos} videos`);
        }
      } else {
        const { images, videos } = countRemoteMedia(document);
        if (images > 0 || videos > 0) {
          console.log(`  Remote media: ${images} images, ${videos} videos (skipped)`);
        }
      }

      // Save Markdown
      const mdPath = path.join(articleDir, "article.md");
      await writeFile(mdPath, document, "utf-8");

      console.log(`  -> ${articleDir}`);
      console.log(`     Title: ${title}`);
      console.log(`     Method: ${conversionResult.conversionMethod}`);
      if (conversionResult.fallbackReason) {
        console.log(`     Fallback: ${conversionResult.fallbackReason}`);
      }

      results.push({ url, success: true, outputPath: articleDir, title });
      nextId++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  FAILED: ${message}`);
      results.push({ url, success: false, error: message });
    }

    console.log("");
  }

  // Summary
  const succeeded = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log("=== Summary ===");
  console.log(`Success: ${succeeded}, Failed: ${failed}`);
  if (failed > 0) {
    console.log("Failed URLs:");
    for (const r of results.filter(r => !r.success)) {
      console.log(`  ${r.url}: ${r.error}`);
    }
  }
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
