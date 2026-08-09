import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AccessoryResponse } from '../../models/accessory/accessory-response';
import { Page } from '../../models/page';
import { AccessoryRequest } from '../../models/accessory/accessory-request';

@Service()
export class AccessoryService {

    private apiUrl = `${environment.apiUrl}/accessories`;

    private http = inject(HttpClient);

    getAllAccessories(page: number = 0, size: number = 10, sort?: string): Observable<Page<AccessoryResponse>> {
        let params = new HttpParams()
        .set('page', page.toString())
        .set('size', size.toString());

        if (sort) {
            params = params.set('sort', sort);
        }

        return this.http.get<Page<AccessoryResponse>>(this.apiUrl, { params, withCredentials: true });
    }

    getAccessoryById(id: number): Observable<AccessoryResponse> {
        return this.http.get<AccessoryResponse>(`${this.apiUrl}/${id}`, { withCredentials: true });
    }

    createAccessory(data: AccessoryRequest): Observable<AccessoryResponse> {
        return this.http.post<AccessoryResponse>(this.apiUrl, data, { withCredentials: true });
    }

    updateAccessory(id: number, data: AccessoryRequest): Observable<AccessoryResponse> {
        return this.http.put<AccessoryResponse>(`${this.apiUrl}/${id}`, data, { withCredentials: true });
    }

    deleteAccessory(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`, { withCredentials: true });
    }
}