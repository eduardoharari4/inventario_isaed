import { Injectable } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { Cliente } from '../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  constructor(private supabase: SupabaseService) {}

  async listar(): Promise<Cliente[]> {
    const { data, error } = await this.supabase.client
      .from('clientes')
      .select('*')
      .order('nombre');
    if (error) throw error;
    return data as Cliente[];
  }

  async obtener(id: number): Promise<Cliente> {
    const { data, error } = await this.supabase.client
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Cliente;
  }

  async crear(
    cliente: Pick<Cliente, 'nombre' | 'domicilio' | 'ciudad' | 'telefono' | 'email'>
  ): Promise<Cliente> {
    const { data, error } = await this.supabase.client
      .from('clientes')
      .insert(cliente)
      .select()
      .single();
    if (error) throw error;
    return data as Cliente;
  }

  async actualizar(id: number, cambios: Partial<Cliente>): Promise<void> {
    const { error } = await this.supabase.client.from('clientes').update(cambios).eq('id', id);
    if (error) throw error;
  }

  async eliminar(id: number): Promise<void> {
    const { error } = await this.supabase.client.from('clientes').delete().eq('id', id);
    if (error) throw error;
  }
}
