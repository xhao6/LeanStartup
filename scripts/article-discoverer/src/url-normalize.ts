import { URL } from "node:url";

const KEEP_PARAMS = new Set(["__biz", "mid", "idx"]);

export function normalizeWeChatUrl(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  if (url.hostname !== "mp.weixin.qq.com") return null;

  const clean = new URL(url.origin + url.pathname);
  for (const [key, value] of url.searchParams) {
    if (KEEP_PARAMS.has(key)) {
      clean.searchParams.set(key, value);
    }
  }

  if (
    clean.searchParams.get("__biz") &&
    clean.searchParams.get("mid") &&
    clean.searchParams.get("idx")
  ) {
    return clean.toString();
  }

  return null;
}

export function extractWeChatUrlFromSogou(href: string): string | null {
  // Try as a direct WeChat URL first (check hostname, not substring)
  try {
    const parsed = new URL(href);
    if (parsed.hostname === "mp.weixin.qq.com") {
      return normalizeWeChatUrl(href);
    }
  } catch {
    // not a valid URL, fall through
  }

  // Try extracting url parameter (Sogou redirect pattern)
  try {
    const urlParam = new URL(
      href,
      "https://weixin.sogou.com",
    ).searchParams.get("url");
    if (urlParam) {
      return normalizeWeChatUrl(urlParam);
    }
  } catch {
    // not parseable
  }

  return null;
}
