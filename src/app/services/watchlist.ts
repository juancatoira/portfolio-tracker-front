import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { WatchlistItem, WatchlistRequest } from '../models/watchlist.models';

@Injectable({ providedIn: 'root' })
export class WatchlistService {

  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  getWatchlist() {
    return this.http.get<WatchlistItem[]>(`${this.apiUrl}/watchlist`);
  }

  addToWatchlist(request: WatchlistRequest) {
    return this.http.post<WatchlistItem>(`${this.apiUrl}/watchlist`, request);
  }

  removeFromWatchlist(coinId: string) {
    return this.http.delete(`${this.apiUrl}/watchlist/${coinId}`);
  }
}