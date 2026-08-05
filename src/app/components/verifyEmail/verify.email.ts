import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth/auth.service';
import { Subject, takeUntil, timer } from 'rxjs';
import { VerifyEmailRequest } from '../../core/models/verifemail/verify.email.request';
import is from '@angular/common/locales/is';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';
import { Brand } from "../../shared/components/brand/brand";

type VerifyState = 'loading' | 'success' | 'invalid' | 'expired' | 'error';

@Component({
  selector: 'app-verify.email',
  standalone: true,
  imports: [RouterModule, ThemeToggle, Brand],
  templateUrl: './verify.email.html',
  styleUrl: './verify.email.scss',
})
export class VerifyEmail {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy$ = new Subject<void>();

  state = signal<VerifyState>('loading');
  errorMessage = signal<string | null>(null);
  private token = signal<string | null>(null);

  ngOnInit(): void {
    this.extractTokenAndVerify();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private extractTokenAndVerify(): void {
    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.token.set(params.get('token'));

        if (!this.token()) {
          this.state.set('invalid');
          this.errorMessage.set('The verification link is missing or incomplete.');
          return;
        }

        this.verifyToken();
      });
  }

  private verifyToken(): void {
    this.state.set('loading');

    const request: VerifyEmailRequest = { token: this.token() || '' };

    this.authService.verifyEmail(request)
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.state.set('success');
          timer(4000)
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
              this.router.navigate(['/login']);
            });
        },
        error: (err) => {
          this.handleError(err);
        }
      });
  }

  private handleError(err: any): void {
    if (err.status === 400) {
      this.state.set('invalid');
      this.errorMessage.set('The verification link is invalid or malformed.');
    } else if (err.status === 401 || err.status === 410) {
      this.state.set('expired');
      this.errorMessage.set('This verification link has expired. Please request a new one.');
    } else if (err.status === 0) {
      this.state.set('error');
      this.errorMessage.set('Unable to connect to the server. Please check your connection.');
    } else if (err.status === 429) {
      this.state.set('error');
      this.errorMessage.set('Too many requests. Please wait a moment and try again.');
    } else if (err.error?.message) {
      this.state.set('error');
      this.errorMessage.set(err.error.message);
    } else {
      this.state.set('error');
      this.errorMessage.set('Something went wrong. Please try again later.');
    }
  }
}