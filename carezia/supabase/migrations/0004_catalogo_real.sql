-- =============================================================
-- Carezia · catálogo real
--
-- Generado desde la exportación de servicios del sistema anterior
-- (60 servicios, 11 categorías). Reemplaza los datos de ejemplo.
--
-- REVISAR ANTES DE PRODUCCIÓN:
--  · Dirección y teléfono de la sucursal (marcados como PENDIENTE).
--  · El equipo: hay un solo profesional genérico que puede todos los
--    servicios. Hay que reemplazarlo por las personas reales.
--  · Los 30 servicios que se venden por plan traen un precio por sesión
--    ESTIMADO, dividiendo el valor del plan entre sus sesiones. El plan
--    sí lleva el precio exacto de la planilla.
--  · Vigencia de los planes: quedó sin vencimiento por no tener el dato.
--  · Ningún servicio traía descripción en la exportación.
-- =============================================================

begin;

-- Se limpia el catálogo de ejemplo. No toca citas ni clientes.
delete from package_services;
delete from packages;
delete from staff_services;
delete from services;
delete from service_categories;

update settings set value = value || jsonb_build_object(
  'name', 'Carezia',
  'tagline', 'Centro de estética integral'
) where key = 'business';

-- ---------- sucursal ----------
update locations set
  name = 'Carezia',
  address = 'PENDIENTE: dirección real',
  city = 'Santiago'
where slug = 'providencia';

-- ---------- categorías ----------
insert into service_categories (name, slug, description, sort_order) values
  ('Limpieza facial', 'limpieza-facial', 'Higiene profunda, extracción y tratamientos de piel.', 1),
  ('Diseño de cejas y pestañas', 'diseno-de-cejas-y-pestanas', 'Visajismo, laminado, lifting y extensiones.', 2),
  ('Manicure y pedicure', 'manicure-y-pedicure', 'Esmaltado permanente, gel y diseños.', 3),
  ('Depilación láser', 'depilacion-laser', 'Sesiones por zona, en planes progresivos.', 4),
  ('Masajes y tratamientos corporales', 'masajes-y-tratamientos-corporales', 'Reductivos, reafirmantes, post operatorio y drenaje.', 5),
  ('Masajes relajantes', 'masajes-relajantes', 'Descontracturante y piedras calientes.', 6),
  ('Tensamax', 'tensamax', 'Tratamiento de tensado y reafirmación corporal.', 7),
  ('Therapress', 'therapress', 'Presoterapia y kinesiología.', 8),
  ('Sesiones individuales', 'sesiones-individuales', 'Protocolos puntuales que no requieren plan.', 9),
  ('Promociones', 'promociones', 'Planes combinados por tiempo limitado.', 10),
  ('Evaluación corporal', 'evaluacion-corporal', 'Medición de composición corporal InBody.', 11);

-- ---------- servicios ----------
insert into services (category_id, name, slug, price_amount, duration_min, buffer_min, is_active, sort_order) values
  ((select id from service_categories where slug = 'limpieza-facial'), 'Limpieza facial profunda de espalda', 'limpieza-facial-profunda-de-espalda', 34990, 60, 10, true, 1),
  ((select id from service_categories where slug = 'manicure-y-pedicure'), 'Esmaltado permanente', 'esmaltado-permanente', 15990, 60, 10, true, 2),
  ((select id from service_categories where slug = 'manicure-y-pedicure'), 'Rubber gel', 'rubber-gel', 20990, 120, 10, true, 3),
  ((select id from service_categories where slug = 'manicure-y-pedicure'), 'Soft gel, 1 o 2 tonos', 'soft-gel-1-o-2-tonos', 23990, 120, 10, true, 4),
  ((select id from service_categories where slug = 'manicure-y-pedicure'), 'Soft gel con diseños o efectos', 'soft-gel-con-disenos-o-efectos', 25990, 120, 10, true, 5),
  ((select id from service_categories where slug = 'manicure-y-pedicure'), 'Kapping gel + esmaltado', 'kapping-gel-esmaltado', 25000, 135, 10, true, 6),
  ((select id from service_categories where slug = 'manicure-y-pedicure'), 'Esmaltado permanente con diseño', 'esmaltado-permanente-con-diseno', 18990, 90, 10, true, 7),
  ((select id from service_categories where slug = 'diseno-de-cejas-y-pestanas'), 'Perfilado de cejas + pigmentación', 'perfilado-de-cejas-pigmentacion', 20990, 45, 10, true, 8),
  ((select id from service_categories where slug = 'limpieza-facial'), 'Dermaplaning + limpieza facial profunda', 'dermaplaning-limpieza-facial-profunda', 29990, 60, 10, true, 9),
  ((select id from service_categories where slug = 'diseno-de-cejas-y-pestanas'), 'Pestañas 6D', 'pestanas-6d', 42000, 120, 10, true, 10),
  ((select id from service_categories where slug = 'diseno-de-cejas-y-pestanas'), 'Pestañas 5D', 'pestanas-5d', 40000, 120, 10, true, 11),
  ((select id from service_categories where slug = 'diseno-de-cejas-y-pestanas'), 'Pestañas 4D', 'pestanas-4d', 32000, 120, 10, true, 12),
  ((select id from service_categories where slug = 'diseno-de-cejas-y-pestanas'), 'Lifting de pestañas + pigmentación + vitamina', 'lifting-de-pestanas-pigmentacion-vitamina', 29990, 40, 10, true, 13),
  ((select id from service_categories where slug = 'diseno-de-cejas-y-pestanas'), 'Lifting de pestañas + vitamina', 'lifting-de-pestanas-vitamina', 19990, 40, 10, true, 14),
  ((select id from service_categories where slug = 'diseno-de-cejas-y-pestanas'), 'Laminado de cejas + pigmentación + visajismo', 'laminado-de-cejas-pigmentacion-visajismo', 29990, 60, 10, true, 15),
  ((select id from service_categories where slug = 'diseno-de-cejas-y-pestanas'), 'Visajismo de cejas + pigmentación', 'visajismo-de-cejas-pigmentacion', 19990, 40, 10, true, 16),
  ((select id from service_categories where slug = 'diseno-de-cejas-y-pestanas'), 'Visajismo de cejas', 'visajismo-de-cejas', 13990, 45, 10, true, 17),
  ((select id from service_categories where slug = 'sesiones-individuales'), 'Lipoenzimas + masaje + drenaje linfático', 'lipoenzimas-masaje-drenaje-linfatico', 40000, 60, 10, true, 18),
  ((select id from service_categories where slug = 'depilacion-laser'), 'Depilación láser bozo', 'depilacion-laser-bozo', 5000, 30, 10, true, 19),
  ((select id from service_categories where slug = 'depilacion-laser'), 'Depilación láser hombro, brazo y espalda', 'depilacion-laser-hombro-brazo-y-espalda', 18750, 60, 10, true, 20),
  ((select id from service_categories where slug = 'tensamax'), 'Tensamax piernas completas', 'tensamax-piernas-completas', 17000, 60, 10, true, 21),
  ((select id from service_categories where slug = 'sesiones-individuales'), 'Peptona + vitamina C + protocolo de glúteo', 'peptona-vitamina-c-protocolo-de-gluteo', 35000, 60, 10, true, 22),
  ((select id from service_categories where slug = 'sesiones-individuales'), 'Hidrolipoclasia TR7 + masaje reductivo + drenaje linfático + metaloterapia', 'hidrolipoclasia-tr7-masaje-reductivo-drenaje-linfatico-metaloterapia', 35000, 60, 10, true, 23),
  ((select id from service_categories where slug = 'masajes-y-tratamientos-corporales'), 'Protocolo glúteos premium 360', 'protocolo-gluteos-premium-360', 27000, 60, 10, true, 24),
  ((select id from service_categories where slug = 'limpieza-facial'), 'PDRN salmón + limpieza facial profunda', 'pdrn-salmon-limpieza-facial-profunda', 17500, 120, 10, true, 25),
  ((select id from service_categories where slug = 'masajes-y-tratamientos-corporales'), 'Tratamiento de brazos', 'tratamiento-de-brazos', 10000, 60, 10, true, 26),
  ((select id from service_categories where slug = 'promociones'), 'Promoción 2x1 compartida con otra persona', 'promocion-2x1-compartida-con-otra-persona', 23120, 60, 10, true, 27),
  ((select id from service_categories where slug = 'masajes-relajantes'), 'Relajante con piedras calientes + descontracturante', 'relajante-con-piedras-calientes-descontracturante', 53990, 60, 10, true, 28),
  ((select id from service_categories where slug = 'therapress'), 'Kinesiología de brazo y hombro', 'kinesiologia-de-brazo-y-hombro', 16660, 45, 10, true, 29),
  ((select id from service_categories where slug = 'therapress'), 'Masaje en piernas + Therapress', 'masaje-en-piernas-therapress', 34990, 45, 10, true, 30),
  ((select id from service_categories where slug = 'masajes-relajantes'), 'Masaje relajante con piedras calientes + Therapress o manta térmica', 'masaje-relajante-con-piedras-calientes-therapress-o-manta-termica', 56990, 90, 10, true, 31),
  ((select id from service_categories where slug = 'limpieza-facial'), 'Limpieza facial profunda', 'limpieza-facial-profunda', 29990, 60, 10, true, 32),
  ((select id from service_categories where slug = 'limpieza-facial'), 'Limpieza facial profunda + Dermapen', 'limpieza-facial-profunda-dermapen', 34990, 60, 10, true, 33),
  ((select id from service_categories where slug = 'depilacion-laser'), 'Depilación láser barbilla', 'depilacion-laser-barbilla', 7500, 45, 10, true, 34),
  ((select id from service_categories where slug = 'depilacion-laser'), 'Depilación láser bikini', 'depilacion-laser-bikini', 8620, 40, 10, true, 35),
  ((select id from service_categories where slug = 'depilacion-laser'), 'Depilación láser media pierna', 'depilacion-laser-media-pierna', 7500, 40, 10, true, 36),
  ((select id from service_categories where slug = 'masajes-y-tratamientos-corporales'), 'Drenaje lipo papada', 'drenaje-lipo-papada', 15000, 45, 10, true, 37),
  ((select id from service_categories where slug = 'promociones'), 'Transforma tu cuerpo', 'transforma-tu-cuerpo', 21670, 60, 10, true, 38),
  ((select id from service_categories where slug = 'evaluacion-corporal'), 'Evaluación gratuita', 'evaluacion-gratuita', 0, 40, 10, false, 39),
  ((select id from service_categories where slug = 'masajes-y-tratamientos-corporales'), 'Drenaje linfático cuerpo completo, sin aparatología', 'drenaje-linfatico-cuerpo-completo-sin-aparatologia', 10000, 60, 10, true, 40),
  ((select id from service_categories where slug = 'evaluacion-corporal'), 'InBody', 'inbody', 25000, 30, 10, true, 41),
  ((select id from service_categories where slug = 'masajes-y-tratamientos-corporales'), 'Tratamiento reductivo reafirmante de brazos y piernas', 'tratamiento-reductivo-reafirmante-de-brazos-y-piernas', 24000, 60, 10, true, 42),
  ((select id from service_categories where slug = 'masajes-y-tratamientos-corporales'), 'Tratamiento reductivo reafirmante de abdomen, cintura y espalda', 'tratamiento-reductivo-reafirmante-de-abdomen-cintura-y-espalda', 30000, 60, 10, true, 43),
  ((select id from service_categories where slug = 'masajes-y-tratamientos-corporales'), 'Tratamiento cuerpo completo', 'tratamiento-cuerpo-completo', 37500, 90, 10, true, 44),
  ((select id from service_categories where slug = 'tensamax'), 'Tensamax cuerpo completo', 'tensamax-cuerpo-completo', 26670, 60, 10, true, 45),
  ((select id from service_categories where slug = 'tensamax'), 'Tensamax abdomen, cintura y espalda', 'tensamax-abdomen-cintura-y-espalda', 30000, 60, 10, true, 46),
  ((select id from service_categories where slug = 'masajes-relajantes'), 'Relajante con piedras calientes', 'relajante-con-piedras-calientes', 44990, 60, 10, true, 47),
  ((select id from service_categories where slug = 'masajes-y-tratamientos-corporales'), 'Reduce y moldea', 'reduce-y-moldea', 27000, 60, 10, true, 48),
  ((select id from service_categories where slug = 'masajes-y-tratamientos-corporales'), 'Post operatorio', 'post-operatorio', 27000, 60, 10, true, 49),
  ((select id from service_categories where slug = 'masajes-y-tratamientos-corporales'), 'Levantamiento de glúteos y reafirmante', 'levantamiento-de-gluteos-y-reafirmante', 25000, 60, 10, true, 50),
  ((select id from service_categories where slug = 'masajes-y-tratamientos-corporales'), 'Anticelulítico + levantamiento de glúteos', 'anticelulitico-levantamiento-de-gluteos', 26000, 60, 10, true, 51),
  ((select id from service_categories where slug = 'masajes-relajantes'), 'Descontracturante', 'descontracturante', 39990, 60, 10, true, 52),
  ((select id from service_categories where slug = 'depilacion-laser'), 'Depilación láser rostro completo', 'depilacion-laser-rostro-completo', 10000, 45, 10, true, 53),
  ((select id from service_categories where slug = 'depilacion-laser'), 'Depilación láser rebaje completo + interglúteo + línea alba', 'depilacion-laser-rebaje-completo-intergluteo-linea-alba', 11250, 45, 10, true, 54),
  ((select id from service_categories where slug = 'depilacion-laser'), 'Depilación láser piernas completas', 'depilacion-laser-piernas-completas', 12500, 45, 10, true, 55),
  ((select id from service_categories where slug = 'depilacion-laser'), 'Depilación láser hombros, antebrazos y brazos', 'depilacion-laser-hombros-antebrazos-y-brazos', 11250, 45, 10, true, 56),
  ((select id from service_categories where slug = 'depilacion-laser'), 'Depilación láser glúteos', 'depilacion-laser-gluteos', 6250, 40, 10, true, 57),
  ((select id from service_categories where slug = 'depilacion-laser'), 'Depilación láser axilas', 'depilacion-laser-axilas', 7500, 40, 10, true, 58),
  ((select id from service_categories where slug = 'depilacion-laser'), 'Depilación láser cuerpo completo', 'depilacion-laser-cuerpo-completo', 37500, 90, 10, true, 59),
  ((select id from service_categories where slug = 'masajes-relajantes'), 'Relajante', 'relajante', 35000, 60, 10, true, 60);

-- Precio por sesión estimado (el plan lleva el valor exacto de la planilla):
--   depilacion-laser-bozo
--   depilacion-laser-hombro-brazo-y-espalda
--   tensamax-piernas-completas
--   protocolo-gluteos-premium-360
--   pdrn-salmon-limpieza-facial-profunda
--   tratamiento-de-brazos
--   promocion-2x1-compartida-con-otra-persona
--   kinesiologia-de-brazo-y-hombro
--   depilacion-laser-barbilla
--   depilacion-laser-bikini
--   depilacion-laser-media-pierna
--   drenaje-lipo-papada
--   transforma-tu-cuerpo
--   drenaje-linfatico-cuerpo-completo-sin-aparatologia
--   tratamiento-reductivo-reafirmante-de-brazos-y-piernas
--   tratamiento-reductivo-reafirmante-de-abdomen-cintura-y-espalda
--   tratamiento-cuerpo-completo
--   tensamax-cuerpo-completo
--   tensamax-abdomen-cintura-y-espalda
--   reduce-y-moldea
--   post-operatorio
--   levantamiento-de-gluteos-y-reafirmante
--   anticelulitico-levantamiento-de-gluteos
--   depilacion-laser-rostro-completo
--   depilacion-laser-rebaje-completo-intergluteo-linea-alba
--   depilacion-laser-piernas-completas
--   depilacion-laser-hombros-antebrazos-y-brazos
--   depilacion-laser-gluteos
--   depilacion-laser-axilas
--   depilacion-laser-cuerpo-completo

-- ---------- planes de sesiones ----------
insert into packages (name, slug, price_amount, sessions_count, sort_order) values
  ('Depilación láser bozo · 8 sesiones', 'depilacion-laser-bozo-8-sesiones', 39990, 8, 1),
  ('Depilación láser hombro, brazo y espalda · 8 sesiones', 'depilacion-laser-hombro-brazo-y-espalda-8-sesiones', 149990, 8, 2),
  ('Tensamax piernas completas · 10 sesiones', 'tensamax-piernas-completas-10-sesiones', 169990, 10, 3),
  ('Protocolo glúteos premium 360 · 10 sesiones', 'protocolo-gluteos-premium-360-10-sesiones', 269990, 10, 4),
  ('PDRN salmón + limpieza facial profunda · 4 sesiones', 'pdrn-salmon-limpieza-facial-profunda-4-sesiones', 69990, 4, 5),
  ('Tratamiento de brazos · 10 sesiones', 'tratamiento-de-brazos-10-sesiones', 99990, 10, 6),
  ('Promoción 2x1 compartida con otra persona · 16 sesiones', 'promocion-2x1-compartida-con-otra-persona-16-sesiones', 369990, 16, 7),
  ('Kinesiología de brazo y hombro · 6 sesiones', 'kinesiologia-de-brazo-y-hombro-6-sesiones', 99990, 6, 8),
  ('Depilación láser barbilla · 8 sesiones', 'depilacion-laser-barbilla-8-sesiones', 60000, 8, 9),
  ('Depilación láser bikini · 8 sesiones', 'depilacion-laser-bikini-8-sesiones', 68990, 8, 10),
  ('Depilación láser media pierna · 8 sesiones', 'depilacion-laser-media-pierna-8-sesiones', 60000, 8, 11),
  ('Drenaje lipo papada · 10 sesiones', 'drenaje-lipo-papada-10-sesiones', 149990, 10, 12),
  ('Transforma tu cuerpo · 12 sesiones', 'transforma-tu-cuerpo-12-sesiones', 259990, 12, 13),
  ('Drenaje linfático cuerpo completo, sin aparatología · 6 sesiones', 'drenaje-linfatico-cuerpo-completo-sin-aparatologia-6-sesiones', 60000, 6, 14),
  ('Tratamiento reductivo reafirmante de brazos y piernas · 10 sesiones', 'tratamiento-reductivo-reafirmante-de-brazos-y-piernas-10-sesiones', 239990, 10, 15),
  ('Tratamiento reductivo reafirmante de abdomen, cintura y espalda · 10 sesiones', 'tratamiento-reductivo-reafirmante-de-abdomen-cintura-y-espalda-10-sesiones', 299990, 10, 16),
  ('Tratamiento cuerpo completo · 12 sesiones', 'tratamiento-cuerpo-completo-12-sesiones', 450000, 12, 17),
  ('Tensamax cuerpo completo · 15 sesiones', 'tensamax-cuerpo-completo-15-sesiones', 399990, 15, 18),
  ('Tensamax abdomen, cintura y espalda · 10 sesiones', 'tensamax-abdomen-cintura-y-espalda-10-sesiones', 299990, 10, 19),
  ('Reduce y moldea · 10 sesiones', 'reduce-y-moldea-10-sesiones', 270000, 10, 20),
  ('Post operatorio · 10 sesiones', 'post-operatorio-10-sesiones', 270000, 10, 21),
  ('Levantamiento de glúteos y reafirmante · 8 sesiones', 'levantamiento-de-gluteos-y-reafirmante-8-sesiones', 199990, 8, 22),
  ('Anticelulítico + levantamiento de glúteos · 10 sesiones', 'anticelulitico-levantamiento-de-gluteos-10-sesiones', 260000, 10, 23),
  ('Depilación láser rostro completo · 8 sesiones', 'depilacion-laser-rostro-completo-8-sesiones', 79990, 8, 24),
  ('Depilación láser rebaje completo + interglúteo + línea alba · 8 sesiones', 'depilacion-laser-rebaje-completo-intergluteo-linea-alba-8-sesiones', 89990, 8, 25),
  ('Depilación láser piernas completas · 8 sesiones', 'depilacion-laser-piernas-completas-8-sesiones', 99990, 8, 26),
  ('Depilación láser hombros, antebrazos y brazos · 8 sesiones', 'depilacion-laser-hombros-antebrazos-y-brazos-8-sesiones', 89990, 8, 27),
  ('Depilación láser glúteos · 8 sesiones', 'depilacion-laser-gluteos-8-sesiones', 49990, 8, 28),
  ('Depilación láser axilas · 8 sesiones', 'depilacion-laser-axilas-8-sesiones', 60000, 8, 29),
  ('Depilación láser cuerpo completo · 8 sesiones', 'depilacion-laser-cuerpo-completo-8-sesiones', 299990, 8, 30);

-- Cada plan se canjea en su propio servicio.
insert into package_services (package_id, service_id) values
  ((select id from packages where slug = 'depilacion-laser-bozo-8-sesiones'), (select id from services where slug = 'depilacion-laser-bozo')),
  ((select id from packages where slug = 'depilacion-laser-hombro-brazo-y-espalda-8-sesiones'), (select id from services where slug = 'depilacion-laser-hombro-brazo-y-espalda')),
  ((select id from packages where slug = 'tensamax-piernas-completas-10-sesiones'), (select id from services where slug = 'tensamax-piernas-completas')),
  ((select id from packages where slug = 'protocolo-gluteos-premium-360-10-sesiones'), (select id from services where slug = 'protocolo-gluteos-premium-360')),
  ((select id from packages where slug = 'pdrn-salmon-limpieza-facial-profunda-4-sesiones'), (select id from services where slug = 'pdrn-salmon-limpieza-facial-profunda')),
  ((select id from packages where slug = 'tratamiento-de-brazos-10-sesiones'), (select id from services where slug = 'tratamiento-de-brazos')),
  ((select id from packages where slug = 'promocion-2x1-compartida-con-otra-persona-16-sesiones'), (select id from services where slug = 'promocion-2x1-compartida-con-otra-persona')),
  ((select id from packages where slug = 'kinesiologia-de-brazo-y-hombro-6-sesiones'), (select id from services where slug = 'kinesiologia-de-brazo-y-hombro')),
  ((select id from packages where slug = 'depilacion-laser-barbilla-8-sesiones'), (select id from services where slug = 'depilacion-laser-barbilla')),
  ((select id from packages where slug = 'depilacion-laser-bikini-8-sesiones'), (select id from services where slug = 'depilacion-laser-bikini')),
  ((select id from packages where slug = 'depilacion-laser-media-pierna-8-sesiones'), (select id from services where slug = 'depilacion-laser-media-pierna')),
  ((select id from packages where slug = 'drenaje-lipo-papada-10-sesiones'), (select id from services where slug = 'drenaje-lipo-papada')),
  ((select id from packages where slug = 'transforma-tu-cuerpo-12-sesiones'), (select id from services where slug = 'transforma-tu-cuerpo')),
  ((select id from packages where slug = 'drenaje-linfatico-cuerpo-completo-sin-aparatologia-6-sesiones'), (select id from services where slug = 'drenaje-linfatico-cuerpo-completo-sin-aparatologia')),
  ((select id from packages where slug = 'tratamiento-reductivo-reafirmante-de-brazos-y-piernas-10-sesiones'), (select id from services where slug = 'tratamiento-reductivo-reafirmante-de-brazos-y-piernas')),
  ((select id from packages where slug = 'tratamiento-reductivo-reafirmante-de-abdomen-cintura-y-espalda-10-sesiones'), (select id from services where slug = 'tratamiento-reductivo-reafirmante-de-abdomen-cintura-y-espalda')),
  ((select id from packages where slug = 'tratamiento-cuerpo-completo-12-sesiones'), (select id from services where slug = 'tratamiento-cuerpo-completo')),
  ((select id from packages where slug = 'tensamax-cuerpo-completo-15-sesiones'), (select id from services where slug = 'tensamax-cuerpo-completo')),
  ((select id from packages where slug = 'tensamax-abdomen-cintura-y-espalda-10-sesiones'), (select id from services where slug = 'tensamax-abdomen-cintura-y-espalda')),
  ((select id from packages where slug = 'reduce-y-moldea-10-sesiones'), (select id from services where slug = 'reduce-y-moldea')),
  ((select id from packages where slug = 'post-operatorio-10-sesiones'), (select id from services where slug = 'post-operatorio')),
  ((select id from packages where slug = 'levantamiento-de-gluteos-y-reafirmante-8-sesiones'), (select id from services where slug = 'levantamiento-de-gluteos-y-reafirmante')),
  ((select id from packages where slug = 'anticelulitico-levantamiento-de-gluteos-10-sesiones'), (select id from services where slug = 'anticelulitico-levantamiento-de-gluteos')),
  ((select id from packages where slug = 'depilacion-laser-rostro-completo-8-sesiones'), (select id from services where slug = 'depilacion-laser-rostro-completo')),
  ((select id from packages where slug = 'depilacion-laser-rebaje-completo-intergluteo-linea-alba-8-sesiones'), (select id from services where slug = 'depilacion-laser-rebaje-completo-intergluteo-linea-alba')),
  ((select id from packages where slug = 'depilacion-laser-piernas-completas-8-sesiones'), (select id from services where slug = 'depilacion-laser-piernas-completas')),
  ((select id from packages where slug = 'depilacion-laser-hombros-antebrazos-y-brazos-8-sesiones'), (select id from services where slug = 'depilacion-laser-hombros-antebrazos-y-brazos')),
  ((select id from packages where slug = 'depilacion-laser-gluteos-8-sesiones'), (select id from services where slug = 'depilacion-laser-gluteos')),
  ((select id from packages where slug = 'depilacion-laser-axilas-8-sesiones'), (select id from services where slug = 'depilacion-laser-axilas')),
  ((select id from packages where slug = 'depilacion-laser-cuerpo-completo-8-sesiones'), (select id from services where slug = 'depilacion-laser-cuerpo-completo'));

-- ---------- equipo ----------
-- PENDIENTE: reemplazar por el equipo real. Este profesional genérico
-- existe sólo para que la agenda funcione desde el primer día.
insert into staff (display_name, title, sort_order) values ('Equipo Carezia', 'Especialistas', 1);

insert into staff_services (staff_id, service_id)
select (select id from staff where display_name = 'Equipo Carezia'), id from services;

insert into staff_locations (staff_id, location_id)
select (select id from staff where display_name = 'Equipo Carezia'), id from locations limit 1;

insert into work_shifts (staff_id, location_id, weekday, start_time, end_time)
select (select id from staff where display_name = 'Equipo Carezia'),
       (select id from locations limit 1), d, '10:00', '19:00'
from generate_series(1, 5) d;

insert into work_shifts (staff_id, location_id, weekday, start_time, end_time)
select (select id from staff where display_name = 'Equipo Carezia'),
       (select id from locations limit 1), 6, '10:00', '14:00';

commit;
