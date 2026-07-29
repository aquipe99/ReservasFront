import { ReservationPaymentResponse } from './reservation-payment-response';

export interface ReservationResponse {
  id: number;
  clientId: number;
  clientName: string;
  clientDocumentType: 'DNI' | 'RUC' | 'CE';
  clientDocumentNumber: string;
  clientDni: string;
  phone: string | null;
  reservationDate: string;
  startTime: string;
  endTime: string;
  courtId: number;
  courtName: string;
  paymentMethodId: number | null;
  paymentMethodName: string | null;
  paymentType: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
  createdBy: number;
  createdAt: string;
  modifiedBy: number | null;
  modifiedAt: string | null;
  cancelledBy: number | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  payments: ReservationPaymentResponse[];
}
