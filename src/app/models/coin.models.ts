export interface Coin {
  id: string;
  symbol: string;
  name: string;
  imageUrl: string;
  marketCapRank: number;
}

export interface CoinPrice {
  [coinId: string]: number;
}