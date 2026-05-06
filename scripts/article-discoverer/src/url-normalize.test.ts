import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { normalizeWeChatUrl, extractWeChatUrlFromSogou } from "./url-normalize.js";

describe("normalizeWeChatUrl", () => {
  it("strips tracking params, keeping only __biz, mid, idx", () => {
    const input =
      "https://mp.weixin.qq.com/s?__biz=MzIwNDM2NTA0NA==&mid=2247484533&idx=1&sn=abc123&ch=xyz&pass_ticket=foo#rd";
    const result = normalizeWeChatUrl(input);
    assert.equal(
      result,
      "https://mp.weixin.qq.com/s?__biz=MzIwNDM2NTA0NA%3D%3D&mid=2247484533&idx=1",
    );
  });

  it("keeps URL with only core params as-is", () => {
    const input =
      "https://mp.weixin.qq.com/s?__biz=MzIwNDM2NTA0NA==&mid=2247484533&idx=1";
    const result = normalizeWeChatUrl(input);
    assert.equal(
      result,
      "https://mp.weixin.qq.com/s?__biz=MzIwNDM2NTA0NA%3D%3D&mid=2247484533&idx=1",
    );
  });

  it("returns null for non-WeChat URL", () => {
    assert.equal(normalizeWeChatUrl("https://example.com/page"), null);
  });

  it("returns null for invalid URL string", () => {
    assert.equal(normalizeWeChatUrl("not-a-url"), null);
  });

  it("returns null when required param __biz is missing", () => {
    const input = "https://mp.weixin.qq.com/s?mid=2247484533&idx=1";
    assert.equal(normalizeWeChatUrl(input), null);
  });

  it("returns null when required param mid is missing", () => {
    const input = "https://mp.weixin.qq.com/s?__biz=MzIwNDM2NTA0NA==&idx=1";
    assert.equal(normalizeWeChatUrl(input), null);
  });

  it("returns null when required param idx is missing", () => {
    const input =
      "https://mp.weixin.qq.com/s?__biz=MzIwNDM2NTA0NA==&mid=2247484533";
    assert.equal(normalizeWeChatUrl(input), null);
  });

  it("strips hash/fragment", () => {
    const input =
      "https://mp.weixin.qq.com/s?__biz=MzIwNDM2NTA0NA==&mid=2247484533&idx=1#rd";
    const result = normalizeWeChatUrl(input);
    assert.equal(result?.includes("#"), false);
    assert.equal(
      result,
      "https://mp.weixin.qq.com/s?__biz=MzIwNDM2NTA0NA%3D%3D&mid=2247484533&idx=1",
    );
  });
});

describe("extractWeChatUrlFromSogou", () => {
  it("normalizes a direct mp.weixin.qq.com link", () => {
    const input =
      "https://mp.weixin.qq.com/s?__biz=MzIwNDM2NTA0NA==&mid=2247484533&idx=1&sn=abc123";
    const result = extractWeChatUrlFromSogou(input);
    assert.equal(
      result,
      "https://mp.weixin.qq.com/s?__biz=MzIwNDM2NTA0NA%3D%3D&mid=2247484533&idx=1",
    );
  });

  it("extracts and normalizes URL from sogou redirect", () => {
    const wechatUrl =
      "https://mp.weixin.qq.com/s?__biz=MzIwNDM2NTA0NA==&mid=2247484533&idx=1";
    const sogouUrl = `https://weixin.sogou.com/link?url=${encodeURIComponent(wechatUrl)}&from=xxx`;
    const result = extractWeChatUrlFromSogou(sogouUrl);
    assert.equal(
      result,
      "https://mp.weixin.qq.com/s?__biz=MzIwNDM2NTA0NA%3D%3D&mid=2247484533&idx=1",
    );
  });

  it("normalizes Sogou redirect format (src/timestamp/ver/signature)", () => {
    const input =
      "https://mp.weixin.qq.com/s?src=11&timestamp=1778038032&ver=6703&signature=FvdLTR*some&scene=1#rd";
    const result = normalizeWeChatUrl(input);
    assert.equal(
      result,
      "https://mp.weixin.qq.com/s?src=11&timestamp=1778038032&ver=6703&signature=FvdLTR*some",
    );
  });

  it("normalizes a direct mp.weixin.qq.com link with signature format", () => {
    const input =
      "https://mp.weixin.qq.com/s?src=11&timestamp=1778038032&ver=6703&signature=abc123&extra=foo";
    const result = extractWeChatUrlFromSogou(input);
    assert.equal(
      result,
      "https://mp.weixin.qq.com/s?src=11&timestamp=1778038032&ver=6703&signature=abc123",
    );
  });

  it("returns null for non-WeChat, non-Sogou URL", () => {
    assert.equal(
      extractWeChatUrlFromSogou("https://example.com/some-article"),
      null,
    );
  });
});
