import { Injectable } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { Empresa } from '../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class EmpresaService {
  constructor(private supabase: SupabaseService) {}

  async obtener(): Promise<Empresa> {
    const { data, error } = await this.supabase.client
      .from('empresa')
      .select('*')
      .single();
    if (error) throw error;
    return data as Empresa;
  }

  async actualizar(cambios: Partial<Empresa>): Promise<void> {
    const { error } = await this.supabase.client
      .from('empresa')
      .update(cambios)
      .eq('id', true);
    if (error) throw error;
  }
}
