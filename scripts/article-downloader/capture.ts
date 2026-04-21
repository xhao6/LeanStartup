import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";

import {
  USER_DATA_DIR,
  CDP_CONNECT_TIMEOUT_MS,
  NETWORK_IDLE_TIMEOUT_MS,
} from "./constants.js";

// ===================== Platform Candidates =====================

type PlatformCandidates = {
  darwin?: string[];
  win32?: string[];
  default: string[];
};

const CHROME_CANDIDATES: PlatformCandidates = {
  darwin: [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ],
  win32: [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ],
  default: [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
    "/usr/bin/microsoft-edge",
  ],
};

// ===================== Utilities =====================

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getFreePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Unable to allocate a free TCP port.")));
        return;
      }
      const port = address.port;
      server.close((err) => {
        if (err) reject(err);
        else resolve(port);
      });
    });
  });
}

// ===================== Chrome Discovery =====================

function findChromeExecutable(): string | null {
  const envPath = process.env.ARTICLE_DOWNLOADER_CHROME_PATH?.trim();
  if (envPath && fs.existsSync(envPath)) return envPath;

  const candidates =
    process.platform === "darwin"
      ? CHROME_CANDIDATES.darwin ?? CHROME_CANDIDATES.default
      : process.platform === "win32"
        ? CHROME_CANDIDATES.win32 ?? CHROME_CANDIDATES.default
        : CHROME_CANDIDATES.default;

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

async function fetchJson<T = unknown>(url: string, timeoutMs = 5_000): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const response = await fetch(url, { redirect: "follow", signal: ctl.signal });
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

async function isDebugPortReady(port: number, timeoutMs = 3_000): Promise<boolean> {
  try {
    const version = await fetchJson<{ webSocketDebuggerUrl?: string }>(
      `http://127.0.0.1:${port}/json/version`,
      timeoutMs
    );
    return !!version.webSocketDebuggerUrl;
  } catch {
    return false;
  }
}

function parseDevToolsActivePort(filePath: string): { port: number; wsPath: string } | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split(/\r?\n/);
    const port = Number.parseInt(lines[0]?.trim() ?? "", 10);
    const wsPath = lines[1]?.trim();
    if (port > 0 && wsPath) return { port, wsPath };
  } catch {}
  return null;
}

export async function findExistingChromePort(): Promise<number | null> {
  const parsed = parseDevToolsActivePort(path.join(USER_DATA_DIR, "DevToolsActivePort"));
  if (parsed && parsed.port > 0 && (await isDebugPortReady(parsed.port))) return parsed.port;

  if (process.platform === "win32") return null;

  try {
    const result = spawnSync("ps", ["aux"], { encoding: "utf-8", timeout: 5_000 });
    if (result.status !== 0 || !result.stdout) return null;
    const lines = result.stdout
      .split("\n")
      .filter((line) => line.includes(USER_DATA_DIR) && line.includes("--remote-debugging-port="));
    for (const line of lines) {
      const portMatch = line.match(/--remote-debugging-port=(\d+)/);
      const port = Number.parseInt(portMatch?.[1] ?? "", 10);
      if (port > 0 && (await isDebugPortReady(port))) return port;
    }
  } catch {}
  return null;
}

export async function waitForChromeDebugPort(port: number, timeoutMs: number): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const version = await fetchJson<{ webSocketDebuggerUrl?: string }>(
        `http://127.0.0.1:${port}/json/version`,
        5_000
      );
      if (version.webSocketDebuggerUrl) return version.webSocketDebuggerUrl;
    } catch {}
    await sleep(200);
  }
  throw new Error("Chrome debug port not ready");
}

// ===================== CdpConnection =====================

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout> | null;
};

export class CdpConnection {
  private ws: WebSocket;
  private nextId = 0;
  private pending = new Map<number, PendingRequest>();
  private eventHandlers = new Map<string, Set<(params: unknown) => void>>();
  private defaultTimeoutMs: number;

  private constructor(ws: WebSocket, defaultTimeoutMs = 15_000) {
    this.ws = ws;
    this.defaultTimeoutMs = defaultTimeoutMs;

    this.ws.addEventListener("message", (event) => {
      try {
        const data =
          typeof event.data === "string"
            ? event.data
            : new TextDecoder().decode(event.data as ArrayBuffer);
        const msg = JSON.parse(data) as {
          id?: number;
          method?: string;
          params?: unknown;
          result?: unknown;
          error?: { message?: string };
        };

        if (msg.method) {
          const handlers = this.eventHandlers.get(msg.method);
          if (handlers) {
            handlers.forEach((handler) => handler(msg.params));
          }
        }

        if (msg.id) {
          const pending = this.pending.get(msg.id);
          if (pending) {
            this.pending.delete(msg.id);
            if (pending.timer) clearTimeout(pending.timer);
            if (msg.error?.message) pending.reject(new Error(msg.error.message));
            else pending.resolve(msg.result);
          }
        }
      } catch {}
    });

    this.ws.addEventListener("close", () => {
      for (const [, pending] of this.pending.entries()) {
        if (pending.timer) clearTimeout(pending.timer);
        pending.reject(new Error("CDP connection closed."));
      }
      this.pending.clear();
    });
  }

  static async connect(url: string, timeoutMs: number): Promise<CdpConnection> {
    const ws = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("CDP connection timeout.")), timeoutMs);
      ws.addEventListener("open", () => {
        clearTimeout(timer);
        resolve();
      });
      ws.addEventListener("error", () => {
        clearTimeout(timer);
        reject(new Error("CDP connection failed."));
      });
    });
    return new CdpConnection(ws);
  }

  on(method: string, handler: (params: unknown) => void): void {
    if (!this.eventHandlers.has(method)) {
      this.eventHandlers.set(method, new Set());
    }
    this.eventHandlers.get(method)?.add(handler);
  }

  off(method: string, handler: (params: unknown) => void): void {
    this.eventHandlers.get(method)?.delete(handler);
  }

  async send<T = unknown>(
    method: string,
    params?: Record<string, unknown>,
    options?: { sessionId?: string; timeoutMs?: number }
  ): Promise<T> {
    const id = ++this.nextId;
    const message: Record<string, unknown> = { id, method };
    if (params) message.params = params;
    if (options?.sessionId) message.sessionId = options.sessionId;

    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;
    const result = await new Promise<unknown>((resolve, reject) => {
      const timer = timeoutMs > 0
        ? setTimeout(() => {
            this.pending.delete(id);
            reject(new Error(`CDP timeout: ${method}`));
          }, timeoutMs)
        : null;
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify(message));
    });

    return result as T;
  }

  close(): void {
    try {
      this.ws.close();
    } catch {}
  }
}

// ===================== Chrome Launch =====================

export async function launchChrome(url: string, port: number): Promise<ChildProcess> {
  const chromePath = findChromeExecutable();
  if (!chromePath) throw new Error("Chrome not found. Install Chrome or set ARTICLE_DOWNLOADER_CHROME_PATH.");

  await fs.promises.mkdir(USER_DATA_DIR, { recursive: true });

  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${USER_DATA_DIR}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-popup-blocking",
    url,
  ];

  return spawn(chromePath, args, { stdio: "ignore" });
}

export function killChrome(chrome: ChildProcess): void {
  try {
    chrome.kill("SIGTERM");
  } catch {}
  setTimeout(() => {
    if (!chrome.killed) {
      try { chrome.kill("SIGKILL"); } catch {}
    }
  }, 2_000).unref?.();
}

// ===================== Page Control =====================

export async function waitForNetworkIdle(
  cdp: CdpConnection,
  sessionId: string,
  timeoutMs: number = NETWORK_IDLE_TIMEOUT_MS
): Promise<void> {
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pending = 0;
    const cleanup = () => {
      if (timer) clearTimeout(timer);
      cdp.off("Network.requestWillBeSent", onRequest);
      cdp.off("Network.loadingFinished", onFinish);
      cdp.off("Network.loadingFailed", onFinish);
    };
    const done = () => { cleanup(); resolve(); };
    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(done, timeoutMs);
    };
    const onRequest = () => { pending++; resetTimer(); };
    const onFinish = () => { pending = Math.max(0, pending - 1); if (pending <= 2) resetTimer(); };
    cdp.on("Network.requestWillBeSent", onRequest);
    cdp.on("Network.loadingFinished", onFinish);
    cdp.on("Network.loadingFailed", onFinish);
    resetTimer();
  });
}

export async function waitForPageLoad(
  cdp: CdpConnection,
  sessionId: string,
  timeoutMs: number = 30_000
): Promise<void> {
  void sessionId;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      cdp.off("Page.loadEventFired", handler);
      resolve();
    }, timeoutMs);
    const handler = () => {
      clearTimeout(timer);
      cdp.off("Page.loadEventFired", handler);
      resolve();
    };
    cdp.on("Page.loadEventFired", handler);
  });
}

export async function evaluateScript<T>(
  cdp: CdpConnection,
  sessionId: string,
  expression: string,
  timeoutMs: number = 30_000
): Promise<T> {
  const result = await cdp.send<{ result: { value?: T } }>(
    "Runtime.evaluate",
    { expression, returnByValue: true, awaitPromise: true },
    { sessionId, timeoutMs }
  );
  return result.result.value as T;
}

export async function autoScroll(
  cdp: CdpConnection,
  sessionId: string,
  steps: number,
  waitMs: number
): Promise<void> {
  let lastHeight = await evaluateScript<number>(cdp, sessionId, "document.body.scrollHeight");
  for (let i = 0; i < steps; i++) {
    await evaluateScript<void>(cdp, sessionId, "window.scrollTo(0, document.body.scrollHeight)");
    await sleep(waitMs);
    const newHeight = await evaluateScript<number>(cdp, sessionId, "document.body.scrollHeight");
    if (newHeight === lastHeight) break;
    lastHeight = newHeight;
  }
  await evaluateScript<void>(cdp, sessionId, "window.scrollTo(0, 0)");
}
