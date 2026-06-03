import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../../models/api-response';
import { PageResponse } from '../../models/page-response';
import { PaymentMethodRequest } from '../../models/paymentmethod-request';
@Injectable({
  providedIn: 'root',
})
export class PaymentMethod {
  
    private apiUrl = environment.apiUrl + '/PaymentMethods';
    constructor(private http: HttpClient){}

    getAll(
      page: number,
      size: number,
      sortField?: string,
      sortOrder?: string,
      globalFilter?: string
    ): Observable<ApiResponse<PageResponse<PaymentMethodRequest>>> {
      let params = new HttpParams()
       .set('page', page)
      .set('size', size)
      .set('sortField', sortField ?? '')
      .set('sortOrder', sortOrder ?? '')
      .set('globalFilter', globalFilter ?? '');
  
      return this.http.get<ApiResponse<PageResponse<PaymentMethodRequest>>>(
        
        this.apiUrl,
        { params }
        
      );
    }

    create(data: PaymentMethodRequest) {
     return this.http.post<ApiResponse<PaymentMethodRequest>>(this.apiUrl, data);
    }

    update(id: number, data: PaymentMethodRequest) {
     
        return this.http.put<ApiResponse<PaymentMethodRequest>>(
          `${this.apiUrl}/${id}`,
          data
        );
    }

    delete(id: number) {
       return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
    }


}
