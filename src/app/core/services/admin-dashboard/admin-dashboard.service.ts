import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import { AdminDashboardResponse } from '../../models/admin-dashboard/admin-dashboard-response';

@Service()
export class AdminDashboardService {

    private apiUrl = `${environment.apiUrl}/admin`;

    private http = inject(HttpClient);

    getAdminDashboard(orderListLimit = 10): Observable<AdminDashboardResponse> {
        return this.http.get<AdminDashboardResponse>(`${this.apiUrl}/dashboard/order-limit/${orderListLimit}`, { withCredentials: true });
    }
}