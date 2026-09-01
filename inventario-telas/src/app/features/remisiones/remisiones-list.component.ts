import { Component, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RemisionesService } from './remisiones.service';
import { Cliente, EstadoRemision, Remision } from '../../shared/models/models';
import { AuthService } from '../../core/services/auth.service';
import { mensajeError } from '../../shared/utils/errors';

type FiltroEstado = 'todas' | EstadoRemision;

@Component({
  selector: 'app-remisiones-list',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatChipsModule
  ],
  templateUrl: './remisiones-list.component.html',
  styleUrl: './remisiones-list.component.scss'
})
export class RemisionesListComponent {
  remisiones = signal<(Remision & { cliente: Cliente })[]>([]);
  cargando = signal(true);
  columnas = ['folio', 'fecha', 'cliente', 'total', 'estado', 'acciones'];

  filtro = signal('');
  filtroEstado = signal<FiltroEstado>('todas');
  desde = signal<string>('');
  hasta = signal<string>('');

  constructor(
    private remisionesService: RemisionesService,
    public auth: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    try {
      this.remisiones.set(await this.remisionesService.listar());
    } catch {
      this.snackBar.open('No se pudieron cargar las remisiones', 'Cerrar', { duration: 4000 });
    } finally {
      this.cargando.set(false);
    }
  }

  remisionesFiltradas(): (Remision & { cliente: Cliente })[] {
    const f = this.filtro().trim().toLowerCase();
    const estado = this.filtroEstado();
    const desde = this.desde();
    const hasta = this.hasta();

    return this.remisiones().filter((r) => {
      if (estado !== 'todas' && r.estado !== estado) return false;
      if (desde && r.fecha < desde) return false;
      if (hasta && r.fecha > hasta) return false;
      if (!f) return true;
      return r.cliente.nombre.toLowerCase().includes(f) || String(r.folio).includes(f);
    });
  }

  totalMostrado(): number {
    return this.remisionesFiltradas().reduce((acc, r) => acc + Number(r.total), 0);
  }

  limpiarFiltros() {
    this.filtro.set('');
    this.filtroEstado.set('todas');
    this.desde.set('');
    this.hasta.set('');
  }

  async eliminar(remision: Remision, event: Event) {
    event.stopPropagation();
    if (
      !confirm(
        `¿Borrar PERMANENTEMENTE la remisión #${remision.folio}? Los rollos volverán a estar disponibles. No se puede deshacer.`
      )
    ) {
      return;
    }
    try {
      await this.remisionesService.eliminar(remision.id);
      await this.cargar();
    } catch (e: unknown) {
      this.snackBar.open(mensajeError(e, 'esta remisión'), 'Cerrar', { duration: 6000 });
    }
  }
}
