export interface ReservationPaymentResponse {
  id: number;
  paymentMethodId: number;
  paymentMethodName: string;
  amount: number;
  paymentDate: string;
  createdBy: number;
  createdAt: string;
}
