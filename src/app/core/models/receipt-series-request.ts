export interface ReceiptSeriesRequest {
  id?: number;
  companyId?: number;
  documentType: 'TICKET';
  seriesCode: string;
  nextNumber: number;
  status: boolean;
}
