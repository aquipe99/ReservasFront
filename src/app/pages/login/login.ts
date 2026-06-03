import { Component } from '@angular/core';
import { Auth } from '../../core/services/auth/auth';
import { Router, RouterModule } from '@angular/router';
import { LoginRequest } from '../../core/models/login-request';
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

  constructor( private auth: Auth,private router: Router  ) {}

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
    const payload: LoginRequest = {
      email: this.email,
      password: this.password
    };


    this.auth.login(payload).subscribe({
      next: (res) => {
        this.auth.saveSession(res.token, res.user);
        this.router.navigate(['/inicio']);
      },
      error: (err) => {

        if (err.error?.codigo === 400 && err.error.errores) {
          this.errors.email = err.error.errores.email || null;
          this.errors.password = err.error.errores.password || null;
        }      
        if (err.error?.codigo === 401) {
          this.errors.general = err.error.mensaje;
        }
      }
    });
  }
}
