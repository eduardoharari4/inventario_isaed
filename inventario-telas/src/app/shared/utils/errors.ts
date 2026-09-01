/** Traduce errores comunes de Postgres/Supabase a un mensaje entendible. */
export function mensajeError(e: unknown, contexto = 'este registro'): string {
  const err = e as { code?: string; message?: string } | null;
  if (err?.code === '23503') {
    return `No se puede eliminar ${contexto}: tiene datos relacionados (remisiones, rollos o pagos).`;
  }
  if (e instanceof Error) return e.message;
  return err?.message ?? 'Ocurrió un error';
}
