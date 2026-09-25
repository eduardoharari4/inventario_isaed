import { Component, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TelasService } from './telas.service';
import { Rollo, Tela } from '../../shared/models/models';
import { mensajeError } from '../../shared/utils/errors';
import { redondear2 } from '../../shared/utils/numeros';

@Component({
  selector: 'app-tela-detalle',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule
  ],
  templateUrl: './tela-detalle.component.html',
  styleUrl: './tela-detalle.component.scss'
})
export class TelaDetalleComponent {
  tela = signal<Tela | null>(null);
  rollos = signal<Rollo[]>([]);
  cargando = signal(true);
  metrosNuevoRollo: number | null = null;
  agregando = signal(false);
  rolloEditandoId = signal<number | null>(null);
  metrosCorregidos: number | null = null;
  corrigiendo = signal(false);

  private telaId: number;

  constructor(
    route: ActivatedRoute,
    private telasService: TelasService,
    private snackBar: MatSnackBar
  ) {
    this.telaId = Number(route.snapshot.paramMap.get('id'));
    this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    try {
      const [tela, rollos] = await Promise.all([
        this.telasService.obtener(this.telaId),
        this.telasService.listarRollos(this.telaId)
      ]);
      this.tela.set(tela);
      this.rollos.set(rollos);
    } catch {
      this.snackBar.open('No se pudo cargar la tela', 'Cerrar', { duration: 4000 });
    } finally {
      this.cargando.set(false);
    }
  }

  totalMetrosDisponibles(): number {
    return this.rollos()
      .filter((r) => r.estado === 'disponible')
      .reduce((acc, r) => acc + Number(r.metros), 0);
  }

  rollosDisponibles(): number {
    return this.rollos().filter((r) => r.estado === 'disponible').length;
  }

  async agregarRollo() {
    if (!this.metrosNuevoRollo || this.metrosNuevoRollo <= 0) {
      this.snackBar.open('Ingresa los metros del rollo', 'Cerrar', { duration: 3000 });
      return;
    }
    this.agregando.set(true);
    try {
      await this.telasService.agregarRollo(this.telaId, redondear2(this.metrosNuevoRollo));
      this.metrosNuevoRollo = null;
      await this.cargar();
    } catch {
      this.snackBar.open('No se pudo agregar el rollo', 'Cerrar', { duration: 4000 });
    } finally {
      this.agregando.set(false);
    }
  }

  async eliminarRollo(rollo: Rollo) {
    if (!confirm(`¿Borrar este rollo de ${rollo.metros} m? No se puede deshacer.`)) return;
    try {
      await this.telasService.eliminarRollo(rollo.id);
      await this.cargar();
    } catch (e: unknown) {
      this.snackBar.open(mensajeError(e, 'este rollo'), 'Cerrar', { duration: 6000 });
    }
  }

  iniciarCorreccion(rollo: Rollo) {
    this.rolloEditandoId.set(rollo.id);
    this.metrosCorregidos = Number(rollo.metros);
  }

  cancelarCorreccion() {
    this.rolloEditandoId.set(null);
    this.metrosCorregidos = null;
  }

  async guardarCorreccion(rollo: Rollo) {
    if (!this.metrosCorregidos || this.metrosCorregidos <= 0) {
      this.snackBar.open('Ingresa los metros correctos del rollo', 'Cerrar', { duration: 3000 });
      return;
    }
    this.corrigiendo.set(true);
    try {
      await this.telasService.actualizarRollo(rollo.id, redondear2(this.metrosCorregidos));
      this.rolloEditandoId.set(null);
      this.metrosCorregidos = null;
      await this.cargar();
    } catch (e: unknown) {
      this.snackBar.open(mensajeError(e, 'este rollo'), 'Cerrar', { duration: 6000 });
    } finally {
      this.corrigiendo.set(false);
    }
  }
}
