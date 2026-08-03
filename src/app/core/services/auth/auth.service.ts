import { HttpClient, HttpErrorResponse, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, catchError, filter, map, of, take, tap, throwError } from "rxjs";
import { environment } from "../../../../environments/environment";
import { MeResponse } from "../../models/me/me.response";
import { ForgotPasswordRequest } from "../../models/password/forgot.password.request";
import { ResetPasswordRequest } from "../../models/password/reset.password.request";
import { RefreshTokenResponse } from "../../models/reftoken/refresh.token.response";
import { LoginRequest } from "../../models/user/login/login.request";
import { LoginResponse } from "../../models/user/login/login.response";
import { RegisterRequest } from "../../models/user/register/register.request";
import { RegisterResponse } from "../../models/user/register/register.response";
import { EmailResponse } from "../../models/verifemail/email.response";
import { VerifyEmailRequest } from "../../models/verifemail/verify.email.request";

@Injectable({
    providedIn: 'root'
})
export class AuthService {

    private apiUrl = `${environment.apiUrl}/auth`;

    private authState = new BehaviorSubject<boolean | null>(null);
    
    authState$ = this.authState.asObservable().pipe(
        filter((val): val is boolean => val !== null)
    );

    constructor(private http: HttpClient) {}

    register(data: RegisterRequest): Observable<RegisterResponse> {
        return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, data, { withCredentials: true })
        .pipe(catchError(this.handleError));
    }

    login(credentials: LoginRequest): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials, { withCredentials: true })
        .pipe(
            tap(() => {
                this.authState.next(true);
                localStorage.setItem('isAuthenticated', 'true');
            }),
            catchError(this.handleError)
        );
    }

    refreshToken(): Observable<RefreshTokenResponse> {
        return this.http.post<RefreshTokenResponse>(`${this.apiUrl}/refresh-token`, {}, { withCredentials: true })
            .pipe(catchError(this.handleError));
    }

    verifyEmail(data: VerifyEmailRequest): Observable<EmailResponse> {
        return this.http.post<EmailResponse>(`${this.apiUrl}/verify-email`, data, { withCredentials: true })
        .pipe(catchError(this.handleError));
    }

    forgotPassword(data: ForgotPasswordRequest): Observable<EmailResponse> {
        return this.http.post<EmailResponse>(`${this.apiUrl}/forgot-password`, data, { withCredentials: true })
        .pipe(catchError(this.handleError));
    }

    resetPassword(data: ResetPasswordRequest): Observable<EmailResponse> {
        return this.http.post<EmailResponse>(`${this.apiUrl}/reset-password`, data, { withCredentials: true })
        .pipe(catchError(this.handleError));
    }

    getCurrentUser(): Observable<MeResponse> {
        return this.http.get<MeResponse>(`${this.apiUrl}/me`, { withCredentials: true })
        .pipe(catchError(this.handleError));
    }

    logout(): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/logout`, {}, { withCredentials: true })
        .pipe(
            tap(() => {
                this.authState.next(false);
                localStorage.removeItem('isAuthenticated');
            }),
            catchError((err) => {
            this.authState.next(false);
            return this.handleError(err);
            })
        );
    }

    checkAuth(): Observable<boolean> {
        console.log('checkAuth called, current value:', this.authState.value);
        
        if (this.authState.value !== null) {
            return this.authState$.pipe(take(1));
        }

        return this.http.get(`${this.apiUrl}/me`, { withCredentials: true }).pipe(
            tap(() => { 
                console.log('ME SUCCESS'); 
                this.authState.next(true); 
            }),
            map(() => true),
            catchError((err) => {
                console.log('ME FAILED', err.status, err);
                this.authState.next(false);
                return of(false);
            })
        );
    }

    private handleError(error: HttpErrorResponse) {
        return throwError(() => error);
    }
}