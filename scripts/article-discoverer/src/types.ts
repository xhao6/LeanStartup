export interface CandidateArticle {
  url: string;
  title: string;
  excerpt: string;
  date: string;
  source: string;
  scannedAt: string;
}

export interface SelectionCriteria {
  summary: string;
  coreThemes: string[];
  coreTags: string[];
  scoreDistribution: string;
  searchKeywords: string[];
  negativeSignals: string[];
  generatedAt: string;
}

export interface CapturedArticle extends CandidateArticle {
  html: string;
}

export interface EvaluatedArticle {
  url: string;
  pass: boolean;
  score: number;
  reason: string;
}

export interface SogouSelectors {
  searchBox: string;
  searchButton: string;
  searchTypeAccount: string;
  searchTypeArticle: string;
  accountResult: string;
  articleItem: string;
  articleTitle: string;
  articleExcerpt: string;
  articleDate: string;
  articleUrl: string;
  loadMoreButton: string;
  captchaIndicator: string;
  timeSortTab: string;
}

export interface DiscoverConfig {
  accounts: string[];
  keywords: string[];
  maxPages: number;
  batchSize: number;
  dayLimit: number;       // search within N days (default 90)
  scanDelayMs: [number, number];
  sogouSearchUrl: string;
  outputDir: string;
  selectors: SogouSelectors;
}
