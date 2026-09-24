import Link from 'next/link'
import {
  APPOINTMENT_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  addDaysISO,
  formatLocalTime,
  formatMoney,
  parseLocalDateTime,
  toLocalDateISO,
} from '@carezia/core'
import { getSettings } from '@/lib/settings'
import { createClient } from '@/lib/supabase/server'
import { formatLongDate } from '@/lib/notifications'
import { bloquearHorario, cambiarEstadoCita, eliminarBloqueo } from './actions'
import { uno } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string }>
}) {
  const { business } = await getSettings()
  const supabase = await createClient()

  const params = await searchParams
  const hoy = toLocalDateISO(new Date(), business.timezone)
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(params.dia ?? '') ? params.dia! : hoy

  const desde = parseLocalDateTime(dia, '00:00', business.timezone)
  const hasta = parseLocalDateTime(addDaysISO(dia, 1), '00:00', business.timezone)

  const [{ data: citas }, { data: equipo }, { data: bloqueos }] = await Promise.all([
    supabase
      .from('appointments')
      .select(
        `id, starts_at, ends_at, status, payment_status, price_amount, purchase_id,
         guest_name, guest_phone, client_notes,
         services(name), staff(id, display_name), profiles(full_name, phone)`,
      )
      .gte('starts_at', desde.toISOString())
      .lt('starts_at', hasta.toISOString())
      .order('starts_at'),
    supabase.from('staff').select('id, display_name').eq('is_active', true).order('sort_order'),
    supabase
      .from('time_off')
      .select('id, staff_id, starts_at, ends_at, reason')
      .gte('ends_at', desde.toISOString())
      .lt('starts_at', hasta.toISOString()),
  ])

  const activas = (citas ?? []).filter((c) => c.status !== 'cancelled')
  const ingresos = activas.reduce((total, c) => total + (c.purchase_id ? 0 : c.price_amount), 0)

  return (
    <div className="space-y-10">
      {/* ---------- navegación de días ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl">{formatLongDate(desde.toISOString(), business.timezone)}</h2>
          <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
            {activas.length} {activas.length === 1 ? 'reserva' : 'reservas'} ·{' '}
            {formatMoney(ingresos, business.currency)} por cobrar en caja
          </p>
        </div>

        <div className="flex gap-2">
          <Link href={`/admin?dia=${addDaysISO(dia, -1)}`} className="boton-secundario !px-4 !py-2 text-xs">
            ← Día anterior
          </Link>
          {dia !== hoy && (
            <Link href="/admin" className="boton-secundario !px-4 !py-2 text-xs">
              Hoy
            </Link>
          )}
          <Link href={`/admin?dia=${addDaysISO(dia, 1)}`} className="boton-secundario !px-4 !py-2 text-xs">
            Día siguiente →
          </Link>
        </div>
      </div>

      {/* ---------- citas ---------- */}
      {activas.length === 0 && (citas ?? []).length === 0 ? (
        <p className="tarjeta text-sm text-[var(--color-tinta-suave)]">
          No hay reservas para este día.
        </p>
      ) : (
        <ul className="space-y-3">
          {(citas ?? []).map((cita) => (
            <li
              key={cita.id}
              className={`tarjeta bg-white ${cita.status === 'cancelled' ? 'opacity-50' : ''}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium">
                    {formatLocalTime(new Date(cita.starts_at), business.timezone)} –{' '}
                    {formatLocalTime(new Date(cita.ends_at), business.timezone)} ·{' '}
                    {uno(cita.services)?.name}
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
                    {uno(cita.profiles)?.full_name || cita.guest_name || 'Sin nombre'}
                    {(uno(cita.profiles)?.phone || cita.guest_phone) &&
                      ` · ${uno(cita.profiles)?.phone || cita.guest_phone}`}
                    {' · '}
                    {uno(cita.staff)?.display_name}
                  </p>
                  {cita.client_notes && (
                    <p className="mt-2 rounded-[var(--radius-suave)] bg-[var(--color-arena)]/50 px-3 py-2 text-xs">
                      {cita.client_notes}
                    </p>
                  )}
                </div>

                <div className="text-right text-sm">
                  <p>{APPOINTMENT_STATUS_LABEL[cita.status as 'confirmed']}</p>
                  <p className="text-[var(--color-tinta-suave)]">
                    {cita.purchase_id
                      ? 'Con paquete'
                      : `${formatMoney(cita.price_amount, business.currency)} · ${
                          PAYMENT_STATUS_LABEL[cita.payment_status as 'unpaid']
                        }`}
                  </p>
                </div>
              </div>

              {cita.status !== 'cancelled' && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--color-arena)] pt-4">
                  {cita.status === 'pending' && (
                    <AccionEstado id={cita.id} estado="confirmed" texto="Confirmar" />
                  )}
                  <AccionEstado id={cita.id} estado="completed" texto="Marcar realizada" />
                  <AccionEstado id={cita.id} estado="no_show" texto="No asistió" />
                  <AccionEstado id={cita.id} estado="cancelled" texto="Cancelar" />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* ---------- bloqueos ---------- */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="tarjeta">
          <h3 className="text-lg">Bloquear horario</h3>
          <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
            Vacaciones, feriados o una tarde libre. Las horas bloqueadas desaparecen de la
            agenda pública al instante.
          </p>

          <form action={bloquearHorario} className="mt-5 space-y-4">
            <div>
              <label htmlFor="staff_id" className="etiqueta-campo">Profesional</label>
              <select id="staff_id" name="staff_id" className="campo">
                <option value="">Todo el local (feriado)</option>
                {(equipo ?? []).map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="starts_at" className="etiqueta-campo">Desde</label>
                <input
                  id="starts_at"
                  name="starts_at"
                  type="datetime-local"
                  required
                  className="campo"
                />
              </div>
              <div>
                <label htmlFor="ends_at" className="etiqueta-campo">Hasta</label>
                <input id="ends_at" name="ends_at" type="datetime-local" required className="campo" />
              </div>
            </div>

            <div>
              <label htmlFor="reason" className="etiqueta-campo">Motivo (opcional)</label>
              <input id="reason" name="reason" className="campo" />
            </div>

            <button type="submit" className="boton-primario">Bloquear</button>
          </form>
        </div>

        <div className="tarjeta">
          <h3 className="text-lg">Bloqueos de este día</h3>
          {(bloqueos ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-[var(--color-tinta-suave)]">Ninguno.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {(bloqueos ?? []).map((bloqueo) => (
                <li key={bloqueo.id} className="flex items-center justify-between gap-4 text-sm">
                  <span>
                    {formatLocalTime(new Date(bloqueo.starts_at), business.timezone)} –{' '}
                    {formatLocalTime(new Date(bloqueo.ends_at), business.timezone)}
                    <span className="block text-[var(--color-tinta-suave)]">
                      {bloqueo.staff_id
                        ? (equipo ?? []).find((p) => p.id === bloqueo.staff_id)?.display_name
                        : 'Todo el local'}
                      {bloqueo.reason ? ` · ${bloqueo.reason}` : ''}
                    </span>
                  </span>
                  <form action={eliminarBloqueo}>
                    <input type="hidden" name="id" value={bloqueo.id} />
                    <button type="submit" className="text-xs text-[var(--color-cobre)] hover:underline">
                      Quitar
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}

function AccionEstado({ id, estado, texto }: { id: string; estado: string; texto: string }) {
  return (
    <form action={cambiarEstadoCita}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={estado} />
      <button
        type="submit"
        className="rounded-full border border-[var(--color-arena-oscura)] px-3 py-1.5 text-xs transition-colors hover:border-[var(--color-cobre)]"
      >
        {texto}
      </button>
    </form>
  )
}
