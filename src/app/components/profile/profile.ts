import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProfileService } from '../../services/profile';
import { AuthService } from '../../services/auth';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Navbar],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class Profile implements OnInit {

  private fb = inject(FormBuilder);
  private profileService = inject(ProfileService);
  private authService = inject(AuthService);
  private router = inject(Router);

  currencies = signal<Record<string, string>>({});
  isLoadingProfile = signal(true);
  isSavingProfile = signal(false);
  isSavingPassword = signal(false);
  profileSuccess = signal('');
  profileError = signal('');
  passwordSuccess = signal('');
  passwordError = signal('');

  profileForm: FormGroup = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(2)]],
    currency: ['USD', Validators.required]
  });

  passwordForm: FormGroup = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  });

  ngOnInit() {
    this.profileService.getCurrencies().subscribe({
      next: (currencies) => this.currencies.set(currencies)
    });

    this.profileService.getProfile().subscribe({
      next: (profile) => {
        this.profileForm.patchValue({
          username: profile.username ?? '',
          currency: profile.currency
        });
        this.isLoadingProfile.set(false);
      }
    });
  }

  saveProfile() {
    if (this.profileForm.invalid) return;
    this.isSavingProfile.set(true);
    this.profileSuccess.set('');
    this.profileError.set('');

    this.profileService.updateProfile(this.profileForm.value).subscribe({
      next: () => {
        this.profileSuccess.set('Perfil actualizado correctamente');
        this.isSavingProfile.set(false);
      },
      error: (err) => {
        this.profileError.set(err.error?.error || 'Error al actualizar el perfil');
        this.isSavingProfile.set(false);
      }
    });
  }

  savePassword() {
    if (this.passwordForm.invalid) return;
    const { newPassword, confirmPassword } = this.passwordForm.value;
    if (newPassword !== confirmPassword) {
      this.passwordError.set('Las contraseñas no coinciden');
      return;
    }

    this.isSavingPassword.set(true);
    this.passwordSuccess.set('');
    this.passwordError.set('');

    this.profileService.changePassword({
      currentPassword: this.passwordForm.value.currentPassword,
      newPassword
    }).subscribe({
      next: () => {
        this.passwordSuccess.set('Contraseña actualizada correctamente');
        this.passwordForm.reset();
        this.isSavingPassword.set(false);
      },
      error: (err) => {
        this.passwordError.set(err.error?.error || 'Error al cambiar la contraseña');
        this.isSavingPassword.set(false);
      }
    });
  }

  currencyEntries() {
    return Object.entries(this.currencies());
  }

  logout() { this.authService.logout(); }
}