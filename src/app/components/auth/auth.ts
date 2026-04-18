import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth.html',
  styleUrl: './auth.scss'
})
export class Auth {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLogin = true;
  isLoading = false;
  errorMessage = '';

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  toggleMode() {
    this.isLogin = !this.isLogin;
    this.errorMessage = '';
    this.form.reset();
  }

  submit() {
    if (this.form.invalid) return;
    this.isLoading = true;
    this.errorMessage = '';

    const { email, password } = this.form.value;
    const action$ = this.isLogin
      ? this.authService.login(email, password)
      : this.authService.register(email, password);

    action$.subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.errorMessage = err.error?.error || 'Ha ocurrido un error';
        this.isLoading = false;
      }
    });
  }
  loginDemo() {
    this.isLoading = true;
    this.errorMessage = '';
    this.authService.loginDemo().subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err) => {
        this.errorMessage = err.error?.error || 'Error al acceder a la demo';
        this.isLoading = false;
      }
    });
  }
}