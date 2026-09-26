import Link from 'next/link'
import { formatMoney } from '@carezia/core'
import { getSettings } from '@/lib/settings'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 60
export const metadata = { title: 'Servicios' }

export default async function ServiciosPage() {
  const { business } = await getSettings()
  const supabase = await createClient()

  const { data: categorias } = await supabase
    .from('service_categories')
    .select('id, name, slug, description, sort_order')
    .eq('is_active', true)
    .order('sort_order')

  const { data: servicios } = await supabase
    .from('services')
    .select('id, category_id, name, slug, description, price_amount, duration_min')
    .eq('is_active', true)
    .order('sort_order')

  const sinCategoria = (servicios ?? []).filter((s) => !s.category_id)

  return (
    <div className="contenedor py-16">
      <h1 className="text-4xl">Servicios</h1>
      <p className="mt-3 max-w-xl text-[var(--color-tinta-suave)]">
        Precios y duraciones reales. Lo que ves acá es lo que se cobra en el box.
      </p>

      <div className="mt-14 space-y-16">
        {(categorias ?? []).map((categoria) => {
          const items = (servicios ?? []).filter((s) => s.category_id === categoria.id)
          if (items.length === 0) return null

          return (
            <section key={categoria.id} id={categoria.slug}>
              <h2 className="text-2xl">{categoria.name}</h2>
              {categoria.description && (
                <p className="mt-2 max-w-2xl text-sm text-[var(--color-tinta-suave)]">
                  {categoria.description}
                </p>
              )}

              <ul className="mt-6 divide-y divide-[var(--color-arena)] border-y border-[var(--color-arena)]">
                {items.map((servicio) => (
                  <li key={servicio.id}>
                    <Link
                      href={`/servicios/${servicio.slug}`}
                      className="flex flex-col gap-2 py-5 transition-colors hover:bg-[var(--color-arena)]/30 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-2"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{servicio.name}</p>
                        <p className="mt-1 text-sm text-[var(--color-tinta-suave)]">
                          {servicio.description}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-6">
                        <span className="text-sm text-[var(--color-tinta-tenue)]">
                          {servicio.duration_min} min
                        </span>
                        <span className="font-medium text-[var(--color-cobre)]">
                          {formatMoney(servicio.price_amount, business.currency)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}

        {sinCategoria.length > 0 && (
          <section>
            <h2 className="text-2xl">Otros</h2>
            <ul className="mt-6 divide-y divide-[var(--color-arena)] border-y border-[var(--color-arena)]">
              {sinCategoria.map((servicio) => (
                <li key={servicio.id} className="py-5">
                  <Link href={`/servicios/${servicio.slug}`} className="font-medium">
                    {servicio.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {(servicios ?? []).length === 0 && (
        <p className="mt-10 text-[var(--color-tinta-suave)]">
          Todavía no hay servicios publicados. Se cargan desde el panel de administración.
        </p>
      )}
    </div>
  )
}
