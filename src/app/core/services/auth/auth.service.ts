import { HttpClient, HttpContext } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ForgotPasswordRequest } from '../../models/password/forgot.password.request';
import { ResetPasswordRequest } from '../../models/password/reset.password.request';
import { LoginRequest } from '../../models/user/login/login.request';
import { RegisterRequest } from '../../models/user/register/register.request';
import { RegisterResponse } from '../../models/user/register/register.response';
import { EmailResponse } from '../../models/verif-email/email.response';
import { VerifyEmailRequest } from '../../models/verif-email/verify.email.request';
import { UserService } from '../user/user.service';
import { SKIP_GLOBAL_ERROR_HANDLING } from '../../interceptors/error/error-context';

@Service()
export class AuthService {
  private http = inject(HttpClient);
  private userService = inject(UserService);

  private apiUrl = `${environment.apiUrl}/auth`;

  private readonly context = new HttpContext().set(SKIP_GLOBAL_ERROR_HANDLING, true);

  register(data: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, data, {
      withCredentials: true,
      context: this.context
    });
  }

    login(credentials: LoginRequest): Observable<RegisterResponse> {
        return this.http.post<RegisterResponse>(`${this.apiUrl}/login`, credentials, { withCredentials: true, context: this.context })
        .pipe(
            tap(() => {
                this.userService.authState.next(true);
                localStorage.setItem('isAuthenticated', 'true');

                this.userService.getCurrentUser().subscribe();
            })
        );
    }

  refreshToken(): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/refresh-token`, {}, { withCredentials: true });
  }

  verifyEmail(data: VerifyEmailRequest): Observable<EmailResponse> {
    return this.http.post<EmailResponse>(`${this.apiUrl}/verify-email`, data, {
      withCredentials: true,
      context: this.context
    });
  }

  forgotPassword(data: ForgotPasswordRequest): Observable<EmailResponse> {
    return this.http.post<EmailResponse>(`${this.apiUrl}/forgot-password`, data, {
      withCredentials: true,
      context: this.context
    });
  }

  resetPassword(data: ResetPasswordRequest): Observable<EmailResponse> {
    return this.http.post<EmailResponse>(`${this.apiUrl}/reset-password`, data, {
      withCredentials: true,
      context: this.context
    });
  }

    logout(): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/logout`, {}, { withCredentials: true, context: this.context })
        .pipe(
            tap(() => {
                this.userService.authState.next(false);
                localStorage.removeItem('isAuthenticated');
                this.userService.currentUserSubject.next(null);
            }),
            catchError((err) => {
                this.userService.authState.next(false);
                this.userService.currentUserSubject.next(null);
                return throwError(() => err);
            })
        );
    }
}
