import { inject, Service } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, catchError, filter, map, Observable, of, take, tap } from 'rxjs';
import { RegisterResponse } from '../../models/user/register/register.response';
import { ChangePasswordRequest } from '../../models/user/password/change-password-request';
import { ChangePasswordResponse } from '../../models/user/password/change-password-response';
import { UpdateProfileRequest } from '../../models/user/profile/update-profile-request';

@Service()
export class UserService {

    private apiUrl = `${environment.apiUrl}/profile`;

    private http = inject(HttpClient);

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

    chagePassword(data: ChangePasswordRequest): Observable<ChangePasswordResponse> {
        return this.http.put<ChangePasswordResponse>(`${this.apiUrl}/change-password`, data, { withCredentials: true });
    }

    updateProfile(data: UpdateProfileRequest): Observable<RegisterResponse> {
        return this.http.put<RegisterResponse>(`${this.apiUrl}/update`, data, { withCredentials: true });
    }

    getCurrentUser(): Observable<RegisterResponse> {
        return this.http.get<RegisterResponse>(`${this.apiUrl}/me`, { withCredentials: true })
        .pipe(
            tap((user) => this.currentUserSubject.next(user))
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
                this.currentUserSubject.next(user);
                this.authState.next(true); 
            }),
            map(() => true),
            catchError((err) => {
                console.log('ME FAILED', err.status, err);
                this.authState.next(false);
                this.currentUserSubject.next(null);
                return of(false);
            })
        );
    }

    hasAnyRole(requiredRoles: string[]): boolean {
        const user = this.currentUserSubject.value;
        if (!user) return false;

        const userRoles: string[] = Array.isArray((user as any).roles) 
            ? (user as any).roles 
            : [(user as any).role];

        return requiredRoles.some(required => 
            userRoles.includes(required) || userRoles.includes(`ROLE_${required}`)
        );
    }
}