import { Component, signal } from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReportesService, ResumenReporte } from './reportes.service';
import { mensajeError } from '../../shared/utils/errors';

type Preset = 'hoy' | 'semana' | 'mes' | 'anio' | 'todo' | 'personalizado';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [
    CurrencyPipe,
    DecimalPipe,
    FormsModule,
    MatCardModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.scss'
})
export class ReportesComponent {
  preset = signal<Preset>('mes');
  desde = signal('');
  hasta = signal('');
  resumen = signal<ResumenReporte | null>(null);
  cargando = signal(true);

  constructor(private reportesService: ReportesService, private snackBar: MatSnackBar) {
    this.aplicarPreset('mes');
  }

  private hoyISO(): string {
    return new Date().toISOString().slice(0, 10);
  }

  aplicarPreset(preset: Preset) {
    this.preset.set(preset);
    const hoy = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);

    switch (preset) {
      case 'hoy': {
        const t = this.hoyISO();
        this.desde.set(t);
        this.hasta.set(t);
        break;
      }
      case 'semana': {
        const diaSemana = (hoy.getDay() + 6) % 7; // 0 = lunes
        const lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() - diaSemana);
        this.desde.set(iso(lunes));
        this.hasta.set(this.hoyISO());
        break;
      }
      case 'mes': {
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        this.desde.set(iso(inicioMes));
        this.hasta.set(this.hoyISO());
        break;
      }
      case 'anio': {
        const inicioAnio = new Date(hoy.getFullYear(), 0, 1);
        this.desde.set(iso(inicioAnio));
        this.hasta.set(this.hoyISO());
        break;
      }
      case 'todo': {
        this.desde.set('');
        this.hasta.set('');
        break;
      }
      case 'personalizado':
        break;
    }

    if (preset !== 'personalizado') {
      this.cargar();
    }
  }

  async cargar() {
    this.cargando.set(true);
    try {
      this.resumen.set(
        await this.reportesService.obtenerResumen(this.desde() || null, this.hasta() || null)
      );
    } catch (e: unknown) {
      this.snackBar.open(`No se pudo cargar el reporte: ${mensajeError(e)}`, 'Cerrar', {
        duration: 8000
      });
    } finally {
      this.cargando.set(false);
    }
  }
}
