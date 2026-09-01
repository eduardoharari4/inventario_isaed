import { Component, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TelasService } from './telas.service';
import { Tela } from '../../shared/models/models';
import { TelaFormDialogComponent } from './tela-form-dialog.component';
import { mensajeError } from '../../shared/utils/errors';

interface TelaFila extends Tela {
  rollosDisponibles: number;
  metrosDisponibles: number;
}

@Component({
  selector: 'app-telas-list',
  standalone: true,
  imports: [
    CurrencyPipe,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatDialogModule
  ],
  templateUrl: './telas-list.component.html',
  styleUrl: './telas-list.component.scss'
})
export class TelasListComponent {
  filas = signal<TelaFila[]>([]);
  filtro = signal('');
  cargando = signal(true);
  columnas = ['nombre', 'composicion', 'precio', 'rollos', 'metros', 'costo', 'acciones'];

  constructor(
    private telasService: TelasService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    try {
      const [telas, disponibilidad] = await Promise.all([
        this.telasService.listar(),
        this.telasService.disponibilidadPorTela()
      ]);
      this.filas.set(
        telas.map((t) => {
          const d = disponibilidad.get(t.id);
          return { ...t, rollosDisponibles: d?.rollos ?? 0, metrosDisponibles: d?.metros ?? 0 };
        })
      );
    } catch {
      this.snackBar.open('No se pudieron cargar las telas', 'Cerrar', { duration: 4000 });
    } finally {
      this.cargando.set(false);
    }
  }

  filasFiltradas(): TelaFila[] {
    const f = this.filtro().trim().toLowerCase();
    if (!f) return this.filas();
    return this.filas().filter(
      (t) => t.nombre.toLowerCase().includes(f) || t.composicion.toLowerCase().includes(f)
    );
  }

  totalRollos(): number {
    return this.filasFiltradas().reduce((acc, t) => acc + t.rollosDisponibles, 0);
  }

  totalMetros(): number {
    return this.filasFiltradas().reduce((acc, t) => acc + t.metrosDisponibles, 0);
  }

  totalCosto(): number {
    return this.filasFiltradas().reduce(
      (acc, t) => acc + t.metrosDisponibles * Number(t.precio_costo),
      0
    );
  }

  abrirDetalle(tela: TelaFila) {
    this.router.navigate(['/telas', tela.id]);
  }

  abrirNuevaTela() {
    const ref = this.dialog.open(TelaFormDialogComponent, { width: '400px' });
    ref.afterClosed().subscribe((creada) => {
      if (creada) this.cargar();
    });
  }

  async eliminar(tela: TelaFila, event: Event) {
    event.stopPropagation();
    if (!confirm(`¿Borrar la tela "${tela.nombre}"? Esto también borra sus rollos disponibles. No se puede deshacer.`)) {
      return;
    }
    try {
      await this.telasService.eliminar(tela.id);
      await this.cargar();
    } catch (e: unknown) {
      this.snackBar.open(mensajeError(e, 'esta tela'), 'Cerrar', { duration: 6000 });
    }
  }
}
