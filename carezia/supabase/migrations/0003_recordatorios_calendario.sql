-- =============================================================
-- Carezia · recordatorios y calendario
-- =============================================================

-- Marca de envío del recordatorio. Es lo que hace idempotente la tarea
-- programada: aunque se ejecute varias veces en la ventana, cada cita
-- recibe un solo correo.
alter table appointments
  add column if not exists reminder_sent_at timestamptz;

create index if not exists appointments_reminder_idx
  on appointments (starts_at)
  where reminder_sent_at is null and status in ('pending', 'confirmed');

-- Token del feed de calendario de cada profesional. Es un secreto: quien
-- tenga la URL ve su agenda, así que se puede rotar sin tocar nada más.
alter table staff
  add column if not exists calendar_token uuid not null default gen_random_uuid();

create unique index if not exists staff_calendar_token_idx on staff (calendar_token);

-- Sube con cada cambio de la cita para que el calendario suscrito sepa
-- cuál versión del evento manda.
alter table appointments
  add column if not exists calendar_sequence int not null default 0;

create or replace function bump_calendar_sequence()
returns trigger language plpgsql as $$
begin
  if new.starts_at is distinct from old.starts_at
     or new.ends_at is distinct from old.ends_at
     or new.status is distinct from old.status
     or new.staff_id is distinct from old.staff_id then
    new.calendar_sequence = old.calendar_sequence + 1;
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_calendar_sequence on appointments;
create trigger appointments_calendar_sequence
  before update on appointments
  for each row execute function bump_calendar_sequence();

-- Añade la ventana de recordatorio a los ajustes ya existentes sin pisar
-- el resto de la configuración.
update settings
   set value = value || jsonb_build_object('reminder_hours', 24)
 where key = 'booking'
   and not (value ? 'reminder_hours');
