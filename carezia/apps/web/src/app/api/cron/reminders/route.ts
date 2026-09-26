import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { DEFAULT_BOOKING, DEFAULT_BUSINESS, googleCalendarUrl } from '@carezia/core'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendAppointmentReminder } from '@/lib/notifications'
import { uno } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Compara sin filtrar información por el tiempo que tarda.
 * Un `===` sobre un secreto permite adivinarlo carácter a carácter.
 */
function secretoValido(recibido: string, esperado: string): boolean {
  const a = Buffer.from(recibido)
  const b = Buffer.from(esperado)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Envía los recordatorios de las citas próximas.
 *
 * Pensado para ejecutarse cada hora (ver `vercel.json`). Es idempotente:
 * marca cada cita con `reminder_sent_at`, así que repetir la ejecución no
 * vuelve a escribirle a nadie.
 */
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET
  if (!secreto) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado.' }, { status: 503 })
  }

  const cabecera = request.headers.get('authorization') ?? ''
  const token = cabecera.toLowerCase().startsWith('bearer ') ? cabecera.slice(7).trim() : ''
  if (!secretoValido(token, secreto)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: ajustes } = await admin
    .from('settings')
    .select('key, value')
    .in('key', ['booking', 'business'])
  const mapa = new Map((ajustes ?? []).map((r) => [r.key, r.value]))
  const booking = { ...DEFAULT_BOOKING, ...(mapa.get('booking') as object) }
  const business = { ...DEFAULT_BUSINESS, ...(mapa.get('business') as object) }

  if (booking.reminder_hours <= 0) {
    return NextResponse.json({ ok: true, enviados: 0, motivo: 'recordatorios desactivados' })
  }

  const ahora = Date.now()
  // Ventana: desde ahora hasta el punto de recordatorio. Se incluye todo lo
  // que caiga dentro, no sólo la hora exacta, para que una ejecución fallida
  // se recupere en la siguiente en vez de perder el aviso.
  const limite = new Date(ahora + booking.reminder_hours * 3_600_000).toISOString()

  const { data: citas, error } = await admin
    .from('appointments')
    .select(
      `id, starts_at, guest_name, guest_email, client_id, status,
       services(name, duration_min), staff(display_name),
       locations(name, address), profiles(full_name, email)`,
    )
    .is('reminder_sent_at', null)
    .in('status', ['pending', 'confirmed'])
    .gt('starts_at', new Date(ahora).toISOString())
    .lte('starts_at', limite)
    .order('starts_at')
    .limit(200)

  if (error) {
    console.error('[cron/reminders]', error)
    return NextResponse.json({ error: 'No se pudieron leer las citas.' }, { status: 500 })
  }

  const origen = new URL(request.url).origin
  let enviados = 0
  let sinCorreo = 0

  for (const cita of citas ?? []) {
    const perfil = uno(cita.profiles)
    const servicio = uno(cita.services)
    const lugar = uno(cita.locations)
    const destino = perfil?.email ?? cita.guest_email

    if (!destino) {
      // Sin correo no hay a quién avisar; se marca igual para no revisarla
      // en cada ejecución.
      sinCorreo++
      await admin
        .from('appointments')
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq('id', cita.id)
      continue
    }

    const duracion = servicio?.duration_min ?? 60
    const calendarUrl = googleCalendarUrl({
      uid: `${cita.id}@carezia`,
      title: `${servicio?.name ?? 'Sesión'} · ${business.name}`,
      startsAt: cita.starts_at,
      endsAt: new Date(new Date(cita.starts_at).getTime() + duracion * 60_000),
      location: [lugar?.name, lugar?.address].filter(Boolean).join(' — '),
    })

    const enviado = await sendAppointmentReminder({
      to: destino,
      clientName: perfil?.full_name || cita.guest_name || 'Hola',
      serviceName: servicio?.name ?? 'Sesión',
      staffName: uno(cita.staff)?.display_name ?? 'Nuestro equipo',
      locationName: lugar?.name ?? business.name,
      locationAddress: lugar?.address ?? null,
      startsAt: cita.starts_at,
      timezone: business.timezone,
      businessName: business.name,
      cancelWindowHours: booking.cancel_window_hours,
      manageUrl: `${origen}/reserva/${cita.id}`,
      calendarUrl,
    })

    // Se marca aunque el envío falle: reintentar en bucle cada hora sólo
    // multiplicaría el problema. El fallo queda en el log.
    await admin
      .from('appointments')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', cita.id)

    if (enviado) enviados++
  }

  return NextResponse.json({
    ok: true,
    revisadas: (citas ?? []).length,
    enviados,
    sinCorreo,
  })
}
