# Carezia · estado del proyecto y pendientes

Documento de traspaso. Sirve para retomar el trabajo en otra conversación
o para que otra persona entienda dónde quedó todo.

Última actualización: 26 de septiembre de 2026.

---

## 1. Qué es Carezia

Centro de estética integral en Santiago de Chile. **60 servicios reales en 11
categorías**, cargados desde la exportación del sistema anterior:

| Categoría | Servicios |
|---|---|
| Depilación láser | 12 |
| Masajes y tratamientos corporales | 11 |
| Cejas y pestañas | 9 |
| Manicure y pedicure | 6 |
| Limpieza facial | 5 |
| Masajes relajantes | 5 |
| Tensamax | 3 |
| Sesiones individuales | 3 |
| Promociones | 2 |
| Therapress | 2 |
| Evaluación corporal InBody | 2 |

**El dato que manda el modelo de negocio:** 30 de los 60 servicios se venden en
**planes de 8, 10, 12 o 15 sesiones**, no por visita suelta. Carezia no vive de
que alguien entre una vez, sino de que termine un proceso de meses. Los precios
van de $15.990 (esmaltado permanente) a $450.000 (tratamiento cuerpo completo,
12 sesiones).

Sigue operando en AgendaPro (`careziaspa.agendapro.com`) mientras este sistema
no esté en producción.

---

## 2. Qué está construido

Monorepo en `carezia/`, con todo el contenido operativo en base de datos para
que se edite desde el panel sin tocar código.

```
carezia/
├── apps/web/        Next.js 16 · sitio público + panel + API
├── apps/mobile/     Expo · iOS y Android
├── packages/core/   Motor de agendamiento, calendario, CSV, dinero, tipos
├── supabase/        Cuatro migraciones: esquema, ajustes, recordatorios, catálogo
├── datos/           El catálogo en CSV, listo para la carga masiva
└── scripts/         Puesta en marcha local
```

### Para la clienta
- Catálogo con precio y duración reales.
- Reserva en tres pasos con disponibilidad calculada contra la agenda real.
- Compra de planes; al reservar, el crédito se descuenta solo.
- Cuenta con próximas horas, historial y sesiones restantes. Cancelación propia.
- Se puede reservar sin cuenta, dejando sólo un correo.
- Correo de confirmación, recordatorio automático y botón para agregar la hora
  a Google Calendar o al calendario del teléfono.

### Para el local (`/admin`)
- Agenda del día: confirmar, marcar realizada, no asistió, cancelar.
- Bloqueos de horario: vacaciones, feriados, una tarde libre.
- Servicios, precios, duraciones y abonos editables en caliente.
- Planes: cuántas sesiones, qué servicios cubren, cuánto duran.
- Equipo: quién hace qué y su horario semanal.
- Clientes, con búsqueda.
- Ajustes: datos del negocio, reglas de agenda y textos de la portada.
- **Carga masiva** desde CSV, celdas pegadas o Google Sheets, con vista previa
  antes de escribir nada; y exportación con las mismas columnas.
- Cada profesional tiene una dirección privada para ver su agenda dentro de
  Google Calendar o del iPhone.

### Decisiones técnicas que conviene conocer

**Dos personas no pueden tomar la misma hora.** La comprobación está en la base
de datos, con una restricción de exclusión (`appointments_no_overlap`). Aunque
dos peticiones lleguen en el mismo milisegundo, Postgres rechaza una.

**Las compras son inmutables.** `package_purchases` guarda su propio nombre,
precio y número de sesiones. Cambiar el precio de un plan no altera lo comprado.

**Los créditos se descuentan con lock de fila** (`redeem_package_credit`), así
que dos reservas simultáneas no gastan la misma sesión. Si el canje falla, la
cita se deshace.

**El dinero es un entero** en la unidad mínima de la moneda. En CLP, pesos
enteros. Nada de decimales flotantes.

**Los servicios se archivan, no se borran.** Borrarlos dejaría citas históricas
sin referencia.

**La sincronización de calendario va sólo de Carezia hacia afuera.** Fue
deliberado: la alternativa bidireccional pondría la disponibilidad real del
local en manos de un calendario externo.

**Los recordatorios no se reintentan en bucle.** Cada cita se marca al
procesarse, incluso si el correo falló.

**La vista previa y la importación recorren el mismo camino** (`analizarPlanilla`
es una función pura sin base de datos), y el texto se vuelve a analizar al
confirmar en vez de confiar en lo que devuelve el navegador.

### Verificación
- **55 tests** en `packages/core`: motor de disponibilidad (incluido el cambio
  de horario de verano en Chile), generador de calendario, lector de CSV,
  analizador de planillas y el catálogo real como test de regresión.
- Typecheck y lint limpios en web y móvil.
- Build de producción correcto; la app móvil empaqueta sin errores.
- El SQL del catálogo lo valida el parser real de PostgreSQL.

---

## 3. Qué falta, y de quién depende

### Bloqueado esperando datos del negocio
1. **Dirección y teléfono del local.** Marcado `PENDIENTE` en la migración.
2. **El equipo real.** Hay un profesional genérico «Equipo Carezia» que puede
   todos los servicios, sólo para que la agenda funcione. Hay que reemplazarlo
   por las personas reales, con qué hace cada una y su horario: de eso depende
   toda la disponibilidad.
3. **Vigencia de los planes.** ¿Cuánto tiempo hay para usar las 8 sesiones?
   Quedó sin vencimiento por no tener el dato.
4. **Descripciones de los servicios.** Ninguno de los 60 traía. La web muestra
   sólo nombre y precio.
5. **Manual de marca y logo propios.** El usuario dijo tenerlos; no los ha
   compartido todavía.

### Decisión abierta: el precio por sesión
Los 30 servicios que se venden por plan tienen un **precio por sesión estimado**,
obtenido dividiendo el valor del plan entre sus sesiones. El plan conserva el
precio exacto de la planilla. Hay que confirmar esos valores, o decidir que esos
tratamientos no se venden sueltos y modelarlos de otra forma.

### Decisión abierta: la estética
Se publicaron cuatro direcciones visuales comparables en vivo, con los servicios
y precios reales dentro:

**https://claude.ai/artifact/F55WN1XY2LhEBsP728GoXs**

- **Arena** — crema, cobre, serif. La actual. Es la más vista del rubro.
- **Clínico** — blanco, tinta y verde azulado, sin serif. Habla de procedimiento
  y resultado medible.
- **Nocturno** — ciruela oscuro con dorado. La que mejor sostiene precios altos;
  exige buena fotografía.
- **Vivo** — coral saturado. La más joven y nativa de Instagram.

La tensión de fondo: el catálogo apunta a dos clientas distintas, la del plan de
láser de $300.000 y la del esmaltado de $15.990. Ninguna dirección sirve igual
para ambas. Como el dinero está en los planes, la recomendación fue priorizar a
la primera: **Nocturno** si hay buena fotografía, **Clínico** si no.

### Decisión abierta: cuándo dejar AgendaPro
**No hay ninguna sincronización entre AgendaPro y este sistema, en ninguna
dirección.** No la hay porque mantener dos agendas vivas sobre los mismos boxes
produce sobreventa: ninguna conoce a la otra.

La recomendación es un corte limpio: montar el sistema propio con los datos
reales, probarlo, elegir una fecha desde la cual AgendaPro deja de tomar
reservas nuevas, dejar que cumpla las ya agendadas, y dar de baja la cuenta
cuando pase la última.

### No verificado
Si AgendaPro ofrece una API pública, o si permite bloquear horas leyendo un
calendario externo. Requiere preguntarle a su soporte. El proxy de red de la
sesión bloqueaba `agendapro.com`, así que no se pudo revisar su documentación.

### Sugerencia pendiente
El código vive en `Yukapak2205/github-slideshow`, que es un repositorio de
práctica del curso de GitHub. Carezia merece uno propio.

---

## 4. Cómo correrlo

Requisitos: Node 20+, Docker Desktop y el CLI de Supabase.

```bash
npm run local:setup     # macOS y Linux
npm run dev             # http://localhost:3000
```

En Windows: `powershell -ExecutionPolicy Bypass -File scripts\local-setup.ps1`

Todo el detalle, incluido cómo entrar al panel y dónde llegan los correos de
prueba, está en [`CORRER-LOCAL.md`](./CORRER-LOCAL.md).

---

## 5. Dónde está cada cosa

| | |
|---|---|
| Repositorio | `Yukapak2205/github-slideshow`, rama `claude/carezia-scheduling-web-app-j9v24h` |
| Pull request | [#12](https://github.com/Yukapak2205/github-slideshow/pull/12) · abierto, esperando revisión |
| Direcciones visuales | https://claude.ai/artifact/F55WN1XY2LhEBsP728GoXs |
| Manual de marca | [`MARCA.md`](./MARCA.md) |
| Documentación técnica | [`README.md`](./README.md) |
| Puesta en marcha local | [`CORRER-LOCAL.md`](./CORRER-LOCAL.md) |
| Catálogo en CSV | `datos/servicios-carezia.csv` |

El PR tiene un detalle: su descripción dice «Next.js 15» y «custom CSS system».
Es Next.js 16.3.6 y Tailwind v4. Está sin corregir.
