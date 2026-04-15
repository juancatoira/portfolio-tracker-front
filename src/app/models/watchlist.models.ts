export interface WatchlistItem {
  id: string;
  coinId: string;
  coinName: string;
  coinSymbol: string;
  imageUrl?: string;
  currentPriceUsd: number;
  priceChangePercent24h: number;
  priceChangePercent7d: number;
  marketCap: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  sparkline7d: number[];
}
export interface WatchlistRequest {
  coinId: string;
  coinName: string;
  coinSymbol: string;
}