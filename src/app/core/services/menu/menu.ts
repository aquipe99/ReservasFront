import { Injectable } from '@angular/core';
import { MenuPermissionResponse } from '../../models/menu-permission-response';

@Injectable({
  providedIn: 'root',
})
export class Menu {

  private _menu: MenuPermissionResponse[] = [];

  constructor() {}

  setMenu(items: MenuPermissionResponse[]) {
      this._menu = items;
  }
  
  getMenu(): MenuPermissionResponse[] {
      return this._menu;
  } 
}
