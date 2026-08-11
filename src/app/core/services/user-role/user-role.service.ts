import { inject, Service } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RoleResponse } from '../../models/user/role/role-response';
import { RoleRequest } from '../../models/user/role/role-request';

@Service()
export class UserRoleService {

    private apiUrl = `${environment.apiUrl}/roles`;

    private http = inject(HttpClient);

    getAllRoles(): Observable<RoleResponse[]> {
        return this.http.get<RoleResponse[]>(this.apiUrl, { withCredentials: true });
    }

    getAllByDeleted(deleted: boolean): Observable<RoleResponse[]> {
        const endpoint = deleted ? 'deleted' : 'active'; 
        return this.http.get<RoleResponse[]>(`${this.apiUrl}/${endpoint}`, { withCredentials: true });
    }

    getRoleById(id: number): Observable<RoleResponse> {
        return this.http.get<RoleResponse>(`${this.apiUrl}/${id}`, { withCredentials: true });
    }

    createRole(data: RoleRequest): Observable<RoleResponse> {
        return this.http.post<RoleResponse>(this.apiUrl, data, { withCredentials: true });
    }

    updateRole(id: number, data: RoleRequest): Observable<RoleResponse> {
        return this.http.put<RoleResponse>(`${this.apiUrl}/${id}`, data, { withCredentials: true });
    }

    softDeleteRole(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/soft/${id}`, { withCredentials: true });
    }

    hardDeleteRole(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/hard/${id}`, { withCredentials: true });
    }
}