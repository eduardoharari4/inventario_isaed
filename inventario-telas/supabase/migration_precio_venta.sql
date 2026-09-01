-- =====================================================================
-- Migración: precio de costo (en la tela) vs. precio de venta (por
-- remisión, decidido al momento de vender, puede variar por cliente).
-- Corre esto UNA VEZ en el SQL Editor.
-- =====================================================================

-- La tela ahora guarda el COSTO por metro, no el precio de venta.
alter table public.telas rename column precio_metro to precio_costo;

-- crear_remision ahora recibe el precio de venta por rollo (decidido en
-- el momento, no viene de la tela). p_items es un arreglo jsonb:
-- [{"rollo_id": 1, "precio_venta": 30.5}, ...]
create or replace function public.crear_remision(
  p_cliente_id bigint,
  p_condiciones text,
  p_items jsonb
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

  insert into public.remisiones (cliente_id, usuario_id, condiciones, subtotal, iva, total)
  values (p_cliente_id, auth.uid(), coalesce(p_condiciones, ''), v_subtotal, v_iva, v_total)
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

notify pgrst, 'reload schema';
