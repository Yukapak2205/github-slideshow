import { NextResponse } from 'next/server'
import { DEFAULT_BOOKING, canCancel } from '@carezia/core'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRequestUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const body = await request.json().catch(() => ({}) as { reason?: string })

  const user = await getRequestUser(request)

  const admin = createAdminClient()
  const { data: appointment } = await admin
    .from('appointments')
    .select('id, client_id, guest_email, starts_at, status, purchase_id')
    .eq('id', id)
    .maybeSingle()

  if (!appointment) {
    return NextResponse.json({ error: 'La reserva no existe.' }, { status: 404 })
  }
  if (appointment.status === 'cancelled') {
    return NextResponse.json({ ok: true, alreadyCancelled: true })
  }

  // Quien reservó con cuenta necesita ser quien cancela. El personal puede
  // cancelar cualquier cita.
  let allowed = false
  if (user) {
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    allowed = appointment.client_id === user.id || profile?.role === 'admin' || profile?.role === 'staff'
  } else if (!appointment.client_id) {
    // Reserva de invitado: se valida con el correo usado al reservar.
    allowed =
      typeof body.email === 'string' &&
      body.email.trim().toLowerCase() === (appointment.guest_email ?? '').toLowerCase()
  }

  if (!allowed) {
    return NextResponse.json({ error: 'No puedes cancelar esta reserva.' }, { status: 403 })
  }

  const { data: settingRow } = await admin
    .from('settings')
    .select('value')
    .eq('key', 'booking')
    .maybeSingle()
  const booking = { ...DEFAULT_BOOKING, ...(settingRow?.value as object) }

  const inTime = canCancel(appointment.starts_at, booking.cancel_window_hours)

  // Fuera de plazo el crédito del paquete se pierde: la hora ya no se puede
  // revender. Dentro de plazo se devuelve.
  if (appointment.purchase_id && inTime) {
    await admin.rpc('refund_package_credit', { p_appointment_id: appointment.id })
  }

  const { error } = await admin
    .from('appointments')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancel_reason: typeof body.reason === 'string' ? body.reason.slice(0, 500) : null,
    })
    .eq('id', appointment.id)

  if (error) {
    return NextResponse.json({ error: 'No se pudo cancelar.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, creditRefunded: Boolean(appointment.purchase_id && inTime), inTime })
}
