import { formatMoney, packageSavings } from '@carezia/core'
import { getSettings } from '@/lib/settings'
import { createClient } from '@/lib/supabase/server'
import { uno, varios } from '@/lib/db'
import { BotonComprarPaquete } from '@/components/boton-comprar-paquete'

export const revalidate = 60
export const metadata = { title: 'Paquetes' }

export default async function PaquetesPage() {
  const { business } = await getSettings()
  const supabase = await createClient()

  const { data: paquetes } = await supabase
    .from('packages')
    .select(
      `id, name, slug, description, price_amount, sessions_count, validity_days,
       package_services(services(id, name, price_amount))`,
    )
    .eq('is_active', true)
    .order('sort_order')

  return (
    <div className="contenedor py-16">
      <h1 className="text-4xl">Paquetes de sesiones</h1>
      <p className="mt-3 max-w-2xl text-[var(--color-tinta-suave)]">
        Compras una vez y las sesiones quedan guardadas en tu cuenta. Al reservar eliges
        pagar con el paquete y el crédito se descuenta solo.
      </p>

      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {(paquetes ?? []).map((paquete) => {
          const servicios = varios(paquete.package_services)
            .map((ps) => uno(ps.services))
            .filter((s): s is NonNullable<typeof s> => s !== null)

          // El ahorro se calcula contra el servicio más caro que cubre el plan.
          const referencia = servicios.reduce((max, s) => Math.max(max, s.price_amount), 0)
          const ahorro = packageSavings(paquete.price_amount, referencia, paquete.sessions_count)

          return (
            <article key={paquete.id} id={paquete.slug} className="tarjeta flex flex-col bg-white">
              <div className="flex items-start justify-between gap-3">
                <span className="etiqueta">{paquete.sessions_count} sesiones</span>
                {ahorro.percent > 0 && (
                  <span className="text-xs font-medium text-[var(--color-cobre)]">
                    Ahorras {ahorro.percent}%
                  </span>
                )}
              </div>

              <h2 className="mt-4 text-xl">{paquete.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-tinta-suave)]">
                {paquete.description}
              </p>

              {servicios.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs uppercase tracking-wide text-[var(--color-tinta-tenue)]">
                    Canjeable en
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-[var(--color-tinta-suave)]">
                    {servicios.map((servicio) => (
                      <li key={servicio.id}>· {servicio.name}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-auto pt-6">
                <p className="text-2xl font-medium">
                  {formatMoney(paquete.price_amount, business.currency)}
                </p>
                <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
                  {formatMoney(
                    Math.round(paquete.price_amount / paquete.sessions_count),
                    business.currency,
                  )}{' '}
                  por sesión
                  {paquete.validity_days
                    ? ` · vigencia ${Math.round(paquete.validity_days / 30)} meses`
                    : ' · sin vencimiento'}
                </p>
                <div className="mt-5">
                  <BotonComprarPaquete packageId={paquete.id} />
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {(paquetes ?? []).length === 0 && (
        <p className="mt-10 text-[var(--color-tinta-suave)]">
          Aún no hay paquetes publicados.
        </p>
      )}
    </div>
  )
}
