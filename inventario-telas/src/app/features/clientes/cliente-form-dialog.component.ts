import { Component, Inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ClientesService } from './clientes.service';
import { Cliente } from '../../shared/models/models';

@Component({
  selector: 'app-cliente-form-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './cliente-form-dialog.component.html',
  styleUrl: './cliente-form-dialog.component.scss'
})
export class ClienteFormDialogComponent {
  nombre = '';
  domicilio = '';
  ciudad = '';
  telefono = '';
  email = '';
  guardando = signal(false);
  error = signal('');

  constructor(
    private clientesService: ClientesService,
    private ref: MatDialogRef<ClienteFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { cliente?: Cliente } | null
  ) {
    if (data?.cliente) {
      const c = data.cliente;
      this.nombre = c.nombre;
      this.domicilio = c.domicilio;
      this.ciudad = c.ciudad;
      this.telefono = c.telefono;
      this.email = c.email;
    }
  }

  async guardar() {
    if (!this.nombre.trim()) {
      this.error.set('El nombre es obligatorio');
      return;
    }
    this.guardando.set(true);
    this.error.set('');
    const payload = {
      nombre: this.nombre.trim(),
      domicilio: this.domicilio.trim(),
      ciudad: this.ciudad.trim(),
      telefono: this.telefono.trim(),
      email: this.email.trim()
    };
    try {
      if (this.data?.cliente) {
        await this.clientesService.actualizar(this.data.cliente.id, payload);
      } else {
        await this.clientesService.crear(payload);
      }
      this.ref.close(true);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      this.guardando.set(false);
    }
  }
}
