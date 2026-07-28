import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/api-response';
import { PageResponse } from '../../models/page-response';
import { RoleMenuPermissionRequest } from '../../models/role-menu-permission-request';
import { RoleMenuRequest } from '../../models/role-menu-request';
import { RoleMenuResponse } from '../../models/role-menu-response';

@Injectable({
  providedIn: 'root'
})
export class RoleMenu {
  private apiUrl = environment.apiUrl + '/role-menus';

  constructor(private http: HttpClient) {}

  getAll(
    page: number,
    size: number,
    sortField?: string,
    sortOrder?: string,
    globalFilter?: string
  ): Observable<ApiResponse<PageResponse<RoleMenuResponse>>> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sortField', sortField ?? '')
      .set('sortOrder', sortOrder ?? '')
      .set('globalFilter', globalFilter ?? '');

    return this.http.get<ApiResponse<PageResponse<RoleMenuResponse>>>(this.apiUrl, { params });
  }

  getByRoleId(roleId: number): Observable<ApiResponse<RoleMenuResponse[]>> {
    return this.http.get<ApiResponse<RoleMenuResponse[]>>(`${this.apiUrl}/role/${roleId}`);
  }

  create(data: RoleMenuRequest): Observable<ApiResponse<RoleMenuResponse>> {
    return this.http.post<ApiResponse<RoleMenuResponse>>(this.apiUrl, data);
  }

  update(id: number, data: RoleMenuRequest): Observable<ApiResponse<RoleMenuResponse>> {
    return this.http.put<ApiResponse<RoleMenuResponse>>(`${this.apiUrl}/${id}`, data);
  }

  updateByRole(
    roleId: number,
    permissions: RoleMenuPermissionRequest[]
  ): Observable<ApiResponse<RoleMenuResponse[]>> {
    return this.http.put<ApiResponse<RoleMenuResponse[]>>(
      `${this.apiUrl}/role/${roleId}`,
      permissions
    );
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }
}
