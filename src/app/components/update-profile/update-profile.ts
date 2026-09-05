import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { UserService } from '../../core/services/user/user.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { UpdateProfileRequest } from '../../core/models/user/profile/update-profile-request';
import { InputField } from '../../shared/components/input-field/input-field';
import { RegisterResponse } from '../../core/models/user/register/register.response';
import { Navbar } from "../../shared/components/navbar/navbar";

type LoadState = 'loading' | 'loaded' | 'error';
type SubmitState = 'idle' | 'success' | 'error';

interface ProfileFormValue {
  firstName: string;
  lastName: string;
  email: string;
}

@Component({
  selector: 'app-update-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, InputField, Navbar],
  templateUrl: './update-profile.html',
  styleUrl: './update-profile.scss'
})
export class UpdateProfile implements OnInit {
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly form = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] })
  });

  // Error-key -> message maps, consumed by the shared InputField component
  protected readonly firstNameErrors = { required: 'First name is required.' };
  protected readonly lastNameErrors = { required: 'Last name is required.' };
  protected readonly emailErrors = {
    required: 'Email is required.',
    email: 'Enter a valid email address.',
    emailTaken: 'That email is already in use on another account.'
  };

  protected readonly profileState = signal<LoadState>('loading');
  protected readonly isSubmitting = signal(false);
  protected readonly submitState = signal<SubmitState>('idle');
  protected readonly errorMessage = signal<string | null>(null);

  private readonly originalValues = signal<ProfileFormValue | null>(null);
  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue()
  });

  protected readonly hasChanges = computed(() => {
    const original = this.originalValues();
    const current = this.formValue();
    if (!original) return false;
    return (
      original.firstName !== current.firstName ||
      original.lastName !== current.lastName ||
      original.email !== current.email
    );
  });

  // Nav-only state, same pattern as the other pages
  protected readonly currentUser = signal<RegisterResponse | null>(null);
  protected readonly isDarkTheme = signal(false);

  protected readonly initials = () => {
    const u = this.currentUser();
    if (!u) return '';
    return `${u.firstName?.charAt(0) ?? ''}${u.lastName?.charAt(0) ?? ''}`.toUpperCase();
  };

  ngOnInit(): void {
    this.syncThemeState();
    this.loadProfile();

    this.userService.currentUser$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => this.currentUser.set(user));
  }

  protected loadProfile(): void {
    this.profileState.set('loading');
    this.userService
      .getCurrentUser()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          const u = user as unknown as Partial<ProfileFormValue>;
          const values: ProfileFormValue = {
            firstName: u.firstName ?? '',
            lastName: u.lastName ?? '',
            email: u.email ?? ''
          };

          this.form.reset(values);
          this.originalValues.set(values);
          this.profileState.set('loaded');
        },
        error: () => this.profileState.set('error')
      });
  }

  protected onSubmit(): void {
    if (this.isSubmitting() || !this.hasChanges()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload: UpdateProfileRequest = this.form.getRawValue();

    this.isSubmitting.set(true);
    this.submitState.set('idle');
    this.errorMessage.set(null);

    this.userService
      .updateProfile(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isSubmitting.set(false);
          this.submitState.set('success');
          this.originalValues.set(payload);
          // Keep the service's own user state in sync with the saved values.
          this.userService.currentUserSubject.next(response);
        },
        error: (err: HttpErrorResponse) => {
          this.isSubmitting.set(false);
          this.submitState.set('error');
          this.errorMessage.set(this.extractErrorMessage(err));

          if (err.status === 409) {
            this.form.controls.email.setErrors({ emailTaken: true });
            this.form.controls.email.markAsTouched();
          }
        }
      });
  }

  protected resetForm(): void {
    const original = this.originalValues();
    if (original) {
      this.form.reset(original);
    }
    this.submitState.set('idle');
    this.errorMessage.set(null);
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

  private syncThemeState(): void {
    this.isDarkTheme.set(document.documentElement.classList.contains('dark-theme'));
  }

  private extractErrorMessage(err: HttpErrorResponse): string {
    const backendMessage = (err.error as { message?: string } | null)?.message;
    if (backendMessage) {
      return backendMessage;
    }
    if (err.status === 409) {
      return 'That email is already in use on another account.';
    }
    return 'Something went wrong while saving your profile. Please try again.';
  }
}