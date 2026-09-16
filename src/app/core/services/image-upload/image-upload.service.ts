import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';
import { ImageUploadResponse } from '../../models/image/image-upload-response';
import { SKIP_GLOBAL_ERROR_HANDLING } from '../../interceptors/error/error-context';

@Service()
export class ImageUploadService {

    private apiUrl = `${environment.apiUrl}/images`;

    private http = inject(HttpClient);;

    uploadImage(file: File, folderPath?: string): Observable<ImageUploadResponse> {
        const formData = new FormData();
        formData.append('file', file, file.name);
        
        if (folderPath) {
            formData.append('folderPath', folderPath);
        }

        return this.http.post<ImageUploadResponse>(this.apiUrl, formData, { 
            withCredentials: true, 
            context: new HttpContext().set(SKIP_GLOBAL_ERROR_HANDLING, true)
        });
    }
}