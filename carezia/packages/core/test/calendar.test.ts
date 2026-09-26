import { describe, expect, it } from 'vitest'
import { buildCalendar, googleCalendarUrl } from '../src'

const evento = {
  uid: 'cita-1@carezia.cl',
  title: 'Limpieza facial profunda',
  description: 'Con Valentina Rojas',
  location: 'Av. Providencia 1234',
  startsAt: '2026-03-13T13:00:00.000Z',
  endsAt: '2026-03-13T14:15:00.000Z',
  createdAt: '2026-03-01T10:00:00.000Z',
}

describe('buildCalendar', () => {
  it('genera un calendario válido con el evento', () => {
    const ics = buildCalendar([evento], { calendarName: 'Carezia' })

    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('END:VCALENDAR')
    expect(ics).toContain('UID:cita-1@carezia.cl')
    expect(ics).toContain('DTSTART:20260313T130000Z')
    expect(ics).toContain('DTEND:20260313T141500Z')
    expect(ics).toContain('SUMMARY:Limpieza facial profunda')
  })

  it('usa CRLF, como exige la norma', () => {
    const ics = buildCalendar([evento], { calendarName: 'Carezia' })
    expect(ics.endsWith('\r\n')).toBe(true)
    expect(ics.split('\r\n').length).toBeGreaterThan(5)
    // Ningún salto de línea suelto sin su retorno de carro.
    expect(/[^\r]\n/.test(ics)).toBe(false)
  })

  it('escapa comas, puntos y coma y saltos de línea', () => {
    const ics = buildCalendar(
      [{ ...evento, title: 'Facial, corporal; todo', description: 'Línea 1\nLínea 2' }],
      { calendarName: 'Carezia' },
    )
    expect(ics).toContain('SUMMARY:Facial\\, corporal\; todo')
    expect(ics).toContain('DESCRIPTION:Línea 1\\nLínea 2')
  })

  it('pliega las líneas largas sin romper caracteres multibyte', () => {
    const ics = buildCalendar(
      [{ ...evento, description: 'Sesión con ñ y tildes áéíóú '.repeat(12) }],
      { calendarName: 'Carezia' },
    )

    const codificador = new TextEncoder()
    for (const linea of ics.split('\r\n')) {
      expect(codificador.encode(linea).length).toBeLessThanOrEqual(75)
    }
    // El texto sobrevive al plegado: se quitan los cortes y debe reaparecer.
    expect(ics.replace(/\r\n /g, '')).toContain('Sesión con ñ y tildes áéíóú')
  })

  it('agrega la alarma cuando se pide', () => {
    const ics = buildCalendar([evento], { calendarName: 'Carezia', alarmMinutesBefore: 120 })
    expect(ics).toContain('BEGIN:VALARM')
    expect(ics).toContain('TRIGGER:-PT120M')
  })

  it('marca la cita cancelada para que desaparezca del calendario', () => {
    const ics = buildCalendar([{ ...evento, status: 'CANCELLED', sequence: 1 }], {
      calendarName: 'Carezia',
    })
    expect(ics).toContain('STATUS:CANCELLED')
    expect(ics).toContain('SEQUENCE:1')
  })
})

describe('googleCalendarUrl', () => {
  it('arma el enlace con fechas en UTC', () => {
    const url = new URL(googleCalendarUrl(evento))
    expect(url.searchParams.get('dates')).toBe('20260313T130000Z/20260313T141500Z')
    expect(url.searchParams.get('text')).toBe('Limpieza facial profunda')
    expect(url.searchParams.get('location')).toBe('Av. Providencia 1234')
  })
})
