-- =====================================================================
-- Migración: el rol "vendedor" solo puede crear/ver remisiones. Ya no
-- puede crear, editar ni borrar telas, rollos o clientes (sí puede
-- seguir LEYÉNDOLOS, porque el flujo de crear una remisión los necesita
-- para elegir cliente y rollos). Solo admin administra ese catálogo.
-- También ordena Saldos de clientes alfabéticamente.
-- Corre esto UNA VEZ en el SQL Editor.
-- =====================================================================

drop policy if exists telas_all on public.telas;
create policy telas_select on public.telas
  for select to authenticated using (true);
create policy telas_admin_write on public.telas
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

drop policy if exists rollos_all on public.rollos;
create policy rollos_select on public.rollos
  for select to authenticated using (true);
create policy rollos_admin_write on public.rollos
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

drop policy if exists clientes_all on public.clientes;
create policy clientes_select on public.clientes
  for select to authenticated using (true);
create policy clientes_admin_write on public.clientes
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- saldos_clientes ahora ordena por nombre.
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
  ) p on p.cliente_id = c.id
  order by c.nombre;
end;
$$;

notify pgrst, 'reload schema';
