import { Component, Input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-password-input',
  imports: [RouterModule, ReactiveFormsModule],
  templateUrl: './password-input.html',
  styleUrl: './password-input.scss',
})
export class PasswordInput {

  @Input({ required: true }) control!: FormControl;

  @Input() inputId = 'password';
  @Input() label = 'Password';
  @Input() placeholder = 'Enter your password';
  @Input() forgotPasswordRoute?: string;
  @Input() passwordHint?: string;
  @Input() passwordStrengthIndicator?: boolean = false; 
  @Input() passwordRequiredMessage?: string = 'Password is required';
  @Input() passwordAutocomplete?: string = 'current-password';

  passwordVisible = signal(false);

  toggleVisibility(): void {
    this.passwordVisible.set(!this.passwordVisible());
  }

  getPasswordStrength(): { score: number; label: string } {
    const value = this.control.value || '';
    let score = 0;
    if (value.length >= 8) score++;
    if (/[a-z]/.test(value)) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) score++;

    const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];
    return { score, label: labels[Math.min(score, 4)] };
  }

  get ariaDescribedBy(): string | null {
    const hasError = (this.control?.invalid || this.control?.errors?.['passwordsMismatch']) && this.control?.touched;

    if (hasError) {
      return `${this.inputId}-error`; 
    }
    
    if (this.passwordHint) {
      return `${this.inputId}-hint`;
    }
    
    return null;
  }
}