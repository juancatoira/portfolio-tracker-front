import { Injectable, inject } from '@angular/core';
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

  getProfile() {
    return this.http.get<ProfileResponse>(`${this.apiUrl}/profile`);
  }

  updateProfile(request: UpdateProfileRequest) {
    return this.http.put<ProfileResponse>(`${this.apiUrl}/profile`, request).pipe(
      tap(res => {
        this.exchangeRateService.setPreferredCurrency(res.currency);
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
}