import { inject, Service } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { OrderResponse } from '../../models/checkout/order-response';
import { OrderRequest } from '../../models/checkout/order-request';
import { SKIP_GLOBAL_ERROR_HANDLING } from '../../interceptors/error/error-context';

@Service()
export class OrderService {
    private apiUrl = `${environment.apiUrl}/orders`;

    private http = inject(HttpClient);

    private readonly context = new HttpContext().set(SKIP_GLOBAL_ERROR_HANDLING, true);

    getMyOrdersHistory(): Observable<OrderResponse[]> {
        return this.http.get<OrderResponse[]>(this.apiUrl, { withCredentials: true });
    }

    getOrderById(id: number): Observable<OrderResponse> {
        return this.http.get<OrderResponse>(`${this.apiUrl}/${id}`, { withCredentials: true });
    }

    createOrder(data: OrderRequest): Observable<OrderResponse> {
        return this.http.post<OrderResponse>(this.apiUrl, data, { withCredentials: true, context: this.context });
    }

    updateOrder(id: number, data: OrderRequest): Observable<OrderResponse> {
        return this.http.put<OrderResponse>(`${this.apiUrl}/${id}`, data, { withCredentials: true, context: this.context });
    }

    cancelOrder(id: number): Observable<void> {
        return this.http.put<void>(`${this.apiUrl}/${id}/cancel`, null, { withCredentials: true, context: this.context });
    }

    deleteOrder(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`, { withCredentials: true, context: this.context });
    }
}