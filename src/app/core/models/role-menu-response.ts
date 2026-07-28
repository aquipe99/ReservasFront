export interface RoleMenuResponse {
  id: number | null;
  roleId: number;
  roleName: string;
  menuId: number;
  menuDescription: string;
  menuLink: string | null;
  menuIcon: string | null;
  parentMenu: number | null;
  menuOrder: number;
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  createdAt: string | null;
  modifiedAt: string | null;
}
