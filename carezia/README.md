# Carezia

Sitio web, sistema de agendamiento propio y app móvil para un centro de estética.
Sin AgendaPro ni intermediarios: la agenda, los paquetes y los cobros son tuyos.

- **Manual de marca:** [`MARCA.md`](./MARCA.md)
- **Esquema de base de datos:** [`supabase/migrations/`](./supabase/migrations)

## Qué hace

**Para la clienta**
- Catálogo de tratamientos con precio y duración reales.
- Reserva en tres pasos, con horas calculadas contra la agenda real del equipo.
- Compra de paquetes de sesiones; al reservar, el crédito se descuenta solo.
- Cuenta con próximas horas, historial y sesiones restantes. Cancelación propia.
- Se puede reservar sin cuenta, dejando sólo un correo (configurable).
- Correo de confirmación y recordatorio automático antes de la cita.
- Botón para agregar la hora a Google Calendar o al calendario del teléfono.

**Para el local (`/admin`)**
- Agenda del día con confirmar, marcar realizada, no asistió y cancelar.
- Bloqueos de horario: vacaciones, feriados, una tarde libre.
- Servicios, precios, duraciones y abonos editables en caliente.
- Paquetes: cuántas sesiones, qué servicios cubren, cuánto duran.
- Equipo: quién hace qué y su horario semanal.
- Ajustes: datos del negocio, reglas de la agenda y textos de la portada.
- Cada profesional tiene una dirección privada para ver su agenda de
  Carezia dentro de Google Calendar o del iPhone.

**Nada de esto requiere tocar código.** Un cambio de precio en `/admin` se ve en
la web y en la app al instante.

## Estructura

```
carezia/
├── apps/
│   ├── web/            Next.js 16 · sitio público + panel + API
│   └── mobile/         Expo · iOS y Android
├── packages/
│   └── core/           Motor de disponibilidad, dinero y tipos compartidos
└── supabase/
    └── migrations/     Esquema y datos iniciales
```

El motor de agendamiento vive en `packages/core/src/availability.ts` y está
cubierto por tests, incluido el cambio de horario de verano. La app móvil no lo
reimplementa: consume los mismos endpoints que la web.

## Puesta en marcha

### 1. Base de datos

Crea un proyecto en [supabase.com](https://supabase.com) y ejecuta, en orden,
los archivos de `supabase/migrations/` desde el SQL Editor:

1. `0001_schema.sql` — tablas, reglas y políticas de seguridad.
2. `0002_seed.sql` — servicios, paquetes y horarios de ejemplo.

Luego, para darte acceso al panel, crea tu usuario entrando una vez en
`/ingresar` y ejecuta:

```sql
update profiles set role = 'admin' where email = 'tu@correo.cl';
```

### 2. Web

```bash
cd apps/web
cp .env.example .env.local   # y completa las claves de Supabase
cd ../.. && npm install
npm run dev                  # http://localhost:3000
```

### 3. App móvil

```bash
cd apps/mobile
cp .env.example .env         # mismas claves + la URL donde corre la web
npm start                    # se abre con Expo Go
```

### 4. Pagos (opcional)

Sin configurar nada, el sistema funciona con **cobro presencial**: la reserva se
agenda y el pago se coordina en el local.

Para cobrar en línea, en `apps/web/.env.local`:

```bash
PAYMENT_PROVIDER=mercadopago      # o stripe
MERCADOPAGO_ACCESS_TOKEN=...
MERCADOPAGO_WEBHOOK_SECRET=...    # obligatorio: sin él se rechazan las notificaciones
```

Apunta el webhook del proveedor a:

- Stripe → `https://tudominio.cl/api/webhooks/stripe`
- Mercado Pago → `https://tudominio.cl/api/webhooks/mercadopago`

### 5. Correos y recordatorios (opcional)

Con `RESEND_API_KEY` y `EMAIL_FROM` se envía la confirmación de cada reserva. Si
faltan, la reserva se agenda igual y se registra en el log.

Para los recordatorios, agrega `CRON_SECRET` (genera uno con
`openssl rand -hex 32`). En Vercel el cron de `vercel.json` ya llama cada hora a
`/api/cron/reminders`; fuera de Vercel, llama tú a esa ruta con la cabecera
`Authorization: Bearer <CRON_SECRET>`.

Cuántas horas antes se avisa se ajusta en `/admin/ajustes` (0 desactiva el
recordatorio).

### 6. Calendario

No requiere cuenta de Google ni permisos OAuth:

- La clienta agrega su hora con un botón, a Google Calendar o por archivo `.ics`.
- Cada profesional tiene en `/admin/equipo` una dirección privada que se suscribe
  desde Google Calendar (Otros calendarios → Desde URL) o desde el iPhone.

La sincronización es **de Carezia hacia el calendario**, no al revés: la agenda
del local es la única fuente de verdad de las horas disponibles, y un evento
creado en Google no debería poder ocupar un box.

## Decisiones que vale la pena conocer

**Dos personas no pueden tomar la misma hora.** La comprobación no está en el
código de la aplicación sino en la base de datos, con una restricción de
exclusión (`appointments_no_overlap`). Aunque dos peticiones lleguen en el mismo
milisegundo, Postgres rechaza una de las dos.

**Las compras son inmutables.** `package_purchases` guarda su propio nombre,
precio y número de sesiones. Subir el precio de un paquete mañana no altera lo
que alguien compró hoy.

**Los créditos se descuentan con lock.** La función `redeem_package_credit`
bloquea la fila antes de restar, así que dos reservas simultáneas no pueden
gastar la misma sesión. Si el canje falla, la cita se deshace.

**El dinero es un entero.** Se guarda en la unidad mínima de la moneda: en CLP,
pesos enteros. Nada de decimales flotantes.

**Los servicios se archivan, no se borran.** Borrarlos dejaría citas históricas
sin referencia.

**Los recordatorios no se reintentan en bucle.** Cada cita se marca con
`reminder_sent_at` en cuanto se procesa, incluso si el correo falló. Repetir el
envío cada hora ante un fallo de Resend sólo multiplicaría el problema; el error
queda en el log.

## Comandos

```bash
npm test        # tests del motor de agendamiento
npm run build   # build de producción de la web
npm run lint    # eslint
npm run typecheck
```

## Despliegue

La web va a Vercel con el directorio raíz en `apps/web`. Las variables de
entorno son las de `.env.example`; `SUPABASE_SERVICE_ROLE_KEY` nunca lleva el
prefijo `NEXT_PUBLIC`.

La app se compila con EAS (`eas build`) y se publica en App Store y Play Store.
