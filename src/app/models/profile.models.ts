export interface ProfileResponse {
  email: string;
  username: string;
  currency: string;
}

export interface UpdateProfileRequest {
  username: string;
  currency: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ExchangeRate {
  currency: string;
  symbol: string;
}