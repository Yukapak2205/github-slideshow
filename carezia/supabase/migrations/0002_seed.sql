-- =============================================================
-- Carezia · datos iniciales
-- Todo esto es editable desde /admin. Sirve para que la web
-- arranque con contenido real en vez de pantallas vacías.
-- =============================================================

insert into settings (key, value, description) values
  ('business', jsonb_build_object(
      'name', 'Carezia',
      'tagline', 'Estética consciente',
      'email', 'hola@carezia.cl',
      'phone', '+56 9 0000 0000',
      'instagram', 'carezia.cl',
      'whatsapp', '+56900000000',
      'currency', 'CLP',
      'timezone', 'America/Santiago'
   ), 'Datos de contacto y moneda'),

  ('booking', jsonb_build_object(
      'slot_interval_min', 15,        -- cada cuánto se ofrecen horas
      'min_lead_hours', 2,            -- anticipación mínima para reservar
      'max_advance_days', 60,         -- hasta cuándo se abre la agenda
      'cancel_window_hours', 24,      -- hasta cuándo se puede cancelar sin costo
      'require_account', false,       -- permitir reservar como invitado
      'auto_confirm', true            -- confirmar sin revisión manual
   ), 'Reglas del motor de agendamiento'),

  ('home', jsonb_build_object(
      'hero_title', 'Tu piel, con tiempo y criterio',
      'hero_subtitle', 'Tratamientos faciales y corporales diseñados uno a uno. Sin apuro, sin promesas imposibles.',
      'hero_cta', 'Reservar hora',
      'about_title', 'Qué hacemos distinto',
      'about_body', 'Cada sesión parte con una evaluación real de tu piel. Trabajamos con protocolos progresivos, activos de grado profesional y un plan que se ajusta contigo. Nada de recetas genéricas.',
      'values', jsonb_build_array(
        jsonb_build_object('title', 'Diagnóstico primero', 'body', 'Ninguna sesión empieza sin entender qué necesita tu piel hoy.'),
        jsonb_build_object('title', 'Progresión real', 'body', 'Resultados construidos por capas, no por milagros de una sesión.'),
        jsonb_build_object('title', 'Transparencia total', 'body', 'Precios claros, duraciones reales y lo que sí y no podemos lograr.')
      )
   ), 'Textos de la portada');

-- ---------- sucursal ----------
insert into locations (id, name, slug, address, city, phone, timezone, sort_order) values
  ('11111111-1111-1111-1111-111111111111', 'Carezia Providencia', 'providencia',
   'Av. Providencia 1234, of. 502', 'Santiago', '+56 9 0000 0000', 'America/Santiago', 1);

-- ---------- categorías ----------
insert into service_categories (id, name, slug, description, sort_order) values
  ('21111111-1111-1111-1111-111111111111', 'Facial', 'facial',
   'Limpiezas, hidratación profunda y protocolos de renovación celular.', 1),
  ('22222222-2222-2222-2222-222222222222', 'Corporal', 'corporal',
   'Drenaje, reductivos y cuidado de la piel del cuerpo.', 2),
  ('23333333-3333-3333-3333-333333333333', 'Cejas y pestañas', 'cejas-pestanas',
   'Diseño de mirada con técnicas de baja intervención.', 3);

-- ---------- servicios ----------
insert into services (id, category_id, name, slug, description, price_amount, duration_min, buffer_min, deposit_amount, is_featured, sort_order) values
  ('31111111-1111-1111-1111-111111111111', '21111111-1111-1111-1111-111111111111',
   'Limpieza facial profunda', 'limpieza-facial-profunda',
   'Higiene, extracción y calma. La base de cualquier plan facial.',
   45000, 75, 15, 15000, true, 1),

  ('32222222-2222-2222-2222-222222222222', '21111111-1111-1111-1111-111111111111',
   'Hidratación con ácido hialurónico', 'hidratacion-acido-hialuronico',
   'Reposición de agua y barrera cutánea para pieles deshidratadas.',
   52000, 60, 15, 15000, true, 2),

  ('33333333-3333-3333-3333-333333333333', '21111111-1111-1111-1111-111111111111',
   'Peeling de renovación', 'peeling-renovacion',
   'Exfoliación química controlada para textura, manchas y marcas.',
   68000, 60, 15, 20000, false, 3),

  ('34444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222',
   'Drenaje linfático manual', 'drenaje-linfatico',
   'Técnica manual para retención de líquidos y post operatorio.',
   38000, 60, 10, 0, true, 4),

  ('35555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222',
   'Masaje reductivo', 'masaje-reductivo',
   'Trabajo profundo sobre tejido adiposo localizado.',
   42000, 60, 10, 0, false, 5),

  ('36666666-6666-6666-6666-666666666666', '23333333-3333-3333-3333-333333333333',
   'Diseño y perfilado de cejas', 'diseno-cejas',
   'Medición, depilación y corrección según tu estructura facial.',
   18000, 30, 5, 0, false, 6),

  ('37777777-7777-7777-7777-777777777777', '23333333-3333-3333-3333-333333333333',
   'Lifting de pestañas', 'lifting-pestanas',
   'Curvatura natural y duradera sin extensiones.',
   32000, 60, 10, 0, false, 7);

-- ---------- equipo ----------
insert into staff (id, display_name, title, bio, sort_order) values
  ('41111111-1111-1111-1111-111111111111', 'Valentina Rojas', 'Cosmetóloga · Directora técnica',
   'Diez años de práctica clínica en estética facial. Especialista en pieles reactivas.', 1),
  ('42222222-2222-2222-2222-222222222222', 'Camila Soto', 'Cosmetóloga corporal',
   'Formada en drenaje linfático método Vodder y terapias post quirúrgicas.', 2);

insert into staff_locations (staff_id, location_id) values
  ('41111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111'),
  ('42222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111');

-- Valentina: faciales + cejas · Camila: corporal + cejas
insert into staff_services (staff_id, service_id)
select '41111111-1111-1111-1111-111111111111', id from services
  where slug in ('limpieza-facial-profunda','hidratacion-acido-hialuronico','peeling-renovacion','diseno-cejas','lifting-pestanas');
insert into staff_services (staff_id, service_id)
select '42222222-2222-2222-2222-222222222222', id from services
  where slug in ('drenaje-linfatico','masaje-reductivo','diseno-cejas');

-- ---------- horarios (lunes a viernes 10-19, sábado 10-14) ----------
insert into work_shifts (staff_id, location_id, weekday, start_time, end_time)
select s.id, '11111111-1111-1111-1111-111111111111', d, '10:00', '19:00'
from staff s, generate_series(1, 5) d;

insert into work_shifts (staff_id, location_id, weekday, start_time, end_time)
select s.id, '11111111-1111-1111-1111-111111111111', 6, '10:00', '14:00'
from staff s;

-- ---------- paquetes ----------
insert into packages (id, name, slug, description, price_amount, sessions_count, validity_days, is_featured, sort_order) values
  ('51111111-1111-1111-1111-111111111111', 'Plan Piel Limpia · 4 sesiones', 'plan-piel-limpia',
   'Cuatro limpiezas faciales profundas para instalar el hábito. Vigencia 6 meses.',
   160000, 4, 180, true, 1),
  ('52222222-2222-2222-2222-222222222222', 'Plan Hidratación · 6 sesiones', 'plan-hidratacion',
   'Seis sesiones de hidratación profunda con seguimiento de barrera cutánea.',
   264000, 6, 240, true, 2),
  ('53333333-3333-3333-3333-333333333333', 'Plan Corporal · 10 sesiones', 'plan-corporal',
   'Diez sesiones combinables entre drenaje linfático y masaje reductivo.',
   340000, 10, 180, true, 3);

insert into package_services (package_id, service_id)
select '51111111-1111-1111-1111-111111111111', id from services where slug = 'limpieza-facial-profunda';
insert into package_services (package_id, service_id)
select '52222222-2222-2222-2222-222222222222', id from services where slug = 'hidratacion-acido-hialuronico';
insert into package_services (package_id, service_id)
select '53333333-3333-3333-3333-333333333333', id from services where slug in ('drenaje-linfatico','masaje-reductivo');
