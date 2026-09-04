-- =====================================================================
-- Esquema de base de datos: Inventario de Telas
-- Ejecutar completo en: Supabase Dashboard > SQL Editor > New query > Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.rol_usuario as enum ('admin', 'vendedor');
create type public.estado_rollo as enum ('disponible', 'vendido');
create type public.estado_remision as enum ('activa', 'cancelada');

-- ---------------------------------------------------------------------
-- Tabla: profiles (perfil de cada usuario autenticado, con su rol)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  rol public.rol_usuario not null default 'vendedor',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Tabla: invitaciones (empresa privada: solo un correo pre-invitado por
-- un admin puede completar el registro; ver trigger handle_new_user)
-- ---------------------------------------------------------------------
create table public.invitaciones (
  email text primary key,
  rol public.rol_usuario not null default 'vendedor',
  invitado_por uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- Crea el perfil automáticamente cuando alguien se registra, PERO solo si
-- su correo fue invitado antes por un admin (si no, aborta el registro).
create function public.handle_new_user()
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Función auxiliar: ¿el usuario que ejecuta la consulta es admin?
create function public.es_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and rol = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- Tabla: empresa (una sola fila, datos del membrete para imprimir)
-- ---------------------------------------------------------------------
create table public.empresa (
  id boolean primary key default true constraint empresa_singleton check (id),
  nombre text not null default '',
  rfc text not null default '',
  direccion text not null default '',
  telefono text not null default ''
);

insert into public.empresa (id) values (true);

-- ---------------------------------------------------------------------
-- Tabla: telas
-- ---------------------------------------------------------------------
create table public.telas (
  id bigint generated always as identity primary key,
  nombre text not null,
  composicion text not null default '',
  precio_costo numeric(10, 2) not null check (precio_costo >= 0),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Tabla: rollos (unidad individual de inventario; metraje propio, sin clave manual)
-- ---------------------------------------------------------------------
create table public.rollos (
  id bigint generated always as identity primary key,
  tela_id bigint not null references public.telas (id) on delete cascade,
  metros numeric(10, 2) not null check (metros > 0),
  estado public.estado_rollo not null default 'disponible',
  created_at timestamptz not null default now()
);

create index rollos_tela_id_idx on public.rollos (tela_id);
create index rollos_disponibles_idx on public.rollos (tela_id) where estado = 'disponible';

-- ---------------------------------------------------------------------
-- Tabla: clientes
-- ---------------------------------------------------------------------
create table public.clientes (
  id bigint generated always as identity primary key,
  nombre text not null,
  domicilio text not null default '',
  ciudad text not null default '',
  telefono text not null default '',
  email text not null default '',
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Folio consecutivo de remisiones
-- ---------------------------------------------------------------------
create sequence public.remisiones_folio_seq start 1;

-- ---------------------------------------------------------------------
-- Tabla: remisiones (= la venta; folio, cliente, totales con IVA 16%)
-- ---------------------------------------------------------------------
create table public.remisiones (
  id bigint generated always as identity primary key,
  folio integer not null default nextval('public.remisiones_folio_seq'),
  cliente_id bigint not null references public.clientes (id) on delete restrict,
  usuario_id uuid not null references public.profiles (id),
  fecha date not null default current_date,
  condiciones text not null default '',
  subtotal numeric(10, 2) not null,
  iva numeric(10, 2) not null,
  total numeric(10, 2) not null,
  estado public.estado_remision not null default 'activa',
  created_at timestamptz not null default now()
);

create index remisiones_cliente_id_idx on public.remisiones (cliente_id);

-- ---------------------------------------------------------------------
-- Tabla: remision_rollos (un renglón por rollo realmente vendido;
-- se agrupan por tela_id al mostrar/imprimir para armar la línea
-- "Cant. | Concepto | Precio | Importe" del formato de papel)
-- ---------------------------------------------------------------------
create table public.remision_rollos (
  id bigint generated always as identity primary key,
  remision_id bigint not null references public.remisiones (id) on delete cascade,
  rollo_id bigint not null references public.rollos (id),
  tela_id bigint not null references public.telas (id),
  metros numeric(10, 2) not null,
  precio_metro numeric(10, 2) not null,
  importe numeric(10, 2) not null
);

create index remision_rollos_remision_id_idx on public.remision_rollos (remision_id);

-- ---------------------------------------------------------------------
-- Tabla: pagos (abonos de clientes)
-- ---------------------------------------------------------------------
create table public.pagos (
  id bigint generated always as identity primary key,
  cliente_id bigint not null references public.clientes (id) on delete restrict,
  monto numeric(10, 2) not null check (monto > 0),
  fecha date not null default current_date,
  forma_pago text not null default '',
  nota text not null default '',
  usuario_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index pagos_cliente_id_idx on public.pagos (cliente_id);

-- ---------------------------------------------------------------------
-- Tabla: cargos_manuales (deuda de un cliente sin nota de remisión, ej.
-- saldo previo a usar el sistema, o un ajuste manual)
-- ---------------------------------------------------------------------
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

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.invitaciones enable row level security;
alter table public.empresa enable row level security;
alter table public.telas enable row level security;
alter table public.rollos enable row level security;
alter table public.clientes enable row level security;
alter table public.remisiones enable row level security;
alter table public.remision_rollos enable row level security;
alter table public.pagos enable row level security;
alter table public.cargos_manuales enable row level security;

-- profiles: cada quien ve su propio perfil; admin ve todos y puede
-- cambiar el rol de cualquiera (ej. promover a alguien a admin).
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.es_admin());

create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.es_admin())
  with check (public.es_admin());

-- invitaciones: solo admin las ve y las crea/borra. El trigger de registro
-- las consulta con SECURITY DEFINER, así que esto no bloquea el registro.
create policy invitaciones_all on public.invitaciones
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- empresa: cualquier autenticado lee (para imprimir); solo admin edita.
create policy empresa_select on public.empresa
  for select to authenticated using (true);
create policy empresa_update on public.empresa
  for update to authenticated using (public.es_admin());

-- telas / rollos / clientes: cualquier autenticado puede LEER (lo
-- necesita el flujo de crear remisión), pero solo admin puede crear,
-- editar o borrar — un vendedor solo hace remisiones, nada más.
create policy telas_select on public.telas
  for select to authenticated using (true);
create policy telas_admin_write on public.telas
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

create policy rollos_select on public.rollos
  for select to authenticated using (true);
create policy rollos_admin_write on public.rollos
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

create policy clientes_select on public.clientes
  for select to authenticated using (true);
create policy clientes_admin_write on public.clientes
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

-- remisiones / remision_rollos: cualquier autenticado lee y crea;
-- solo admin puede cambiar el estado (cancelar).
create policy remisiones_select on public.remisiones
  for select to authenticated using (true);
create policy remisiones_insert on public.remisiones
  for insert to authenticated with check (true);
create policy remisiones_update on public.remisiones
  for update to authenticated using (public.es_admin());

create policy remision_rollos_select on public.remision_rollos
  for select to authenticated using (true);
create policy remision_rollos_insert on public.remision_rollos
  for insert to authenticated with check (true);

-- pagos: SOLO admin (saldos de clientes son confidenciales para vendedor).
create policy pagos_select on public.pagos
  for select to authenticated using (public.es_admin());
create policy pagos_insert on public.pagos
  for insert to authenticated with check (public.es_admin());
create policy pagos_delete on public.pagos
  for delete to authenticated using (public.es_admin());

-- cargos_manuales: solo admin (igual que pagos).
create policy cargos_manuales_select on public.cargos_manuales
  for select to authenticated using (public.es_admin());
create policy cargos_manuales_insert on public.cargos_manuales
  for insert to authenticated with check (public.es_admin());
create policy cargos_manuales_delete on public.cargos_manuales
  for delete to authenticated using (public.es_admin());

-- Saldos por cliente: como `clientes` y `remisiones` son legibles por
-- cualquier usuario autenticado (se necesitan para operar remisiones),
-- la confidencialidad del SALDO (y de `pagos`) no puede depender de RLS
-- de tabla — se expone solo a través de esta función SECURITY DEFINER,
-- que valida el rol explícitamente antes de calcular y devolver algo.
create function public.saldos_clientes()
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

-- =====================================================================
-- Funciones RPC transaccionales
-- =====================================================================

-- crear_remision: valida disponibilidad, calcula subtotal/IVA/total con
-- el precio de VENTA que se decide en el momento (no el costo guardado
-- en la tela), inserta remisión + renglones por rollo, y marca los
-- rollos vendidos. Todo en una sola transacción (atómico).
-- p_items: jsonb [{"rollo_id": 1, "precio_venta": 30.5}, ...]
create function public.crear_remision(
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

-- cancelar_remision: revierte, regresa los rollos a disponible.
-- Solo admin: la función es SECURITY DEFINER (salta el RLS de la tabla
-- remisiones), así que la restricción de rol debe validarse aquí también.
create function public.cancelar_remision(p_remision_id bigint)
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

  update public.remisiones
  set estado = 'cancelada'
  where id = p_remision_id;
end;
$$;

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
