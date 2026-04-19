import { Component, inject, OnInit, signal, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Chart, ChartConfiguration, LineElement, PointElement, LinearScale, Filler, Tooltip, LineController, CategoryScale } from 'chart.js';
import { PortfolioService } from '../../services/portfolio';
import { AuthService } from '../../services/auth';
import { Position,Transaction } from '../../models/transaction.models';
import { Snapshot, NewsItem } from '../../models/dashboard.models';
import { NewTransactionComponent } from '../new-transaction/new-transaction';
import { Navbar } from '../navbar/navbar';


Chart.register(LineElement, PointElement, LinearScale, Filler, Tooltip, LineController, CategoryScale);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, Navbar,CommonModule, NewTransactionComponent],
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
  transactions = signal<Transaction[]>([]);
  showBuys = signal(true);
  showSells = signal(true);
  
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

  this.portfolioService.getDashboardTransactions().subscribe({
    next: (txs) => {
      this.transactions.set(txs);
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

toggleBuys() {
  this.showBuys.set(!this.showBuys());
  this.renderLineChart();
}

toggleSells() {
  this.showSells.set(!this.showSells());
  this.renderLineChart();
}

 renderLineChart() {
  if (!this.lineCanvas || this.snapshots().length < 2) return;
  if (this.lineChart) this.lineChart.destroy();

  const snapshots = this.snapshots();
  const transactions = this.transactions();

  // Agrupar snapshots por día y hacer media
  const byDay = new Map<string, number[]>();
  snapshots.forEach(s => {
    const day = new Date(s.timestamp).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'short'
    });
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(s.totalValueUsd);
  });

  // Media por día
  const dailyData = Array.from(byDay.entries()).map(([day, values]) => ({
    label: day,
    value: values.reduce((a, b) => a + b, 0) / values.length
  }));

  const labels = dailyData.map(d => d.label);
  const data = dailyData.map(d => d.value);

  // Marcadores de compras y ventas
  const buyPoints = data.map((v, i) => {
    if (!this.showBuys()) return null;
    const label = labels[i];
    const hasBuy = transactions.some(tx => {
      const txDay = new Date(tx.date).toLocaleDateString('es-ES', {
        day: '2-digit', month: 'short'
      });
      return (tx.type === 'BUY' || tx.type === 'MANUAL') && txDay === label;
    });
    return hasBuy ? v : null;
  });

  const sellPoints = data.map((v, i) => {
    if (!this.showSells()) return null;
    const label = labels[i];
    const hasSell = transactions.some(tx => {
      const txDay = new Date(tx.date).toLocaleDateString('es-ES', {
        day: '2-digit', month: 'short'
      });
      return tx.type === 'SELL' && txDay === label;
    });
    return hasSell ? v : null;
  });

  this.lineChart = new Chart(this.lineCanvas.nativeElement, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Valor',
          data,
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6,182,212,0.08)',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: '#06b6d4',
          fill: true,
          tension: 0.4,
          order: 3
        },
        {
          label: 'Compras',
          data: buyPoints,
          borderColor: 'transparent',
          backgroundColor: '#10b981',
          pointRadius: 6,
          pointHoverRadius: 8,
          pointStyle: 'triangle',
          pointBackgroundColor: '#10b981',
          showLine: false,
          order: 1
        },
        {
          label: 'Ventas',
          data: sellPoints,
          borderColor: 'transparent',
          backgroundColor: '#f43f5e',
          pointRadius: 6,
          pointHoverRadius: 8,
          pointStyle: 'triangle',
          pointRotation: 180,
          pointBackgroundColor: '#f43f5e',
          showLine: false,
          order: 2
        }
      ]
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
          padding: 12,
          displayColors: true,
          filter: (item) => item.parsed.y !== null,
          callbacks: {
            label: (ctx) => {
              if (ctx.dataset.label === 'Compras') return '  ▲ Compra';
              if (ctx.dataset.label === 'Ventas') return '  ▼ Venta';
              return `  ${this.formatCurrency(ctx.parsed.y ?? 0)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: '#1e293b' },
          ticks: {
            color: '#64748b',
            font: { family: 'Inter', size: 11 },
            maxRotation: 0,
            autoSkip: true,
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
    const timestamp = parseInt(date) * 1000; // convertir a milisegundos
    return new Date(timestamp).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit'
    });
  }

  isPnlPositive(value: number): boolean { return value >= 0; }
}