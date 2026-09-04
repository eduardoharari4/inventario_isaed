-- =====================================================================
-- Migración: cargos manuales (deuda de un cliente sin necesidad de una
-- nota de remisión — ej. saldo previo al usar el sistema, un ajuste).
-- Corre esto UNA VEZ en el SQL Editor.
-- =====================================================================

create table public.cargos_manuales (
  id bigint generated always as identity primary key,
  cliente_id bigint not null references public.clientes (id) on delete cascade,
  monto numeric(10, 2) not null check (monto > 0),
  concepto text not null default '',
  fecha date not null default current_date,
  usuario_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index cargos_manuales_cliente_id_idx on public.cargos_manuales (cliente_id);

alter table public.cargos_manuales enable row level security;

create policy cargos_manuales_select on public.cargos_manuales
  for select to authenticated using (public.es_admin());
create policy cargos_manuales_insert on public.cargos_manuales
  for insert to authenticated with check (public.es_admin());
create policy cargos_manuales_delete on public.cargos_manuales
  for delete to authenticated using (public.es_admin());

-- saldos_clientes ahora también suma los cargos manuales.
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
    coalesce(r.total_cargos, 0) + coalesce(m.total_manual, 0),
    coalesce(p.total_pagos, 0),
    coalesce(r.total_cargos, 0) + coalesce(m.total_manual, 0) - coalesce(p.total_pagos, 0)
  from public.clientes c
  left join (
    select rem.cliente_id, sum(rem.total) as total_cargos
    from public.remisiones rem
    where rem.estado = 'activa'
    group by rem.cliente_id
  ) r on r.cliente_id = c.id
  left join (
    select cm.cliente_id, sum(cm.monto) as total_manual
    from public.cargos_manuales cm
    group by cm.cliente_id
  ) m on m.cliente_id = c.id
  left join (
    select pag.cliente_id, sum(pag.monto) as total_pagos
    from public.pagos pag
    group by pag.cliente_id
  ) p on p.cliente_id = c.id;
end;
$$;

notify pgrst, 'reload schema';
