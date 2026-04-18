export interface Transaction {
  id: string;
  coinId: string;
  coinName: string;
  coinSymbol: string;
  type: 'BUY' | 'SELL' | 'MANUAL';
  quantity: number;
  priceUsd: number;
  feeUsd: number;
  date: string;
  notes?: string;
}

export interface TransactionRequest {
  coinId: string;
  coinName: string;
  coinSymbol: string;
  type: 'BUY' | 'SELL' | 'MANUAL';
  quantity: number;
  priceUsd: number;
  feeUsd: number;
  date: string;
  notes?: string;
}

export interface ManualPositionRequest {
  coinId: string;
  coinName: string;
  coinSymbol: string;
  quantity: number;
  averagePriceUsd: number;
}

export interface Position {
  coinId: string;
  coinName: string;
  coinSymbol: string;
  imageUrl: string;
  quantity: number;
  averagePriceUsd: number;
  currentPriceUsd: number;
  totalInvestedUsd: number;
  currentValueUsd: number;
  pnlUsd: number;
  pnlPercent: number;
}