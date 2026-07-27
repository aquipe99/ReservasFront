export interface MenuRequest {
  id?: number;
  description: string;
  link?: string;
  icon: string;
  active: boolean;
  parentMenu?: number;
  menuOrder: number;
  apiPath?: string;
}
