import { Component, Inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { PagosService } from './pagos.service';
import { mensajeError } from '../../shared/utils/errors';

@Component({
  selector: 'app-pago-form-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './pago-form-dialog.component.html',
  styleUrl: './pago-form-dialog.component.scss'
})
export class PagoFormDialogComponent {
  monto: number | null = null;
  formaPago = '';
  nota = '';
  fecha = new Date().toISOString().slice(0, 10);
  guardando = signal(false);
  error = signal('');

  constructor(
    private pagosService: PagosService,
    private ref: MatDialogRef<PagoFormDialogComponent>,
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
      await this.pagosService.registrar({
        cliente_id: this.data.clienteId,
        monto: this.monto,
        forma_pago: this.formaPago.trim(),
        nota: this.nota.trim(),
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
