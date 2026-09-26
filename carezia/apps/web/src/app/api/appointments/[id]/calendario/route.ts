import { NextResponse } from 'next/server'
import { DEFAULT_BUSINESS, buildCalendar } from '@carezia/core'
import { createAdminClient } from '@/lib/supabase/admin'
import { uno } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * Archivo .ics de una cita, para agregarla al calendario del teléfono.
 *
 * Igual que la página de la reserva, se protege por lo impredecible del
 * identificador: es un UUID aleatorio que sólo conoce quien reservó. No
 * expone datos de otras personas ni la agenda completa.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return new NextResponse('Reserva no encontrada.', { status: 404 })
  }

  const admin = createAdminClient()
  const { data: cita } = await admin
    .from('appointments')
    .select(
      `id, starts_at, ends_at, status, calendar_sequence, created_at,
       services(name), staff(display_name), locations(name, address)`,
    )
    .eq('id', id)
    .maybeSingle()

  if (!cita) {
    return new NextResponse('Reserva no encontrada.', { status: 404 })
  }

  const { data: ajuste } = await admin
    .from('settings')
    .select('value')
    .eq('key', 'business')
    .maybeSingle()
  const business = { ...DEFAULT_BUSINESS, ...(ajuste?.value as object) }

  const lugar = uno(cita.locations)
  const ics = buildCalendar(
    [
      {
        uid: `${cita.id}@carezia`,
        title: `${uno(cita.services)?.name ?? 'Sesión'} · ${business.name}`,
        description: `Con ${uno(cita.staff)?.display_name ?? 'nuestro equipo'}`,
        location: [lugar?.name, lugar?.address].filter(Boolean).join(' — '),
        startsAt: cita.starts_at,
        endsAt: cita.ends_at,
        createdAt: cita.created_at,
        sequence: cita.calendar_sequence ?? 0,
        status: cita.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED',
        organizerName: business.name,
        organizerEmail: business.email || undefined,
      },
    ],
    { calendarName: business.name, alarmMinutesBefore: 120 },
  )

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="carezia-${cita.id.slice(0, 8)}.ics"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
