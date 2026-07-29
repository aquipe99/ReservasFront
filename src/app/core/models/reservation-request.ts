export interface ReservationRequest {
  clientId: number | null;
  clientName: string;
  clientDocumentType: 'DNI' | 'RUC' | 'CE';
  clientDocumentNumber: string;
  clientDni?: string | null;
  phone: string | null;
  reservationDate: string;
  startTime: string;
  endTime: string;
  courtId: number;
  paymentMethodId: number | null;
  paymentType: string;
  totalAmount: number;
  paidAmount: number;
}
