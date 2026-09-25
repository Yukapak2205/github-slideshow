import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  APPOINTMENT_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  canCancel,
  formatLocalTime,
  formatMoney,
  googleCalendarUrl,
} from '@carezia/core'
import { getSettings } from '@/lib/settings'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { formatLongDate } from '@/lib/notifications'
import { BotonCancelar } from '@/components/boton-cancelar'
import { uno } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Tu reserva' }

export default async function ReservaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ pago?: string }>
}) {
  const { id } = await params
  const { pago } = await searchParams
  const { business, booking } = await getSettings()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // El identificador de la cita es un UUID aleatorio: funciona como enlace
  // privado para quien reservó sin cuenta.
  const admin = createAdminClient()
  const { data: cita } = await admin
    .from('appointments')
    .select(
      `id, client_id, starts_at, ends_at, status, payment_status, price_amount, purchase_id,
       guest_name, guest_email, client_notes,
       services(name, duration_min),
       staff(display_name, title),
       locations(name, address, map_url)`,
    )
    .eq('id', id)
    .maybeSingle()

  if (!cita) notFound()

  const lugar = uno(cita.locations)
  const enlaceGoogle = googleCalendarUrl({
    uid: `${cita.id}@carezia`,
    title: `${uno(cita.services)?.name ?? 'Sesión'} · ${business.name}`,
    description: `Con ${uno(cita.staff)?.display_name ?? 'nuestro equipo'}`,
    location: [lugar?.name, lugar?.address].filter(Boolean).join(' — '),
    startsAt: cita.starts_at,
    endsAt: cita.ends_at,
  })

  const enPlazo = canCancel(cita.starts_at, booking.cancel_window_hours)
  const cancelable = cita.status !== 'cancelled' && new Date(cita.starts_at) > new Date()
  const esInvitado = !cita.client_id
  const esDueno = Boolean(user && cita.client_id === user.id)

  return (
    <div className="contenedor max-w-2xl py-16">
      {pago === 'ok' && (
        <p className="mb-6 rounded-[var(--radius-suave)] bg-[var(--color-salvia-clara)] px-4 py-3 text-sm">
          Pago recibido. Estamos confirmando tu reserva.
        </p>
      )}
      {pago === 'cancelado' && (
        <p className="mb-6 rounded-[var(--radius-suave)] bg-[var(--color-arena)] px-4 py-3 text-sm">
          No se completó el pago. Tu hora sigue tomada, pero sin abono confirmado.
        </p>
      )}

      <p className="etiqueta">{APPOINTMENT_STATUS_LABEL[cita.status as 'confirmed']}</p>
      <h1 className="mt-4 text-3xl">
        {cita.status === 'cancelled' ? 'Reserva cancelada' : 'Tu hora está agendada'}
      </h1>

      <div className="tarjeta mt-8 bg-white">
        <dl className="space-y-4 text-sm">
          <Dato etiqueta="Servicio" valor={uno(cita.services)?.name ?? '—'} />
          <Dato
            etiqueta="Fecha"
            valor={`${formatLongDate(cita.starts_at, business.timezone)} · ${formatLocalTime(
              new Date(cita.starts_at),
              business.timezone,
            )} h`}
          />
          <Dato etiqueta="Duración" valor={`${uno(cita.services)?.duration_min ?? 0} minutos`} />
          <Dato etiqueta="Profesional" valor={uno(cita.staff)?.display_name ?? '—'} />
          <Dato
            etiqueta="Lugar"
            valor={[uno(cita.locations)?.name, uno(cita.locations)?.address].filter(Boolean).join(' — ')}
          />
          <Dato
            etiqueta="Valor"
            valor={
              cita.purchase_id
                ? 'Pagado con tu paquete'
                : `${formatMoney(cita.price_amount, business.currency)} · ${
                    PAYMENT_STATUS_LABEL[cita.payment_status as 'unpaid']
                  }`
            }
          />
          {cita.client_notes && <Dato etiqueta="Tus notas" valor={cita.client_notes} />}
        </dl>
      </div>

      {cita.status !== 'cancelled' && (
        <div className="mt-6">
          <p className="text-sm font-medium">Agrégala a tu calendario</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={enlaceGoogle}
              target="_blank"
              rel="noreferrer"
              className="boton-secundario !px-4 !py-2 text-xs"
            >
              Google Calendar
            </a>
            <a
              href={`/api/appointments/${cita.id}/calendario`}
              className="boton-secundario !px-4 !py-2 text-xs"
            >
              Apple Calendar y otros (.ics)
            </a>
          </div>
        </div>
      )}

      {cancelable && (esDueno || esInvitado) && (
        <div className="mt-6">
          <BotonCancelar
            appointmentId={cita.id}
            requiereEmail={esInvitado && !esDueno}
            dentroDePlazo={enPlazo}
            horasDePlazo={booking.cancel_window_hours}
          />
        </div>
      )}

      <p className="mt-8 text-sm text-[var(--color-tinta-suave)]">
        Guarda este enlace para consultar o cancelar tu reserva.{' '}
        <Link href="/mi-cuenta" className="text-[var(--color-cobre)] hover:underline">
          Ver todas mis reservas
        </Link>
      </p>
    </div>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between gap-6 border-b border-[var(--color-arena)] pb-4 last:border-0 last:pb-0">
      <dt className="shrink-0 text-[var(--color-tinta-suave)]">{etiqueta}</dt>
      <dd className="text-right">{valor}</dd>
    </div>
  )
}
