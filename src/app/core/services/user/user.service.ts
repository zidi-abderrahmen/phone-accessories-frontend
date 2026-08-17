import { inject, Service } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { RegisterResponse } from '../../models/user/register/register.response';
import { ChangePasswordRequest } from '../../models/user/password/change-password-request';
import { ChangePasswordResponse } from '../../models/user/password/change-password-response';
import { UpdateProfileRequest } from '../../models/user/profile/update-profile-request';

@Service()
export class UserService {

    private apiUrl = `${environment.apiUrl}/profile`;

    private http = inject(HttpClient);

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
}