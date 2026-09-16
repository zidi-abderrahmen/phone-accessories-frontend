import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth/auth.service';
import { Subject, finalize, takeUntil } from 'rxjs';
import { ResetPasswordRequest } from '../../core/models/password/reset.password.request';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';
import { PasswordInput } from "../../shared/components/password-input/password-input";
import { Brand } from "../../shared/components/brand/brand";
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-reset.password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, ThemeToggle, PasswordInput, Brand],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy$ = new Subject<void>();

  resetForm!: FormGroup;
  token = signal<string | null>(null);
  isLoading = signal(false);
  isSuccess = signal(false);
  isInvalidToken = signal(false);
  isExpiredToken = signal(false);
  errorMessage = signal<string | null>(null);
  passwordVisible = false;
  confirmVisible = false;

  ngOnInit(): void {
    this.extractToken();
    this.initForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private extractToken(): void {
    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.token.set(params.get('token'));
        if (!this.token()) {
          this.isInvalidToken.set(true);
        }
      });
  }

  private initForm(): void {
    this.resetForm = this.fb.group({
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        this.passwordStrengthValidator()
      ]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordsMatchValidator() });

    this.resetForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.errorMessage()) {
          this.errorMessage.set(null);
        }
      });
  }

  private passwordStrengthValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value || '';
      const hasUpper = /[A-Z]/.test(value);
      const hasLower = /[a-z]/.test(value);
      const hasNumber = /[0-9]/.test(value);
      const hasSpecial = /[!@#$%^&*()_+=\-\]{};':"|,.<>/?]/.test(value);

      const valid = hasUpper && hasLower && hasNumber && hasSpecial;
      return valid ? null : { passwordStrength: true };
    };
  }

  private passwordsMatchValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const password = group.get('password')?.value;
      const confirmControl = group.get('confirmPassword');
      const confirm = confirmControl?.value;

      if (password && confirm && password !== confirm) {
        confirmControl?.setErrors({
          ...(confirmControl.errors || {}),
          passwordsMismatch: true
        });
        return { passwordsMismatch: true };
      }

      if (confirmControl?.hasError('passwordsMismatch')) {
        const errors = { ...confirmControl.errors };
        delete errors['passwordsMismatch'];
        confirmControl.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }

      return null;
    };
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  toggleConfirmVisibility(): void {
    this.confirmVisible = !this.confirmVisible;
  }

  getPasswordStrength(): { score: number; label: string } {
    const value = this.password?.value || '';
    let score = 0;
    if (value.length >= 8) score++;
    if (/[a-z]/.test(value)) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[!@#$%^&*()_+\-=\x5B\x5D{};':"|,.<>/?]/.test(value)) score++;

    const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
    return { score, label: labels[Math.min(score, 4)] };
  }

  onSubmit(): void {
    if (this.resetForm.invalid || this.isLoading() || this.isSuccess() || !this.token()) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const request: ResetPasswordRequest = {
      token: this.token() || '',
      newPassword: this.resetForm.value.password
    };

    this.authService.resetPassword(request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: () => {
          this.isSuccess.set(true);
        },
        error: (err) => {
          this.handleError(err);
        }
      });
  }

  private handleError(err: HttpErrorResponse): void {
    if (err.status === 400) {
      this.isInvalidToken.set(true);
      this.errorMessage.set('The reset link is invalid or malformed.');
    } else if (err.status === 401 || err.status === 410) {
      this.isExpiredToken.set(true);
      this.errorMessage.set('This reset link has expired. Please request a new one.');
    } else if (err.status === 0) {
      this.errorMessage.set('Unable to connect to the server. Please check your connection.');
    } else if (err.status === 429) {
      this.errorMessage.set('Too many requests. Please wait a moment and try again.');
    } else if (err.error?.message) {
      this.errorMessage.set(err.error.message);
    } else {
      this.errorMessage.set('Something went wrong. Please try again later.');
    }
  }

  get password() {
    return this.resetForm.get('password');
  }

  get confirmPassword() {
    return this.resetForm.get('confirmPassword');
  }
}