import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  APPOINTMENT_STATUS_LABEL,
  PURCHASE_STATUS_LABEL,
  formatLocalTime,
  formatMoney,
} from '@carezia/core'
import { getSettings } from '@/lib/settings'
import { createClient } from '@/lib/supabase/server'
import { formatLongDate } from '@/lib/notifications'
import { BotonSalir } from '@/components/boton-salir'
import { uno } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Mi cuenta' }

export default async function MiCuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ compra?: string }>
}) {
  const { compra } = await searchParams
  const { business } = await getSettings()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/ingresar?volver=/mi-cuenta')

  const ahora = new Date().toISOString()

  const [{ data: proximas }, { data: pasadas }, { data: paquetes }, { data: perfil }] =
    await Promise.all([
      supabase
        .from('appointments')
        .select('id, starts_at, status, price_amount, purchase_id, services(name), staff(display_name)')
        .eq('client_id', user.id)
        .gte('starts_at', ahora)
        .neq('status', 'cancelled')
        .order('starts_at'),
      supabase
        .from('appointments')
        .select('id, starts_at, status, services(name)')
        .eq('client_id', user.id)
        .lt('starts_at', ahora)
        .order('starts_at', { ascending: false })
        .limit(10),
      supabase
        .from('package_purchases')
        .select('id, package_name, sessions_total, sessions_used, status, expires_at, price_amount')
        .eq('client_id', user.id)
        .in('status', ['active', 'pending'])
        .order('purchased_at', { ascending: false }),
      supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    ])

  return (
    <div className="contenedor py-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl">Hola{perfil?.full_name ? `, ${perfil.full_name.split(' ')[0]}` : ''}</h1>
          <p className="mt-2 text-sm text-[var(--color-tinta-suave)]">{user.email}</p>
        </div>
        <BotonSalir />
      </div>

      {compra === 'pendiente' && (
        <p className="mt-8 rounded-[var(--radius-suave)] bg-[var(--color-salvia-clara)] px-4 py-3 text-sm">
          Tu paquete quedó reservado. Coordinamos el pago contigo y se activa apenas se confirme.
        </p>
      )}

      {/* ---------- paquetes ---------- */}
      <section className="mt-12">
        <h2 className="text-2xl">Mis paquetes</h2>
        {(paquetes ?? []).length === 0 ? (
          <p className="mt-4 text-sm text-[var(--color-tinta-suave)]">
            Todavía no tienes paquetes.{' '}
            <Link href="/paquetes" className="text-[var(--color-cobre)] hover:underline">
              Ver planes disponibles
            </Link>
          </p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(paquetes ?? []).map((paquete) => {
              const restantes = paquete.sessions_total - paquete.sessions_used
              const porcentaje = Math.round((paquete.sessions_used / paquete.sessions_total) * 100)

              return (
                <article key={paquete.id} className="tarjeta bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-medium">{paquete.package_name}</h3>
                    <span className="etiqueta shrink-0">
                      {PURCHASE_STATUS_LABEL[paquete.status as 'active']}
                    </span>
                  </div>

                  <p className="mt-4 text-2xl font-medium">
                    {restantes}
                    <span className="text-base text-[var(--color-tinta-suave)]">
                      {' '}/ {paquete.sessions_total} sesiones
                    </span>
                  </p>

                  <div
                    className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-arena)]"
                    role="progressbar"
                    aria-valuenow={porcentaje}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${paquete.sessions_used} de ${paquete.sessions_total} sesiones usadas`}
                  >
                    <div
                      className="h-full bg-[var(--color-cobre)]"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>

                  {paquete.expires_at && (
                    <p className="mt-3 text-xs text-[var(--color-tinta-tenue)]">
                      Vence el {formatLongDate(paquete.expires_at, business.timezone)}
                    </p>
                  )}

                  {paquete.status === 'active' && restantes > 0 && (
                    <Link href="/reservar" className="boton-secundario mt-4 w-full !py-2 text-xs">
                      Agendar una sesión
                    </Link>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* ---------- próximas citas ---------- */}
      <section className="mt-16">
        <h2 className="text-2xl">Próximas reservas</h2>
        {(proximas ?? []).length === 0 ? (
          <p className="mt-4 text-sm text-[var(--color-tinta-suave)]">
            No tienes horas agendadas.{' '}
            <Link href="/reservar" className="text-[var(--color-cobre)] hover:underline">
              Reservar ahora
            </Link>
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-[var(--color-arena)] border-y border-[var(--color-arena)]">
            {(proximas ?? []).map((cita) => (
              <li key={cita.id}>
                <Link
                  href={`/reserva/${cita.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-5 hover:bg-[var(--color-arena)]/30 sm:px-2"
                >
                  <div>
                    <p className="font-medium">{uno(cita.services)?.name}</p>
                    <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
                      {formatLongDate(cita.starts_at, business.timezone)} ·{' '}
                      {formatLocalTime(new Date(cita.starts_at), business.timezone)} h ·{' '}
                      {uno(cita.staff)?.display_name}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p>{APPOINTMENT_STATUS_LABEL[cita.status as 'confirmed']}</p>
                    <p className="text-[var(--color-tinta-suave)]">
                      {cita.purchase_id
                        ? 'Con paquete'
                        : formatMoney(cita.price_amount, business.currency)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------- historial ---------- */}
      {(pasadas ?? []).length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl">Historial</h2>
          <ul className="mt-6 space-y-3 text-sm">
            {(pasadas ?? []).map((cita) => (
              <li key={cita.id} className="flex justify-between gap-4 text-[var(--color-tinta-suave)]">
                <span>{uno(cita.services)?.name}</span>
                <span>
                  {formatLongDate(cita.starts_at, business.timezone)} ·{' '}
                  {APPOINTMENT_STATUS_LABEL[cita.status as 'completed']}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
