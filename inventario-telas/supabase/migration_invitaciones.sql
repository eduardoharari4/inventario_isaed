-- =====================================================================
-- Migración: registro cerrado por invitación (empresa privada)
-- Corre esto UNA VEZ en el SQL Editor si ya habías corrido schema.sql
-- antes de que existiera esta migración. schema.sql ya la incluye para
-- instalaciones nuevas.
-- =====================================================================

create table if not exists public.invitaciones (
  email text primary key,
  rol public.rol_usuario not null default 'vendedor',
  invitado_por uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.invitaciones enable row level security;

drop policy if exists invitaciones_all on public.invitaciones;
create policy invitaciones_all on public.invitaciones
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_rol public.rol_usuario;
begin
  select rol into v_rol from public.invitaciones where email = new.email;

  if v_rol is null then
    raise exception 'Este correo no fue invitado por un administrador';
  end if;

  insert into public.profiles (id, nombre, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre', new.email),
    v_rol
  );

  delete from public.invitaciones where email = new.email;

  return new;
end;
$$;

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- Confirma manualmente tu cuenta ya creada (evita el error "Email not confirmed").
update auth.users
set email_confirmed_at = now()
where email = 'lhk68@hotmail.com' and email_confirmed_at is null;
