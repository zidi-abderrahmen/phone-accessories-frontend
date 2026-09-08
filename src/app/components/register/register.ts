import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth/auth.service';
import { RouterModule } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';
import { RegisterRequest } from '../../core/models/user/register/register.request';
import { ThemeToggle } from "../../shared/components/theme-toggle/theme-toggle";
import { PasswordInput } from "../../shared/components/password-input/password-input";
import { Brand } from "../../shared/components/brand/brand";
import { InputField } from "../../shared/components/input-field/input-field";
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, ThemeToggle, PasswordInput, Brand, InputField],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly destroy$ = new Subject<void>();

  registerForm!: FormGroup;
  isLoading = signal(false);
  isSuccess = signal(false);
  errorMessage = signal<string | null>(null);
  passwordVisible = false;
  confirmVisible = false;

  ngOnInit(): void {
    this.initForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.registerForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        this.passwordStrengthValidator()
      ]],
      confirmPassword: ['', [Validators.required]],
      termsAccepted: [false, [Validators.requiredTrue]]
    }, { validators: this.passwordsMatchValidator() });

    this.registerForm.valueChanges
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
    if (/[!@#$%^&*()_+=\-\]{};':"|,.<>/?]/.test(value)) score++;

    const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
    return { score, label: labels[Math.min(score, 4)] };
  }

  onSubmit(): void {
    if (this.registerForm.invalid || this.isLoading() || this.isSuccess()) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const request: RegisterRequest = {
      firstName: this.registerForm.value.firstName.trim(),
      lastName: this.registerForm.value.lastName.trim(),
      email: this.registerForm.value.email.trim().toLowerCase(),
      password: this.registerForm.value.password
    };

    this.authService.register(request)
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
    if (err.status === 409) {
      this.errorMessage.set(err.error?.message || 'An account with this email already exists. Please sign in instead.');
    } else if (err.status === 422) {
      this.errorMessage.set('The provided information is invalid. Please check your details and try again.');
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

  get firstName() {
    return this.registerForm.get('firstName');
  }

  get lastName() {
    return this.registerForm.get('lastName');
  }

  get email() {
    return this.registerForm.get('email');
  }

  get password() {
    return this.registerForm.get('password');
  }

  get confirmPassword() {
    return this.registerForm.get('confirmPassword');
  }

  get termsAccepted() {
    return this.registerForm.get('termsAccepted');
  }
}