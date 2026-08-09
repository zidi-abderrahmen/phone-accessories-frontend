import { Component, computed, effect, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { startWith } from 'rxjs';

@Component({
  selector: 'app-password-input',
  standalone: true,
  imports: [RouterModule, ReactiveFormsModule],
  templateUrl: './password-input.html',
  styleUrl: './password-input.scss',
})
export class PasswordInput {
  /** The FormControl bound to this password input */
  control = input.required<FormControl<string | null>>();

  /** Unique identifier for the input element */
  inputId = input<string>('password');

  /** Label text displayed above the input */
  label = input<string>('Password');

  /** Placeholder text shown when the input is empty */
  placeholder = input<string>('Enter your password');

  /** Optional router link to the forgot-password page */
  forgotPasswordRoute = input<string | null>(null);

  /** Optional helper text displayed below the input */
  passwordHint = input<string>('');

  /** Whether to display the password strength indicator */
  passwordStrengthIndicator = input<boolean>(false);

  /** Custom message shown when the password field is required and empty */
  passwordRequiredMessage = input<string>('Password is required');

  /** HTML autocomplete attribute for the password field */
  passwordAutocomplete = input<string>('current-password');

  /** Whether the field is required (shows an asterisk on the label) */
  required = input<boolean>(false);

  /** Whether the input is read-only */
  readonly = input<boolean>(false);

  /** Signal tracking password visibility state */
  passwordVisible = signal(false);

  private currentValue = signal('');

  constructor() {
    effect((onCleanup) => {
      const ctrl = this.control();
      this.currentValue.set(ctrl.value || '');

      const sub = ctrl.valueChanges.subscribe((v) => {
        this.currentValue.set(v || '');
      });

      onCleanup(() => sub.unsubscribe());
    });
  }

  /** Toggle password visibility between text and password */
  toggleVisibility(): void {
    this.passwordVisible.set(!this.passwordVisible());
  }

  /** Computed password strength score and label */
  strength = computed(() => {
    const value = this.currentValue();

    let score = 0;
    if (value.length >= 8) score++;
    if (/[a-z]/.test(value)) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value)) score++;

    const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'] as const;
    const clampedScore = Math.min(score, labels.length - 1);

    return { score, label: labels[clampedScore] };
  });

  /** Computed check for active validation errors */
  hasErrors = computed(() => {
    const c = this.control();
    return (c.invalid || !!c.errors?.['passwordsMismatch']) && c.touched;
  });

  /** Computed aria-describedby value pointing to hint or error element */
  describedById = computed(() => {
    if (this.hasErrors()) {
      return `${this.inputId()}-error`;
    }
    if (this.passwordHint()) {
      return `${this.inputId()}-hint`;
    }
    return null;
  });
}