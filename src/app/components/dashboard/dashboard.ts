import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PortfolioService } from '../../services/portfolio';
import { AuthService } from '../../services/auth';
import { Position } from '../../models/transaction.models';
import { NewTransactionComponent } from '../new-transaction/new-transaction';


@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NewTransactionComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  private portfolioService = inject(PortfolioService);
  private authService = inject(AuthService);
  private router = inject(Router);

  positions = signal<Position[]>([]);
  isLoading = signal(true);
  lastUpdated = signal<string>('');
  isRefreshing = signal(false);
  showNewTransaction = signal(false);


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

  currentUser$ = this.authService.currentUser$;

  ngOnInit() {
    this.loadPositions();
    this.loadPositions();
    this.loadLastUpdated();
  }

  loadPositions() {
    this.isLoading.set(true);
    this.portfolioService.getPositions().subscribe({
      next: (positions) => {
        this.positions.set(positions);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  loadLastUpdated() {
    this.portfolioService.getLastUpdated().subscribe({
      next: (res) => {
        if (res.lastUpdated !== 'never') {
          const date = new Date(res.lastUpdated);
          this.lastUpdated.set(date.toLocaleString('es-ES'));
        } else {
          this.lastUpdated.set('Nunca');
        }
      }
    });
  }

  refreshPrices() {
    this.isRefreshing.set(true);
    this.portfolioService.refreshPrices().subscribe({
      next: () => {
        this.loadPositions();
        this.loadLastUpdated();
        this.isRefreshing.set(false);
      },
      error: () => this.isRefreshing.set(false)
    });
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

  formatPercent(value: number): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }

  isPnlPositive(value: number): boolean {
    return value >= 0;
  }
  openNewTransaction() {
    this.showNewTransaction.set(true);
  }

  onModalClosed(refresh: boolean) {
    this.showNewTransaction.set(false);
    if (refresh) this.loadPositions();
  }
}