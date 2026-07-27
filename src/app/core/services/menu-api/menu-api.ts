import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../../models/api-response';
import { PageResponse } from '../../models/page-response';
import { MenuRequest } from '../../models/menu-request';
import { ParentMenuResponse } from '../../models/parent-menu-response';

@Injectable({
  providedIn: 'root',
})
export class MenuApi {
  
  private apiUrl = environment.apiUrl + '/menus';
  constructor(private http: HttpClient){}

  getParents(): Observable<ApiResponse<ParentMenuResponse[]>> {
    return this.http.get<ApiResponse<ParentMenuResponse[]>>(`${this.apiUrl}/parents`);
  }

  getAll(
      page: number,
      size: number,
      sortField?: string,
      sortOrder?: string,
      globalFilter?: string
  ): Observable<ApiResponse<PageResponse<MenuRequest>>>{
        let params = new HttpParams()
        .set('page', page)
        .set('size', size)
        .set('sortField', sortField ?? '')
        .set('sortOrder', sortOrder ?? '')
        .set('globalFilter', globalFilter ?? '');

      return this.http.get<ApiResponse<PageResponse<MenuRequest>>>(
        this.apiUrl,
        { params }
      );
  }

  create(data: MenuRequest): Observable<ApiResponse<MenuRequest>> {
    return this.http.post<ApiResponse<MenuRequest>>(this.apiUrl, data);
  }

  update(id: number, data: MenuRequest): Observable<ApiResponse<MenuRequest>> {
      return this.http.put<ApiResponse<MenuRequest>>(
        `${this.apiUrl}/${id}`,
        data
      );
  }

  delete(id: number): Observable<ApiResponse<void>> {
      return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }
}
