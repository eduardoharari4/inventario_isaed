import { Component, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RemisionesService, RemisionConDetalle } from './remisiones.service';
import { EmpresaService } from '../empresa/empresa.service';
import { AuthService } from '../../core/services/auth.service';
import { Empresa } from '../../shared/models/models';
import { mensajeError } from '../../shared/utils/errors';

@Component({
  selector: 'app-remision-detalle',
  standalone: true,
  imports: [CurrencyPipe, DatePipe, RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './remision-detalle.component.html',
  styleUrl: './remision-detalle.component.scss'
})
export class RemisionDetalleComponent {
  remision = signal<RemisionConDetalle | null>(null);
  empresa = signal<Empresa | null>(null);
  cargando = signal(true);
  cancelando = signal(false);
  eliminando = signal(false);

  private id: number;

  constructor(
    route: ActivatedRoute,
    private remisionesService: RemisionesService,
    private empresaService: EmpresaService,
    public auth: AuthService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.id = Number(route.snapshot.paramMap.get('id'));
    this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    try {
      const [remision, empresa] = await Promise.all([
        this.remisionesService.obtenerConDetalle(this.id),
        this.empresaService.obtener()
      ]);
      this.remision.set(remision);
      this.empresa.set(empresa);
    } catch {
      this.snackBar.open('No se pudo cargar la remisión', 'Cerrar', { duration: 4000 });
    } finally {
      this.cargando.set(false);
    }
  }

  imprimir() {
    window.print();
  }

  rellenoFilas(cantidadLineas: number): number[] {
    const faltantes = Math.max(0, 12 - cantidadLineas);
    return Array.from({ length: faltantes });
  }

  async cancelar() {
    if (!confirm('¿Cancelar esta remisión? Los rollos volverán a estar disponibles.')) return;
    this.cancelando.set(true);
    try {
      await this.remisionesService.cancelar(this.id);
      await this.cargar();
      this.snackBar.open('Remisión cancelada', 'Cerrar', { duration: 3000 });
    } catch {
      this.snackBar.open('No se pudo cancelar', 'Cerrar', { duration: 4000 });
    } finally {
      this.cancelando.set(false);
    }
  }

  async eliminar() {
    if (
      !confirm(
        '¿Borrar esta remisión PERMANENTEMENTE? Los rollos volverán a estar disponibles y este registro desaparecerá del historial. No se puede deshacer.'
      )
    ) {
      return;
    }
    this.eliminando.set(true);
    try {
      await this.remisionesService.eliminar(this.id);
      this.snackBar.open('Remisión borrada', 'Cerrar', { duration: 3000 });
      this.router.navigateByUrl('/remisiones');
    } catch (e: unknown) {
      this.snackBar.open(mensajeError(e, 'esta remisión'), 'Cerrar', { duration: 6000 });
    } finally {
      this.eliminando.set(false);
    }
  }
}
