import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Auth } from './core/services/auth/auth';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('front-reservas');
  private auth = inject(Auth);

  ngOnInit() {
    //Refresca los permisos al iniciar la aplicación
    if(this.auth.token){
      this.auth.refreshPermissions().subscribe({
       
        next: (res) => {  
             
          //console.log('Permisos actualizados', res);
        },
        error: (err) => {
          //console.warn('No se pudieron actualizar los permisos', err);
        }
      });
    }

  }
}
