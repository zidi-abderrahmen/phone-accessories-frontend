import { inject, Service } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CartResponse } from '../../models/cart/cart-response';
import { CartItemRequest } from '../../models/cart/items/cart-item-request';
import { CartItemResponse } from '../../models/cart/items/cart-item-response';
import { UpdateCartItemRequest } from '../../models/cart/items/update-cart-item-request';

@Service()
export class CartService {

    private apiUrl = `${environment.apiUrl}/carts/my-cart`;
    private http = inject(HttpClient);

    getMyCart(): Observable<CartResponse> {
        return this.http.get<CartResponse>(this.apiUrl, { withCredentials: true });
    }

    addItemToCart(data: CartItemRequest): Observable<CartItemResponse> {
        return this.http.post<CartItemResponse>(this.apiUrl, data, { withCredentials: true });
    }

    updateItemInCart(id: number, data: UpdateCartItemRequest): Observable<CartItemResponse> {
        return this.http.put<CartItemResponse>(`${this.apiUrl}/cart-item/${id}`, data, { withCredentials: true });
    }

    removeItemFromCart(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/cart-item/${id}`, { withCredentials: true });
    }

    clearCart(): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}`, { withCredentials: true });
    }
}