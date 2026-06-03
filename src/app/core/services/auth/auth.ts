import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { LoginRequest } from '../../models/login-request';
import { LoginResponse } from '../../models/login-response';
import { Menu } from '../menu/menu';
import { EMPTY, tap } from 'rxjs';


@Injectable({
  providedIn: 'root',
})
export class Auth {

  private apiUrl = environment.apiUrl + '/auth';
  
  userSignal =signal<any>(this.getUserFromLocalStorage());
  constructor(private http: HttpClient,private menuService :Menu ) {
   const storeduser = this.getUserFromLocalStorage();
   this.userSignal.set(storeduser);
   if(storeduser?.menus){
    this.menuService.setMenu(storeduser.menus);
   }
  }
  private getUserFromLocalStorage(){
    const u= localStorage.getItem('user');
    return u ? JSON.parse(u):null;
  }

  login(payload: LoginRequest) {
 
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, payload);
  }

  saveSession(token: string, user: any) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    if(user.menus){
      this.menuService.setMenu(user.menus)
    }
    this.userSignal.set(user);
  }

  get token(): string | null {
    return localStorage.getItem('token');
  }

  get user() {   
    return this.userSignal();
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
    refreshPermissions() {
      if (!this.token) return EMPTY;

      return this.http
        .get<any>(`${this.apiUrl}/me`)
        .pipe(
          tap((res) => {
            const user = res?.data; 
            if (user) {              
              localStorage.setItem('user', JSON.stringify(user));              
              this.userSignal.set(user);              
              if (user.menus) {
                this.menuService.setMenu(user.menus);
              }
            }
          })
        );
    }
}
