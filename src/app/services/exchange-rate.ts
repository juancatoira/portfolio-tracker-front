import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ExchangeRateService {

  private http = inject(HttpClient);

  rates = signal<Record<string, number>>({ USD: 1 });

  readonly symbols: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', JPY: '¥',
    CHF: 'CHF', CAD: 'C$', AUD: 'A$', MXN: 'MX$'
  };

  activeCurrency = signal<string>(
    JSON.parse(localStorage.getItem('user') || '{}')?.currency ?? 'USD'
  );

  loadRates(): Observable<void> {
    return this.http.get<{ currency: string; symbol: string; rates: Record<string, number> }>(
      `${environment.apiUrl}/profile/exchange-rates`
    ).pipe(
      tap(res => {
        this.rates.set(res.rates);
        this.activeCurrency.set(res.currency);
      }),
      catchError(() => of(null)),
      map(() => undefined)
    );
  }

  setCurrency(currency: string) {
    this.activeCurrency.set(currency);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    localStorage.setItem('user', JSON.stringify({ ...user, currency }));
  }

  convert(amountUsd: number): number {
    const rate = this.rates()[this.activeCurrency()] ?? 1;
    return amountUsd * rate;
  }

  format(amountUsd: number): string {
    const currency = this.activeCurrency();
    const symbol = this.symbols[currency] ?? currency;
    const converted = this.convert(amountUsd);

    if (currency === 'JPY') {
      return `${symbol}${Math.round(converted).toLocaleString()}`;
    }
    return `${symbol}${converted.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  getSymbol(): string {
    return this.symbols[this.activeCurrency()] ?? this.activeCurrency();
  }
}