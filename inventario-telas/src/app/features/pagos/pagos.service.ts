import { Injectable } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { Pago } from '../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class PagosService {
  constructor(private supabase: SupabaseService) {}

  async listarPorCliente(clienteId: number): Promise<Pago[]> {
    const { data, error } = await this.supabase.client
      .from('pagos')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('fecha', { ascending: false });
    if (error) throw error;
    return data as Pago[];
  }

  async registrar(pago: Pick<Pago, 'cliente_id' | 'monto' | 'forma_pago' | 'nota'>): Promise<void> {
    const { error } = await this.supabase.client.from('pagos').insert(pago);
    if (error) throw error;
  }

  async eliminar(id: number): Promise<void> {
    const { error } = await this.supabase.client.from('pagos').delete().eq('id', id);
    if (error) throw error;
  }
}
