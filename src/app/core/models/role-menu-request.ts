export interface RoleMenuRequest {
  roleId: number;
  menuId: number;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}
