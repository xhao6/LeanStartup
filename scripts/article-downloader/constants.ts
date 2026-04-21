import os from "node:os";
import path from "node:path";
import process from "node:process";

// Chrome profile 目录
function resolveUserDataRoot(): string {
  if (process.platform === "win32") {
    return process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support");
  }
  return process.env.XDG_DATA_HOME ?? path.join(os.homedir(), ".local", "share");
}

export const USER_DATA_DIR = process.env.ARTICLE_DOWNLOADER_CHROME_PROFILE?.trim()
  ? path.resolve(process.env.ARTICLE_DOWNLOADER_CHROME_PROFILE.trim())
  : path.join(resolveUserDataRoot(), "article-downloader", "chrome-profile");

export const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

export const DEFAULT_TIMEOUT_MS = 30_000;
export const CDP_CONNECT_TIMEOUT_MS = 15_000;
export const NETWORK_IDLE_TIMEOUT_MS = 1_500;
export const POST_LOAD_DELAY_MS = 800;
export const SCROLL_STEP_WAIT_MS = 600;
export const SCROLL_MAX_STEPS = 8;

// 默认输出目录（相对于项目根目录）
export const DEFAULT_OUTPUT_DIR = "resources/raw";
