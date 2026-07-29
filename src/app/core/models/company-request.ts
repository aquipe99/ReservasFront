export interface CompanyRequest {
  id?: number;
  legalName: string;
  tradeName: string;
  ruc: string;
  fiscalAddress: string;
  phone?: string | null;
  email?: string | null;
  additionalInfo?: string | null;
  status: boolean;
}
