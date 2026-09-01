import { Injectable } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { Rollo, Tela } from '../../shared/models/models';

@Injectable({ providedIn: 'root' })
export class TelasService {
  constructor(private supabase: SupabaseService) {}

  async listar(): Promise<Tela[]> {
    const { data, error } = await this.supabase.client
      .from('telas')
      .select('*')
      .order('nombre');
    if (error) throw error;
    return data as Tela[];
  }

  async obtener(id: number): Promise<Tela> {
    const { data, error } = await this.supabase.client
      .from('telas')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Tela;
  }

  async crear(tela: Pick<Tela, 'nombre' | 'composicion' | 'precio_costo'>): Promise<Tela> {
    const { data, error } = await this.supabase.client
      .from('telas')
      .insert(tela)
      .select()
      .single();
    if (error) throw error;
    return data as Tela;
  }

  async actualizar(id: number, cambios: Partial<Tela>): Promise<void> {
    const { error } = await this.supabase.client.from('telas').update(cambios).eq('id', id);
    if (error) throw error;
  }

  async eliminar(id: number): Promise<void> {
    const { error } = await this.supabase.client.from('telas').delete().eq('id', id);
    if (error) throw error;
  }

  async eliminarRollo(id: number): Promise<void> {
    const { error } = await this.supabase.client.from('rollos').delete().eq('id', id);
    if (error) throw error;
  }

  /** Rollos disponibles con su tela, para armar remisiones (todas las telas activas). */
  async listarRollosDisponibles(): Promise<(Rollo & { tela: Tela })[]> {
    const { data, error } = await this.supabase.client
      .from('rollos')
      .select('*, tela:telas(*)')
      .eq('estado', 'disponible')
      .order('tela_id');
    if (error) throw error;
    return data as unknown as (Rollo & { tela: Tela })[];
  }

  /** Rollos y metros disponibles por tela, para mostrar en el listado. */
  async disponibilidadPorTela(): Promise<Map<number, { rollos: number; metros: number }>> {
    const { data, error } = await this.supabase.client
      .from('rollos')
      .select('tela_id, metros')
      .eq('estado', 'disponible');
    if (error) throw error;

    const mapa = new Map<number, { rollos: number; metros: number }>();
    for (const r of data as Pick<Rollo, 'tela_id' | 'metros'>[]) {
      const actual = mapa.get(r.tela_id) ?? { rollos: 0, metros: 0 };
      actual.rollos += 1;
      actual.metros += Number(r.metros);
      mapa.set(r.tela_id, actual);
    }
    return mapa;
  }

  async listarRollos(telaId: number): Promise<Rollo[]> {
    const { data, error } = await this.supabase.client
      .from('rollos')
      .select('*')
      .eq('tela_id', telaId)
      .order('estado')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Rollo[];
  }

  async agregarRollo(telaId: number, metros: number): Promise<void> {
    const { error } = await this.supabase.client
      .from('rollos')
      .insert({ tela_id: telaId, metros });
    if (error) throw error;
  }
}
