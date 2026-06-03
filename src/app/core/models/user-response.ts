
import { MenuPermissionResponse } from "./menu-permission-response";

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  role: string;
  menus: MenuPermissionResponse[];
}
