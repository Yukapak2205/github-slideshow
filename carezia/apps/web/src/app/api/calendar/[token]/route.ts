import { NextResponse } from 'next/server'
import { DEFAULT_BUSINESS, buildCalendar, type CalendarEvent } from '@carezia/core'
import { createAdminClient } from '@/lib/supabase/admin'
import { uno } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * Feed de calendario de un/a profesional, en formato iCalendar.
 *
 * Se suscribe una sola vez desde Google Calendar (Otros calendarios →
 * Desde URL) o desde el iPhone, y a partir de ahí su agenda de Carezia
 * aparece junto al resto de sus compromisos. Es de sólo lectura: lo que
 * se agende en Google no vuelve a Carezia, porque la agenda del local es
 * la única fuente de verdad de las horas disponibles.
 *
 * La URL lleva un token secreto e irrepetible. Quien lo tenga ve esa
 * agenda, así que el token se puede rotar desde la base de datos.
 */
export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params

  // Sin un UUID bien formado ni siquiera se consulta la base.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return new NextResponse('Calendario no encontrado.', { status: 404 })
  }

  const admin = createAdminClient()

  const { data: profesional } = await admin
    .from('staff')
    .select('id, display_name')
    .eq('calendar_token', token)
    .maybeSingle()

  if (!profesional) {
    return new NextResponse('Calendario no encontrado.', { status: 404 })
  }

  const { data: ajuste } = await admin
    .from('settings')
    .select('value')
    .eq('key', 'business')
    .maybeSingle()
  const business = { ...DEFAULT_BUSINESS, ...(ajuste?.value as object) }

  // Un mes hacia atrás para el historial reciente, y toda la agenda futura.
  const desde = new Date(Date.now() - 30 * 86_400_000).toISOString()

  const { data: citas } = await admin
    .from('appointments')
    .select(
      `id, starts_at, ends_at, status, calendar_sequence, guest_name, client_notes, created_at,
       services(name), locations(name, address), profiles(full_name, phone)`,
    )
    .eq('staff_id', profesional.id)
    .gte('starts_at', desde)
    .order('starts_at')
    .limit(1000)

  const eventos: CalendarEvent[] = (citas ?? []).map((cita) => {
    const perfil = uno(cita.profiles)
    const lugar = uno(cita.locations)
    const cliente = perfil?.full_name || cita.guest_name || 'Cliente'

    const detalles = [
      `Cliente: ${cliente}`,
      perfil?.phone ? `Teléfono: ${perfil.phone}` : null,
      cita.client_notes ? `Notas: ${cita.client_notes}` : null,
    ].filter(Boolean)

    return {
      uid: `${cita.id}@carezia`,
      title: `${uno(cita.services)?.name ?? 'Sesión'} · ${cliente}`,
      description: detalles.join('\n'),
      location: [lugar?.name, lugar?.address].filter(Boolean).join(' — '),
      startsAt: cita.starts_at,
      endsAt: cita.ends_at,
      createdAt: cita.created_at,
      sequence: cita.calendar_sequence ?? 0,
      // Una cita cancelada se publica como CANCELLED en vez de omitirse:
      // así desaparece del calendario de quien ya la tenía sincronizada.
      status: cita.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED',
    }
  })

  const ics = buildCalendar(eventos, {
    calendarName: `${business.name} · ${profesional.display_name}`,
    refreshIntervalMinutes: 60,
  })

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="carezia.ics"',
      // El token es secreto: ningún intermediario debe guardar esto.
      'Cache-Control': 'private, no-store',
    },
  })
}
