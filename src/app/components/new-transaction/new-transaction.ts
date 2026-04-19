import { Component, inject, OnInit, signal, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, switchMap, of } from 'rxjs';
import { CoinService } from '../../services/coin';
import { PortfolioService } from '../../services/portfolio';
import { Coin } from '../../models/coin.models';

@Component({
  selector: 'app-new-transaction',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './new-transaction.html',
  styleUrl: './new-transaction.scss'
})
export class NewTransactionComponent implements OnInit {

  private fb = inject(FormBuilder);
  private coinService = inject(CoinService);
  private portfolioService = inject(PortfolioService);

  closed = output<boolean>();

  topCoins = signal<Coin[]>([]);
  searchResults = signal<Coin[]>([]);
  selectedCoin = signal<Coin | null>(null);
  isSearching = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  searchQuery = signal('');
  showDropdown = signal(false);
  useMarketPrice = signal(false);
  isFetchingPrice = signal(false);

  private searchSubject = new Subject<string>();

  form: FormGroup = this.fb.group({
  type: ['BUY', Validators.required],
  quantity: ['', [Validators.required, Validators.min(0.00000001)]],
  priceUsd: ['', [Validators.required, Validators.min(0.01)]],
  feeUsd: [0, [Validators.min(0)]],
  date: [new Date().toISOString().slice(0, 16), Validators.required],
  notes: ['']
});

  ngOnInit() {
    this.coinService.getTop(10).subscribe({
      next: (coins) => this.topCoins.set(coins)
    });

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (query.length < 2) {
          this.searchResults.set([]);
          return of([]);
        }
        this.isSearching.set(true);
        return this.coinService.search(query);
      })
    ).subscribe({
      next: (coins) => {
        this.searchResults.set(coins);
        this.isSearching.set(false);
      }
    });
  }

  onDateChange(event: Event) {
    const date = (event.target as HTMLInputElement).value;
    this.form.get('date')?.setValue(date);
    if (this.useMarketPrice() && this.selectedCoin()) {
      this.fetchHistoricalPrice(date);
    }
  }

  onUseMarketPriceChange(checked: boolean) {
    this.useMarketPrice.set(checked);
    if (checked && this.selectedCoin() && this.form.get('date')?.value) {
      const date = this.form.get('date')?.value.slice(0, 10);
      this.fetchHistoricalPrice(date);
    } else if (!checked) {
      this.form.get('priceUsd')?.enable();
    }
  }

  onSearchInput(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery.set(query);
    this.showDropdown.set(true);
    this.searchSubject.next(query);
  }

  selectCoin(coin: Coin) {
    this.selectedCoin.set(coin);
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.showDropdown.set(false);
  }

  clearCoin() {
    this.selectedCoin.set(null);
  }

  displayedCoins() {
    return this.searchResults().length > 0
      ? this.searchResults()
      : this.topCoins();
  }

  submit() {
    if (this.form.invalid && !this.useMarketPrice()) return;
    if (!this.selectedCoin()) {
      this.errorMessage.set('Selecciona una moneda');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    const coin = this.selectedCoin()!;
    const { type, quantity, priceUsd, feeUsd, date, notes } = this.form.getRawValue();

    const request = {
      coinId: coin.id,
      coinName: coin.name,
      coinSymbol: coin.symbol,
      type,
      quantity: parseFloat(quantity),
      priceUsd: parseFloat(priceUsd),
      feeUsd: parseFloat(feeUsd ?? 0),
      date: new Date(date).toISOString().slice(0, 19),
      notes
    };

    this.portfolioService.createTransaction(request).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closed.emit(true);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.error || 'Error al guardar la operación');
        this.isSubmitting.set(false);
      }
    });
  } 
  close() {
    this.closed.emit(false);
  }

  fetchHistoricalPrice(dateTime: string) {
    const coin = this.selectedCoin();
    if (!coin) return;

    const date = dateTime.slice(0, 10);
    this.isFetchingPrice.set(true);
    this.form.get('priceUsd')?.disable();

    this.portfolioService.getHistoricalPrice(coin.id, date).subscribe({
      next: (res) => {
        if (res.price) {
          this.form.get('priceUsd')?.setValue(res.price);
        }
        this.isFetchingPrice.set(false);
      },
      error: () => {
        this.form.get('priceUsd')?.enable();
        this.isFetchingPrice.set(false);
      }
    });
  }

}