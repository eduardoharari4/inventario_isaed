export type Rol = 'admin' | 'vendedor';
export type EstadoRollo = 'disponible' | 'vendido';
export type EstadoRemision = 'activa' | 'cancelada';

export interface Profile {
  id: string;
  nombre: string;
  rol: Rol;
  created_at: string;
}

export interface Invitacion {
  email: string;
  rol: Rol;
  invitado_por: string | null;
  created_at: string;
}

export interface Empresa {
  id: true;
  nombre: string;
  rfc: string;
  direccion: string;
  telefono: string;
}

export interface Tela {
  id: number;
  nombre: string;
  composicion: string;
  precio_costo: number;
  activo: boolean;
  created_at: string;
}

export interface Rollo {
  id: number;
  tela_id: number;
  metros: number;
  estado: EstadoRollo;
  created_at: string;
}

export interface Cliente {
  id: number;
  nombre: string;
  domicilio: string;
  ciudad: string;
  telefono: string;
  email: string;
  activo: boolean;
  created_at: string;
}

export interface Remision {
  id: number;
  folio: number;
  cliente_id: number;
  usuario_id: string;
  fecha: string;
  condiciones: string;
  subtotal: number;
  iva: number;
  total: number;
  estado: EstadoRemision;
  created_at: string;
}

export interface RemisionRollo {
  id: number;
  remision_id: number;
  rollo_id: number;
  tela_id: number;
  metros: number;
  precio_metro: number;
  importe: number;
}

export interface Pago {
  id: number;
  cliente_id: number;
  monto: number;
  fecha: string;
  forma_pago: string;
  nota: string;
  usuario_id: string;
  created_at: string;
}

/** Deuda de un cliente sin nota de remisión (saldo previo, ajuste manual). */
export interface CargoManual {
  id: number;
  cliente_id: number;
  monto: number;
  concepto: string;
  fecha: string;
  usuario_id: string;
  created_at: string;
}

export interface SaldoCliente {
  cliente_id: number;
  nombre: string;
  total_cargos: number;
  total_pagos: number;
  saldo: number;
}

/** Línea agrupada por tela, para mostrar/imprimir una remisión al estilo del papel. */
export interface RemisionConceptoLinea {
  tela_id: number;
  nombre_tela: string;
  metros: number;
  precio_metro: number;
  importe: number;
}
