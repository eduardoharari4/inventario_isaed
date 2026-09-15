-- =====================================================================
-- Migración: color de tela, fecha editable al crear una remisión, y el
-- saldo del cliente ya NO incluye IVA (solo el subtotal).
-- Corre esto UNA VEZ en el SQL Editor.
-- =====================================================================

alter table public.telas add column if not exists color text not null default '';

-- crear_remision ahora acepta la fecha (por defecto hoy, si no se manda).
create or replace function public.crear_remision(
  p_cliente_id bigint,
  p_condiciones text,
  p_items jsonb,
  p_fecha date default current_date
)
returns bigint
language plpgsql
security definer set search_path = public
as $$
declare
  v_subtotal numeric(10, 2);
  v_iva numeric(10, 2);
  v_total numeric(10, 2);
  v_remision_id bigint;
  v_no_disponibles int;
  v_rollo_ids bigint[];
begin
  select array_agg((item ->> 'rollo_id')::bigint)
  into v_rollo_ids
  from jsonb_array_elements(p_items) as item;

  if v_rollo_ids is null or array_length(v_rollo_ids, 1) is null then
    raise exception 'Debe incluir al menos un rollo';
  end if;

  select count(*) into v_no_disponibles
  from public.rollos
  where id = any(v_rollo_ids) and estado <> 'disponible';

  if v_no_disponibles > 0 then
    raise exception 'Uno o más rollos ya no están disponibles';
  end if;

  select round(sum(r.metros * (item ->> 'precio_venta')::numeric), 2)
  into v_subtotal
  from jsonb_array_elements(p_items) as item
  join public.rollos r on r.id = (item ->> 'rollo_id')::bigint;

  v_iva := round(v_subtotal * 0.16, 2);
  v_total := v_subtotal + v_iva;

  insert into public.remisiones (cliente_id, usuario_id, condiciones, subtotal, iva, total, fecha)
  values (
    p_cliente_id,
    auth.uid(),
    coalesce(p_condiciones, ''),
    v_subtotal,
    v_iva,
    v_total,
    coalesce(p_fecha, current_date)
  )
  returning id into v_remision_id;

  insert into public.remision_rollos (remision_id, rollo_id, tela_id, metros, precio_metro, importe)
  select
    v_remision_id,
    r.id,
    r.tela_id,
    r.metros,
    (item ->> 'precio_venta')::numeric,
    round(r.metros * (item ->> 'precio_venta')::numeric, 2)
  from jsonb_array_elements(p_items) as item
  join public.rollos r on r.id = (item ->> 'rollo_id')::bigint;

  update public.rollos
  set estado = 'vendido'
  where id = any(v_rollo_ids);

  return v_remision_id;
end;
$$;

-- saldos_clientes: el cargo de una remisión ahora es su SUBTOTAL (sin
-- IVA), no el total.
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
    select rem.cliente_id, sum(rem.subtotal) as total_cargos
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
