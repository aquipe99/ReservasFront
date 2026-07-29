import { ReservationPaymentResponse } from './reservation-payment-response';

export interface ReservationTicketResponse {
  id: number;
  reservationId: number;
  documentType: 'TICKET';
  seriesCode: string;
  correlativeNumber: number;
  fullNumber: string;
  issuedAt: string;
  companyLegalName: string;
  companyTradeName: string;
  companyRuc: string;
  companyFiscalAddress: string;
  companyPhone: string | null;
  companyEmail: string | null;
  companyAdditionalInfo: string | null;
  clientName: string;
  clientDocumentType: 'DNI' | 'RUC' | 'CE';
  clientDocumentNumber: string;
  clientPhone: string | null;
  reservationDate: string;
  startTime: string;
  endTime: string;
  courtName: string;
  totalPaid: number;
  payments: ReservationPaymentResponse[];
}
