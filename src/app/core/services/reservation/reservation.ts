import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../models/api-response';
import { ReservationCalendarResponse } from '../../models/reservation-calendar-response';
import { ReservationCancellationRequest } from '../../models/reservation-cancellation-request';
import { ReservationOptionsResponse } from '../../models/reservation-options-response';
import { ReservationPaymentRequest } from '../../models/reservation-payment-request';
import { ReservationRequest } from '../../models/reservation-request';
import { ReservationResponse } from '../../models/reservation-response';
import { ReservationTicketResponse } from '../../models/reservation-ticket-response';

@Injectable({
  providedIn: 'root',
})
export class Reservation {

  private apiUrl = environment.apiUrl + '/reservations';

  constructor(private http: HttpClient) {}

  getCalendar(date?: string): Observable<ApiResponse<ReservationCalendarResponse>> {
    let params = new HttpParams();

    if (date) {
      params = params.set('date', date);
    }

    return this.http.get<ApiResponse<ReservationCalendarResponse>>(
      `${this.apiUrl}/calendar`,
      { params }
    );
  }

  getOptions(): Observable<ApiResponse<ReservationOptionsResponse>> {
    return this.http.get<ApiResponse<ReservationOptionsResponse>>(
      `${this.apiUrl}/options`
    );
  }

  getById(id: number): Observable<ApiResponse<ReservationResponse>> {
    return this.http.get<ApiResponse<ReservationResponse>>(
      `${this.apiUrl}/${id}`
    );
  }

  create(data: ReservationRequest): Observable<ApiResponse<ReservationResponse>> {
    return this.http.post<ApiResponse<ReservationResponse>>(this.apiUrl, data);
  }

  update(
    id: number,
    data: ReservationRequest
  ): Observable<ApiResponse<ReservationResponse>> {
    return this.http.put<ApiResponse<ReservationResponse>>(
      `${this.apiUrl}/${id}`,
      data
    );
  }

  addPayment(
    id: number,
    data: ReservationPaymentRequest
  ): Observable<ApiResponse<ReservationResponse>> {
    return this.http.post<ApiResponse<ReservationResponse>>(
      `${this.apiUrl}/${id}/payments`,
      data
    );
  }

  cancel(
    id: number,
    data: ReservationCancellationRequest
  ): Observable<ApiResponse<ReservationResponse>> {
    return this.http.put<ApiResponse<ReservationResponse>>(
      `${this.apiUrl}/${id}/cancel`,
      data
    );
  }

  getTicket(id: number): Observable<ApiResponse<ReservationTicketResponse>> {
    return this.http.get<ApiResponse<ReservationTicketResponse>>(
      `${this.apiUrl}/${id}/ticket`
    );
  }

  emitTicket(id: number): Observable<ApiResponse<ReservationTicketResponse>> {
    return this.http.post<ApiResponse<ReservationTicketResponse>>(
      `${this.apiUrl}/${id}/ticket`,
      {}
    );
  }
}
