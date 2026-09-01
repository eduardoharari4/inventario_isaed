import { Component, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { SaldosService } from './saldos.service';
import { PagosService } from '../pagos/pagos.service';
import { SaldoCliente, Pago } from '../../shared/models/models';
import { PagoFormDialogComponent } from '../pagos/pago-form-dialog.component';

@Component({
  selector: 'app-saldos',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatDialogModule,
    MatExpansionModule,
    MatCheckboxModule
  ],
  templateUrl: './saldos.component.html',
  styleUrl: './saldos.component.scss'
})
export class SaldosComponent {
  saldos = signal<SaldoCliente[]>([]);
  filtro = signal('');
  soloConSaldo = signal(false);
  cargando = signal(true);
  pagosPorCliente = signal<Map<number, Pago[]>>(new Map());

  constructor(
    private saldosService: SaldosService,
    private pagosService: PagosService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    try {
      this.saldos.set(await this.saldosService.listar());
    } catch (e: unknown) {
      const detalle = e instanceof Error ? e.message : JSON.stringify(e);
      this.snackBar.open(`No se pudieron cargar los saldos: ${detalle}`, 'Cerrar', {
        duration: 10000
      });
    } finally {
      this.cargando.set(false);
    }
  }

  saldosFiltrados(): SaldoCliente[] {
    const f = this.filtro().trim().toLowerCase();
    return this.saldos().filter((s) => {
      if (this.soloConSaldo() && s.saldo <= 0) return false;
      if (f && !s.nombre.toLowerCase().includes(f)) return false;
      return true;
    });
  }

  totalCargos(): number {
    return this.saldosFiltrados().reduce((acc, s) => acc + Number(s.total_cargos), 0);
  }

  totalPagos(): number {
    return this.saldosFiltrados().reduce((acc, s) => acc + Number(s.total_pagos), 0);
  }

  totalSaldoPendiente(): number {
    return this.saldosFiltrados().reduce((acc, s) => acc + Math.max(0, Number(s.saldo)), 0);
  }

  async verHistorial(clienteId: number) {
    if (this.pagosPorCliente().has(clienteId)) return;
    const pagos = await this.pagosService.listarPorCliente(clienteId);
    const mapa = new Map(this.pagosPorCliente());
    mapa.set(clienteId, pagos);
    this.pagosPorCliente.set(mapa);
  }

  historialDe(clienteId: number): Pago[] {
    return this.pagosPorCliente().get(clienteId) ?? [];
  }

  registrarPago(saldo: SaldoCliente) {
    const ref = this.dialog.open(PagoFormDialogComponent, {
      width: '400px',
      data: { clienteId: saldo.cliente_id, clienteNombre: saldo.nombre }
    });
    ref.afterClosed().subscribe(async (ok) => {
      if (ok) {
        const mapa = new Map(this.pagosPorCliente());
        mapa.delete(saldo.cliente_id);
        this.pagosPorCliente.set(mapa);
        await this.cargar();
      }
    });
  }

  async eliminarPago(pago: Pago) {
    if (!confirm('¿Borrar este pago? El saldo del cliente subirá de nuevo. No se puede deshacer.')) {
      return;
    }
    try {
      await this.pagosService.eliminar(pago.id);
      const mapa = new Map(this.pagosPorCliente());
      mapa.delete(pago.cliente_id);
      this.pagosPorCliente.set(mapa);
      await this.cargar();
      await this.verHistorial(pago.cliente_id);
    } catch {
      this.snackBar.open('No se pudo borrar el pago', 'Cerrar', { duration: 4000 });
    }
  }
}
