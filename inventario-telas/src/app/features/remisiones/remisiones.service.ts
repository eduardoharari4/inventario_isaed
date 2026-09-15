import { Injectable } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { Cliente, Remision, RemisionConceptoLinea, RemisionRollo, Tela } from '../../shared/models/models';

export interface RemisionConDetalle extends Remision {
  cliente: Cliente;
  lineas: RemisionConceptoLinea[];
}

@Injectable({ providedIn: 'root' })
export class RemisionesService {
  constructor(private supabase: SupabaseService) {}

  async listar(): Promise<(Remision & { cliente: Cliente })[]> {
    const { data, error } = await this.supabase.client
      .from('remisiones')
      .select('*, cliente:clientes(*)')
      .order('folio', { ascending: false });
    if (error) throw error;
    return data as unknown as (Remision & { cliente: Cliente })[];
  }

  async obtenerConDetalle(id: number): Promise<RemisionConDetalle> {
    const { data: remision, error } = await this.supabase.client
      .from('remisiones')
      .select('*, cliente:clientes(*)')
      .eq('id', id)
      .single();
    if (error) throw error;

    const { data: rollos, error: errorRollos } = await this.supabase.client
      .from('remision_rollos')
      .select('*, tela:telas(*)')
      .eq('remision_id', id);
    if (errorRollos) throw errorRollos;

    const porTela = new Map<number, RemisionConceptoLinea>();
    for (const r of rollos as unknown as (RemisionRollo & { tela: Tela })[]) {
      const existente = porTela.get(r.tela_id);
      if (existente) {
        existente.metros += Number(r.metros);
        existente.importe += Number(r.importe);
      } else {
        porTela.set(r.tela_id, {
          tela_id: r.tela_id,
          nombre_tela: r.tela.nombre,
          color: r.tela.color,
          metros: Number(r.metros),
          precio_metro: Number(r.precio_metro),
          importe: Number(r.importe)
        });
      }
    }

    return {
      ...(remision as unknown as Remision & { cliente: Cliente }),
      lineas: Array.from(porTela.values())
    };
  }

  async crear(
    clienteId: number,
    condiciones: string,
    items: { rollo_id: number; precio_venta: number }[],
    fecha: string
  ): Promise<number> {
    const { data, error } = await this.supabase.client.rpc('crear_remision', {
      p_cliente_id: clienteId,
      p_condiciones: condiciones,
      p_items: items,
      p_fecha: fecha
    });
    if (error) throw error;
    return data as number;
  }

  async cancelar(remisionId: number): Promise<void> {
    const { error } = await this.supabase.client.rpc('cancelar_remision', {
      p_remision_id: remisionId
    });
    if (error) throw error;
  }

  /** Borra la remisión por completo (permanente) y regresa sus rollos a disponible. */
  async eliminar(remisionId: number): Promise<void> {
    const { error } = await this.supabase.client.rpc('eliminar_remision', {
      p_remision_id: remisionId
    });
    if (error) throw error;
  }
}
