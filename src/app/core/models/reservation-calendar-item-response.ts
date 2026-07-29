export interface ReservationCalendarItemResponse {
  id: number;
  clientName: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  courtId: number;
  courtName: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
}
