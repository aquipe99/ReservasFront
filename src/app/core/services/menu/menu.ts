import { Injectable } from '@angular/core';
import { MenuPermissionResponse } from '../../models/menu-permission-response';

@Injectable({
  providedIn: 'root',
})
export class Menu {

  private _menu :MenuPermissionResponse[]=[];

  constructor(){
    const stored =localStorage.getItem('menus');
    if(stored){
      this._menu=JSON.parse(stored);
    }   
  }

  setMenu(items: MenuPermissionResponse[]) {
      this._menu = items;
      localStorage.setItem('menus', JSON.stringify(items));
  }
  getMenu(): MenuPermissionResponse[] {
      return this._menu;
  } 
  
}
