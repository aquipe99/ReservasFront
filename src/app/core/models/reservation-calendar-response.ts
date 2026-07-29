import { CourtRequest } from './court-request';
import { ReservationCalendarItemResponse } from './reservation-calendar-item-response';

export interface ReservationCalendarResponse {
  weekStart: string;
  weekEnd: string;
  courts: CourtRequest[];
  reservations: ReservationCalendarItemResponse[];
}
