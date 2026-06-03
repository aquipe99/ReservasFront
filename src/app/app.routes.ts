import { Routes } from '@angular/router';
import { AppLayout } from './layout/component/app.layout';
import { Inicio } from './pages/inicio/inicio';
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
      data: { routePath: 'MetodoPago', permission: 'canRead' },
      loadComponent: () =>
        import('./layout/component/app.layout').then(m => m.AppLayout),
      children: [
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
          path: 'unauthorized',
         loadComponent: () =>
              import('./pages/unauthorized/unauthorized')
          .then(m => m.Unauthorized)
        },
      ]
    }, 
    {
      path: 'unauthorized',    
      loadComponent: () =>
        import('./pages/unauthorized/unauthorized')
          .then(m => m.Unauthorized)
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
