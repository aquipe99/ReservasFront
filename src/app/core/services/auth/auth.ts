import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { AuthRequest } from '../../models/auth-request';
import { Menu } from '../menu/menu';
import { EMPTY, Observable, forkJoin, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { ApiResponse } from '../../models/api-response';

@Injectable({
  providedIn: 'root',
})
export class Auth {

  private apiUrl = environment.apiUrl + '/auth';
  private _accessToken: string | null = null;
  
  userSignal = signal<any>(null);
  
  constructor(private http: HttpClient, private menuService: Menu) {}

  login(payload: AuthRequest): Observable<any> {
    return this.http.post<ApiResponse<{ token: string }>>(`${this.apiUrl}/login`, payload, { withCredentials: true }).pipe(
      switchMap(res => {
        const token = res.data.token;
        
        // Almacenamos el token en memoria para las peticiones de perfil y menú
        this._accessToken = token;

        return forkJoin({
          profile: this.http.get<ApiResponse<any>>(`${environment.apiUrl}/users/me`),
          menus: this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/users/me/menus`)
        }).pipe(
          map(({ profile, menus }) => {
            const transformedMenus = this.transformMenus(menus.data);
            const user = {
              id: profile.data.id,
              name: profile.data.name,
              email: profile.data.email,
              role: profile.data.roleName,
              menus: transformedMenus
            };

            this.saveSession(token, user);
            return { token, user };
          }),
          catchError(err => {
            this.logout();
            return throwError(() => err);
          })
        );
      })
    );
  }

  refreshSession(): Observable<any> {
    return this.http.post<ApiResponse<{ token: string }>>(
      `${this.apiUrl}/refresh`,
      {},
      { withCredentials: true }
    ).pipe(
      switchMap(res => {
        const token = res.data.token;
        this._accessToken = token;

        return forkJoin({
          profile: this.http.get<ApiResponse<any>>(`${environment.apiUrl}/users/me`),
          menus: this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/users/me/menus`)
        }).pipe(
          tap(({ profile, menus }) => {
            const transformedMenus = this.transformMenus(menus.data);
            const user = {
              id: profile.data.id,
              name: profile.data.name,
              email: profile.data.email,
              role: profile.data.roleName,
              menus: transformedMenus
            };

            this.saveSession(token, user);
          }),
          catchError(err => {
            this.logout();
            return throwError(() => err);
          })
        );
      }),
      catchError(err => {
        this.logout();
        return throwError(() => err);
      })
    );
  }

  saveSession(token: string, user: any) {
    this._accessToken = token;
    this.userSignal.set(user);
    if (user?.menus) {
      this.menuService.setMenu(user.menus);
    }
  }

  get token(): string | null {
    return this._accessToken;
  }

  get user() {   
    return this.userSignal();
  }

  logout() {
    this._accessToken = null;
    this.userSignal.set(null);
    this.menuService.setMenu([]);
    this.http.post<ApiResponse<void>>(`${this.apiUrl}/logout`, {}, { withCredentials: true }).subscribe({
      error: () => {} // Ignorar errores de red al cerrar sesión
    });
  }

  refreshPermissions(): Observable<any> {
    if (!this.token) return EMPTY;

    return forkJoin({
      profile: this.http.get<ApiResponse<any>>(`${environment.apiUrl}/users/me`),
      menus: this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/users/me/menus`)
    }).pipe(
      tap(({ profile, menus }) => {
        const transformedMenus = this.transformMenus(menus.data);
        const user = {
          id: profile.data.id,
          name: profile.data.name,
          email: profile.data.email,
          role: profile.data.roleName,
          menus: transformedMenus
        };

        this.userSignal.set(user);
        this.menuService.setMenu(transformedMenus);
      })
    );
  }

  private transformMenus(menus: any[]): any[] {
    if (!menus) return [];
    return menus.map(menu => {
      return {
        id: menu.id,
        description: menu.description,
        link: menu.link,
        icon: menu.icon,
        canCreate: menu.permissions?.canCreate ?? false,
        canRead: menu.permissions?.canRead ?? false,
        canUpdate: menu.permissions?.canUpdate ?? false,
        canDelete: menu.permissions?.canDelete ?? false,
        items: menu.submenus ? this.transformMenus(menu.submenus) : []
      };
    });
  }
}
