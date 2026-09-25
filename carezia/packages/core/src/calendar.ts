/**
 * Generación de calendario en formato iCalendar (RFC 5545).
 *
 * Sirve para dos cosas: que la clienta agregue su hora al calendario del
 * teléfono, y que el equipo vea su agenda de Carezia dentro de Google
 * Calendar mediante una suscripción de sólo lectura.
 */

export interface CalendarEvent {
  /** Identificador estable del evento. Al repetirse, el calendario actualiza en vez de duplicar. */
  uid: string
  title: string
  description?: string
  location?: string
  startsAt: Date | string
  endsAt: Date | string
  organizerName?: string
  organizerEmail?: string
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED'
  /** Sube en cada modificación para que el calendario sepa cuál versión manda. */
  sequence?: number
  createdAt?: Date | string
}

function toUtcStamp(value: Date | string): string {
  const fecha = value instanceof Date ? value : new Date(value)
  return `${fecha.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`
}

/** Escapa los caracteres que en iCalendar tienen significado propio. */
function escapar(texto: string): string {
  return texto
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

// TextEncoder/TextDecoder existen en Node, en el navegador y en React
// Native. Buffer no: usarlo rompería la app móvil, que importa este
// mismo paquete.
const codificador = new TextEncoder()
const decodificador = new TextDecoder()

/**
 * Pliega las líneas a 75 octetos, como exige la norma.
 *
 * Se cuenta en bytes UTF-8, no en caracteres: una línea con tildes o eñes
 * ocupa más de lo que aparenta, y cortarla por caracteres produciría
 * líneas demasiado largas que algunos clientes rechazan.
 */
function plegar(linea: string): string {
  const bytes = codificador.encode(linea)
  if (bytes.length <= 75) return linea

  const partes: string[] = []
  let inicio = 0
  let limite = 75

  while (inicio < bytes.length) {
    let fin = Math.min(inicio + limite, bytes.length)
    // No se parte a mitad de un carácter multibyte: los bytes de
    // continuación en UTF-8 empiezan con los bits 10.
    while (fin > inicio && fin < bytes.length && (bytes[fin]! & 0xc0) === 0x80) {
      fin--
    }
    partes.push(decodificador.decode(bytes.subarray(inicio, fin)))
    inicio = fin
    limite = 74 // las continuaciones llevan un espacio inicial
  }

  return partes.join('\r\n ')
}

export interface CalendarOptions {
  calendarName: string
  /** Minutos antes del evento para la alarma. 0 o ausente = sin alarma. */
  alarmMinutesBefore?: number
  /** Cada cuánto debería releer el calendario quien se suscribe. */
  refreshIntervalMinutes?: number
}

/** Arma un calendario iCalendar completo con los eventos dados. */
export function buildCalendar(events: CalendarEvent[], options: CalendarOptions): string {
  const lineas: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Carezia//Agenda//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapar(options.calendarName)}`,
  ]

  if (options.refreshIntervalMinutes) {
    lineas.push(`REFRESH-INTERVAL;VALUE=DURATION:PT${options.refreshIntervalMinutes}M`)
    lineas.push(`X-PUBLISHED-TTL:PT${options.refreshIntervalMinutes}M`)
  }

  for (const evento of events) {
    lineas.push('BEGIN:VEVENT')
    lineas.push(`UID:${evento.uid}`)
    lineas.push(`DTSTAMP:${toUtcStamp(evento.createdAt ?? new Date())}`)
    lineas.push(`DTSTART:${toUtcStamp(evento.startsAt)}`)
    lineas.push(`DTEND:${toUtcStamp(evento.endsAt)}`)
    lineas.push(`SUMMARY:${escapar(evento.title)}`)
    lineas.push(`STATUS:${evento.status ?? 'CONFIRMED'}`)
    lineas.push(`SEQUENCE:${evento.sequence ?? 0}`)

    if (evento.description) lineas.push(`DESCRIPTION:${escapar(evento.description)}`)
    if (evento.location) lineas.push(`LOCATION:${escapar(evento.location)}`)
    if (evento.organizerEmail) {
      const nombre = evento.organizerName ? `;CN=${escapar(evento.organizerName)}` : ''
      lineas.push(`ORGANIZER${nombre}:mailto:${evento.organizerEmail}`)
    }

    if (options.alarmMinutesBefore && options.alarmMinutesBefore > 0) {
      lineas.push(
        'BEGIN:VALARM',
        `TRIGGER:-PT${options.alarmMinutesBefore}M`,
        'ACTION:DISPLAY',
        `DESCRIPTION:${escapar(evento.title)}`,
        'END:VALARM',
      )
    }

    lineas.push('END:VEVENT')
  }

  lineas.push('END:VCALENDAR')

  // iCalendar exige CRLF y una línea en blanco final.
  return `${lineas.map(plegar).join('\r\n')}\r\n`
}

/**
 * Enlace para agregar el evento a Google Calendar desde el navegador.
 * No requiere que el negocio tenga cuenta de Google ni permisos OAuth.
 */
export function googleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${toUtcStamp(event.startsAt)}/${toUtcStamp(event.endsAt)}`,
  })
  if (event.description) params.set('details', event.description)
  if (event.location) params.set('location', event.location)

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
