import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';

import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserService } from '../../core/services/user/user.service';
import { ChangePasswordRequest } from '../../core/models/user/password/change-password-request';
import { PasswordInput } from '../../shared/components/password-input/password-input';
import { RegisterResponse } from '../../core/models/user/register/register.response';
import { Navbar } from '../../shared/components/navbar/navbar';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  const parent = control.parent;

  if (!parent || !value) {
    return null;
  }

  const newPassword = parent.get('newPassword')?.value;
  return value === newPassword ? null : { passwordsMismatch: true };
}

type SubmitState = 'idle' | 'success' | 'error';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, PasswordInput, Navbar],
  templateUrl: './change-password.html',
  styleUrl: './change-password.scss',
})
export class ChangePassword implements OnInit {
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly form = new FormGroup({
    oldPassword: new FormControl<string | null>('', {
      validators: [Validators.required],
    }),
    newPassword: new FormControl<string | null>('', {
      validators: [Validators.required, Validators.minLength(8)],
    }),
    confirmationPassword: new FormControl<string | null>('', {
      validators: [Validators.required, passwordsMatchValidator],
    }),
  });

  protected readonly isSubmitting = signal(false);
  protected readonly submitState = signal<SubmitState>('idle');
  protected readonly errorMessage = signal<string | null>(null);

  // Nav-only state, same pattern as the other pages
  protected readonly currentUser = signal<RegisterResponse | null>(null);
  protected readonly isDarkTheme = signal(false);

  protected readonly initials = () => {
    const u = this.currentUser();
    if (!u) return '';
    return `${u.firstName?.charAt(0) ?? ''}${u.lastName?.charAt(0) ?? ''}`.toUpperCase();
  };

  ngOnInit(): void {
    this.userService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => this.currentUser.set(user));

    // Re-validate the confirmation field whenever the new password changes,
    // so a match/mismatch is reflected immediately in either direction.
    this.form.controls.newPassword.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.form.controls.confirmationPassword.updateValueAndValidity({ onlySelf: true });
      });
  }

  protected onSubmit(): void {
    if (this.isSubmitting()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { oldPassword, newPassword } = this.form.getRawValue();
    const payload: ChangePasswordRequest = {
      oldPassword: oldPassword ?? '',
      newPassword: newPassword ?? '',
    };

    this.isSubmitting.set(true);
    this.submitState.set('idle');
    this.errorMessage.set(null);

    this.userService
      .changePassword(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.submitState.set('success');
          this.form.reset();
        },
        error: (err: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.submitState.set('error');
          this.errorMessage.set(this.extractErrorMessage(err));

          if (err.status === 400 || err.status === 401) {
            this.form.controls.oldPassword.setErrors({ incorrect: true });
            this.form.controls.oldPassword.markAsTouched();
          }
        },
      });
  }

  protected dismissAlert(): void {
    this.submitState.set('idle');
    this.errorMessage.set(null);
  }

  protected toggleTheme(): void {
    const html = document.documentElement;
    const next = !this.isDarkTheme();

    html.classList.toggle('dark-theme', next);
    html.style.colorScheme = next ? 'dark' : 'light';

    try {
      localStorage.setItem('pa-theme', next ? 'dark' : 'light');
    } catch {
      // localStorage unavailable (private mode, SSR, etc.) — theme just won't persist
    }

    this.isDarkTheme.set(next);
  }

  private extractErrorMessage(err: HttpErrorResponse): string {
    const backendMessage = (err.error as { message?: string } | null)?.message;
    if (backendMessage) {
      return backendMessage;
    }
    if (err.status === 400 || err.status === 401) {
      return 'Your current password is incorrect. Please try again.';
    }
    return 'Something went wrong while updating your password. Please try again.';
  }
}
