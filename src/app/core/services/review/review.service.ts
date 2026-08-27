import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import { ReviewResponse } from '../../models/review/review-response';
import { ReviewRequest } from '../../models/review/review-request';

@Service()
export class ReviewService {

    private apiUrl = `${environment.apiUrl}/reviews`;

    private http = inject(HttpClient);

    getAllReviewsByAccessoryId(id: number, page: number = 0, size: number = 10, sort?: string): Observable<ReviewResponse> {
        let params = new HttpParams()
        .set('page', page.toString())
        .set('size', size.toString());

        if (sort) {
            params = params.set('sort', sort);
        }

        return this.http.get<ReviewResponse>(`${this.apiUrl}/accessory/${id}`, { params });
    }

    createReview(id: number, data: ReviewRequest): Observable<ReviewResponse> {
        return this.http.post<ReviewResponse>(`${this.apiUrl}/accessory/${id}`, data, { withCredentials: true });
    }

    updateReview(id: number, data: ReviewRequest): Observable<ReviewResponse> {
        return this.http.put<ReviewResponse>(`${this.apiUrl}/${id}`, data, { withCredentials: true });
    }

    deleteReview(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`, { withCredentials: true });
    }
}