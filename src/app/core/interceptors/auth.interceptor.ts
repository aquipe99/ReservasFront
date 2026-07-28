import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpErrorResponse
} from '@angular/common/http';
import { catchError, finalize, shareReplay, switchMap } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { Auth } from '../services/auth/auth';
import { MessageService } from 'primeng/api';
import { environment } from '../../../environments/environment';

let refreshRequest$: Observable<unknown> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const auth = inject(Auth);
  const router = inject(Router);
  const messageService = inject(MessageService);

  const isApiRequest = req.url.startsWith(environment.apiUrl);
  const isAuthRequest = req.url.startsWith(`${environment.apiUrl}/auth`);
  const csrfToken = getCookie('XSRF-TOKEN');
  const requiresCsrf = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase());

  const authReq = isApiRequest
    ? req.clone({
        withCredentials: true,
        setHeaders: csrfToken && requiresCsrf
          ? { 'X-XSRF-TOKEN': csrfToken }
          : {}
      })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && isApiRequest && !isAuthRequest) {
        return getRefreshRequest(auth, router).pipe(
          switchMap(() => next(authReq))
        );
      }

      if (error.status === 403) {
        messageService.add({
          severity: 'warn',
          summary: 'No autorizado',
          detail: 'No tiene permisos para realizar esta acción',
          life: 4000
        });
      }

      return throwError(() => error);
    })
  );
};

function getRefreshRequest(auth: Auth, router: Router): Observable<unknown> {
  if (!refreshRequest$) {
    refreshRequest$ = auth.refreshAccessToken().pipe(
      catchError(error => {
        auth.logout('expired');
        router.navigate(['/login'], {
          queryParams: { reason: 'expired' }
        });
        return throwError(() => error);
      }),
      finalize(() => {
        refreshRequest$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
  }

  return refreshRequest$;
}

function getCookie(name: string): string | null {
  const cookie = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${name}=`));

  return cookie
    ? decodeURIComponent(cookie.substring(name.length + 1))
    : null;
}
