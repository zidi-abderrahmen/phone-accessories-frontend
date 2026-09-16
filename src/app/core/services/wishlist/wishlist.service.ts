import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import { WishlistResponse } from '../../models/wishlist/wishlist-response';
import { WishlistItemResponse } from '../../models/wishlist/items/wishlist-item-response';
import { SKIP_GLOBAL_ERROR_HANDLING } from '../../interceptors/error/error-context';

@Service()
export class WishlistService {

    private apiUrl = `${environment.apiUrl}/wishlist`;

    private http = inject(HttpClient);

    private readonly context = new HttpContext().set(SKIP_GLOBAL_ERROR_HANDLING, true);

    getMyWishlist(): Observable<WishlistResponse> {
        return this.http.get<WishlistResponse>(this.apiUrl, { withCredentials: true });
    }

    addToWishlist(accessoryId: number): Observable<WishlistItemResponse> {
        return this.http.post<WishlistItemResponse>(`${this.apiUrl}/items/${accessoryId}`, null, { withCredentials: true, context: this.context });
    }

    removeFromWishlist(accessoryId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/items/${accessoryId}`, { withCredentials: true, context: this.context });
    }

    clearWishlist(): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/items`, { withCredentials: true, context: this.context });
    }
}