/** Redondea a máximo 2 decimales (metros, precios, montos) evitando errores de punto flotante. */
export function redondear2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}
