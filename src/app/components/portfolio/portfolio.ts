import { Component, inject, OnInit, signal, computed, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Chart, ChartConfiguration, ArcElement, Tooltip, Legend, DoughnutController } from 'chart.js';
import { PortfolioService } from '../../services/portfolio';
import { AuthService } from '../../services/auth';
import { Position, Transaction } from '../../models/transaction.models';
import { NewTransactionComponent } from '../new-transaction/new-transaction';
import { Navbar} from '../navbar/navbar';

Chart.register(ArcElement, Tooltip, Legend, DoughnutController);

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [Navbar, CommonModule, NewTransactionComponent],
  templateUrl: './portfolio.html',
  styleUrl: './portfolio.scss'
})
export class Portfolio implements OnInit, AfterViewInit {

@ViewChild('chartCanvas', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;
 
  private portfolioService = inject(PortfolioService);
  private authService = inject(AuthService);
  private router = inject(Router);

  positions = signal<Position[]>([]);
  transactions = signal<Transaction[]>([]);
  isLoading = signal(true);
  showNewTransaction = signal(false);
  filterCoinId = signal<string | null>(null);
  openMenuId = signal<string | null>(null);
  currentUser$ = this.authService.currentUser$;
  historySearch = signal<string>('');
  selectedTransaction = signal<Transaction | null>(null);


  private chart: Chart | null = null;
  readonly OTHER_THRESHOLD = 3;
  readonly MIN_POSITIONS_FOR_OTHERS = 5;

filteredTransactions = computed(() => {
  const filter = this.filterCoinId();
  const search = this.historySearch().toLowerCase().trim();

  let txs = this.transactions();

  if (filter) {
    txs = txs.filter(t => t.coinId === filter);
  }

  if (search) {
    txs = txs.filter(t =>
      t.coinSymbol.toLowerCase().includes(search) ||
      t.coinName.toLowerCase().includes(search)
    );
  }

  return txs;
});

 chartData = computed(() => {
  const positions = this.positions();
  const totalValue = positions.reduce((sum, p) => sum + p.currentValueUsd, 0);
  if (totalValue === 0) return { labels: [], data: [], colors: [] };

  const withPercent = positions.map(p => ({
    ...p,
    percent: (p.currentValueUsd / totalValue) * 100
  }));

  const colors = [
    '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6',
    '#f43f5e', '#3b82f6', '#ec4899', '#14b8a6',
    '#a78bfa', '#34d399'
  ];

  const MIN_VISUAL = 3; // Mínimo visual del 3%

  // Aplicamos tamaño mínimo visual
  const visualData = withPercent.map(p => ({
    ...p,
    visualPercent: Math.max(p.percent, MIN_VISUAL)
  }));

  // Normalizamos para que sumen 100
  const visualTotal = visualData.reduce((sum, p) => sum + p.visualPercent, 0);
  const normalized = visualData.map(p => ({
    ...p,
    visualPercent: (p.visualPercent / visualTotal) * 100
  }));

  return {
    labels: normalized.map(p => p.coinSymbol),
    data: normalized.map(p => parseFloat(p.visualPercent.toFixed(2))),
    realPercents: normalized.map(p => parseFloat(p.percent.toFixed(2))),
    colors: colors.slice(0, normalized.length)
  };
});

  ngOnInit() {
    this.loadData();
  }

  ngAfterViewInit() {
    // No renderizamos aquí, esperamos a que carguen los datos
  }

  loadData() {
  this.isLoading.set(true);
  this.portfolioService.getPositions().subscribe({
    next: (positions) => {
      this.positions.set(positions);
      this.isLoading.set(false);
      // Esperamos a que Angular actualice el DOM antes de renderizar
      setTimeout(() => this.renderChart(), 100);
    }
  });
  this.portfolioService.getHistory().subscribe({
    next: (transactions) => {
      this.transactions.set(transactions);
    },
    error: () => this.isLoading.set(false)
  });
}

  renderChart() {
      console.log('renderChart called');
  console.log('chartCanvas:', this.chartCanvas);
  console.log('chartData:', this.chartData());
    if (!this.chartCanvas) return;
    const { labels, data, colors } = this.chartData();
    if (data.length === 0) return;

    if (this.chart) this.chart.destroy();

    const realPercents = this.chartData().realPercents ?? [];

    this.chart = new Chart(this.chartCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: '#0f1117',
          borderWidth: 2,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#94a3b8',
              font: { family: 'Inter', size: 12 },
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 8
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const real = realPercents[ctx.dataIndex];
                return ` ${ctx.label}: ${real.toFixed(2)}%`;
              }
            }
          }
        }
      }
    } as ChartConfiguration);
  }

  setFilter(coinId: string | null) {
    this.filterCoinId.set(coinId);
  }

  toggleMenu(id: string) {
    this.openMenuId.set(this.openMenuId() === id ? null : id);
  }

  deleteTransaction(id: string) {
    if (!confirm('¿Eliminar esta transacción?')) return;
    this.portfolioService.deleteTransaction(id).subscribe({
      next: () => this.loadData()
    });
  }

  onModalClosed(refresh: boolean) {
    this.showNewTransaction.set(false);
    if (refresh) this.loadData();
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  logout() {
    this.authService.logout();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  isPnlPositive(value: number): boolean {
    return value >= 0;
  }

  typeLabel(type: string): string {
    if (type === 'BUY') return 'Compra';
    if (type === 'SELL') return 'Venta';
    return 'Manual';
  }

  typeClass(type: string): string {
    if (type === 'BUY') return 'badge-buy';
    if (type === 'SELL') return 'badge-sell';
    return 'badge-manual';
  }

  openTransaction(tx: Transaction) {
    this.selectedTransaction.set(tx);
  }

  closeTransaction() {
    this.selectedTransaction.set(null);
  }
  
  getCoinImage(coinId: string): string {
    const position = this.positions().find(p => p.coinId === coinId);
    return position?.imageUrl ?? '';
  }
}