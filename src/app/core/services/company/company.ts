import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/api-response';
import { CompanyRequest } from '../../models/company-request';

@Injectable({
  providedIn: 'root'
})
export class Company {
  private apiUrl = environment.apiUrl + '/companies';

  constructor(private http: HttpClient) {}

  getCurrent(): Observable<ApiResponse<CompanyRequest>> {
    return this.http.get<ApiResponse<CompanyRequest>>(`${this.apiUrl}/current`);
  }

  create(data: CompanyRequest): Observable<ApiResponse<CompanyRequest>> {
    return this.http.post<ApiResponse<CompanyRequest>>(this.apiUrl, data);
  }

  update(id: number, data: CompanyRequest): Observable<ApiResponse<CompanyRequest>> {
    return this.http.put<ApiResponse<CompanyRequest>>(`${this.apiUrl}/${id}`, data);
  }
}
