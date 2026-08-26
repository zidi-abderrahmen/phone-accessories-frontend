import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import { WishlistResponse } from '../../models/wishlist/wishlist-response';
import { WishlistItemResponse } from '../../models/wishlist/items/wishlist-item-response';

@Service()
export class WishlistService {

    private apiUrl = `${environment.apiUrl}/wishlist`;

    private http = inject(HttpClient);

    getMyWishlist(): Observable<WishlistResponse> {
        return this.http.get<WishlistResponse>(this.apiUrl, { withCredentials: true });
    }

    addToWishlist(id: number): Observable<WishlistItemResponse> {
        return this.http.post<WishlistItemResponse>(`${this.apiUrl}/items/${id}`, null, { withCredentials: true });
    }

    removeFromWishlist(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/items/${id}`, { withCredentials: true });
    }

    clearWishlist(): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/items`, { withCredentials: true });
    }
}