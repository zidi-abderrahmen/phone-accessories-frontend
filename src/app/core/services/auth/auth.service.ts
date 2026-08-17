import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, catchError, filter, map, of, take, tap, throwError } from "rxjs";
import { environment } from "../../../../environments/environment";
import { ForgotPasswordRequest } from "../../models/password/forgot.password.request";
import { ResetPasswordRequest } from "../../models/password/reset.password.request";
import { RefreshTokenResponse } from "../../models/reftoken/refresh.token.response";
import { LoginRequest } from "../../models/user/login/login.request";
import { LoginResponse } from "../../models/user/login/login.response";
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

    private authState = new BehaviorSubject<boolean | null>(null);
    
    authState$ = this.authState.asObservable().pipe(
        filter((val): val is boolean => val !== null)
    );

    // Synchronous access to the current auth state value
    isAuthenticatedValue(): boolean | null {
        return this.authState.value;
    }

    constructor(private http: HttpClient, private userService: UserService) {}

    register(data: RegisterRequest): Observable<RegisterResponse> {
        return this.http.post<RegisterResponse>(`${this.apiUrl}/register`, data, { withCredentials: true });
    }

    login(credentials: LoginRequest): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials, { withCredentials: true })
        .pipe(
            tap(() => {
                this.authState.next(true);
                localStorage.setItem('isAuthenticated', 'true');

                this.userService.getCurrentUser().subscribe();
            })
        );
    }

    refreshToken(): Observable<RefreshTokenResponse> {
        return this.http.post<RefreshTokenResponse>(`${this.apiUrl}/refresh-token`, {}, { withCredentials: true });
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
                this.authState.next(false);
                localStorage.removeItem('isAuthenticated');
                this.userService.currentUserSubject.next(null);
            }),
            catchError((err) => {
                this.authState.next(false);
                this.userService.currentUserSubject.next(null);
                return throwError(() => err);
            })
        );
    }

    checkAuth(): Observable<boolean> {
        console.log('checkAuth called, current value:', this.authState.value);
        
        if (this.authState.value !== null) {
            return this.authState$.pipe(take(1));
        }

        return this.http.get<RegisterResponse>(`${this.apiUrl}/me`, { withCredentials: true }).pipe(
            tap((user) => { 
                console.log('ME SUCCESS');
                this.userService.currentUserSubject.next(user);
                this.authState.next(true); 
            }),
            map(() => true),
            catchError((err) => {
                console.log('ME FAILED', err.status, err);
                this.authState.next(false);
                this.userService.currentUserSubject.next(null);
                return of(false);
            })
        );
    }

    hasAnyRole(requiredRoles: string[]): boolean {
        const user = this.userService.currentUserSubject.value;
        if (!user) return false;

        const userRoles: string[] = Array.isArray((user as any).roles) 
            ? (user as any).roles 
            : [(user as any).role];

        return requiredRoles.some(required => 
            userRoles.includes(required) || userRoles.includes(`ROLE_${required}`)
        );
    }
}