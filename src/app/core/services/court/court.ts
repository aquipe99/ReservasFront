import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../../models/api-response';
import { PageResponse } from '../../models/page-response';
import { CourtRequest } from '../../models/court-request';

@Injectable({
  providedIn: 'root',
})
export class Court {
  
  private apiUrl =environment.apiUrl + '/Court';
  constructor(private http:HttpClient){}

    getAll(
        page: number,
        size: number,
        sortField?: string,
        sortOrder?: string,
        globalFilter?: string
    ): Observable<ApiResponse<PageResponse<CourtRequest>>>{
          let params = new HttpParams()
          .set('page', page)
          .set('size', size)
          .set('sortField', sortField ?? '')
          .set('sortOrder', sortOrder ?? '')
          .set('globalFilter', globalFilter ?? '');

        return this.http.get<ApiResponse<PageResponse<CourtRequest>>>(
          this.apiUrl,
          {params}
        )
    }

    create(data: CourtRequest) {
      return this.http.post<ApiResponse<CourtRequest>>(this.apiUrl, data);
     }
 
     update(id: number, data: CourtRequest) {
      
         return this.http.put<ApiResponse<CourtRequest>>(
           `${this.apiUrl}/${id}`,
           data
         );
     }
 
     delete(id: number) {
        return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
     }
 

}
