import { Service, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { CategoryResponse } from '../../models/category/category-response';
import { Observable, tap } from 'rxjs';
import { Page } from '../../models/page';
import { CategoryRequest } from '../../models/category/category-request';
import { AccessoryResponse } from '../../models/accessory/accessory-response';
import { SKIP_GLOBAL_ERROR_HANDLING } from '../../interceptors/error/error-context';
import { invalidateCache } from '../../interceptors/cache/cache-interceptor';

@Service()
export class CategoryService {
  private http = inject(HttpClient);

  private apiUrl = `${environment.apiUrl}/categories`;

  private readonly context = new HttpContext().set(SKIP_GLOBAL_ERROR_HANDLING, true);

  getAllCategories(
    page = 0,
    size = 10,
    sort?: string,
  ): Observable<Page<CategoryResponse>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    if (sort) {
      params = params.set('sort', sort);
    }

    return this.http.get<Page<CategoryResponse>>(this.apiUrl, { params });
  }

  getAllRelatedAccessories(
    id: number,
    page = 0,
    size = 10,
    sort?: string,
  ): Observable<Page<AccessoryResponse>> {
    let params = new HttpParams().set('page', page.toString()).set('size', size.toString());

    if (sort) params = params.set('sort', sort);

    return this.http.get<Page<AccessoryResponse>>(`${this.apiUrl}/${id}/accessories`, { params });
  }

  getCategoryById(id: number): Observable<CategoryResponse> {
    return this.http.get<CategoryResponse>(`${this.apiUrl}/${id}`);
  }

  createCategory(data: CategoryRequest): Observable<CategoryResponse> {
    return this.http.post<CategoryResponse>(this.apiUrl, data, { withCredentials: true, context: this.context }).pipe(
      tap(() => invalidateCache('/categories'))
    );
  }

  updateCategory(id: number, data: CategoryRequest): Observable<CategoryResponse> {
    return this.http.put<CategoryResponse>(`${this.apiUrl}/${id}`, data, { withCredentials: true, context: this.context }).pipe(
      tap(() => invalidateCache('/categories'))
    );
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { withCredentials: true, context: this.context }).pipe(
      tap(() => invalidateCache('/categories'))
    );
  }
}
