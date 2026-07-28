import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth/auth';
import { map } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {

  const auth =inject(Auth);
  const router =inject(Router)

  return auth.initializeSession().pipe(
    map(isAuthenticated =>
      isAuthenticated
        ? true
        : router.createUrlTree(['/login'])
    )
  );
  
};
