import { Injectable } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { SaldoCliente } from '../../shared/models/models';

export interface ResumenReporte {
  ventasTotal: number;
  ventasSubtotal: number;
  numRemisiones: number;
  costoVendido: number;
  utilidadBruta: number;
  margenPct: number;
  metrosInventario: number;
  costoInventario: number;
  totalPorCobrar: number;
  clientesConSaldo: number;
}

interface RemisionResumen {
  id: number;
  total: number;
  subtotal: number;
}

interface RolloConCosto {
  metros: number;
  tela: { precio_costo: number } | null;
}

@Injectable({ providedIn: 'root' })
export class ReportesService {
  constructor(private supabase: SupabaseService) {}

  async obtenerResumen(desde: string | null, hasta: string | null): Promise<ResumenReporte> {
    let query = this.supabase.client
      .from('remisiones')
      .select('id, total, subtotal')
      .eq('estado', 'activa');
    if (desde) query = query.gte('fecha', desde);
    if (hasta) query = query.lte('fecha', hasta);

    const { data: remisionesData, error: errorRem } = await query;
    if (errorRem) throw errorRem;
    const remisiones = (remisionesData ?? []) as RemisionResumen[];

    const ventasTotal = remisiones.reduce((acc, r) => acc + Number(r.total), 0);
    const ventasSubtotal = remisiones.reduce((acc, r) => acc + Number(r.subtotal), 0);
    const numRemisiones = remisiones.length;

    let costoVendido = 0;
    const remisionIds = remisiones.map((r) => r.id);
    if (remisionIds.length > 0) {
      const { data: rollosVendidosData, error: errorRollos } = await this.supabase.client
        .from('remision_rollos')
        .select('metros, tela:telas(precio_costo)')
        .in('remision_id', remisionIds);
      if (errorRollos) throw errorRollos;
      const rollosVendidos = (rollosVendidosData ?? []) as unknown as RolloConCosto[];
      costoVendido = rollosVendidos.reduce(
        (acc, r) => acc + Number(r.metros) * Number(r.tela?.precio_costo ?? 0),
        0
      );
    }

    const utilidadBruta = ventasSubtotal - costoVendido;
    const margenPct = ventasSubtotal > 0 ? (utilidadBruta / ventasSubtotal) * 100 : 0;

    const { data: rollosDispData, error: errorDisp } = await this.supabase.client
      .from('rollos')
      .select('metros, tela:telas(precio_costo)')
      .eq('estado', 'disponible');
    if (errorDisp) throw errorDisp;
    const rollosDisp = (rollosDispData ?? []) as unknown as RolloConCosto[];
    const metrosInventario = rollosDisp.reduce((acc, r) => acc + Number(r.metros), 0);
    const costoInventario = rollosDisp.reduce(
      (acc, r) => acc + Number(r.metros) * Number(r.tela?.precio_costo ?? 0),
      0
    );

    const { data: saldosData, error: errorSaldos } = await this.supabase.client.rpc(
      'saldos_clientes'
    );
    if (errorSaldos) throw errorSaldos;
    const saldos = (saldosData ?? []) as SaldoCliente[];
    const totalPorCobrar = saldos.reduce((acc, s) => acc + Math.max(0, Number(s.saldo)), 0);
    const clientesConSaldo = saldos.filter((s) => Number(s.saldo) > 0).length;

    return {
      ventasTotal,
      ventasSubtotal,
      numRemisiones,
      costoVendido,
      utilidadBruta,
      margenPct,
      metrosInventario,
      costoInventario,
      totalPorCobrar,
      clientesConSaldo
    };
  }
}
