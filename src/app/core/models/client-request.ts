export interface ClientRequest {
  id?: number;
  documentType: 'DNI' | 'RUC' | 'CE';
  documentNumber: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  status: boolean;
}
