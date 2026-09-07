import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, catchError, tap, throwError } from "rxjs";
import { environment } from "../../../../environments/environment";
import { ForgotPasswordRequest } from "../../models/password/forgot.password.request";
import { ResetPasswordRequest } from "../../models/password/reset.password.request";
import { LoginRequest } from "../../models/user/login/login.request";
import { RegisterRequest } from "../../models/user/register/register.request";
import { RegisterResponse } from "../../models/user/register/register.response";
import { EmailResponse } from "../../models/verifemail/email.response";
import { VerifyEmailRequest } from "../../models/verifemail/verify.email.request";
import { UserService } from "../user/user.service";

@Injectable({
    providedIn: 'root'
})
export class AuthService {

    private apiUrl = `${environment.apiUrl}/auth`;

    constructor(private http: HttpClient, private userService: UserService) {}

    register(data: RegisterRequest): Observable<RegisterResponse> {
        return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, data, { withCredentials: true });
    }

    login(credentials: LoginRequest): Observable<RegisterResponse> {
        return this.http.post<RegisterResponse>(`${this.apiUrl}/login`, credentials, { withCredentials: true })
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
        return this.http.post<EmailResponse>(`${this.apiUrl}/verify-email`, data, { withCredentials: true });
    }

    forgotPassword(data: ForgotPasswordRequest): Observable<EmailResponse> {
        return this.http.post<EmailResponse>(`${this.apiUrl}/forgot-password`, data, { withCredentials: true });
    }

    resetPassword(data: ResetPasswordRequest): Observable<EmailResponse> {
        return this.http.post<EmailResponse>(`${this.apiUrl}/reset-password`, data, { withCredentials: true });
    }

    logout(): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/logout`, {}, { withCredentials: true })
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