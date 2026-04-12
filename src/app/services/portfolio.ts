import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Position, Transaction, TransactionRequest, ManualPositionRequest } from '../models/transaction.models';
import { environment } from '../../environments/environment';

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
}