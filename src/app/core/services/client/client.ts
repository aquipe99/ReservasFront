import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/api-response';
import { ClientRequest } from '../../models/client-request';
import { PageResponse } from '../../models/page-response';

@Injectable({
  providedIn: 'root'
})
export class Client {
  private apiUrl = environment.apiUrl + '/clients';

  constructor(private http: HttpClient) {}

  getAll(
    page: number,
    size: number,
    sortField?: string,
    sortOrder?: string,
    globalFilter?: string
  ): Observable<ApiResponse<PageResponse<ClientRequest>>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortField', sortField ?? '')
      .set('sortOrder', sortOrder ?? '')
      .set('globalFilter', globalFilter ?? '');

    return this.http.get<ApiResponse<PageResponse<ClientRequest>>>(this.apiUrl, { params });
  }

  getById(id: number): Observable<ApiResponse<ClientRequest>> {
    return this.http.get<ApiResponse<ClientRequest>>(`${this.apiUrl}/${id}`);
  }

  getForSelect(): Observable<ApiResponse<PageResponse<ClientRequest>>> {
    const params = new HttpParams()
      .set('page', '0')
      .set('size', '1000')
      .set('sortField', 'name')
      .set('sortOrder', 'asc');

    return this.http.get<ApiResponse<PageResponse<ClientRequest>>>(this.apiUrl, { params });
  }

  create(data: ClientRequest): Observable<ApiResponse<ClientRequest>> {
    return this.http.post<ApiResponse<ClientRequest>>(this.apiUrl, data);
  }

  update(id: number, data: ClientRequest): Observable<ApiResponse<ClientRequest>> {
    return this.http.put<ApiResponse<ClientRequest>>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }
}
