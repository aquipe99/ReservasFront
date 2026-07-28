import { Component } from '@angular/core';
import { Auth } from '../../core/services/auth/auth';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthRequest } from '../../core/models/auth-request';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ButtonModule, CheckboxModule, InputTextModule, PasswordModule, FormsModule, RouterModule, RippleModule,MessageModule,CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  email = '';
  password = '';
  checked: boolean = false;

   errors: any = {
    email: null,
    password: null,
    general: null
  };

  constructor(
    private auth: Auth,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    const reason = this.route.snapshot.queryParamMap.get('reason');

    if (reason === 'inactivity') {
      this.errors.general = 'La sesión se cerró por inactividad.';
    } else if (reason === 'expired') {
      this.errors.general = 'La sesión expiró. Por favor inicia sesión nuevamente.';
    }
  }

  clearError(field: string) {  
    this.errors[field] = null;
    this.errors.general = null;
  }

  onSubmit() {

     this.errors = { email: null, password: null, general: null };

    if (!this.email) this.errors.email = 'El email es requerido' ;
    if (!this.password) this.errors.password = 'La contraseña es requerida ';

    if (this.errors.email || this.errors.password) {
      return;
    }
    const payload: AuthRequest = {
      email: this.email,
      password: this.password
    };


    this.auth.login(payload).subscribe({
      next: (res) => {
        this.router.navigate(['/inicio']);
      },
      error: (err) => {       
        this.errors ={
          email:null,
          password:null,
          general:null
        }
        // Errores de validación por campo
        if (err.error?.errors?.length) {
          err.error.errors.forEach((e: any) => {
            if (e.field in this.errors) {
              this.errors[e.field] = e.message;
            }
          });
          return;
        }
        // Error general (credenciales inválidas, acceso denegado, etc.)
        if (err.error?.message) {
          this.errors.general = err.error.message;
          return;
        }
      // Fallback
      this.errors.general = 'Ocurrió un error inesperado';
      }
    });
  }
}
