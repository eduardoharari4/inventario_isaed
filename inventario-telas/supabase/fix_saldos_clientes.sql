-- =====================================================================
-- Fix: "column reference cliente_id is ambiguous" (42702) en saldos_clientes()
-- Causa: el nombre de columna de salida `cliente_id` chocaba con la
-- columna `cliente_id` sin calificar dentro de las subconsultas.
-- Corre esto UNA VEZ en el SQL Editor.
-- =====================================================================

create or replace function public.saldos_clientes()
returns table (
  cliente_id bigint,
  nombre text,
  total_cargos numeric,
  total_pagos numeric,
  saldo numeric
)
language plpgsql
security definer set search_path = public
stable
as $$
begin
  if not public.es_admin() then
    raise exception 'No autorizado';
  end if;

  return query
  select
    c.id,
    c.nombre,
    coalesce(r.total_cargos, 0),
    coalesce(p.total_pagos, 0),
    coalesce(r.total_cargos, 0) - coalesce(p.total_pagos, 0)
  from public.clientes c
  left join (
    select rem.cliente_id, sum(rem.total) as total_cargos
    from public.remisiones rem
    where rem.estado = 'activa'
    group by rem.cliente_id
  ) r on r.cliente_id = c.id
  left join (
    select pag.cliente_id, sum(pag.monto) as total_pagos
    from public.pagos pag
    group by pag.cliente_id
  ) p on p.cliente_id = c.id;
end;
$$;
