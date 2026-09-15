import { Injectable } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { CargoManual } from '../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class CargosManualesService {
  constructor(private supabase: SupabaseService) {}

  async listarPorCliente(clienteId: number): Promise<CargoManual[]> {
    const { data, error } = await this.supabase.client
      .from('cargos_manuales')
      .select('*')
      .eq('cliente_id', clienteId)
      .order('fecha', { ascending: false });
    if (error) throw error;
    return data as CargoManual[];
  }

  async registrar(
    cargo: Pick<CargoManual, 'cliente_id' | 'monto' | 'concepto' | 'fecha'>
  ): Promise<void> {
    const { data: userData } = await this.supabase.client.auth.getUser();
    const { error } = await this.supabase.client
      .from('cargos_manuales')
      .insert({ ...cargo, usuario_id: userData.user?.id });
    if (error) throw error;
  }

  async eliminar(id: number): Promise<void> {
    const { error } = await this.supabase.client.from('cargos_manuales').delete().eq('id', id);
    if (error) throw error;
  }
}
