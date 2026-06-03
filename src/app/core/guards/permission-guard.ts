import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth/auth';

export const permissionGuard: CanActivateFn = (route, state) => {

  const auth = inject(Auth);
  const router = inject(Router);
  const user = auth.user;

  if (route.routeConfig?.path === 'unauthorized') {
    return true;
  }

  if (!user || !user.menus) {
    router.navigate(['/login']);
    return false;
  }
  const routePath = (route.data?.['routePath'] ) as string;
  const permission = route.data['permission'] as
    | 'canRead'
    | 'canCreate'
    | 'canUpdate'
    | 'canDelete';
  
  if (!routePath || !permission) {
    router.navigate(['/unauthorized']);
    return false;
  }

 const menu = findMenuByLink(user.menus, `/${routePath}`);

  if (!menu || !menu[permission]) {
    router.navigate(['/unauthorized']);
    return false;
  }

  return true;

};

function findMenuByLink(menus: any[], link: string): any | null {
  for (const menu of menus) {
    if (menu.link?.toLowerCase() === link.toLowerCase()) {
      return menu;
    }

    if (menu.items?.length) {
      const found = findMenuByLink(menu.items, link);
      if (found) return found;
    }
  }
  return null;
}
