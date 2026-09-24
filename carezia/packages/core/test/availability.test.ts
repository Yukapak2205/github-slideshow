import { describe, expect, it } from 'vitest'
import {
  canCancel,
  computeAvailability,
  formatMoney,
  mergeAvailability,
  packageSavings,
  parseLocalDateTime,
  toLocalDateISO,
} from '../src'

const TZ = 'America/Santiago'
// Viernes 13 de marzo de 2026, 08:00 en Santiago.
const NOW = parseLocalDateTime('2026-03-13', '08:00', TZ)

const shifts = [{ weekday: 5, start_time: '10:00', end_time: '13:00' }]

const base = {
  timezone: TZ,
  fromDate: '2026-03-13',
  toDate: '2026-03-13',
  shifts,
  busy: [],
  durationMin: 60,
  bufferMin: 15,
  slotIntervalMin: 30,
  minLeadHours: 0,
  now: NOW,
}

describe('computeAvailability', () => {
  it('genera horas cada slotIntervalMin dentro del turno', () => {
    const [day] = computeAvailability(base)
    expect(day!.date).toBe('2026-03-13')
    // 10:00, 10:30, 11:00, 11:30, 12:00 — las 12:30 no cabe (terminaría 13:30)
    expect(day!.slots.map((s) => new Date(s).toISOString())).toHaveLength(5)
    expect(new Date(day!.slots[0]!).getTime()).toBe(
      parseLocalDateTime('2026-03-13', '10:00', TZ).getTime(),
    )
  })

  it('permite empezar aunque la limpieza pase del cierre', () => {
    const [day] = computeAvailability({ ...base, slotIntervalMin: 60 })
    // 12:00 termina a las 13:00 justo con el cierre; su buffer se desborda y aun así vale.
    expect(day!.slots).toHaveLength(3)
  })

  it('descarta horas que chocan con una cita, incluido su buffer', () => {
    const busy = [
      {
        start: parseLocalDateTime('2026-03-13', '11:00', TZ),
        end: parseLocalDateTime('2026-03-13', '12:00', TZ),
      },
    ]
    const [day] = computeAvailability({ ...base, busy })
    const times = day!.slots.map((s) => s)
    // 10:00 bloquea hasta 11:15 → choca. 10:30 también. Queda sólo 12:00.
    expect(times).toHaveLength(1)
    expect(new Date(times[0]!).getTime()).toBe(
      parseLocalDateTime('2026-03-13', '12:00', TZ).getTime(),
    )
  })

  it('respeta la anticipación mínima', () => {
    const [day] = computeAvailability({ ...base, minLeadHours: 3 })
    // Con 3 h desde las 08:00, la primera hora válida es 11:00.
    expect(new Date(day!.slots[0]!).getTime()).toBe(
      parseLocalDateTime('2026-03-13', '11:00', TZ).getTime(),
    )
  })

  it('devuelve el día vacío cuando no hay turno', () => {
    const days = computeAvailability({ ...base, fromDate: '2026-03-14', toDate: '2026-03-14' })
    expect(days).toHaveLength(1)
    expect(days[0]!.slots).toEqual([])
  })

  it('cubre el rango completo de días pedido', () => {
    const days = computeAvailability({ ...base, fromDate: '2026-03-13', toDate: '2026-03-19' })
    expect(days.map((d) => d.date)).toEqual([
      '2026-03-13',
      '2026-03-14',
      '2026-03-15',
      '2026-03-16',
      '2026-03-17',
      '2026-03-18',
      '2026-03-19',
    ])
  })
})

describe('zonas horarias', () => {
  it('sobrevive al cambio de horario de verano en Chile', () => {
    // En 2026 Chile atrasa el reloj el 5 de abril. Un turno de 10:00
    // debe seguir siendo 10:00 local antes y después del cambio.
    const before = parseLocalDateTime('2026-04-03', '10:00', TZ)
    const after = parseLocalDateTime('2026-04-10', '10:00', TZ)
    expect(toLocalDateISO(before, TZ)).toBe('2026-04-03')
    expect(toLocalDateISO(after, TZ)).toBe('2026-04-10')
    // El desfase cambia, así que la diferencia no es un múltiplo exacto de 7 días.
    expect(after.getTime() - before.getTime()).not.toBe(7 * 86_400_000)
  })
})

describe('mergeAvailability', () => {
  it('agrupa por hora quién puede atender', () => {
    const merged = mergeAvailability([
      { staffId: 'a', days: [{ date: '2026-03-13', slots: ['2026-03-13T13:00:00.000Z'] }] },
      {
        staffId: 'b',
        days: [
          {
            date: '2026-03-13',
            slots: ['2026-03-13T13:00:00.000Z', '2026-03-13T14:00:00.000Z'],
          },
        ],
      },
    ])
    expect(merged).toHaveLength(1)
    expect(merged[0]!.slots[0]!.staffIds).toEqual(['a', 'b'])
    expect(merged[0]!.slots[1]!.staffIds).toEqual(['b'])
  })
})

describe('dinero', () => {
  it('formatea CLP sin decimales', () => {
    expect(formatMoney(45000, 'CLP').replace(/ /g, ' ')).toContain('45.000')
  })

  it('calcula el ahorro de un paquete', () => {
    expect(packageSavings(160000, 45000, 4)).toEqual({ amount: 20000, percent: 11 })
  })
})

describe('canCancel', () => {
  it('bloquea la cancelación dentro de la ventana', () => {
    const start = new Date(NOW.getTime() + 3 * 3_600_000)
    expect(canCancel(start, 24, NOW)).toBe(false)
    expect(canCancel(start, 2, NOW)).toBe(true)
  })
})
