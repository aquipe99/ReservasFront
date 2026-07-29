import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/api-response';
import { PageResponse } from '../../models/page-response';
import { ReceiptSeriesRequest } from '../../models/receipt-series-request';

@Injectable({
  providedIn: 'root'
})
export class ReceiptSeries {
  private apiUrl = environment.apiUrl + '/series';

  constructor(private http: HttpClient) {}

  getAll(
    page: number,
    size: number,
    sortField: string,
    sortOrder: string,
    globalFilter: string
  ): Observable<ApiResponse<PageResponse<ReceiptSeriesRequest>>> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sortField', sortField)
      .set('sortOrder', sortOrder);

    if (globalFilter) {
      params = params.set('globalFilter', globalFilter);
    }

    return this.http.get<ApiResponse<PageResponse<ReceiptSeriesRequest>>>(
      this.apiUrl,
      { params }
    );
  }

  create(data: ReceiptSeriesRequest) {
    return this.http.post<ApiResponse<ReceiptSeriesRequest>>(this.apiUrl, data);
  }

  update(id: number, data: ReceiptSeriesRequest) {
    return this.http.put<ApiResponse<ReceiptSeriesRequest>>(
      `${this.apiUrl}/${id}`,
      data
    );
  }

  delete(id: number) {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }
}
