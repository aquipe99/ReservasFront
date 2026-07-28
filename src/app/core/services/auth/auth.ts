import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { AuthRequest } from '../../models/auth-request';
import { Menu } from '../menu/menu';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { catchError, finalize, map, shareReplay, switchMap, tap } from 'rxjs/operators';
import { ApiResponse } from '../../models/api-response';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class Auth {

  private apiUrl = environment.apiUrl + '/auth';
  private sessionInitialized = false;
  private sessionInitialization$: Observable<boolean> | null = null;
  private readonly lastActivityKey = 'reservas.lastActivityAt';
  private readonly logoutReasonKey = 'reservas.logoutReason';
  private readonly inactivityTimeout = environment.inactivityTimeout;
  private readonly activityEvents = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private inactivityMonitoring = false;
  private lastRecordedActivity = 0;

  userSignal = signal<any>(null);

  constructor(
    private http: HttpClient,
    private menuService: Menu,
    private router: Router
  ) {}

  initializeSession(): Observable<boolean> {
    if (this.sessionInitialized) {
      return of(this.isAuthenticated);
    }

    if (!this.sessionInitialization$) {
      this.sessionInitialization$ = this.refreshSession().pipe(
        tap(() => this.startInactivityMonitoring(false)),
        map(() => true),
        catchError(() => of(false)),
        finalize(() => this.sessionInitialized = true),
        shareReplay(1)
      );
    }

    return this.sessionInitialization$;
  }

  login(payload: AuthRequest): Observable<any> {
    return this.initializeCsrf().pipe(
      switchMap(() =>
        this.http.post<ApiResponse<any>>(`${this.apiUrl}/login`, payload)
      ),
      switchMap(() => this.loadCurrentUser()),
      tap(() => this.startInactivityMonitoring(true)),
      map(user => ({ user })),
      catchError(err => {
        this.clearSession();
        return throwError(() => err);
      })
    );
  }

  refreshSession(): Observable<any> {
    return this.initializeCsrf().pipe(
      switchMap(() => this.loadCurrentUser()),
      catchError(err => {
        this.clearSession();
        return throwError(() => err);
      })
    );
  }

  refreshAccessToken(): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/refresh`, {});
  }

  get user() {
    return this.userSignal();
  }

  get isAuthenticated(): boolean {
    return this.userSignal() !== null;
  }

  logout(reason: 'manual' | 'inactivity' | 'expired' = 'manual') {
    this.setStorageValue(this.logoutReasonKey, reason);
    this.clearSession();
    this.http.post<ApiResponse<void>>(`${this.apiUrl}/logout`, {}).subscribe({
      error: () => {}
    });
  }

  refreshPermissions(): Observable<any> {
    return this.loadCurrentUser();
  }

  private initializeCsrf(): Observable<ApiResponse<void>> {
    return this.http.get<ApiResponse<void>>(`${this.apiUrl}/csrf`);
  }

  private loadCurrentUser(): Observable<any> {
    return forkJoin({
      profile: this.http.get<ApiResponse<any>>(`${environment.apiUrl}/users/me`),
      menus: this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/users/me/menus`)
    }).pipe(
      map(({ profile, menus }) => {
        const transformedMenus = this.transformMenus(menus.data);
        return {
          id: profile.data.id,
          name: profile.data.name,
          email: profile.data.email,
          role: profile.data.roleName,
          menus: transformedMenus
        };
      }),
      tap(user => {
        this.userSignal.set(user);
        this.menuService.setMenu(user.menus);
      })
    );
  }

  private clearSession() {
    this.stopInactivityMonitoring();
    this.removeStorageValue(this.lastActivityKey);
    this.userSignal.set(null);
    this.menuService.setMenu([]);
  }

  private startInactivityMonitoring(resetActivity: boolean) {
    if (typeof window === 'undefined' || this.inactivityMonitoring || !this.isAuthenticated) {
      if (resetActivity && this.isAuthenticated) {
        this.registerActivity();
      }
      return;
    }

    this.inactivityMonitoring = true;
    this.activityEvents.forEach(event =>
      window.addEventListener(event, this.activityListener)
    );
    window.addEventListener('focus', this.focusListener);
    window.addEventListener('storage', this.storageListener);
    document.addEventListener('visibilitychange', this.visibilityListener);

    const lastActivity = this.getLastActivity();
    if (resetActivity || lastActivity === null) {
      this.registerActivity(true);
    } else {
      this.scheduleInactivityLogout();
    }
  }

  private stopInactivityMonitoring() {
    if (typeof window === 'undefined' || !this.inactivityMonitoring) {
      return;
    }

    this.activityEvents.forEach(event =>
      window.removeEventListener(event, this.activityListener)
    );
    window.removeEventListener('focus', this.focusListener);
    window.removeEventListener('storage', this.storageListener);
    document.removeEventListener('visibilitychange', this.visibilityListener);

    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    this.inactivityMonitoring = false;
  }

  private readonly activityListener = () => {
    this.registerActivity();
  };

  private readonly focusListener = () => {
    if (this.hasInactivityExpired()) {
      this.handleInactivity();
      return;
    }
    this.registerActivity(true);
  };

  private readonly visibilityListener = () => {
    if (document.visibilityState !== 'visible') {
      return;
    }
    this.focusListener();
  };

  private readonly storageListener = (event: StorageEvent) => {
    if (event.key !== this.lastActivityKey) {
      return;
    }

    if (event.newValue === null) {
      const reason = this.getStorageValue(this.logoutReasonKey);
      this.stopInactivityMonitoring();
      this.userSignal.set(null);
      this.menuService.setMenu([]);
      this.navigateToLogin(reason === 'inactivity' ? 'inactivity' : reason === 'expired' ? 'expired' : undefined);
      return;
    }

    this.scheduleInactivityLogout();
  };

  private registerActivity(force = false) {
    if (!this.isAuthenticated) {
      return;
    }

    const now = Date.now();
    if (!force && now - this.lastRecordedActivity < 1000) {
      return;
    }

    this.lastRecordedActivity = now;
    this.removeStorageValue(this.logoutReasonKey);
    this.setStorageValue(this.lastActivityKey, now.toString());
    this.scheduleInactivityLogout();
  }

  private scheduleInactivityLogout() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    const lastActivity = this.getLastActivity();
    const elapsed = lastActivity === null ? 0 : Date.now() - lastActivity;
    const remaining = Math.max(0, this.inactivityTimeout - elapsed);

    if (remaining === 0) {
      this.handleInactivity();
      return;
    }

    this.inactivityTimer = setTimeout(() => this.handleInactivity(), remaining);
  }

  private hasInactivityExpired(): boolean {
    const lastActivity = this.getLastActivity();
    return lastActivity !== null && Date.now() - lastActivity >= this.inactivityTimeout;
  }

  private handleInactivity() {
    if (!this.isAuthenticated) {
      return;
    }

    this.logout('inactivity');
    this.navigateToLogin('inactivity');
  }

  private navigateToLogin(reason?: 'inactivity' | 'expired') {
    this.router.navigate(['/login'], {
      queryParams: reason ? { reason } : undefined
    });
  }

  private getLastActivity(): number | null {
    const value = this.getStorageValue(this.lastActivityKey);
    if (!value) {
      return null;
    }

    const timestamp = Number(value);
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  private getStorageValue(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private setStorageValue(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
    }
  }

  private removeStorageValue(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
    }
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
