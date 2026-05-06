import readline from "node:readline";

import {
  CdpConnection,
  evaluateScript,
  waitForPageLoad,
  waitForNetworkIdle,
  autoScroll,
  findExistingChromePort,
  getFreePort,
  launchChrome,
  killChrome,
  sleep,
  waitForChromeDebugPort,
} from "../../article-downloader/capture.js";
import { DEFAULT_CONFIG } from "./config.js";

export {
  CdpConnection,
  evaluateScript,
  waitForPageLoad,
  waitForNetworkIdle,
  autoScroll,
  sleep,
};

export async function connectChrome(): Promise<{
  cdp: CdpConnection;
  sessionId: string;
  targetId: string;
  cleanup: () => Promise<void>;
}> {
  const existingPort = await findExistingChromePort();
  const reusing = existingPort !== null;
  const port = existingPort ?? await getFreePort();
  const chrome = reusing ? null : await launchChrome("about:blank", port);

  if (reusing) console.log(`  复用已有 Chrome 实例 (port ${port})`);
  else console.log(`  已启动 Chrome (port ${port})`);

  const wsUrl = await waitForChromeDebugPort(port, 15_000);
  const cdp = await CdpConnection.connect(wsUrl, 15_000);

  let targetId: string;
  let sessionId: string;

  if (reusing) {
    const target = await cdp.send<{ targetId: string }>("Target.createTarget", {
      url: "about:blank",
    });
    targetId = target.targetId;
    const attached = await cdp.send<{ sessionId: string }>(
      "Target.attachToTarget",
      { targetId, flatten: true }
    );
    sessionId = attached.sessionId;
  } else {
    const targets = await cdp.send<{ targetInfos: Array<{ targetId: string; type: string; url: string }> }>("Target.getTargets");
    const pageTarget = targets.targetInfos.find(t => t.type === "page" && t.url.startsWith("http"));
    if (!pageTarget) {
      const target = await cdp.send<{ targetId: string }>("Target.createTarget", { url: "about:blank" });
      targetId = target.targetId;
    } else {
      targetId = pageTarget.targetId;
    }
    const attached = await cdp.send<{ sessionId: string }>(
      "Target.attachToTarget",
      { targetId, flatten: true }
    );
    sessionId = attached.sessionId;
  }

  const cleanup = async () => {
    if (reusing) {
      try { await cdp.send("Target.closeTarget", { targetId }, { timeoutMs: 5_000 }); } catch { /* ignore */ }
      cdp.close();
    } else {
      try { await cdp.send("Browser.close", {}, { timeoutMs: 5_000 }); } catch { /* ignore */ }
      cdp.close();
      if (chrome) killChrome(chrome);
    }
  };

  return { cdp, sessionId, targetId, cleanup };
}

export async function navigateTo(
  cdp: CdpConnection,
  sessionId: string,
  url: string
): Promise<void> {
  await cdp.send("Page.enable", {}, { sessionId });
  await cdp.send("Network.enable", {}, { sessionId });
  await cdp.send("Page.navigate", { url }, { sessionId });
  await waitForPageLoad(cdp, sessionId);
  await waitForNetworkIdle(cdp, sessionId);
}

export async function randomDelay(
  msRange?: [number, number]
): Promise<void> {
  const [min, max] = msRange ?? DEFAULT_CONFIG.scanDelayMs;
  const delay = min + Math.random() * (max - min);
  await sleep(delay);
}

export async function detectCaptcha(
  cdp: CdpConnection,
  sessionId: string
): Promise<boolean> {
  const url = await evaluateScript<string>(
    cdp,
    sessionId,
    "window.location.href"
  );
  if (url.includes("/antispider/")) return true;

  const hasCaptcha = await evaluateScript<boolean>(
    cdp,
    sessionId,
    `!!document.querySelector('${DEFAULT_CONFIG.selectors.captchaIndicator}')`
  );
  return hasCaptcha;
}

let captchaCount = 0;

export function resetCaptchaCount(): void {
  captchaCount = 0;
}

export async function handleCaptcha(
  cdp: CdpConnection,
  sessionId: string
): Promise<void> {
  captchaCount++;
  if (captchaCount > 3) {
    console.error(
      "[!] 验证码出现超过 3 次，终止扫描。已扫描结果已保存。"
    );
    process.exit(1);
  }

  console.log(
    "[!] 检测到验证码，请在浏览器中手动完成验证后按 Enter 继续..."
  );
  await waitForEnter();
  await waitForPageLoad(cdp, sessionId);
  await waitForNetworkIdle(cdp, sessionId);
}

function waitForEnter(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.once("line", () => {
      rl.close();
      resolve();
    });
  });
}
