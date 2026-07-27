export interface UserRequest {
  id?: number;
  name: string;
  phone: string;
  email: string;
  password?: string;
  roleId: number;
  active: boolean;
}
