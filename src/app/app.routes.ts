import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { permissionGuard } from './core/guards/permission-guard';

export const routes: Routes = [

    {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login').then(m => m.Login)
    },
    {
      path: '',
      canActivate: [authGuard], 
      canActivateChild:[permissionGuard],
      loadComponent: () =>
        import('./layout/component/app.layout').then(m => m.AppLayout),
      children: [
        {
          path: '',
          redirectTo: 'inicio',
          pathMatch: 'full'
        },
        {
          path: 'inicio',
          loadComponent: () =>
            import('./pages/inicio/inicio').then(m => m.Inicio)
        },
        {
          path: 'MetodoPago',
          data: { routePath: 'MetodoPago', permission: 'canRead' },
          loadComponent: () =>
            import('./pages/payment-method/payment-method').then(m => m.PaymentMethodComponent)
        },
        {
          path: 'Cancha',
          data: { routePath: 'Cancha', permission: 'canRead' },
          loadComponent: () =>
             import('./pages/court/court').then(m => m.CourtComponent)
        },
        {
          path: 'Reserva',
          data: { routePath: 'Reserva', permission: 'canRead' },
          loadComponent: () =>
             import('./pages/reservation/reservation').then(m => m.ReservationComponent)
        },
        {
          path: 'Cliente',
          data: { routePath: 'Cliente', permission: 'canRead' },
          loadComponent: () =>
             import('./pages/client/client').then(m => m.ClientComponent)
        },
        {
          path: 'Empresa',
          data: { routePath: 'Empresa', permission: 'canRead' },
          loadComponent: () =>
             import('./pages/company/company').then(m => m.CompanyComponent)
        },
        {
          path: 'Serie',
          data: { routePath: 'Serie', permission: 'canRead' },
          loadComponent: () =>
             import('./pages/receipt-series/receipt-series')
               .then(m => m.ReceiptSeriesComponent)
        },
        {
          path: 'Rol',
          data: { routePath: 'Rol', permission: 'canRead' },
          loadComponent: () =>
             import('./pages/role/role').then(m => m.RoleComponent)
        },
        {
          path: 'Permiso',
          data: { routePath: 'Permiso', permission: 'canRead' },
          loadComponent: () =>
             import('./pages/role-menu/role-menu').then(m => m.RoleMenuComponent)
        },
        {
          path: 'Menu',
          data: { routePath: 'Menu', permission: 'canRead' },
          loadComponent: () =>
             import('./pages/menu/menu').then(m => m.MenuComponent)
        },
        {
          path: 'Usuario',
          data: { routePath: 'Usuario', permission: 'canRead' },
          loadComponent: () =>
             import('./pages/user/user').then(m => m.UserComponent)
        },
        {
          path: 'unauthorized',
         loadComponent: () =>
              import('./pages/unauthorized/unauthorized')
          .then(m => m.Unauthorized)
        },
      ]
    }
  ///guiarme de este ejemplo para los demas mantenedores //
      /*     {
        path: 'metodo-pago',
        canActivate: [permissionGuard],
        data: { routePath: 'MetodoPago', permission: 'canRead' },
        loadComponent: () =>
          import('./pages/payment-method/payment-method')
            .then(m => m.PaymentMethod)
      },
      {
        path: 'usuario',
        canActivate: [permissionGuard],
        data: { routePath: 'Usuario', permission: 'canRead' },
        loadComponent: () =>
          import('./pages/usuario/usuario')
            .then(m => m.Usuario)
      },
      {
        path: 'cancha',
        canActivate: [permissionGuard],
        data: { routePath: 'Cancha', permission: 'canRead' },
        loadComponent: () =>
          import('./pages/cancha/cancha')
            .then(m => m.Cancha)
      } */

  //

];
