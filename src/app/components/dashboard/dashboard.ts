import { Component, inject, OnInit, signal, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Chart, ChartConfiguration, LineElement, PointElement, LinearScale, Filler, Tooltip, LineController, CategoryScale } from 'chart.js';
import { PortfolioService } from '../../services/portfolio';
import { AuthService } from '../../services/auth';
import { Position } from '../../models/transaction.models';
import { Snapshot, NewsItem } from '../../models/dashboard.models';
import { NewTransactionComponent } from '../new-transaction/new-transaction';

Chart.register(LineElement, PointElement, LinearScale, Filler, Tooltip, LineController, CategoryScale);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NewTransactionComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {

  @ViewChild('lineCanvas', { static: false }) lineCanvas!: ElementRef<HTMLCanvasElement>;

  private portfolioService = inject(PortfolioService);
  private authService = inject(AuthService);
  private router = inject(Router);

  positions = signal<Position[]>([]);
  snapshots = signal<Snapshot[]>([]);
  news = signal<NewsItem[]>([]);
  isLoading = signal(true);
  isRefreshing = signal(false);
  lastUpdated = signal<string>('');
  showNewTransaction = signal(false);
  currentUser$ = this.authService.currentUser$;

  private lineChart: Chart | null = null;

  totalValue = computed(() =>
    this.positions().reduce((sum, p) => sum + p.currentValueUsd, 0)
  );

  totalInvested = computed(() =>
    this.positions().reduce((sum, p) => sum + p.totalInvestedUsd, 0)
  );

  totalPnl = computed(() => this.totalValue() - this.totalInvested());

  totalPnlPercent = computed(() => {
    const invested = this.totalInvested();
    if (invested === 0) return 0;
    return (this.totalPnl() / invested) * 100;
  });

  bestPosition = computed(() => {
    if (this.positions().length === 0) return null;
    return this.positions().reduce((best, p) =>
      p.pnlPercent > best.pnlPercent ? p : best
    );
  });

  worstPosition = computed(() => {
    if (this.positions().length === 0) return null;
    return this.positions().reduce((worst, p) =>
      p.pnlPercent < worst.pnlPercent ? p : worst
    );
  });

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.isLoading.set(true);

    this.portfolioService.getPositions().subscribe({
      next: (positions) => {
        this.positions.set(positions);
        this.isLoading.set(false);
        setTimeout(() => this.renderLineChart(), 100);
      }
    });

    this.portfolioService.getSnapshots(30).subscribe({
      next: (snapshots) => {
        this.snapshots.set(snapshots);
        setTimeout(() => this.renderLineChart(), 100);
      }
    });

    this.portfolioService.getNews().subscribe({
      next: (news) => this.news.set(news)
    });

    this.portfolioService.getLastUpdated().subscribe({
      next: (res) => {
        if (res.lastUpdated !== 'never') {
          this.lastUpdated.set(new Date(res.lastUpdated).toLocaleString('es-ES'));
        }
      }
    });
  }

 renderLineChart() {
  if (!this.lineCanvas || this.snapshots().length < 2) return;
  if (this.lineChart) this.lineChart.destroy();

  const snapshots = this.snapshots();
  const firstDate = new Date(snapshots[0].timestamp).toLocaleDateString('es-ES');
  const lastDate = new Date(snapshots[snapshots.length - 1].timestamp).toLocaleDateString('es-ES');
  const sameDay = firstDate === lastDate;

  const labels = snapshots.map(s => {
    const date = new Date(s.timestamp);
    if (sameDay) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  });

  const data = snapshots.map(s => s.totalValueUsd);

  this.lineChart = new Chart(this.lineCanvas.nativeElement, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6,182,212,0.08)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#06b6d4',
        pointHoverBorderColor: '#0f1117',
        pointHoverBorderWidth: 2,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#151821',
          borderColor: '#2d3f55',
          borderWidth: 1,
          titleColor: '#64748b',
          bodyColor: '#e2e8f0',
          padding: 12,
          displayColors: false,
          callbacks: {
            title: (items) => items[0].label,
            label: (item) => { 
              const value = item.parsed.y ?? 0;
              return `  ${this.formatCurrency(value)}`;}
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#1e293b' },
          ticks: {
            color: '#64748b',
            font: { family: 'Inter', size: 11 },
            maxTicksLimit: 8
          }
        },
        y: {
          grid: { color: '#1e293b' },
          ticks: {
            color: '#64748b',
            font: { family: 'Inter', size: 11 },
            callback: (value) => `$${Number(value).toLocaleString()}`
          }
        }
      }
    }
  } as ChartConfiguration);
}

  refreshPrices() {
    this.isRefreshing.set(true);
    this.portfolioService.refreshPrices().subscribe({
      next: () => {
        this.loadAll();
        this.isRefreshing.set(false);
      },
      error: () => this.isRefreshing.set(false)
    });
  }

  openNewTransaction() { this.showNewTransaction.set(true); }

  onModalClosed(refresh: boolean) {
    this.showNewTransaction.set(false);
    if (refresh) this.loadAll();
  }

  navigateTo(route: string) { this.router.navigate([route]); }
  logout() { this.authService.logout(); }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
  }

  formatPercent(value: number): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  formatNewsDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit'
    });
  }

  isPnlPositive(value: number): boolean { return value >= 0; }
}