import { inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpErrorResponse
} from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { Router } from '@angular/router';
import { Auth } from '../services/auth/auth';
import { MessageService } from 'primeng/api';

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const auth = inject(Auth);
  const router = inject(Router);
  const messageService = inject(MessageService);

  const token = auth.token;

  // 1️⃣ Clonamos el request y agregamos el token si existe
  const authReq = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      })
    : req;

  // 2️⃣ Continuamos la request
  return next(authReq).pipe(

    // 3️⃣ Capturamos errores
    catchError((error: HttpErrorResponse) => {
       if (error.status === 401) {
        messageService.add({
          severity: 'warn',
          summary: 'Sesión expirada',
          detail: 'Por favor inicia sesión nuevamente',
          life: 4000
        });
        auth.logout();
        router.navigate(['/login']);
      }
      if (error.status === 403) {
        // 🔐 Token inválido o expirado      
        messageService.add({
          severity: 'warn',
          summary: 'No autorizado',
          detail: 'No tiene permisos para realizar esta accion',
          life: 4000
        }); 
    /*     auth.logout();
        router.navigate(['/unauthorized']);   */     
      }

      return throwError(() => error);
    })
  );
};
