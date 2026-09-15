-- =====================================================================
-- Migración: el vendedor SÍ puede capturar inventario (crear/editar/
-- borrar telas y rollos), además de hacer remisiones. Clientes se queda
-- solo para admin (crear/editar/borrar) — vendedor solo lo lee, porque
-- lo necesita para elegir cliente al hacer una remisión.
-- Corre esto UNA VEZ en el SQL Editor.
-- =====================================================================

drop policy if exists telas_select on public.telas;
drop policy if exists telas_admin_write on public.telas;
create policy telas_all on public.telas
  for all to authenticated using (true) with check (true);

drop policy if exists rollos_select on public.rollos;
drop policy if exists rollos_admin_write on public.rollos;
create policy rollos_all on public.rollos
  for all to authenticated using (true) with check (true);

-- clientes queda igual (select para todos, escritura solo admin) — sin cambios.

notify pgrst, 'reload schema';
