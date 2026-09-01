import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClientesService } from './clientes.service';
import { Cliente } from '../../shared/models/models';
import { ClienteFormDialogComponent } from './cliente-form-dialog.component';
import { mensajeError } from '../../shared/utils/errors';

@Component({
  selector: 'app-clientes-list',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatDialogModule
  ],
  templateUrl: './clientes-list.component.html',
  styleUrl: './clientes-list.component.scss'
})
export class ClientesListComponent {
  clientes = signal<Cliente[]>([]);
  filtro = signal('');
  cargando = signal(true);
  columnas = ['nombre', 'ciudad', 'telefono', 'acciones'];

  constructor(
    private clientesService: ClientesService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    try {
      this.clientes.set(await this.clientesService.listar());
    } catch {
      this.snackBar.open('No se pudieron cargar los clientes', 'Cerrar', { duration: 4000 });
    } finally {
      this.cargando.set(false);
    }
  }

  clientesFiltrados(): Cliente[] {
    const f = this.filtro().trim().toLowerCase();
    if (!f) return this.clientes();
    return this.clientes().filter((c) => c.nombre.toLowerCase().includes(f));
  }

  abrirNuevo() {
    const ref = this.dialog.open(ClienteFormDialogComponent, { width: '420px' });
    ref.afterClosed().subscribe((ok) => {
      if (ok) this.cargar();
    });
  }

  editar(cliente: Cliente) {
    const ref = this.dialog.open(ClienteFormDialogComponent, {
      width: '420px',
      data: { cliente }
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) this.cargar();
    });
  }

  async eliminar(cliente: Cliente) {
    if (!confirm(`¿Borrar al cliente "${cliente.nombre}"? Esto no se puede deshacer.`)) return;
    try {
      await this.clientesService.eliminar(cliente.id);
      await this.cargar();
    } catch (e: unknown) {
      this.snackBar.open(mensajeError(e, 'este cliente'), 'Cerrar', { duration: 6000 });
    }
  }
}
