import { Injectable } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { SaldoCliente } from '../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class SaldosService {
  constructor(private supabase: SupabaseService) {}

  async listar(): Promise<SaldoCliente[]> {
    const { data, error } = await this.supabase.client.rpc('saldos_clientes');
    if (error) throw error;
    return data as SaldoCliente[];
  }
}
