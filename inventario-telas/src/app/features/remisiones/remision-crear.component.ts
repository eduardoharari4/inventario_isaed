import { Component, computed, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ClientesService } from '../clientes/clientes.service';
import { TelasService } from '../telas/telas.service';
import { RemisionesService } from './remisiones.service';
import { Cliente, Rollo, Tela } from '../../shared/models/models';

type RolloDisponible = Rollo & { tela: Tela };

interface GrupoTela {
  tela: Tela;
  rollos: RolloDisponible[];
}

@Component({
  selector: 'app-remision-crear',
  standalone: true,
  imports: [
    CurrencyPipe,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule
  ],
  templateUrl: './remision-crear.component.html',
  styleUrl: './remision-crear.component.scss'
})
export class RemisionCrearComponent {
  clientes = signal<Cliente[]>([]);
  grupos = signal<GrupoTela[]>([]);
  seleccionados = signal<Set<number>>(new Set());
  /** Precio de venta por metro que el vendedor decide en el momento, por tela. */
  preciosVenta = signal<Map<number, number | null>>(new Map());
  clienteId: number | null = null;
  condiciones = '';
  fecha = new Date().toISOString().slice(0, 10);
  cargando = signal(true);
  guardando = signal(false);

  constructor(
    private clientesService: ClientesService,
    private telasService: TelasService,
    private remisionesService: RemisionesService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    try {
      const [clientes, rollos] = await Promise.all([
        this.clientesService.listar(),
        this.telasService.listarRollosDisponibles()
      ]);
      this.clientes.set(clientes);

      const mapa = new Map<number, GrupoTela>();
      for (const r of rollos) {
        const grupo = mapa.get(r.tela_id);
        if (grupo) {
          grupo.rollos.push(r);
        } else {
          mapa.set(r.tela_id, { tela: r.tela, rollos: [r] });
        }
      }
      this.grupos.set(
        Array.from(mapa.values()).sort((a, b) => a.tela.nombre.localeCompare(b.tela.nombre))
      );
    } catch {
      this.snackBar.open('No se pudo cargar la información', 'Cerrar', { duration: 4000 });
    } finally {
      this.cargando.set(false);
    }
  }

  toggleRollo(rolloId: number) {
    const set = new Set(this.seleccionados());
    if (set.has(rolloId)) {
      set.delete(rolloId);
    } else {
      set.add(rolloId);
    }
    this.seleccionados.set(set);
  }

  precioVentaDe(telaId: number): number | null {
    return this.preciosVenta().get(telaId) ?? null;
  }

  setPrecioVenta(telaId: number, valor: number | null) {
    const mapa = new Map(this.preciosVenta());
    mapa.set(telaId, valor);
    this.preciosVenta.set(mapa);
  }

  metrosSeleccionadosDeTela(grupo: GrupoTela): number {
    return grupo.rollos
      .filter((r) => this.seleccionados().has(r.id))
      .reduce((acc, r) => acc + Number(r.metros), 0);
  }

  importeSeleccionadoDeTela(grupo: GrupoTela): number {
    const precio = this.precioVentaDe(grupo.tela.id);
    if (!precio) return 0;
    return this.metrosSeleccionadosDeTela(grupo) * precio;
  }

  subtotal = computed(() => {
    let total = 0;
    for (const grupo of this.grupos()) {
      total += this.importeSeleccionadoDeTela(grupo);
    }
    return Math.round(total * 100) / 100;
  });

  iva = computed(() => Math.round(this.subtotal() * 0.16 * 100) / 100);

  total = computed(() => Math.round((this.subtotal() + this.iva()) * 100) / 100);

  hayRollosSeleccionados(): boolean {
    return this.seleccionados().size > 0;
  }

  /** true si algún grupo con rollos seleccionados no tiene precio de venta capturado. */
  faltaPrecioVenta(): boolean {
    return this.grupos().some(
      (g) => this.metrosSeleccionadosDeTela(g) > 0 && !this.precioVentaDe(g.tela.id)
    );
  }

  async confirmar() {
    if (!this.clienteId) {
      this.snackBar.open('Selecciona un cliente', 'Cerrar', { duration: 3000 });
      return;
    }
    if (!this.hayRollosSeleccionados()) {
      this.snackBar.open('Selecciona al menos un rollo', 'Cerrar', { duration: 3000 });
      return;
    }
    if (this.faltaPrecioVenta()) {
      this.snackBar.open('Ingresa el precio de venta para cada tela seleccionada', 'Cerrar', {
        duration: 4000
      });
      return;
    }

    const items: { rollo_id: number; precio_venta: number }[] = [];
    for (const grupo of this.grupos()) {
      const precio = this.precioVentaDe(grupo.tela.id);
      if (!precio) continue;
      for (const rollo of grupo.rollos) {
        if (this.seleccionados().has(rollo.id)) {
          items.push({ rollo_id: rollo.id, precio_venta: precio });
        }
      }
    }

    this.guardando.set(true);
    try {
      const id = await this.remisionesService.crear(
        this.clienteId,
        this.condiciones,
        items,
        this.fecha
      );
      this.snackBar.open('Remisión creada', 'Cerrar', { duration: 3000 });
      this.router.navigate(['/remisiones', id]);
    } catch (e: unknown) {
      this.snackBar.open(
        e instanceof Error ? e.message : 'No se pudo crear la remisión',
        'Cerrar',
        { duration: 5000 }
      );
      await this.cargar();
    } finally {
      this.guardando.set(false);
    }
  }
}
