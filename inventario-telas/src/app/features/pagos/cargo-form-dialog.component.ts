import { Component, Inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CargosManualesService } from './cargos-manuales.service';
import { mensajeError } from '../../shared/utils/errors';
import { redondear2 } from '../../shared/utils/numeros';

@Component({
  selector: 'app-cargo-form-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './cargo-form-dialog.component.html',
  styleUrl: './cargo-form-dialog.component.scss'
})
export class CargoFormDialogComponent {
  monto: number | null = null;
  concepto = '';
  fecha = new Date().toISOString().slice(0, 10);
  guardando = signal(false);
  error = signal('');

  constructor(
    private cargosService: CargosManualesService,
    private ref: MatDialogRef<CargoFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { clienteId: number; clienteNombre: string }
  ) {}

  async guardar() {
    if (!this.monto || this.monto <= 0) {
      this.error.set('Ingresa un monto válido');
      return;
    }
    this.guardando.set(true);
    this.error.set('');
    try {
      await this.cargosService.registrar({
        cliente_id: this.data.clienteId,
        monto: redondear2(this.monto),
        concepto: this.concepto.trim(),
        fecha: this.fecha
      });
      this.ref.close(true);
    } catch (e: unknown) {
      this.error.set(mensajeError(e));
    } finally {
      this.guardando.set(false);
    }
  }
}
