import readline from "node:readline";

import {
  CdpConnection,
  evaluateScript,
  waitForPageLoad,
  waitForNetworkIdle,
  autoScroll,
  findExistingChromePort,
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
}> {
  const port = await findExistingChromePort();
  if (!port) {
    console.error("[!] 未检测到运行中的 Chrome 实例");
    console.error(
      "    请先启动 Chrome 并开启远程调试：chrome.exe --remote-debugging-port=9222"
    );
    process.exit(1);
  }

  const wsUrl = await waitForChromeDebugPort(port, 15_000);
  const cdp = await CdpConnection.connect(wsUrl, 15_000);

  const target = await cdp.send<{ targetId: string }>("Target.createTarget", {
    url: "about:blank",
  });
  const { sessionId } = await cdp.send<{ sessionId: string }>(
    "Target.attachToTarget",
    {
      targetId: target.targetId,
      flatten: true,
    }
  );

  return { cdp, sessionId, targetId: target.targetId };
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
