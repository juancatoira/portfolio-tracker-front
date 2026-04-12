import { Routes } from '@angular/router';
import { authGuard } from './guards/auth';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () => import('./components/auth/auth').then(m => m.Auth)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard').then(m => m.Dashboard),
    canActivate: [authGuard]
  },
  {
    path: 'portfolio',
    loadComponent: () => import('./components/portfolio/portfolio').then(m => m.Portfolio),
    canActivate: [authGuard]
  },
  {
    path: 'watchlist',
    loadComponent: () => import('./components/watchlist/watchlist').then(m => m.Watchlist),
    canActivate: [authGuard]
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];