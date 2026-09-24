/**
 * Utilidades de zona horaria sin dependencias.
 *
 * El negocio piensa en hora local ("el box abre a las 10:00 en Santiago")
 * pero la base de datos guarda instantes absolutos (timestamptz). Estas
 * funciones traducen entre ambos mundos respetando el horario de verano.
 */

type Parts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const formatterCache = new Map<string, Intl.DateTimeFormat>()

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let fmt = formatterCache.get(timeZone)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    formatterCache.set(timeZone, fmt)
  }
  return fmt
}

/** Descompone un instante en sus componentes de reloj de pared en `timeZone`. */
export function zonedParts(date: Date, timeZone: string): Parts {
  const parts = formatterFor(timeZone).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? '0')
  // Intl devuelve "24" para la medianoche en algunos runtimes.
  const hour = get('hour') % 24
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour,
    minute: get('minute'),
    second: get('second'),
  }
}

/** Desfase de la zona respecto a UTC, en milisegundos, para ese instante. */
function offsetMs(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - Math.floor(date.getTime() / 1000) * 1000
}

/**
 * Convierte una hora de pared local a instante absoluto.
 * Se itera dos veces porque el desfase depende del propio instante
 * (cambio de horario de verano).
 */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const wall = Date.UTC(year, month - 1, day, hour, minute, 0)
  let utc = wall - offsetMs(new Date(wall), timeZone)
  utc = wall - offsetMs(new Date(utc), timeZone)
  return new Date(utc)
}

/** "2026-03-14" + "10:30" en la zona dada → Date absoluto. */
export function parseLocalDateTime(dateISO: string, time: string, timeZone: string): Date {
  const [y, m, d] = dateISO.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return zonedTimeToUtc(y ?? 0, m ?? 1, d ?? 1, hh ?? 0, mm ?? 0, timeZone)
}

/** Fecha calendario local en formato "YYYY-MM-DD". */
export function toLocalDateISO(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

/** Día de la semana local: 0 = domingo … 6 = sábado. */
export function localWeekday(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone)
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay()
}

/** Suma días a una fecha calendario "YYYY-MM-DD" sin tocar zonas horarias. */
export function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split('-').map(Number)
  const next = new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, (d ?? 1) + days))
  return next.toISOString().slice(0, 10)
}

/** Diferencia en días calendario entre dos fechas "YYYY-MM-DD". */
export function diffDaysISO(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.split('-').map(Number)
  const [ty, tm, td] = toISO.split('-').map(Number)
  const a = Date.UTC(fy ?? 0, (fm ?? 1) - 1, fd ?? 1)
  const b = Date.UTC(ty ?? 0, (tm ?? 1) - 1, td ?? 1)
  return Math.round((b - a) / 86_400_000)
}

/** Formatea un instante como "10:30" en la zona indicada. */
export function formatLocalTime(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone)
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`
}
