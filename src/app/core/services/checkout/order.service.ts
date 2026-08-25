import { inject, Service } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OrderResponse } from '../../models/checkout/order-response';
import { OrderRequest } from '../../models/checkout/order-request';

@Service()
export class OrderService {
    private apiUrl = `${environment.apiUrl}/orders`;

    private http = inject(HttpClient);

    getMyOrdersHistory(): Observable<OrderResponse[]> {
        return this.http.get<OrderResponse[]>(this.apiUrl, { withCredentials: true });
    }

    getOrderById(id: number): Observable<OrderResponse> {
        return this.http.get<OrderResponse>(`${this.apiUrl}/${id}`, { withCredentials: true });
    }

    createOrder(data: OrderRequest): Observable<OrderResponse> {
        return this.http.post<OrderResponse>(this.apiUrl, data, { withCredentials: true });
    }

    updateOrder(id: number, data: OrderRequest): Observable<OrderResponse> {
        return this.http.put<OrderResponse>(`${this.apiUrl}/${id}`, data, { withCredentials: true });
    }

    cancelOrder(id: number): Observable<void> {
        return this.http.put<void>(`${this.apiUrl}/${id}/cancel`, null, { withCredentials: true });
    }

    deleteOrder(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`, { withCredentials: true });
    }
}