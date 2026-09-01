import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EmpresaService } from './empresa.service';
import { Empresa } from '../../shared/models/models';

@Component({
  selector: 'app-empresa',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './empresa.component.html',
  styleUrl: './empresa.component.scss'
})
export class EmpresaComponent {
  empresa = signal<Empresa | null>(null);
  cargando = signal(true);
  guardando = signal(false);

  constructor(private empresaService: EmpresaService, private snackBar: MatSnackBar) {
    this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    try {
      this.empresa.set(await this.empresaService.obtener());
    } catch {
      this.snackBar.open('No se pudo cargar la información de la empresa', 'Cerrar', {
        duration: 4000
      });
    } finally {
      this.cargando.set(false);
    }
  }

  async guardar() {
    const e = this.empresa();
    if (!e) return;
    this.guardando.set(true);
    try {
      await this.empresaService.actualizar({
        nombre: e.nombre,
        rfc: e.rfc,
        direccion: e.direccion,
        telefono: e.telefono
      });
      this.snackBar.open('Datos guardados', 'Cerrar', { duration: 3000 });
    } catch {
      this.snackBar.open('No se pudo guardar', 'Cerrar', { duration: 4000 });
    } finally {
      this.guardando.set(false);
    }
  }
}
