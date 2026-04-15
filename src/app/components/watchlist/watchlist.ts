import { Component, inject, OnInit, signal, AfterViewInit, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject, switchMap, of } from 'rxjs';
import { Chart, ChartConfiguration, LineElement, PointElement, LinearScale, Filler, Tooltip, LineController, CategoryScale } from 'chart.js';
import { WatchlistService } from '../../services/watchlist';
import { CoinService } from '../../services/coin';
import { AuthService } from '../../services/auth';
import { WatchlistItem } from '../../models/watchlist.models';
import { Coin } from '../../models/coin.models';

Chart.register(LineElement, PointElement, LinearScale, Filler, Tooltip, LineController, CategoryScale);

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './watchlist.html',
  styleUrl: './watchlist.scss'
})
export class Watchlist implements OnInit {

  @ViewChildren('sparklineCanvas') sparklineCanvases!: QueryList<ElementRef<HTMLCanvasElement>>;

  private watchlistService = inject(WatchlistService);
  private coinService = inject(CoinService);
  private authService = inject(AuthService);
  private router = inject(Router);

  watchlist = signal<WatchlistItem[]>([]);
  topCoins = signal<Coin[]>([]);
  searchResults = signal<Coin[]>([]);
  isLoading = signal(true);
  isSearching = signal(false);
  searchQuery = signal('');
  showDropdown = signal(false);
  selectedCoin = signal<WatchlistItem | null>(null);
  currentUser$ = this.authService.currentUser$;

  private searchSubject = new Subject<string>();
  private sparklineCharts: Map<string, Chart> = new Map();
  private detailChart: Chart | null = null;

  ngOnInit() {
    this.loadWatchlist();
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
        this.searchResults.set(coins as Coin[]);
        this.isSearching.set(false);
      }
    });
  }

  loadWatchlist() {
    this.isLoading.set(true);
    this.watchlistService.getWatchlist().subscribe({
      next: (items) => {
        this.watchlist.set(items);
        this.isLoading.set(false);
        setTimeout(() => this.renderSparklines(), 100);
      },
      error: () => this.isLoading.set(false)
    });
  }

  renderSparklines() {
    if (!this.sparklineCanvases) return;
    this.sparklineCanvases.forEach((canvasRef, index) => {
      const item = this.watchlist()[index];
      if (!item || !item.sparkline7d?.length) return;

      const existingChart = this.sparklineCharts.get(item.coinId);
      if (existingChart) existingChart.destroy();

      const isPositive = item.priceChangePercent7d >= 0;
      const color = isPositive ? '#10b981' : '#f43f5e';

      const chart = new Chart(canvasRef.nativeElement, {
        type: 'line',
        data: {
          labels: item.sparkline7d.map(() => ''),
          datasets: [{
            data: item.sparkline7d,
            borderColor: color,
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: {
            x: { display: false },
            y: { display: false }
          },
          animation: false
        }
      } as ChartConfiguration);

      this.sparklineCharts.set(item.coinId, chart);
    });
  }

  openDetail(item: WatchlistItem) {
    this.selectedCoin.set(item);
    setTimeout(() => this.renderDetailChart(item), 100);
  }

  closeDetail() {
    if (this.detailChart) {
      this.detailChart.destroy();
      this.detailChart = null;
    }
    this.selectedCoin.set(null);
  }

  renderDetailChart(item: WatchlistItem) {
    const canvas = document.getElementById('detailChart') as HTMLCanvasElement;
    if (!canvas || !item.sparkline7d?.length) return;

    if (this.detailChart) this.detailChart.destroy();

    const isPositive = item.priceChangePercent7d >= 0;
    const color = isPositive ? '#10b981' : '#f43f5e';

    // Generamos etiquetas por día, una cada 24 puntos aprox
    const totalPoints = item.sparkline7d.length;
    const labels = item.sparkline7d.map((_, i) => {
      const daysAgo = Math.floor((totalPoints - i) / (totalPoints / 7));
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      // Solo mostramos etiqueta cada ~24 puntos
      if (i % Math.floor(totalPoints / 7) === 0) {
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      }
      return '';
    });

    this.detailChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: item.sparkline7d,
          borderColor: color,
          backgroundColor: isPositive ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: color,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#151821',
            borderColor: '#2d3f55',
            borderWidth: 1,
            titleColor: '#64748b',
            bodyColor: '#e2e8f0',
            padding: 10,
            displayColors: false,
            callbacks: {
              label: (ctx) => `  ${this.formatCurrency(ctx.parsed.y ?? 0)}`
            }
          }
        },
        scales: {
          x: {
            grid: { color: '#1e293b' },
            ticks: {
              color: '#64748b',
              font: { family: 'Inter', size: 10 },
              maxTicksLimit: 7,
              maxRotation: 0
            }
          },
          y: {
            grid: { color: '#1e293b' },
            ticks: {
              color: '#64748b',
              font: { family: 'Inter', size: 10 },
              callback: (value) => `$${Number(value).toLocaleString()}`
            }
          }
        }
      }
    } as ChartConfiguration);
  }

  onSearchInput(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery.set(query);
    this.showDropdown.set(true);
    this.searchSubject.next(query);
  }

  displayedCoins() {
    return this.searchResults().length > 0 ? this.searchResults() : this.topCoins();
  }

  addCoin(coin: Coin) {
    if (this.isInWatchlist(coin.id)) {
      this.showDropdown.set(false);
      this.searchQuery.set('');
      return;
    }
    this.watchlistService.addToWatchlist({
      coinId: coin.id,
      coinName: coin.name,
      coinSymbol: coin.symbol
    }).subscribe({
      next: () => {
        this.loadWatchlist();
        this.showDropdown.set(false);
        this.searchQuery.set('');
      }
    });
  }

  removeCoin(coinId: string) {
    this.watchlistService.removeFromWatchlist(coinId).subscribe({
      next: () => {
        if (this.selectedCoin()?.coinId === coinId) this.closeDetail();
        this.loadWatchlist();
      }
    });
  }

  isInWatchlist(coinId: string): boolean {
    return this.watchlist().some(w => w.coinId === coinId);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
  }

  formatLargeNumber(value: number): string {
    if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    return this.formatCurrency(value);
  }

  formatPercent(value: number): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  isPositive(value: number): boolean { return value >= 0; }
  navigateTo(route: string) { this.router.navigate([route]); }
  logout() { this.authService.logout(); }
  closeDropdown() { setTimeout(() => this.showDropdown.set(false), 200); }
}