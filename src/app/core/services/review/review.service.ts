import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Observable, map } from 'rxjs';
import { ReviewResponse } from '../../models/review/review-response';
import { ReviewRequest } from '../../models/review/review-request';
import { SKIP_GLOBAL_ERROR_HANDLING } from '../../interceptors/error/error-context';
import { Page } from '../../models/page/page';
import { mapToPage } from '../../models/page/map-to-page';

@Service()
export class ReviewService {

    private apiUrl = `${environment.apiUrl}/reviews`;

    private http = inject(HttpClient);

    private readonly context = new HttpContext().set(SKIP_GLOBAL_ERROR_HANDLING, true);

    getAllReviewsByAccessoryId(id: number, page = 0, size = 10, sort?: string): Observable<Page<ReviewResponse>> {
        let params = new HttpParams()
        .set('page', page.toString())
        .set('size', size.toString());

        if (sort) {
            params = params.set('sort', sort);
        }

        return this.http.get<Page<ReviewResponse>>(`${this.apiUrl}/accessory/${id}`, { params }).pipe(
            map((response) => mapToPage(response)),
        );
    }

    createReview(id: number, data: ReviewRequest): Observable<ReviewResponse> {
        return this.http.post<ReviewResponse>(`${this.apiUrl}/accessory/${id}`, data, { withCredentials: true, context: this.context });
    }

    updateReview(id: number, data: ReviewRequest): Observable<ReviewResponse> {
        return this.http.put<ReviewResponse>(`${this.apiUrl}/${id}`, data, { withCredentials: true, context: this.context });
    }

    deleteReview(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`, { withCredentials: true, context: this.context });
    }
}