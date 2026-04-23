import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ProfileResponse, UpdateProfileRequest, ChangePasswordRequest } from '../models/profile.models';
import { ExchangeRateService } from './exchange-rate';
import { tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProfileService {

  private http = inject(HttpClient);
  private exchangeRateService = inject(ExchangeRateService);
  private apiUrl = environment.apiUrl;

  activeCurrency = signal<string>(
    JSON.parse(localStorage.getItem('user') || '{}')?.currency ?? 'USD'
  );

  activeSymbol = signal<string>(
    this.getSymbolFor(JSON.parse(localStorage.getItem('user') || '{}')?.currency ?? 'USD')
  );

  getProfile() {
    return this.http.get<ProfileResponse>(`${this.apiUrl}/profile`);
  }

  updateProfile(request: UpdateProfileRequest) {
    return this.http.put<ProfileResponse>(`${this.apiUrl}/profile`, request).pipe(
      tap(res => {
        this.exchangeRateService.setCurrency(res.currency);
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({
          ...user,
          currency: res.currency,
          username: res.username
        }));
      })
    );
  }

  changePassword(request: ChangePasswordRequest) {
    return this.http.put<void>(`${this.apiUrl}/profile/password`, request);
  }
  
  getCurrencies() {
    return this.http.get<Record<string, string>>(`${this.apiUrl}/profile/currencies`);
  }

  setCurrency(currency: string) {
    this.activeCurrency.set(currency);
    this.activeSymbol.set(this.getSymbolFor(currency));
  }

  getSymbolFor(currency: string): string {
    const symbols: Record<string, string> = {
      USD: '$', EUR: '€', GBP: '£', JPY: '¥',
      CHF: 'CHF', CAD: 'C$', AUD: 'A$', MXN: 'MX$'
    };
    return symbols[currency] ?? currency;
  }

  formatAmount(amountUsd: number, rates: Record<string, number>): string {
    const currency = this.activeCurrency();
    const symbol = this.activeSymbol();
    const rate = rates[currency] ?? 1;
    const converted = amountUsd * rate;

    if (currency === 'JPY') {
      return `${symbol}${Math.round(converted).toLocaleString()}`;
    }
    return `${symbol}${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}