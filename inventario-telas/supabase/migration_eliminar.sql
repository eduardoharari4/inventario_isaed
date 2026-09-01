-- =====================================================================
-- Migración: permitir borrar clientes, telas, rollos y remisiones
-- (para limpiar datos de prueba), protegiendo el historial real.
-- Corre esto UNA VEZ en el SQL Editor.
-- =====================================================================

-- Si una tela se borra, sus rollos se borran con ella — PERO si algún
-- rollo ya fue vendido (aparece en remision_rollos), ese rollo no se
-- puede borrar (FK de remision_rollos lo impide), así que el borrado de
-- la tela completa fallará con un error claro en ese caso: es la
-- protección correcta para no perder el historial de una venta real.
alter table public.rollos
  drop constraint rollos_tela_id_fkey,
  add constraint rollos_tela_id_fkey
    foreign key (tela_id) references public.telas (id) on delete cascade;

-- Permite borrar pagos (solo admin) — antes solo había select/insert.
create policy pagos_delete on public.pagos
  for delete to authenticated using (public.es_admin());

-- eliminar_remision: borra la remisión por completo (a diferencia de
-- cancelar_remision, que solo la marca como cancelada y la conserva
-- como historial). Regresa los rollos a "disponible" antes de borrar.
-- Solo admin.
create function public.eliminar_remision(p_remision_id bigint)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'No autorizado';
  end if;

  update public.rollos
  set estado = 'disponible'
  where id in (
    select rollo_id from public.remision_rollos where remision_id = p_remision_id
  );

  delete from public.remisiones where id = p_remision_id;
end;
$$;
