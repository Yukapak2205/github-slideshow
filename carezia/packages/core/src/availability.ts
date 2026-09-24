import {
  addDaysISO,
  diffDaysISO,
  localWeekday,
  parseLocalDateTime,
  toLocalDateISO,
} from './time'

/** Turno semanal recurrente de un/a profesional. */
export interface WorkShift {
  weekday: number // 0 = domingo … 6 = sábado
  start_time: string // "10:00" hora local del local
  end_time: string // "19:00"
}

/** Intervalo ya ocupado: otra cita, vacaciones, feriado. */
export interface BusyInterval {
  start: string | Date
  end: string | Date
}

export interface AvailabilityOptions {
  timezone: string
  /** Primer día a evaluar, "YYYY-MM-DD" en hora local. */
  fromDate: string
  /** Último día a evaluar, inclusive. */
  toDate: string
  shifts: WorkShift[]
  busy: BusyInterval[]
  /** Duración de la sesión en minutos. */
  durationMin: number
  /** Minutos de limpieza reservados después de la sesión. */
  bufferMin: number
  /** Cada cuántos minutos se ofrece una hora de inicio. */
  slotIntervalMin: number
  /** Anticipación mínima para reservar, en horas. */
  minLeadHours: number
  /** Instante actual; inyectable para tests. */
  now?: Date
}

export interface DayAvailability {
  /** "YYYY-MM-DD" en hora local. */
  date: string
  /** Horas de inicio disponibles, como instantes ISO en UTC. */
  slots: string[]
}

function toMs(value: string | Date): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime()
}

/**
 * Calcula las horas disponibles día por día.
 *
 * Una hora entra si el bloque completo (sesión + limpieza) cabe dentro
 * de un turno y no se cruza con nada ocupado. El buffer se reserva en la
 * agenda pero no impide que el turno termine justo al final de la sesión:
 * si el turno cierra a las 19:00, una sesión de 60' puede empezar a las
 * 18:00 aunque su limpieza se extienda más allá del cierre.
 */
export function computeAvailability(options: AvailabilityOptions): DayAvailability[] {
  const {
    timezone,
    fromDate,
    toDate,
    shifts,
    busy,
    durationMin,
    bufferMin,
    slotIntervalMin,
    minLeadHours,
    now = new Date(),
  } = options

  const earliest = now.getTime() + minLeadHours * 3_600_000
  const blocked = busy
    .map((b) => ({ start: toMs(b.start), end: toMs(b.end) }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start)

  const shiftsByWeekday = new Map<number, WorkShift[]>()
  for (const shift of shifts) {
    const list = shiftsByWeekday.get(shift.weekday) ?? []
    list.push(shift)
    shiftsByWeekday.set(shift.weekday, list)
  }

  const totalDays = diffDaysISO(fromDate, toDate)
  const result: DayAvailability[] = []
  if (totalDays < 0) return result

  for (let offset = 0; offset <= totalDays; offset++) {
    const date = addDaysISO(fromDate, offset)
    const noon = parseLocalDateTime(date, '12:00', timezone)
    const weekday = localWeekday(noon, timezone)
    const daySlots: string[] = []

    for (const shift of shiftsByWeekday.get(weekday) ?? []) {
      const shiftStart = parseLocalDateTime(date, shift.start_time, timezone).getTime()
      const shiftEnd = parseLocalDateTime(date, shift.end_time, timezone).getTime()
      const step = slotIntervalMin * 60_000
      const sessionMs = durationMin * 60_000
      const blockMs = (durationMin + bufferMin) * 60_000

      for (let start = shiftStart; start + sessionMs <= shiftEnd; start += step) {
        if (start < earliest) continue
        const blockEnd = start + blockMs
        const collides = blocked.some((b) => b.start < blockEnd && b.end > start)
        if (collides) continue
        daySlots.push(new Date(start).toISOString())
      }
    }

    // Varios turnos en un mismo día pueden generar horas repetidas.
    const unique = Array.from(new Set(daySlots)).sort()
    result.push({ date, slots: unique })
  }

  return result
}

/**
 * Une la disponibilidad de varios profesionales para el modo
 * "me da lo mismo con quién", guardando quién puede tomar cada hora.
 */
export function mergeAvailability(
  perStaff: Array<{ staffId: string; days: DayAvailability[] }>,
): Array<{ date: string; slots: Array<{ start: string; staffIds: string[] }> }> {
  const byDate = new Map<string, Map<string, string[]>>()

  for (const { staffId, days } of perStaff) {
    for (const day of days) {
      const slots = byDate.get(day.date) ?? new Map<string, string[]>()
      for (const slot of day.slots) {
        const ids = slots.get(slot) ?? []
        ids.push(staffId)
        slots.set(slot, ids)
      }
      byDate.set(day.date, slots)
    }
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, slots]) => ({
      date,
      slots: Array.from(slots.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([start, staffIds]) => ({ start, staffIds })),
    }))
}

/** Rango de días que la agenda acepta según los ajustes del negocio. */
export function bookingWindow(
  now: Date,
  timezone: string,
  maxAdvanceDays: number,
): { fromDate: string; toDate: string } {
  const fromDate = toLocalDateISO(now, timezone)
  return { fromDate, toDate: addDaysISO(fromDate, maxAdvanceDays) }
}

/** ¿Alcanza a cancelar sin costo? */
export function canCancel(
  startsAt: string | Date,
  cancelWindowHours: number,
  now: Date = new Date(),
): boolean {
  return toMs(startsAt) - now.getTime() >= cancelWindowHours * 3_600_000
}
