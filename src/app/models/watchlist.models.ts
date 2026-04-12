export interface WatchlistItem {
  id: string;
  coinId: string;
  coinName: string;
  coinSymbol: string;
  currentPriceUsd: number;
  priceChangePercent24h: number;
  priceChangePercent7d: number;
}

export interface WatchlistRequest {
  coinId: string;
  coinName: string;
  coinSymbol: string;
}