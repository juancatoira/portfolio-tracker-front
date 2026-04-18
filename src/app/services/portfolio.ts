import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Position, Transaction, TransactionRequest, ManualPositionRequest } from '../models/transaction.models';
import { Snapshot, NewsItem } from '../models/dashboard.models';

@Injectable({ providedIn: 'root' })
export class PortfolioService {

  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getPositions() {
    return this.http.get<Position[]>(`${this.apiUrl}/portfolio`);
  }

  getHistory() {
    return this.http.get<Transaction[]>(`${this.apiUrl}/transactions`);
  }

  createTransaction(request: TransactionRequest) {
    return this.http.post<Transaction>(`${this.apiUrl}/transactions`, request);
  }

  addManualPosition(request: ManualPositionRequest) {
    return this.http.post<Transaction>(`${this.apiUrl}/portfolio/manual`, request);
  }

  deleteTransaction(id: string) {
    return this.http.delete(`${this.apiUrl}/transactions/${id}`);
  }

  refreshPrices() {
    return this.http.post<any>(`${this.apiUrl}/portfolio/prices/refresh`, {});
  }

  getLastUpdated() {
    return this.http.get<any>(`${this.apiUrl}/portfolio/prices/last-updated`);
  }
  
  getSnapshots(days: number = 30) {
    return this.http.get<Snapshot[]>(`${this.apiUrl}/dashboard/snapshots?days=${days}`);
  }

  getNews() {
    return this.http.get<NewsItem[]>(`${this.apiUrl}/dashboard/news`);
  }

  getDashboardTransactions() {
    return this.http.get<Transaction[]>(`${this.apiUrl}/dashboard/transactions`);
  }  

  getHistoricalPrice(coinId: string, date: string) {
    return this.http.get<any>(`${this.apiUrl}/coins/historical-price?coinId=${coinId}&date=${date}`);
  }
  
}