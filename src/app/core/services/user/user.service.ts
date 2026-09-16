import { inject, Injector, Service } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, catchError, filter, from, map, Observable, of, switchMap, take, tap } from 'rxjs';
import { RegisterResponse } from '../../models/user/register/register.response';
import { ChangePasswordRequest } from '../../models/user/password/change-password-request';
import { ChangePasswordResponse } from '../../models/user/password/change-password-response';
import { UpdateProfileRequest } from '../../models/user/profile/update-profile-request';
import { SKIP_GLOBAL_ERROR_HANDLING } from '../../interceptors/error/error-context';

@Service()
export class UserService {

    private apiUrl = `${environment.apiUrl}/profile`;

    private http = inject(HttpClient);
    private injector = inject(Injector);

    private readonly context = new HttpContext().set(SKIP_GLOBAL_ERROR_HANDLING, true);

    authState = new BehaviorSubject<boolean | null>(null);

    authState$ = this.authState.asObservable().pipe(
        filter((val): val is boolean => val !== null)
    );

    // Synchronous access to the current auth state value
    isAuthenticatedValue(): boolean | null {
        return this.authState.value;
    }

    currentUserSubject = new BehaviorSubject<RegisterResponse | null>(null);
    currentUser$ = this.currentUserSubject.asObservable();

    changePassword(data: ChangePasswordRequest): Observable<ChangePasswordResponse> {
        return this.http.put<ChangePasswordResponse>(`${this.apiUrl}/change-password`, data, { withCredentials: true, context: this.context });
    }

    updateProfile(data: UpdateProfileRequest): Observable<RegisterResponse> {
        return this.http.put<RegisterResponse>(`${this.apiUrl}/update`, data, { withCredentials: true, context: this.context });
    }

    getCurrentUser(): Observable<RegisterResponse> {
        return this.http.get<RegisterResponse>(`${this.apiUrl}/me`, { withCredentials: true })
        .pipe(
            tap((user) => this.currentUserSubject.next(user))
        );
    }

    checkAuth(): Observable<boolean> {
        
        if (this.authState.value !== null) {
            return this.authState$.pipe(take(1));
        }

        const meRequest$ = this.http.get<RegisterResponse>(`${this.apiUrl}/me`, { withCredentials: true }).pipe(
            tap((user) => {
                this.currentUserSubject.next(user);
                this.authState.next(true);
            }),
            map(() => true)
        );

        const handleAuthFailure = () => {
            this.authState.next(false);
            this.currentUserSubject.next(null);
            return of(false);
        };

        return meRequest$.pipe(
            catchError((err: HttpErrorResponse) => {
                if (err.status === 401) {
                    return from(import('../auth/auth.service')).pipe(
                        switchMap(({ AuthService }) => {
                            const authService = this.injector.get(AuthService);
                            return authService.refreshToken();
                        }),
                        switchMap(() => meRequest$),
                        catchError(() => handleAuthFailure())
                    );
                }
                
                return handleAuthFailure();
            })
        );
    }

    hasAnyRole(requiredRoles: string[]): boolean {
        const user = this.currentUserSubject.value;
        if (!user) return false;

        const userRoles: string[] = Array.isArray((user as RegisterResponse).roles) 
            ? (user as RegisterResponse).roles
            : [(user as RegisterResponse).roles as unknown as string];

        return requiredRoles.some(required => 
            userRoles.includes(required) || userRoles.includes(`ROLE_${required}`)
        );
    }
}