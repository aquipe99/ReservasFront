import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../../models/api-response';
import { PageResponse } from '../../models/page-response';
import { RoleRequest } from '../../models/role-request';

@Injectable({
  providedIn: 'root',
})
export class Role {
  
  private apiUrl = environment.apiUrl + '/roles';
  constructor(private http:HttpClient){}

  getAll(
      page: number,
      size: number,
      sortField?: string,
      sortOrder?: string,
      globalFilter?: string
  ): Observable<ApiResponse<PageResponse<RoleRequest>>>{
        let params = new HttpParams()
        .set('page', page)
        .set('size', size)
        .set('sortField', sortField ?? '')
        .set('sortOrder', sortOrder ?? '')
        .set('globalFilter', globalFilter ?? '');

      return this.http.get<ApiResponse<PageResponse<RoleRequest>>>(
        this.apiUrl,
        {params}
      )
  }

  create(data: RoleRequest) {
    return this.http.post<ApiResponse<RoleRequest>>(this.apiUrl, data);
  }

  update(id: number, data: RoleRequest) {
      return this.http.put<ApiResponse<RoleRequest>>(
        `${this.apiUrl}/${id}`,
        data
      );
  }

  delete(id: number) {
      return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }
  getForSelect(): Observable<ApiResponse<PageResponse<RoleRequest>>> {
    const params = new HttpParams()
      .set('page', 0)
      .set('size', 1000)
      .set('sortField', 'name')
      .set('sortOrder', 'asc');

    return this.http.get<ApiResponse<PageResponse<RoleRequest>>>(this.apiUrl, { params });
  }
}
