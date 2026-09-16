import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth/auth.service';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';
import { ForgotPasswordRequest } from '../../core/models/password/forgot.password.request';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';
import { Brand } from "../../shared/components/brand/brand";
import { InputField } from "../../shared/components/input-field/input-field";
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-forgot.password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, ThemeToggle, Brand, InputField],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly destroy$ = new Subject<void>();

  forgotForm!: FormGroup;
  isLoading = signal(false);
  isSuccess = signal(false);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.initForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.forgotForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.errorMessage()) {
          this.errorMessage.set(null);
        }
      });
  }

  onSubmit(): void {
    if (this.forgotForm.invalid || this.isLoading() || this.isSuccess()) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const request: ForgotPasswordRequest = {
      email: this.forgotForm.value.email.trim().toLowerCase()
    };

    this.authService.forgotPassword(request)
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
    if (err.status === 0) {
      this.errorMessage.set('Unable to connect to the server. Please check your connection.');
    } else if (err.status === 429) {
      this.errorMessage.set('Too many requests. Please wait a moment and try again.');
    } else if (err.error?.message) {
      this.errorMessage.set(err.error.message);
    } else {
      this.errorMessage.set('Something went wrong. Please try again later.');
    }
  }

  get email() {
    return this.forgotForm.get('email');
  }
}