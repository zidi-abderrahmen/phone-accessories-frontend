import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import { RegisterResponse } from '../../models/user/register/register.response';
import { RegisterRequest } from '../../models/user/register/register.request';

@Service()
export class UserManagementService {

    private apiUrl = `${environment.apiUrl}/users`;

    private http = inject(HttpClient);

    getAllUsers(blocked?: boolean, deleted?: boolean, page: number = 0, size: number = 10, sort?: string): Observable<RegisterResponse> {
        let params = new HttpParams()
        .set('page', page.toString())
        .set('size', size.toString());

        if (blocked !== undefined) {
            params = params.set('blocked', blocked.toString());
        }

        if (deleted !== undefined) {
            params = params.set('deleted', deleted.toString());
        }

        if (sort) {
            params = params.set('sort', sort);
        }

        return this.http.get<RegisterResponse>(this.apiUrl, { withCredentials: true, params });
    }

    createAdmin(data: RegisterRequest): Observable<RegisterResponse> {
        return this.http.post<RegisterResponse>(`${this.apiUrl}/admins`, data, { withCredentials: true });
    }

    updateUserBlockedStatus(id: string, blocked: boolean): Observable<RegisterResponse> {
        return this.http.put<RegisterResponse>(`${this.apiUrl}/${id}/blocked/${blocked}`, null, { withCredentials: true });
    }

    updateUserDeletedStatus(id: string, deleted: boolean): Observable<RegisterResponse> {
        return this.http.patch<RegisterResponse>(`${this.apiUrl}/${id}/deleted/${deleted}`, null, { withCredentials: true });
    }
}