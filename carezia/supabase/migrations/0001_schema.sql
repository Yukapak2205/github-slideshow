-- =============================================================
-- Carezia · esquema base
-- Todo el contenido operativo (servicios, precios, paquetes,
-- horarios, textos de marca) vive en tablas para que sea
-- editable desde el panel de administración sin tocar código.
-- =============================================================

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- ---------- enums ----------
create type user_role as enum ('client', 'staff', 'admin');
create type appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'no_show');
create type payment_status as enum ('unpaid', 'pending', 'paid', 'refunded', 'failed');
create type payment_provider as enum ('stripe', 'mercadopago', 'manual');
create type payment_kind as enum ('appointment', 'package');
create type purchase_status as enum ('pending', 'active', 'used', 'expired', 'cancelled');

-- ---------- utilidades ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================
-- Perfiles
-- =============================================================
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  email       text,
  phone       text,
  role        user_role not null default 'client',
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('staff', 'admin')
  );
$$;

-- =============================================================
-- Sucursales
-- =============================================================
create table locations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  address     text,
  city        text,
  phone       text,
  timezone    text not null default 'America/Santiago',
  map_url     text,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger locations_updated_at before update on locations
  for each row execute function set_updated_at();

-- =============================================================
-- Catálogo de servicios
-- =============================================================
create table service_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  image_url   text,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger service_categories_updated_at before update on service_categories
  for each row execute function set_updated_at();

create table services (
  id              uuid primary key default gen_random_uuid(),
  category_id     uuid references service_categories(id) on delete set null,
  name            text not null,
  slug            text not null unique,
  description     text,
  -- precio en la unidad mínima de la moneda (CLP: pesos enteros)
  price_amount    int not null check (price_amount >= 0),
  duration_min    int not null check (duration_min > 0),
  -- minutos de limpieza/preparación reservados después de la sesión
  buffer_min      int not null default 0 check (buffer_min >= 0),
  -- abono requerido para confirmar la reserva (0 = no requiere)
  deposit_amount  int not null default 0 check (deposit_amount >= 0),
  image_url       text,
  is_active       boolean not null default true,
  is_featured     boolean not null default false,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger services_updated_at before update on services
  for each row execute function set_updated_at();
create index services_category_idx on services(category_id) where is_active;

-- =============================================================
-- Equipo y disponibilidad
-- =============================================================
create table staff (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid unique references profiles(id) on delete set null,
  display_name text not null,
  title        text,
  bio          text,
  avatar_url   text,
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger staff_updated_at before update on staff
  for each row execute function set_updated_at();

create table staff_services (
  staff_id   uuid not null references staff(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  primary key (staff_id, service_id)
);

create table staff_locations (
  staff_id    uuid not null references staff(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  primary key (staff_id, location_id)
);

-- Horario semanal recurrente. weekday: 0 = domingo … 6 = sábado
create table work_shifts (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid not null references staff(id) on delete cascade,
  location_id uuid not null references locations(id) on delete cascade,
  weekday     smallint not null check (weekday between 0 and 6),
  start_time  time not null,
  end_time    time not null,
  created_at  timestamptz not null default now(),
  check (end_time > start_time)
);
create index work_shifts_staff_idx on work_shifts(staff_id, weekday);

-- Bloqueos puntuales: vacaciones, colación, feriados
create table time_off (
  id         uuid primary key default gen_random_uuid(),
  staff_id   uuid references staff(id) on delete cascade, -- null = cierre de todo el local
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  reason     text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index time_off_range_idx on time_off using gist (tstzrange(starts_at, ends_at));

-- =============================================================
-- Paquetes de sesiones
-- =============================================================
create table packages (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  slug           text not null unique,
  description    text,
  price_amount   int not null check (price_amount >= 0),
  sessions_count int not null check (sessions_count > 0),
  -- días de vigencia desde la compra; null = sin vencimiento
  validity_days  int check (validity_days is null or validity_days > 0),
  image_url      text,
  is_active      boolean not null default true,
  is_featured    boolean not null default false,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger packages_updated_at before update on packages
  for each row execute function set_updated_at();

-- Servicios que el paquete permite canjear
create table package_services (
  package_id uuid not null references packages(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  primary key (package_id, service_id)
);

create table package_purchases (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references profiles(id) on delete cascade,
  package_id     uuid not null references packages(id) on delete restrict,
  -- copia inmutable de las condiciones al momento de comprar:
  -- si mañana cambia el precio o el número de sesiones, la compra no se altera
  package_name   text not null,
  price_amount   int not null,
  sessions_total int not null check (sessions_total > 0),
  sessions_used  int not null default 0 check (sessions_used >= 0),
  status         purchase_status not null default 'pending',
  purchased_at   timestamptz not null default now(),
  expires_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (sessions_used <= sessions_total)
);
create trigger package_purchases_updated_at before update on package_purchases
  for each row execute function set_updated_at();
create index package_purchases_client_idx on package_purchases(client_id, status);

-- =============================================================
-- Citas
-- =============================================================
create table appointments (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid references profiles(id) on delete set null,
  staff_id       uuid not null references staff(id) on delete restrict,
  service_id     uuid not null references services(id) on delete restrict,
  location_id    uuid not null references locations(id) on delete restrict,
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  -- fin del bloqueo de agenda (ends_at + buffer del servicio)
  blocked_until  timestamptz not null,
  status         appointment_status not null default 'pending',
  payment_status payment_status not null default 'unpaid',
  -- precio congelado al momento de reservar
  price_amount   int not null default 0,
  -- si la cita se pagó con crédito de un paquete
  purchase_id    uuid references package_purchases(id) on delete set null,
  -- datos de contacto para reservas sin cuenta
  guest_name     text,
  guest_email    text,
  guest_phone    text,
  client_notes   text,
  staff_notes    text,
  cancelled_at   timestamptz,
  cancel_reason  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (ends_at > starts_at),
  check (blocked_until >= ends_at)
);
create trigger appointments_updated_at before update on appointments
  for each row execute function set_updated_at();
create index appointments_staff_time_idx on appointments(staff_id, starts_at);
create index appointments_client_idx on appointments(client_id, starts_at desc);

-- Regla dura anti-sobreventa: un/a profesional no puede tener dos
-- bloques activos solapados. Se evalúa dentro de la base de datos,
-- así que ni una condición de carrera puede duplicar una hora.
alter table appointments add constraint appointments_no_overlap
  exclude using gist (
    staff_id with =,
    tstzrange(starts_at, blocked_until, '[)') with &&
  ) where (status in ('pending', 'confirmed', 'completed'));

-- =============================================================
-- Pagos
-- =============================================================
create table payments (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid references profiles(id) on delete set null,
  kind           payment_kind not null,
  appointment_id uuid references appointments(id) on delete set null,
  purchase_id    uuid references package_purchases(id) on delete set null,
  provider       payment_provider not null,
  provider_ref   text,
  amount         int not null check (amount >= 0),
  currency       text not null default 'CLP',
  status         payment_status not null default 'pending',
  raw_payload    jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger payments_updated_at before update on payments
  for each row execute function set_updated_at();
create unique index payments_provider_ref_idx
  on payments(provider, provider_ref) where provider_ref is not null;

-- =============================================================
-- Ajustes generales y contenido de marca (editable en el panel)
-- =============================================================
create table settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_at  timestamptz not null default now()
);
create trigger settings_updated_at before update on settings
  for each row execute function set_updated_at();

-- =============================================================
-- Canje de crédito de paquete (atómico)
-- =============================================================
create or replace function redeem_package_credit(p_purchase_id uuid, p_appointment_id uuid)
returns package_purchases language plpgsql security definer set search_path = public as $$
declare
  v_purchase package_purchases;
begin
  select * into v_purchase from package_purchases
    where id = p_purchase_id for update;

  if not found then
    raise exception 'PACKAGE_NOT_FOUND';
  end if;
  if v_purchase.status <> 'active' then
    raise exception 'PACKAGE_NOT_ACTIVE';
  end if;
  if v_purchase.expires_at is not null and v_purchase.expires_at < now() then
    update package_purchases set status = 'expired' where id = p_purchase_id;
    raise exception 'PACKAGE_EXPIRED';
  end if;
  if v_purchase.sessions_used >= v_purchase.sessions_total then
    update package_purchases set status = 'used' where id = p_purchase_id;
    raise exception 'PACKAGE_EXHAUSTED';
  end if;

  update package_purchases
     set sessions_used = sessions_used + 1,
         status = case when sessions_used + 1 >= sessions_total then 'used' else 'active' end
   where id = p_purchase_id
   returning * into v_purchase;

  update appointments
     set purchase_id = p_purchase_id,
         payment_status = 'paid',
         price_amount = 0
   where id = p_appointment_id;

  return v_purchase;
end;
$$;

-- Devuelve el crédito cuando la cita se cancela a tiempo
create or replace function refund_package_credit(p_appointment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_purchase_id uuid;
begin
  select purchase_id into v_purchase_id from appointments where id = p_appointment_id;
  if v_purchase_id is null then
    return;
  end if;

  update package_purchases
     set sessions_used = greatest(sessions_used - 1, 0),
         status = case
                    when expires_at is not null and expires_at < now() then 'expired'
                    else 'active'
                  end
   where id = v_purchase_id;

  update appointments set purchase_id = null where id = p_appointment_id;
end;
$$;

-- =============================================================
-- RLS
-- =============================================================
alter table profiles            enable row level security;
alter table locations           enable row level security;
alter table service_categories  enable row level security;
alter table services            enable row level security;
alter table staff               enable row level security;
alter table staff_services      enable row level security;
alter table staff_locations     enable row level security;
alter table work_shifts         enable row level security;
alter table time_off            enable row level security;
alter table packages            enable row level security;
alter table package_services    enable row level security;
alter table package_purchases   enable row level security;
alter table appointments        enable row level security;
alter table payments            enable row level security;
alter table settings            enable row level security;

-- Catálogo público: cualquiera lee lo activo, sólo admin escribe.
create policy "catálogo público" on locations for select using (is_active or is_staff());
create policy "catálogo admin"   on locations for all using (is_admin()) with check (is_admin());

create policy "categorías públicas" on service_categories for select using (is_active or is_staff());
create policy "categorías admin"    on service_categories for all using (is_admin()) with check (is_admin());

create policy "servicios públicos" on services for select using (is_active or is_staff());
create policy "servicios admin"    on services for all using (is_admin()) with check (is_admin());

create policy "equipo público" on staff for select using (is_active or is_staff());
create policy "equipo admin"   on staff for all using (is_admin()) with check (is_admin());

create policy "staff_services público" on staff_services for select using (true);
create policy "staff_services admin"   on staff_services for all using (is_admin()) with check (is_admin());

create policy "staff_locations público" on staff_locations for select using (true);
create policy "staff_locations admin"   on staff_locations for all using (is_admin()) with check (is_admin());

create policy "turnos públicos" on work_shifts for select using (true);
create policy "turnos admin"    on work_shifts for all using (is_admin()) with check (is_admin());

create policy "bloqueos públicos" on time_off for select using (true);
create policy "bloqueos staff"    on time_off for all using (is_staff()) with check (is_staff());

create policy "paquetes públicos" on packages for select using (is_active or is_staff());
create policy "paquetes admin"    on packages for all using (is_admin()) with check (is_admin());

create policy "package_services público" on package_services for select using (true);
create policy "package_services admin"   on package_services for all using (is_admin()) with check (is_admin());

create policy "ajustes públicos" on settings for select using (true);
create policy "ajustes admin"    on settings for all using (is_admin()) with check (is_admin());

-- Datos personales
create policy "perfil propio" on profiles for select
  using (id = auth.uid() or is_staff());
create policy "editar perfil propio" on profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));
create policy "perfiles admin" on profiles for all
  using (is_admin()) with check (is_admin());

create policy "compras propias" on package_purchases for select
  using (client_id = auth.uid() or is_staff());
create policy "compras staff" on package_purchases for all
  using (is_staff()) with check (is_staff());

create policy "citas propias" on appointments for select
  using (client_id = auth.uid() or is_staff());
create policy "cancelar cita propia" on appointments for update
  using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy "citas staff" on appointments for all
  using (is_staff()) with check (is_staff());

create policy "pagos propios" on payments for select
  using (client_id = auth.uid() or is_staff());
create policy "pagos staff" on payments for all
  using (is_staff()) with check (is_staff());
