import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  modo = signal<'login' | 'signup'>('login');
  email = '';
  password = '';
  nombre = '';
  cargando = signal(false);
  error = signal('');

  constructor(private auth: AuthService, private router: Router) {}

  toggleModo() {
    this.modo.set(this.modo() === 'login' ? 'signup' : 'login');
    this.error.set('');
  }

  async submit() {
    this.error.set('');
    this.cargando.set(true);
    try {
      if (this.modo() === 'login') {
        await this.auth.signIn(this.email, this.password);
        this.router.navigateByUrl('/');
      } else {
        await this.auth.signUp(this.email, this.password, this.nombre);
        this.error.set('Cuenta creada. Ya puedes iniciar sesión.');
        this.modo.set('login');
      }
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Ocurrió un error');
    } finally {
      this.cargando.set(false);
    }
  }
}
