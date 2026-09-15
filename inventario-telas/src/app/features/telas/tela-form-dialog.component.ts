import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { TelasService } from './telas.service';

@Component({
  selector: 'app-tela-form-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './tela-form-dialog.component.html',
  styleUrl: './tela-form-dialog.component.scss'
})
export class TelaFormDialogComponent {
  nombre = '';
  composicion = '';
  color = '';
  precioCosto: number | null = null;
  guardando = signal(false);
  error = signal('');

  constructor(private telasService: TelasService, private ref: MatDialogRef<TelaFormDialogComponent>) {}

  async guardar() {
    if (!this.nombre.trim() || this.precioCosto === null || this.precioCosto < 0) {
      this.error.set('Nombre y precio de costo son obligatorios');
      return;
    }
    this.guardando.set(true);
    this.error.set('');
    try {
      await this.telasService.crear({
        nombre: this.nombre.trim(),
        composicion: this.composicion.trim(),
        color: this.color.trim(),
        precio_costo: this.precioCosto
      });
      this.ref.close(true);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      this.guardando.set(false);
    }
  }
}
