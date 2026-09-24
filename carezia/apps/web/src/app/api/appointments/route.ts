import { NextResponse } from 'next/server'
import { z } from 'zod'
import { DEFAULT_BOOKING, DEFAULT_BUSINESS } from '@carezia/core'
import { BookingError, createAppointment } from '@/lib/booking'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRequestUser } from '@/lib/supabase/server'
import { createCheckout } from '@/lib/payments'
import { sendAppointmentConfirmation } from '@/lib/notifications'
import { uno } from '@/lib/db'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  serviceId: z.uuid(),
  staffId: z.uuid().optional(),
  locationId: z.uuid().optional(),
  startsAt: z.iso.datetime(),
  purchaseId: z.uuid().optional(),
  guestName: z.string().trim().min(2).max(120).optional(),
  guestEmail: z.email().optional(),
  guestPhone: z.string().trim().min(6).max(30).optional(),
  clientNotes: z.string().trim().max(1000).optional(),
})

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Faltan datos de la reserva.', detail: parsed.error.issues },
      { status: 400 },
    )
  }

  const input = parsed.data
  const user = await getRequestUser(request)

  const admin = createAdminClient()
  const { data: settingsRows } = await admin
    .from('settings')
    .select('key, value')
    .in('key', ['booking', 'business'])
  const settings = new Map((settingsRows ?? []).map((r) => [r.key, r.value]))
  const booking = { ...DEFAULT_BOOKING, ...(settings.get('booking') as object) }
  const business = { ...DEFAULT_BUSINESS, ...(settings.get('business') as object) }

  if (booking.require_account && !user) {
    return NextResponse.json(
      { error: 'Necesitas iniciar sesión para reservar.', code: 'AUTH_REQUIRED' },
      { status: 401 },
    )
  }
  if (!user && !input.guestEmail) {
    return NextResponse.json(
      { error: 'Déjanos un correo para enviarte la confirmación.', code: 'EMAIL_REQUIRED' },
      { status: 400 },
    )
  }
  // Un crédito de paquete sólo lo puede gastar su dueño, nunca un invitado.
  if (input.purchaseId && !user) {
    return NextResponse.json(
      { error: 'Inicia sesión para usar tu paquete.', code: 'AUTH_REQUIRED' },
      { status: 401 },
    )
  }

  try {
    const appointment = await createAppointment({
      ...input,
      clientId: user?.id ?? null,
    })

    const { data: details } = await admin
      .from('appointments')
      .select(
        `id, starts_at, price_amount,
         services(name, deposit_amount),
         staff(display_name),
         locations(name, address)`,
      )
      .eq('id', appointment.id)
      .single()

    const serviceName = uno(details?.services)?.name ?? 'Sesión'
    const deposit = uno(details?.services)?.deposit_amount ?? 0
    const email = user?.email ?? input.guestEmail ?? null

    // Abono en línea: sólo si el servicio lo pide y no se pagó con paquete.
    let checkoutUrl: string | null = null
    if (deposit > 0 && !appointment.usedCredit) {
      const origin = new URL(request.url).origin
      const checkout = await createCheckout(
        {
          title: `Abono · ${serviceName}`,
          description: `Reserva en ${business.name}`,
          amount: deposit,
          currency: business.currency,
        },
        {
          kind: 'appointment',
          appointmentId: appointment.id,
          clientId: user?.id ?? null,
          email,
          origin,
          successPath: `/reserva/${appointment.id}`,
          cancelPath: `/reserva/${appointment.id}`,
        },
      )
      checkoutUrl = checkout.url
    }

    if (email) {
      await sendAppointmentConfirmation({
        to: email,
        clientName: input.guestName ?? user?.user_metadata?.full_name ?? 'Hola',
        serviceName,
        staffName: uno(details?.staff)?.display_name ?? 'Nuestro equipo',
        locationName: uno(details?.locations)?.name ?? business.name,
        locationAddress: uno(details?.locations)?.address ?? null,
        startsAt: appointment.startsAt,
        timezone: business.timezone,
        priceAmount: appointment.priceAmount,
        currency: business.currency,
        paidWithPackage: appointment.usedCredit,
        businessName: business.name,
        cancelWindowHours: booking.cancel_window_hours,
        manageUrl: `${new URL(request.url).origin}/reserva/${appointment.id}`,
      })
    }

    return NextResponse.json({ appointment, checkoutUrl }, { status: 201 })
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    }
    console.error('[appointments]', error)
    return NextResponse.json({ error: 'No se pudo crear la reserva.' }, { status: 500 })
  }
}
