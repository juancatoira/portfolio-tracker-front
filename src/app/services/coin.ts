import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Coin } from '../models/coin.models';

@Injectable({ providedIn: 'root' })
export class CoinService {

  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getTop(limit: number = 10) {
    return this.http.get<Coin[]>(`${this.apiUrl}/coins/top?limit=${limit}`);
  }

  search(query: string) {
    return this.http.get<Coin[]>(`${this.apiUrl}/coins/search?query=${query}`);
  }
}