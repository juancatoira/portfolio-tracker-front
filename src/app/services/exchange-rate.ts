import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ExchangeRateService {

  private http = inject(HttpClient);

  readonly symbols: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', JPY: '¥',
    CHF: 'CHF', CAD: 'C$', AUD: 'A$', MXN: 'MX$'
  };

  rates = signal<Record<string, number>>({ USD: 1 });
  activeCurrency = signal<string>(
    JSON.parse(localStorage.getItem('user') || '{}')?.currency ?? 'USD'
  );
  preferredCurrency = signal<string>(
    JSON.parse(localStorage.getItem('user') || '{}')?.currency ?? 'USD'
  );

  // Un único computed que depende de ambos signals
  // Cuando cualquiera cambia, todo lo que use este objeto se recalcula
  conversionState = computed(() => ({
    currency: this.activeCurrency(),
    rates: this.rates(),
    symbol: this.symbols[this.activeCurrency()] ?? this.activeCurrency()
  }));

  loadRates() {
    this.http.get<any>(`${environment.apiUrl}/profile/exchange-rates`)
      .subscribe({
        next: (res) => {
          if (res.rates) {
            this.rates.set({ USD: 1, ...res.rates });
          }
        },
        error: () => console.warn('No se pudieron cargar los tipos de cambio')
      });
  }

  setCurrency(currency: string) {
    this.activeCurrency.set(currency);
  }

  setPreferredCurrency(currency: string) {
    this.preferredCurrency.set(currency);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    localStorage.setItem('user', JSON.stringify({ ...user, currency }));
  }

  toggleCurrency() {
    const current = this.activeCurrency();
    const preferred = this.preferredCurrency();
    const next = current === 'USD' ? preferred : 'USD';
    this.setCurrency(next);
  }

  format(amountUsd: number): string {
    const { currency, rates, symbol } = this.conversionState();
    const rate = rates[currency] ?? 1;
    const converted = amountUsd * rate;

    if (currency === 'JPY') {
      return `${symbol}${Math.round(converted).toLocaleString()}`;
    }
    return `${symbol}${converted.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  getSymbol(): string {
    return this.conversionState().symbol;
  }
}