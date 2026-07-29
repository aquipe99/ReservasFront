import { CourtRequest } from './court-request';
import { PaymentMethodRequest } from './paymentmethod-request';

export interface ReservationOptionsResponse {
  courts: CourtRequest[];
  paymentMethods: PaymentMethodRequest[];
}
