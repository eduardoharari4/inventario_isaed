import { Component, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UsuariosService } from './usuarios.service';
import { AuthService } from '../../core/services/auth.service';
import { Invitacion, Profile, Rol } from '../../shared/models/models';
import { mensajeError } from '../../shared/utils/errors';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './usuarios.component.html',
  styleUrl: './usuarios.component.scss'
})
export class UsuariosComponent {
  perfiles = signal<Profile[]>([]);
  invitaciones = signal<Invitacion[]>([]);
  cargando = signal(true);
  invitando = signal(false);

  emailNuevo = '';
  rolNuevo: Rol = 'vendedor';

  constructor(
    private usuariosService: UsuariosService,
    public auth: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    try {
      const [perfiles, invitaciones] = await Promise.all([
        this.usuariosService.listarPerfiles(),
        this.usuariosService.listarInvitaciones()
      ]);
      this.perfiles.set(perfiles);
      this.invitaciones.set(invitaciones);
    } catch (e: unknown) {
      this.snackBar.open(`No se pudieron cargar los usuarios: ${mensajeError(e)}`, 'Cerrar', {
        duration: 10000
      });
    } finally {
      this.cargando.set(false);
    }
  }

  async invitar() {
    const email = this.emailNuevo.trim().toLowerCase();
    if (!email) {
      this.snackBar.open('Ingresa un correo', 'Cerrar', { duration: 3000 });
      return;
    }
    this.invitando.set(true);
    try {
      await this.usuariosService.invitar(email, this.rolNuevo);
      this.emailNuevo = '';
      this.rolNuevo = 'vendedor';
      await this.cargar();
      this.snackBar.open('Invitación creada. Esa persona ya puede registrarse con ese correo.', 'Cerrar', {
        duration: 5000
      });
    } catch (e: unknown) {
      this.snackBar.open(e instanceof Error ? e.message : 'No se pudo invitar', 'Cerrar', {
        duration: 4000
      });
    } finally {
      this.invitando.set(false);
    }
  }

  async cancelarInvitacion(email: string) {
    try {
      await this.usuariosService.cancelarInvitacion(email);
      await this.cargar();
    } catch {
      this.snackBar.open('No se pudo cancelar la invitación', 'Cerrar', { duration: 4000 });
    }
  }

  async cambiarRol(perfil: Profile, rol: Rol) {
    if (perfil.rol === rol) return;
    try {
      await this.usuariosService.cambiarRol(perfil.id, rol);
      await this.cargar();
      this.snackBar.open('Rol actualizado', 'Cerrar', { duration: 3000 });
    } catch {
      this.snackBar.open('No se pudo cambiar el rol', 'Cerrar', { duration: 4000 });
    }
  }
}
