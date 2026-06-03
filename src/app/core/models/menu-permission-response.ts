export interface MenuPermissionResponse {
  id: number;
  description: string;
  link: string;
  icon: string; 
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}
