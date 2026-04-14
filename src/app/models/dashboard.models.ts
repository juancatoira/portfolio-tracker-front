export interface Snapshot {
  timestamp: string;
  totalValueUsd: number;
}

export interface NewsItem {
  id: number;
  title: string;
  url: string;
  updated_at: string;
  author: string;
  news_site: string;
}