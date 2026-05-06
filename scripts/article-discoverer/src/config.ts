import path from "node:path";
import type { DiscoverConfig } from "./types.js";

export const DEFAULT_CONFIG: DiscoverConfig = {
  accounts: [],
  keywords: [],
  maxPages: 5,
  batchSize: 10,
  dayLimit: 90,
  scanDelayMs: [3000, 5000],
  sogouSearchUrl: "https://weixin.sogou.com",
  outputDir: path.resolve(import.meta.dirname ?? ".", "../../../resources"),
  selectors: {
    searchBox: "#query",
    searchButton: ".swz2",
    searchTypeAccount: "a[href*='type=1']",
    searchTypeArticle: "a[href*='type=2']",
    accountResult: ".txt-box h3 a",
    articleItem: ".news-list li",
    articleTitle: ".txt-box h3 a",
    articleExcerpt: ".txt-box p",
    articleDate: ".s-p .s2",
    articleUrl: ".txt-box h3 a[href]",
    loadMoreButton: ".load-more",
    captchaIndicator: "#captcha, .antispider",
    timeSortTab: "a[href*='sort=time']",
  },
};
